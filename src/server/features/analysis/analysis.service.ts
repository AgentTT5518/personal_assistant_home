import { z } from 'zod';
import { sql, eq, and, gte, lte, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db, schema } from '../../lib/db/index.js';
import { routeToProvider } from '../../lib/ai/router.js';
import type { AnalysisInsights } from '../../../shared/types/index.js';
import { log } from './logger.js';

const analysisSectionSchema = z.object({
  title: z.string(),
  type: z.enum(['overview', 'categories', 'trends', 'anomalies', 'recommendations']),
  content: z.string(),
  highlights: z.array(z.string()).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

const analysisInsightsSchema = z.object({
  period: z.object({ from: z.string(), to: z.string() }),
  currency: z.string(),
  summary: z.object({
    totalIncome: z.number(),
    totalExpenses: z.number(),
    netAmount: z.number(),
    transactionCount: z.number(),
  }),
  sections: z.array(analysisSectionSchema).min(5),
});

function parseAiResponse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const match = /```(?:json)?\s*([\s\S]*?)\s*```/.exec(raw);
    if (match) {
      return JSON.parse(match[1]);
    }
    throw new Error('Failed to parse AI response as JSON');
  }
}

interface TransactionSummary {
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  transactionCount: number;
  byCategory: Array<{ name: string; total: number; percentage: number }>;
  byMonth: Array<{ month: string; income: number; expenses: number }>;
  topMerchants: Array<{ merchant: string; total: number; count: number }>;
  dateRange: { from: string; to: string };
  currency: string;
}

function buildTransactionSummary(dateFrom?: string, dateTo?: string): TransactionSummary {
  const conditions = [];
  if (dateFrom) {
    conditions.push(gte(schema.transactions.date, dateFrom));
  }
  if (dateTo) {
    conditions.push(lte(schema.transactions.date, dateTo));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get all transactions in range
  const txns = db
    .select()
    .from(schema.transactions)
    .where(whereClause)
    .all();

  // Basic totals
  let totalIncome = 0;
  let totalExpenses = 0;
  for (const t of txns) {
    if (t.type === 'credit') totalIncome += t.amount;
    else totalExpenses += t.amount;
  }

  // By category
  const categoryTotals = new Map<string, number>();
  const categoryIds = new Set<string>();
  for (const t of txns) {
    if (t.type === 'debit' && t.categoryId) {
      categoryIds.add(t.categoryId);
      categoryTotals.set(t.categoryId, (categoryTotals.get(t.categoryId) ?? 0) + t.amount);
    }
  }

  const categories = categoryIds.size > 0
    ? db.select().from(schema.categories).all()
    : [];
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const byCategory = Array.from(categoryTotals.entries())
    .map(([id, total]) => ({
      name: categoryMap.get(id) ?? 'Unknown',
      total,
      percentage: totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // By month
  const monthTotals = new Map<string, { income: number; expenses: number }>();
  for (const t of txns) {
    const month = t.date.slice(0, 7); // YYYY-MM
    const entry = monthTotals.get(month) ?? { income: 0, expenses: 0 };
    if (t.type === 'credit') entry.income += t.amount;
    else entry.expenses += t.amount;
    monthTotals.set(month, entry);
  }

  const byMonth = Array.from(monthTotals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));

  // Top merchants (net-new query — debit only, grouped by merchant)
  const merchantQuery = db
    .select({
      merchant: schema.transactions.merchant,
      total: sql<number>`SUM(${schema.transactions.amount})`.as('total'),
      count: sql<number>`COUNT(*)`.as('count'),
    })
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.type, 'debit'),
        sql`${schema.transactions.merchant} IS NOT NULL`,
        ...(dateFrom ? [gte(schema.transactions.date, dateFrom)] : []),
        ...(dateTo ? [lte(schema.transactions.date, dateTo)] : []),
      ),
    )
    .groupBy(schema.transactions.merchant)
    .orderBy(sql`total DESC`)
    .limit(10)
    .all();

  const topMerchants = merchantQuery.map((r) => ({
    merchant: r.merchant as string,
    total: r.total,
    count: r.count,
  }));

  // Get currency
  const currencySetting = db
    .select()
    .from(schema.appSettings)
    .where(eq(schema.appSettings.key, 'currency'))
    .get();
  const currency = currencySetting?.value ?? 'AUD';

  // Determine actual date range
  const actualFrom = dateFrom ?? (txns.length > 0 ? txns.reduce((min, t) => (t.date < min ? t.date : min), txns[0].date) : new Date().toISOString().split('T')[0]);
  const actualTo = dateTo ?? (txns.length > 0 ? txns.reduce((max, t) => (t.date > max ? t.date : max), txns[0].date) : new Date().toISOString().split('T')[0]);

  return {
    totalIncome,
    totalExpenses,
    netAmount: totalIncome - totalExpenses,
    transactionCount: txns.length,
    byCategory,
    byMonth,
    topMerchants,
    dateRange: { from: actualFrom, to: actualTo },
    currency,
  };
}

