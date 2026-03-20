import { Router, type Request, type Response } from 'express';
import { eq, sql, and, like, or, count as drizzleCount } from 'drizzle-orm';
import { db, schema } from '../../lib/db/index.js';
import { validateBody, validateQuery } from '../../shared/middleware/validate.js';
import { aiRateLimiter } from '../../shared/middleware/rate-limiter.js';
import { AppError } from '../../shared/middleware/error-handler.js';
import {
  transactionFiltersSchema,
  updateTransactionSchema,
  bulkCategoriseSchema,
} from '../../../shared/types/validation.js';
import type {
  TransactionResponse,
  PaginatedResponse,
  TransactionStats,
  TransactionFilters,
} from '../../../shared/types/index.js';
import { runRuleCategorisation } from './categorisation.service.js';
import { aiCategoriseTransactions } from './ai-categorisation.service.js';
import { detectRecurringTransactions, getRecurringSummary } from './recurring-detection.service.js';
import { log } from './logger.js';

function paramStr(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export const transactionRouter = Router();

// GET /api/transactions — list with filtering, sorting, pagination
transactionRouter.get(
  '/transactions',
  validateQuery(transactionFiltersSchema),
  (req: Request, res: Response) => {
    const filters = (req as unknown as Record<string, unknown>).validatedQuery as TransactionFilters;

    // Build WHERE conditions
    const conditions: ReturnType<typeof eq>[] = [];

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          like(schema.transactions.description, searchTerm),
          like(schema.transactions.merchant, searchTerm),
        )!,
      );
    }

    if (filters.categoryId) {
      if (filters.categoryId === 'uncategorised') {
        conditions.push(sql`${schema.transactions.categoryId} IS NULL`);
      } else {
        conditions.push(eq(schema.transactions.categoryId, filters.categoryId));
      }
    }

    if (filters.type) {
      conditions.push(eq(schema.transactions.type, filters.type));
    }

    if (filters.dateFrom) {
      conditions.push(sql`${schema.transactions.date} >= ${filters.dateFrom}`);
    }

    if (filters.dateTo) {
      conditions.push(sql`${schema.transactions.date} <= ${filters.dateTo}`);
    }

    if (filters.amountMin !== undefined) {
      conditions.push(sql`${schema.transactions.amount} >= ${filters.amountMin}`);
    }

    if (filters.amountMax !== undefined) {
      conditions.push(sql`${schema.transactions.amount} <= ${filters.amountMax}`);
    }

    if (filters.documentId) {
      conditions.push(eq(schema.transactions.documentId, filters.documentId));
    }

    if (filters.isRecurring !== undefined) {
      conditions.push(eq(schema.transactions.isRecurring, filters.isRecurring));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Sort
    const sortBy = filters.sortBy ?? 'date';
    const sortOrder = filters.sortOrder ?? 'desc';
    const sortColumn =
      sortBy === 'amount'
        ? schema.transactions.amount
        : sortBy === 'description'
          ? schema.transactions.description
          : schema.transactions.date;
    const orderExpr = sortOrder === 'asc' ? sql`${sortColumn} ASC` : sql`${sortColumn} DESC`;

    // Pagination
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 50;
    const offset = (page - 1) * pageSize;

    // Count query
    let countQuery = db
      .select({ count: drizzleCount() })
      .from(schema.transactions)
      .$dynamic();

    if (whereClause) {
      countQuery = countQuery.where(whereClause);
    }

    const totalResult = countQuery.get();
    const total = totalResult?.count ?? 0;

    // Data query with joins
    const txns = db
      .select({
        id: schema.transactions.id,
        documentId: schema.transactions.documentId,
        date: schema.transactions.date,
        description: schema.transactions.description,
        amount: schema.transactions.amount,
        type: schema.transactions.type,
        merchant: schema.transactions.merchant,
        isRecurring: schema.transactions.isRecurring,
        categoryId: schema.transactions.categoryId,
        createdAt: schema.transactions.createdAt,
        categoryName: schema.categories.name,
        categoryColor: schema.categories.color,
        documentFilename: schema.documents.filename,
      })
      .from(schema.transactions)
      .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
      .leftJoin(schema.documents, eq(schema.transactions.documentId, schema.documents.id))
      .where(whereClause)
      .orderBy(orderExpr)
      .limit(pageSize)
      .offset(offset)
      .all();

    const data: TransactionResponse[] = txns.map((t) => ({
      id: t.id,
      documentId: t.documentId,
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type as 'debit' | 'credit',
      merchant: t.merchant,
      isRecurring: t.isRecurring ?? false,
      categoryId: t.categoryId,
      categoryName: t.categoryName ?? null,
      categoryColor: t.categoryColor ?? null,
      documentFilename: t.documentFilename ?? null,
      createdAt: t.createdAt,
    }));

    const response: PaginatedResponse<TransactionResponse> = {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    res.json(response);
  },
);

