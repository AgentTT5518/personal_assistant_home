import { Router } from 'express';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/db/index.js';
import { budgets, categories, transactions } from '../../lib/db/schema/index.js';
import { validateBody } from '../../shared/middleware/validate.js';
import { AppError } from '../../shared/middleware/error-handler.js';
import { createBudgetSchema, updateBudgetSchema } from '../../../shared/types/validation.js';
import type { BudgetPeriod, BudgetResponse, BudgetSummaryResponse } from '../../../shared/types/index.js';
import { log } from './logger.js';

export const budgetRouter = Router();

// --- Helpers ---

function getPeriodDateRange(period: BudgetPeriod): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDay();

  switch (period) {
    case 'weekly': {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - day);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return {
        from: startOfWeek.toISOString().split('T')[0],
        to: endOfWeek.toISOString().split('T')[0],
      };
    }
    case 'yearly': {
      return {
        from: `${year}-01-01`,
        to: `${year}-12-31`,
      };
    }
    case 'monthly':
    default: {
      const lastDay = new Date(year, month + 1, 0).getDate();
      const m = String(month + 1).padStart(2, '0');
      return {
        from: `${year}-${m}-01`,
        to: `${year}-${m}-${String(lastDay).padStart(2, '0')}`,
      };
    }
  }
}

// --- Routes ---

// GET /api/budgets — list all budgets with category info
budgetRouter.get('/budgets', (_req, res, next) => {
  try {
    log.info('Listing budgets');
    const rows = db
      .select({
        id: budgets.id,
        categoryId: budgets.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        amount: budgets.amount,
        period: budgets.period,
        createdAt: budgets.createdAt,
        updatedAt: budgets.updatedAt,
      })
      .from(budgets)
      .innerJoin(categories, eq(budgets.categoryId, categories.id))
      .all();

    const result: BudgetResponse[] = rows.map((r) => ({
      ...r,
      categoryName: r.categoryName ?? '',
      categoryColor: r.categoryColor ?? '#6b7280',
      period: r.period as BudgetPeriod,
    }));

    res.json(result);
  } catch (error) {
    log.error('Failed to list budgets', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// GET /api/budgets/summary — budgets with current period spend
budgetRouter.get('/budgets/summary', (_req, res, next) => {
  try {
    log.info('Fetching budget summary');
    const rows = db
      .select({
        id: budgets.id,
        categoryId: budgets.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        amount: budgets.amount,
        period: budgets.period,
      })
      .from(budgets)
      .innerJoin(categories, eq(budgets.categoryId, categories.id))
      .all();

    const result: BudgetSummaryResponse[] = rows.map((budget) => {
      const { from, to } = getPeriodDateRange(budget.period as BudgetPeriod);

      const spentRow = db
        .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.categoryId, budget.categoryId),
            eq(transactions.type, 'debit'),
            gte(transactions.date, from),
            lte(transactions.date, to),
          ),
        )
        .get();

      const spent = spentRow?.total ?? 0;
      const remaining = budget.amount - spent;
      const percentUsed = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;

      return {
        id: budget.id,
        categoryId: budget.categoryId,
        categoryName: budget.categoryName ?? '',
        categoryColor: budget.categoryColor ?? '#6b7280',
        budgetAmount: budget.amount,
        period: budget.period as BudgetPeriod,
        spent,
        remaining,
        percentUsed,
      };
    });

    res.json(result);
  } catch (error) {
    log.error('Failed to fetch budget summary', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// POST /api/budgets — create a budget
budgetRouter.post('/budgets', validateBody(createBudgetSchema), (req, res, next) => {
  try {
    const { categoryId, amount, period } = req.body as { categoryId: string; amount: number; period: BudgetPeriod };

    // Verify category exists
    const category = db.select().from(categories).where(eq(categories.id, categoryId)).get();
    if (!category) {
      throw new AppError(404, 'NOT_FOUND', 'Category not found');
    }

    // Check for existing budget on this category
    const existing = db.select().from(budgets).where(eq(budgets.categoryId, categoryId)).get();
    if (existing) {
      throw new AppError(409, 'DUPLICATE', 'A budget already exists for this category');
    }

    const now = new Date().toISOString();
    const id = uuidv4();

    db.insert(budgets)
      .values({ id, categoryId, amount, period, createdAt: now, updatedAt: now })
      .run();

    log.info('Budget created', { id, categoryId, amount, period });

    const created = db
      .select({
        id: budgets.id,
        categoryId: budgets.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        amount: budgets.amount,
        period: budgets.period,
        createdAt: budgets.createdAt,
        updatedAt: budgets.updatedAt,
      })
      .from(budgets)
      .innerJoin(categories, eq(budgets.categoryId, categories.id))
      .where(eq(budgets.id, id))
      .get()!;

    res.status(201).json({
      ...created,
      categoryName: created.categoryName ?? '',
      categoryColor: created.categoryColor ?? '#6b7280',
      period: created.period as BudgetPeriod,
    });
  } catch (error) {
    log.error('Failed to create budget', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// PUT /api/budgets/:id — update a budget
budgetRouter.put('/budgets/:id', validateBody(updateBudgetSchema), (req, res, next) => {
  try {
    const id = req.params.id as string;
    const updates = req.body as { amount?: number; period?: BudgetPeriod };

    const existing = db.select().from(budgets).where(eq(budgets.id, id)).get();
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Budget not found');
    }

    db.update(budgets)
      .set({
        ...(updates.amount !== undefined && { amount: updates.amount }),
        ...(updates.period !== undefined && { period: updates.period }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(budgets.id, id))
      .run();

    log.info('Budget updated', { id, ...updates });

    const updated = db
      .select({
        id: budgets.id,
        categoryId: budgets.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        amount: budgets.amount,
        period: budgets.period,
        createdAt: budgets.createdAt,
        updatedAt: budgets.updatedAt,
      })
      .from(budgets)
      .innerJoin(categories, eq(budgets.categoryId, categories.id))
      .where(eq(budgets.id, id))
      .get()!;

    res.json({
      ...updated,
      categoryName: updated.categoryName ?? '',
      categoryColor: updated.categoryColor ?? '#6b7280',
      period: updated.period as BudgetPeriod,
    });
  } catch (error) {
    log.error('Failed to update budget', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// DELETE /api/budgets/:id — delete a budget
budgetRouter.delete('/budgets/:id', (req, res, next) => {
  try {
    const id = req.params.id as string;

    const existing = db.select().from(budgets).where(eq(budgets.id, id)).get();
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Budget not found');
    }

    db.delete(budgets).where(eq(budgets.id, id)).run();
    log.info('Budget deleted', { id });

    res.status(204).end();
  } catch (error) {
    log.error('Failed to delete budget', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});