function buildPromptMessages(summary: TransactionSummary) {
  const systemMessage = {
    role: 'system' as const,
    content:
      'You are a personal finance analyst. Analyse the spending data provided and return structured insights as JSON matching the specified schema. Be specific — reference actual numbers, categories, and merchants from the data. Do not give generic advice.',
  };

  const userMessage = {
    role: 'user' as const,
    content: `Analyse this spending data and return structured JSON insights.

## Spending Data

**Period:** ${summary.dateRange.from} to ${summary.dateRange.to}
**Currency:** ${summary.currency}
**Transaction Count:** ${summary.transactionCount}

**Totals:**
- Total Income: ${summary.totalIncome.toFixed(2)}
- Total Expenses: ${summary.totalExpenses.toFixed(2)}
- Net Amount: ${summary.netAmount.toFixed(2)}

**Top Spending Categories:**
${summary.byCategory.map((c) => `- ${c.name}: ${c.total.toFixed(2)} (${c.percentage}%)`).join('\n')}

**Monthly Trends:**
${summary.byMonth.map((m) => `- ${m.month}: Income ${m.income.toFixed(2)}, Expenses ${m.expenses.toFixed(2)}`).join('\n')}

**Top Merchants by Spend:**
${summary.topMerchants.map((m) => `- ${m.merchant}: ${m.total.toFixed(2)} (${m.count} transactions)`).join('\n')}

## Required Output

Return ONLY valid JSON matching this exact schema:
{
  "period": { "from": "${summary.dateRange.from}", "to": "${summary.dateRange.to}" },
  "currency": "${summary.currency}",
  "summary": {
    "totalIncome": ${summary.totalIncome},
    "totalExpenses": ${summary.totalExpenses},
    "netAmount": ${summary.netAmount},
    "transactionCount": ${summary.transactionCount}
  },
  "sections": [
    {
      "title": "Spending Overview",
      "type": "overview",
      "content": "Markdown analysis text...",
      "highlights": ["Key point 1", "Key point 2"]
    },
    {
      "title": "Top Categories",
      "type": "categories",
      "content": "Markdown analysis text...",
      "highlights": ["Key point 1"]
    },
    {
      "title": "Trends",
      "type": "trends",
      "content": "Markdown analysis text...",
      "highlights": ["Key point 1"]
    },
    {
      "title": "Anomalies",
      "type": "anomalies",
      "content": "Markdown analysis text...",
      "highlights": ["Key point 1"]
    },
    {
      "title": "Recommendations",
      "type": "recommendations",
      "content": "Markdown analysis text...",
      "highlights": ["Key point 1"]
    }
  ]
}

Include ALL 5 section types. The "content" fields should be Markdown-formatted analysis text referencing specific numbers from the data. The "highlights" arrays should contain 2-4 key takeaways each.`,
  };

  return [systemMessage, userMessage];
}

