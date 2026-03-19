import { z } from 'zod';
import { eq, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db, schema } from '../../lib/db/index.js';
import { routeToProvider } from '../../lib/ai/router.js';
import { log } from './logger.js';

const AI_BATCH_SIZE = 20;
const MIN_CONFIDENCE = 0.7;
const AUTO_RULE_CONFIDENCE = 0.9;

const aiCategorisationResponseSchema = z.object({
  categorisations: z.array(
    z.object({
      transactionId: z.string(),
      categoryId: z.string(),
      confidence: z.number(),
    }),
  ),
});

function parseAiResponse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const match = /```(?:json)?\s*([\s\S]*?)\s*```/.exec(raw);
    if (match) {
      return JSON.parse(match[1]);
    }
    throw new Error('Failed to parse AI categorisation response as JSON');
  }
}

export async function aiCategoriseTransactions(
  transactionIds: string[],
): Promise<{ categorised: number; failed: number }> {
  try {
    // Load specified uncategorised transactions
    const txns = db
      .select()
      .from(schema.transactions)
      .where(inArray(schema.transactions.id, transactionIds))
      .all()
      .filter((t) => t.categoryId === null);

    if (txns.length === 0) {
      return { categorised: 0, failed: 0 };
    }

    // Load all categories
    const categories = db.select().from(schema.categories).all();
    const categoryList = categories.map((c) => ({ id: c.id, name: c.name }));

    let totalCategorised = 0;
    let totalFailed = 0;

    // Process in batches
    for (let i = 0; i < txns.length; i += AI_BATCH_SIZE) {
      const batch = txns.slice(i, i + AI_BATCH_SIZE);

      try {
        const batchResult = await processBatch(batch, categoryList);
        totalCategorised += batchResult.categorised;
        totalFailed += batchResult.failed;
      } catch (error) {
        log.error('AI categorisation batch failed', error instanceof Error ? error : new Error(String(error)), {
          batchStart: i,
          batchSize: batch.length,
        });
        totalFailed += batch.length;
      }
    }

    log.info('AI categorisation complete', { categorised: totalCategorised, failed: totalFailed });
    return { categorised: totalCategorised, failed: totalFailed };
  } catch (error) {
    log.error('AI categorisation failed', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

async function processBatch(
  transactions: Array<{
    id: string;
    description: string;
    merchant: string | null;
    amount: number;
    type: string;
  }>,
  categoryList: Array<{ id: string; name: string }>,
): Promise<{ categorised: number; failed: number }> {
  const transactionData = transactions.map((t) => ({
    id: t.id,
    description: t.description,
    merchant: t.merchant,
    amount: t.amount,
    type: t.type,
  }));

  const messages = [
    {
      role: 'system' as const,
      content:
        'You are a financial transaction categoriser. Given a list of transactions and available categories, assign each transaction to the most appropriate category. Prefer specific subcategories over parent categories when applicable.',
    },
    {
      role: 'user' as const,
      content: `Categorise these transactions into the available categories. Output JSON only.

Available categories:
${JSON.stringify(categoryList, null, 2)}

Transactions to categorise:
${JSON.stringify(transactionData, null, 2)}

Respond with ONLY valid JSON in this format:
{
  "categorisations": [
    { "transactionId": "...", "categoryId": "...", "confidence": 0.95 }
  ]
}

Include a confidence score between 0 and 1 for each assignment.`,
    },
  ];

  const aiResponse = await routeToProvider('categorisation', messages, {
    maxTokens: 4096,
    temperature: 0,
  });

  const parsed = parseAiResponse(aiResponse);
  const validation = aiCategorisationResponseSchema.safeParse(parsed);

  if (!validation.success) {
    log.error('AI categorisation response validation failed', new Error(validation.error.message));
    return { categorised: 0, failed: transactions.length };
  }

  // Filter by minimum confidence and validate categoryIds exist
  const validCategoryIds = new Set(categoryList.map((c) => c.id));
  const validTransactionIds = new Set(transactions.map((t) => t.id));

  const highConfidence = validation.data.categorisations.filter(
    (c) =>
      c.confidence >= MIN_CONFIDENCE &&
      validCategoryIds.has(c.categoryId) &&
      validTransactionIds.has(c.transactionId),
  );

  if (highConfidence.length === 0) {
    return { categorised: 0, failed: 0 };
  }

  const now = new Date().toISOString();

  // Update transactions and auto-generate rules
  db.transaction((tx) => {
    for (const cat of highConfidence) {
      tx.update(schema.transactions)
        .set({ categoryId: cat.categoryId, updatedAt: now })
        .where(eq(schema.transactions.id, cat.transactionId))
        .run();
    }
  });

  // Auto-generate rules for high-confidence matches
  const autoRuleCandidates = highConfidence.filter((c) => c.confidence >= AUTO_RULE_CONFIDENCE);
  for (const candidate of autoRuleCandidates) {
    const txn = transactions.find((t) => t.id === candidate.transactionId);
    if (!txn) continue;

    // Use merchant if available, otherwise extract key words from description
    const patternSource = txn.merchant ?? txn.description;
    const pattern = escapeRegex(patternSource);
    const field = txn.merchant ? 'merchant' : 'description';

    // Check if a similar rule already exists
    const existingRules = db
      .select()
      .from(schema.categoryRules)
      .where(eq(schema.categoryRules.categoryId, candidate.categoryId))
      .all();

    const alreadyExists = existingRules.some((r) => {
      try {
        const existingRegex = new RegExp(r.pattern, 'i');
        return existingRegex.test(patternSource);
      } catch {
        return false;
      }
    });

    if (!alreadyExists) {
      db.insert(schema.categoryRules)
        .values({
          id: uuidv4(),
          categoryId: candidate.categoryId,
          pattern,
          field,
          isAiGenerated: true,
          confidence: candidate.confidence,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      log.info('Auto-generated category rule', {
        categoryId: candidate.categoryId,
        pattern,
        field,
        confidence: candidate.confidence,
      });
    }
  }

  return { categorised: highConfidence.length, failed: 0 };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