// GET /api/transactions/stats — aggregated stats
transactionRouter.get('/transactions/stats', (req: Request, res: Response) => {
  const dateFrom = req.query.dateFrom as string | undefined;
  const dateTo = req.query.dateTo as string | undefined;

  const dateConditions: ReturnType<typeof eq>[] = [];
  if (dateFrom) {
    dateConditions.push(sql`${schema.transactions.date} >= ${dateFrom}`);
  }
  if (dateTo) {
    dateConditions.push(sql`${schema.transactions.date} <= ${dateTo}`);
  }
  const dateWhere = dateConditions.length > 0 ? and(...dateConditions) : undefined;

  // Total income/expenses
  const totals = db
    .select({
      totalIncome: sql<number>`COALESCE(SUM(CASE WHEN ${schema.transactions.type} = 'credit' THEN ${schema.transactions.amount} ELSE 0 END), 0)`,
      totalExpenses: sql<number>`COALESCE(SUM(CASE WHEN ${schema.transactions.type} = 'debit' THEN ${schema.transactions.amount} ELSE 0 END), 0)`,
      transactionCount: drizzleCount(),
      uncategorisedCount: sql<number>`COALESCE(SUM(CASE WHEN ${schema.transactions.categoryId} IS NULL THEN 1 ELSE 0 END), 0)`,
    })
    .from(schema.transactions)
    .where(dateWhere)
    .get();

  const totalIncome = totals?.totalIncome ?? 0;
  const totalExpenses = totals?.totalExpenses ?? 0;

  // By category
  const byCategoryRows = db
    .select({
      categoryId: schema.transactions.categoryId,
      categoryName: schema.categories.name,
      categoryColor: schema.categories.color,
      total: sql<number>`COALESCE(SUM(${schema.transactions.amount}), 0)`,
      count: drizzleCount(),
    })
    .from(schema.transactions)
    .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
    .where(dateWhere ? and(dateWhere, sql`${schema.transactions.categoryId} IS NOT NULL`) : sql`${schema.transactions.categoryId} IS NOT NULL`)
    .groupBy(schema.transactions.categoryId)
    .all();

  const byCategory = byCategoryRows.map((r) => ({
    categoryId: r.categoryId!,
    categoryName: r.categoryName ?? 'Unknown',
    categoryColor: r.categoryColor ?? '#6b7280',
    total: r.total,
    count: r.count,
  }));

  // By month
  const byMonthRows = db
    .select({
      month: sql<string>`SUBSTR(${schema.transactions.date}, 1, 7)`,
      income: sql<number>`COALESCE(SUM(CASE WHEN ${schema.transactions.type} = 'credit' THEN ${schema.transactions.amount} ELSE 0 END), 0)`,
      expenses: sql<number>`COALESCE(SUM(CASE WHEN ${schema.transactions.type} = 'debit' THEN ${schema.transactions.amount} ELSE 0 END), 0)`,
    })
    .from(schema.transactions)
    .where(dateWhere)
    .groupBy(sql`SUBSTR(${schema.transactions.date}, 1, 7)`)
    .orderBy(sql`SUBSTR(${schema.transactions.date}, 1, 7) ASC`)
    .all();

  const byMonth = byMonthRows.map((r) => ({
    month: r.month,
    income: r.income,
    expenses: r.expenses,
  }));

  const stats: TransactionStats = {
    totalIncome,
    totalExpenses,
    netAmount: totalIncome - totalExpenses,
    transactionCount: totals?.transactionCount ?? 0,
    uncategorisedCount: totals?.uncategorisedCount ?? 0,
    byCategory,
    byMonth,
  };

  res.json(stats);
});

// PUT /api/transactions/:id — update category
transactionRouter.put(
  '/transactions/:id',
  validateBody(updateTransactionSchema),
  (req: Request, res: Response) => {
    const id = paramStr(req.params.id);
    const { categoryId } = req.body as { categoryId: string | null };

    const existing = db
      .select({ id: schema.transactions.id })
      .from(schema.transactions)
      .where(eq(schema.transactions.id, id))
      .get();

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Transaction not found');
    }

    // Validate category exists if not null
    if (categoryId) {
      const cat = db
        .select({ id: schema.categories.id })
        .from(schema.categories)
        .where(eq(schema.categories.id, categoryId))
        .get();
      if (!cat) {
        throw new AppError(400, 'INVALID_CATEGORY', 'Category not found');
      }
    }

    db.update(schema.transactions)
      .set({ categoryId, updatedAt: new Date().toISOString() })
      .where(eq(schema.transactions.id, id))
      .run();

    log.info('Transaction updated', { id, categoryId });

    // Return updated transaction with joins
    const updated = db
      .select({
        id: schema.transactions.id,
        documentId: schema.transactions.documentId,
        date: schema.transactions.date,
        description: schema.transactions.description,
        amount: schema.transactions.amount,
        type: schema.transactions.type,
        merchant: schema.transactions.merchant,
        isRecurring: schema.transactions.isRecurring,
        categoryId: schema.transactions.categoryId,
        createdAt: schema.transactions.createdAt,
        categoryName: schema.categories.name,
        categoryColor: schema.categories.color,
        documentFilename: schema.documents.filename,
      })
      .from(schema.transactions)
      .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
      .leftJoin(schema.documents, eq(schema.transactions.documentId, schema.documents.id))
      .where(eq(schema.transactions.id, id))
      .get()!;

    const response: TransactionResponse = {
      id: updated.id,
      documentId: updated.documentId,
      date: updated.date,
      description: updated.description,
      amount: updated.amount,
      type: updated.type as 'debit' | 'credit',
      merchant: updated.merchant,
      isRecurring: updated.isRecurring ?? false,
      categoryId: updated.categoryId,
      categoryName: updated.categoryName ?? null,
      categoryColor: updated.categoryColor ?? null,
      documentFilename: updated.documentFilename ?? null,
      createdAt: updated.createdAt,
    };

    res.json(response);
  },
);