export async function generateAnalysis(
  dateFrom?: string,
  dateTo?: string,
): Promise<{ id: string; snapshotType: string; data: AnalysisInsights; generatedAt: string; createdAt: string; updatedAt: string }> {
  try {
    log.info('Generating analysis', { dateFrom, dateTo });

    const summary = buildTransactionSummary(dateFrom, dateTo);

    if (summary.transactionCount === 0) {
      throw new Error('No transactions found for the specified date range');
    }

    const messages = buildPromptMessages(summary);

    // First attempt
    let aiResponse = await routeToProvider('analysis_insights', messages, {
      maxTokens: 4096,
      temperature: 0.3,
    });

    let needsRetry = false;
    let parsed: unknown;
    try {
      parsed = parseAiResponse(aiResponse);
      const validation = analysisInsightsSchema.safeParse(parsed);
      if (!validation.success) {
        log.warn('AI response validation failed, retrying', { errors: validation.error.message });
        needsRetry = true;
      } else {
        parsed = validation.data;
      }
    } catch {
      log.warn('AI response JSON parse failed, retrying');
      needsRetry = true;
    }

    // Retry once on parse/validation failure
    if (needsRetry) {
      const retryMessages = [
        ...messages,
        { role: 'assistant' as const, content: aiResponse },
        {
          role: 'user' as const,
          content: 'Your previous response was not valid JSON. Please return only valid JSON matching the schema.',
        },
      ];

      aiResponse = await routeToProvider('analysis_insights', retryMessages, {
        maxTokens: 4096,
        temperature: 0.3,
      });

      try {
        parsed = parseAiResponse(aiResponse);
      } catch {
        log.error('AI response JSON parse failed after retry', new Error('Invalid JSON'));
        throw new Error('Failed to parse AI response after retry');
      }

      const validation = analysisInsightsSchema.safeParse(parsed);
      if (!validation.success) {
        log.error('AI response validation failed after retry', new Error(validation.error.message));
        throw new Error('Failed to parse AI response after retry');
      }
      parsed = validation.data;
    }

    const insights = parsed as AnalysisInsights;
    const now = new Date().toISOString();
    const id = uuidv4();

    db.insert(schema.analysisSnapshots)
      .values({
        id,
        snapshotType: 'analysis_insights',
        data: JSON.stringify(insights),
        generatedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    log.info('Analysis generated and saved', { id, transactionCount: summary.transactionCount });

    return {
      id,
      snapshotType: 'analysis_insights',
      data: insights,
      generatedAt: now,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    log.error('Failed to generate analysis', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export function listSnapshots(): Array<{
  id: string;
  snapshotType: string;
  period: { from: string; to: string };
  generatedAt: string;
}> {
  try {
    const rows = db
      .select({
        id: schema.analysisSnapshots.id,
        snapshotType: schema.analysisSnapshots.snapshotType,
        periodFrom: sql<string>`JSON_EXTRACT(${schema.analysisSnapshots.data}, '$.period.from')`.as('period_from'),
        periodTo: sql<string>`JSON_EXTRACT(${schema.analysisSnapshots.data}, '$.period.to')`.as('period_to'),
        generatedAt: schema.analysisSnapshots.generatedAt,
      })
      .from(schema.analysisSnapshots)
      .orderBy(desc(schema.analysisSnapshots.generatedAt))
      .all();

    return rows.map((r) => ({
      id: r.id,
      snapshotType: r.snapshotType,
      period: { from: r.periodFrom, to: r.periodTo },
      generatedAt: r.generatedAt,
    }));
  } catch (error) {
    log.error('Failed to list snapshots', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export function getSnapshot(id: string): {
  id: string;
  snapshotType: string;
  data: AnalysisInsights;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
} | null {
  try {
    const row = db
      .select()
      .from(schema.analysisSnapshots)
      .where(eq(schema.analysisSnapshots.id, id))
      .get();

    if (!row) return null;

    return {
      id: row.id,
      snapshotType: row.snapshotType,
      data: JSON.parse(row.data) as AnalysisInsights,
      generatedAt: row.generatedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  } catch (error) {
    log.error('Failed to get snapshot', error instanceof Error ? error : new Error(String(error)), { id });
    throw error;
  }
}

export function deleteSnapshot(id: string): boolean {
  try {
    const result = db
      .delete(schema.analysisSnapshots)
      .where(eq(schema.analysisSnapshots.id, id))
      .run();

    if (result.changes === 0) return false;

    log.info('Snapshot deleted', { id });
    return true;
  } catch (error) {
    log.error('Failed to delete snapshot', error instanceof Error ? error : new Error(String(error)), { id });
    throw error;
  }
}
