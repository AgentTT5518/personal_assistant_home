import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import { transactions, categories, budgets, splitTransactions, accounts } from '../../lib/db/schema/index.js';
import type { ReportData } from '../../../shared/types/index.js';
import { log } from './logger.js';

/**
 * Generates report data by aggregating transactions within a date range.
 */
export function generateReportData(periodFrom: string, periodTo: string): ReportData {
  log.info('Generating report data', { periodFrom, periodTo });

  const summary = buildSummary(periodFrom, periodTo);
  const budgetVsActual = buildBudgetVsActual(periodFrom, periodTo);
  const categoryBreakdown = buildCategoryBreakdown(periodFrom, periodTo);
  const topMerchants = buildTopMerchants(periodFrom, periodTo);
  const monthlyComparison = buildMonthlyComparison(periodFrom, periodTo);
  const accountBreakdown = buildAccountBreakdown(periodFrom, periodTo);

  return {
    summary,
    budgetVsActual,
    categoryBreakdown,
    topMerchants,
    ...(monthlyComparison.length > 1 ? { monthlyComparison } : {}),
    ...(accountBreakdown.length > 0 ? { accountBreakdown } : {}),
  };
}

function buildSummary(from: string, to: string): ReportData['summary'] {
  const incomeRow = db
    .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
    .from(transactions)
    .where(and(eq(transactions.type, 'credit'), gte(transactions.date, from), lte(transactions.date, to)))
    .get();

  const expensesRow = db
    .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
    .from(transactions)
    .where(and(eq(transactions.type, 'debit'), gte(transactions.date, from), lte(transactions.date, to)))
    .get();

  const countRow = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(transactions)
    .where(and(gte(transactions.date, from), lte(transactions.date, to)))
    .get();

  const income = incomeRow?.total ?? 0;
  const expenses = expensesRow?.total ?? 0;

  return {
    income,
    expenses,
    net: income - expenses,
    transactionCount: countRow?.count ?? 0,
  };
}

function buildBudgetVsActual(from: string, to: string): ReportData['budgetVsActual'] {
  const budgetRows = db
    .select({
      categoryId: budgets.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      budgetAmount: budgets.amount,
      period: budgets.period,
    })
    .from(budgets)
    .innerJoin(categories, eq(budgets.categoryId, categories.id))
    .all();

  return budgetRows.map((budget) => {
    // Unsplit transactions
    const unsplitRow = db
      .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.categoryId, budget.categoryId),
          eq(transactions.type, 'debit'),
          sql`${transactions.isSplit} = 0`,
          gte(transactions.date, from),
          lte(transactions.date, to),
        ),
      )
      .get();

    // Split portions
    const splitRow = db
      .select({ total: sql<number>`COALESCE(SUM(${splitTransactions.amount}), 0)` })
      .from(splitTransactions)
      .innerJoin(transactions, eq(splitTransactions.parentTransactionId, transactions.id))
      .where(
        and(
          eq(splitTransactions.categoryId, budget.categoryId),
          eq(transactions.type, 'debit'),
          gte(transactions.date, from),
          lte(transactions.date, to),
        ),
      )
      .get();

    const actualSpent = (unsplitRow?.total ?? 0) + (splitRow?.total ?? 0);
    const percentUsed = budget.budgetAmount > 0 ? Math.round((actualSpent / budget.budgetAmount) * 100) : 0;

    return {
      categoryName: budget.categoryName ?? '',
      categoryColor: budget.categoryColor ?? '#6b7280',
      budgetAmount: budget.budgetAmount,
      actualSpent,
      percentUsed,
    };
  });
}