// POST /api/transactions/bulk-categorise
transactionRouter.post(
  '/transactions/bulk-categorise',
  validateBody(bulkCategoriseSchema),
  (req: Request, res: Response) => {
    const { transactionIds, categoryId } = req.body as {
      transactionIds: string[];
      categoryId: string | null;
    };

    // Validate category exists if not null
    if (categoryId) {
      const cat = db
        .select({ id: schema.categories.id })
        .from(schema.categories)
        .where(eq(schema.categories.id, categoryId))
        .get();
      if (!cat) {
        throw new AppError(400, 'INVALID_CATEGORY', 'Category not found');
      }
    }

    const now = new Date().toISOString();
    let updated = 0;

    db.transaction((tx) => {
      for (const txnId of transactionIds) {
        const result = tx.update(schema.transactions)
          .set({ categoryId, updatedAt: now })
          .where(eq(schema.transactions.id, txnId))
          .run();
        if (result.changes > 0) updated++;
      }
    });

    log.info('Bulk categorise complete', { count: updated, categoryId });

    res.json({ updated, categoryId });
  },
);

// POST /api/transactions/auto-categorise — rule-based
transactionRouter.post(
  '/transactions/auto-categorise',
  aiRateLimiter,
  (_req: Request, res: Response) => {
    const result = runRuleCategorisation();

    log.info('Auto-categorise triggered', result);

    res.json(result);
  },
);

// GET /api/transactions/export/csv — CSV export with optional date range
transactionRouter.get('/transactions/export/csv', (req: Request, res: Response, next) => {
  try {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const conditions: ReturnType<typeof eq>[] = [];
    if (from) {
      conditions.push(sql`${schema.transactions.date} >= ${from}`);
    }
    if (to) {
      conditions.push(sql`${schema.transactions.date} <= ${to}`);
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = db
      .select({
        date: schema.transactions.date,
        description: schema.transactions.description,
        amount: schema.transactions.amount,
        type: schema.transactions.type,
        merchant: schema.transactions.merchant,
        isRecurring: schema.transactions.isRecurring,
        categoryName: schema.categories.name,
      })
      .from(schema.transactions)
      .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
      .where(whereClause)
      .orderBy(sql`${schema.transactions.date} ASC`)
      .all();

    const header = 'date,description,amount,type,merchant,category,is_recurring';
    const lines = rows.map((r) => {
      const escapeCsv = (val: string | null | undefined) => {
        if (val == null) return '';
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };
      return [
        r.date,
        escapeCsv(r.description),
        r.amount,
        r.type,
        escapeCsv(r.merchant),
        escapeCsv(r.categoryName),
        r.isRecurring ? 'true' : 'false',
      ].join(',');
    });

    const csv = [header, ...lines].join('\n');
    const today = new Date().toISOString().split('T')[0];

    log.info('CSV export', { rowCount: rows.length, from, to });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=transactions-${today}.csv`);
    res.send(csv);
  } catch (error) {
    log.error('CSV export failed', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// POST /api/transactions/detect-recurring — run recurring detection algorithm
transactionRouter.post('/transactions/detect-recurring', (_req: Request, res: Response, next) => {
  try {
    log.info('Running recurring transaction detection');
    const groups = detectRecurringTransactions();
    log.info('Recurring detection complete', { groupsFound: groups.length });
    res.json({ groups, groupCount: groups.length });
  } catch (error) {
    log.error('Recurring detection failed', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// GET /api/transactions/recurring-summary — grouped recurring transactions
transactionRouter.get('/transactions/recurring-summary', (_req: Request, res: Response, next) => {
  try {
    log.info('Fetching recurring summary');
    const groups = getRecurringSummary();
    res.json(groups);
  } catch (error) {
    log.error('Recurring summary failed', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// POST /api/transactions/ai-categorise — AI-based (fire-and-forget)
transactionRouter.post(
  '/transactions/ai-categorise',
  aiRateLimiter,
  validateBody(bulkCategoriseSchema.pick({ transactionIds: true })),
  (req: Request, res: Response) => {
    const { transactionIds } = req.body as { transactionIds: string[] };

    log.info('AI categorise triggered', { count: transactionIds.length });

    // Fire-and-forget with error isolation
    aiCategoriseTransactions(transactionIds).catch((err) =>
      log.error('AI categorisation failed', err instanceof Error ? err : new Error(String(err))),
    );

    res.status(202).json({ status: 'processing', count: transactionIds.length });
  },
);