function buildCategoryBreakdown(from: string, to: string): ReportData['categoryBreakdown'] {
  // Unsplit debit transactions by category
  const unsplitRows = db
    .select({
      categoryName: categories.name,
      categoryColor: categories.color,
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.type, 'debit'),
        sql`${transactions.isSplit} = 0`,
        gte(transactions.date, from),
        lte(transactions.date, to),
      ),
    )
    .groupBy(transactions.categoryId)
    .all();

  // Split portions by category
  const splitRows = db
    .select({
      categoryName: categories.name,
      categoryColor: categories.color,
      total: sql<number>`COALESCE(SUM(${splitTransactions.amount}), 0)`,
    })
    .from(splitTransactions)
    .innerJoin(transactions, eq(splitTransactions.parentTransactionId, transactions.id))
    .leftJoin(categories, eq(splitTransactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.type, 'debit'),
        gte(transactions.date, from),
        lte(transactions.date, to),
      ),
    )
    .groupBy(splitTransactions.categoryId)
    .all();

  // Merge by category name
  const categoryMap = new Map<string, { name: string; color: string; total: number }>();
  for (const row of unsplitRows) {
    const name = row.categoryName ?? 'Uncategorised';
    const existing = categoryMap.get(name);
    categoryMap.set(name, {
      name,
      color: row.categoryColor ?? '#6b7280',
      total: (existing?.total ?? 0) + row.total,
    });
  }
  for (const row of splitRows) {
    const name = row.categoryName ?? 'Uncategorised';
    const existing = categoryMap.get(name);
    categoryMap.set(name, {
      name,
      color: row.categoryColor ?? '#6b7280',
      total: (existing?.total ?? 0) + row.total,
    });
  }

  const totalExpenses = Array.from(categoryMap.values()).reduce((sum, c) => sum + c.total, 0);

  return Array.from(categoryMap.values())
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .map((c) => ({
      categoryName: c.name,
      categoryColor: c.color,
      amount: c.total,
      percentage: totalExpenses > 0 ? Math.round((c.total / totalExpenses) * 100) : 0,
    }));
}

function buildTopMerchants(from: string, to: string): ReportData['topMerchants'] {
  const rows = db
    .select({
      merchant: transactions.merchant,
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.type, 'debit'),
        sql`${transactions.merchant} IS NOT NULL AND ${transactions.merchant} != ''`,
        gte(transactions.date, from),
        lte(transactions.date, to),
      ),
    )
    .groupBy(transactions.merchant)
    .orderBy(desc(sql`SUM(${transactions.amount})`))
    .limit(10)
    .all();

  return rows.map((r) => ({
    merchant: r.merchant ?? '',
    amount: r.total,
    transactionCount: r.count,
  }));
}

function buildMonthlyComparison(from: string, to: string): NonNullable<ReportData['monthlyComparison']> {
  const rows = db
    .select({
      month: sql<string>`substr(${transactions.date}, 1, 7)`,
      type: transactions.type,
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(and(gte(transactions.date, from), lte(transactions.date, to)))
    .groupBy(sql`substr(${transactions.date}, 1, 7)`, transactions.type)
    .orderBy(sql`substr(${transactions.date}, 1, 7)`)
    .all();

  const monthMap = new Map<string, { income: number; expenses: number }>();
  for (const row of rows) {
    const existing = monthMap.get(row.month) ?? { income: 0, expenses: 0 };
    if (row.type === 'credit') {
      existing.income = row.total;
    } else {
      existing.expenses = row.total;
    }
    monthMap.set(row.month, existing);
  }

  return Array.from(monthMap.entries()).map(([month, data]) => ({
    month,
    income: data.income,
    expenses: data.expenses,
  }));
}

function buildAccountBreakdown(from: string, to: string): NonNullable<ReportData['accountBreakdown']> {
  const activeAccounts = db.select().from(accounts).where(eq(accounts.isActive, true)).all();
  if (activeAccounts.length === 0) return [];

  return activeAccounts.map((account) => {
    const incomeRow = db
      .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, account.id),
          eq(transactions.type, 'credit'),
          gte(transactions.date, from),
          lte(transactions.date, to),
        ),
      )
      .get();

    const expensesRow = db
      .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, account.id),
          eq(transactions.type, 'debit'),
          gte(transactions.date, from),
          lte(transactions.date, to),
        ),
      )
      .get();

    const income = incomeRow?.total ?? 0;
    const expenses = expensesRow?.total ?? 0;

    return {
      accountName: account.name,
      type: account.type,
      income,
      expenses,
      net: income - expenses,
    };
  });
}
