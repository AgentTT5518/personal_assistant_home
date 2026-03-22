import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db, schema } from '../../lib/db/index.js';
import { validateBody, validateQuery } from '../../shared/middleware/validate.js';
import { AppError } from '../../shared/middleware/error-handler.js';
import { createGoalSchema, updateGoalSchema, contributeSchema, goalStatusSchema } from '../../../shared/types/validation.js';
import type { GoalStatus, GoalResponse, GoalContributionResponse } from '../../../shared/types/index.js';
import { log } from './logger.js';
import { z } from 'zod';

export const goalRouter = Router();

// --- Helpers ---

function toGoalResponse(row: {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number | null;
  deadline: string | null;
  accountId: string | null;
  accountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}, contributions?: GoalContributionResponse[]): GoalResponse {
  return {
    id: row.id,
    name: row.name,
    targetAmount: row.targetAmount,
    currentAmount: row.currentAmount ?? 0,
    deadline: row.deadline,
    accountId: row.accountId,
    accountName: row.accountName ?? null,
    categoryId: row.categoryId,
    categoryName: row.categoryName ?? null,
    categoryColor: row.categoryColor ?? null,
    status: row.status as GoalStatus,
    ...(contributions ? { contributions } : {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function selectGoalWithJoins() {
  return db
    .select({
      id: schema.goals.id,
      name: schema.goals.name,
      targetAmount: schema.goals.targetAmount,
      currentAmount: schema.goals.currentAmount,
      deadline: schema.goals.deadline,
      accountId: schema.goals.accountId,
      accountName: schema.accounts.name,
      categoryId: schema.goals.categoryId,
      categoryName: schema.categories.name,
      categoryColor: schema.categories.color,
      status: schema.goals.status,
      createdAt: schema.goals.createdAt,
      updatedAt: schema.goals.updatedAt,
    })
    .from(schema.goals)
    .leftJoin(schema.accounts, eq(schema.goals.accountId, schema.accounts.id))
    .leftJoin(schema.categories, eq(schema.goals.categoryId, schema.categories.id));
}

// --- Routes ---

const goalListQuerySchema = z.object({
  status: goalStatusSchema.optional(),
});

// GET /api/goals — list goals
goalRouter.get('/goals', validateQuery(goalListQuerySchema), (req, res, next) => {
  try {
    log.info('Listing goals');
    const query = (req as unknown as Record<string, unknown>).validatedQuery as {
      status?: GoalStatus;
    };

    const baseQuery = selectGoalWithJoins();
    const rows = query.status
      ? baseQuery.where(eq(schema.goals.status, query.status)).all()
      : baseQuery.all();

    res.json(rows.map((r) => toGoalResponse(r)));
  } catch (error) {
    log.error('Failed to list goals', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// GET /api/goals/:id — get single goal with contributions
goalRouter.get('/goals/:id', (req, res, next) => {
  try {
    const id = req.params.id as string;
    log.info('Fetching goal', { id });

    const row = selectGoalWithJoins().where(eq(schema.goals.id, id)).get();
    if (!row) {
      throw new AppError(404, 'NOT_FOUND', 'Goal not found');
    }

    const contributions = db
      .select()
      .from(schema.goalContributions)
      .where(eq(schema.goalContributions.goalId, id))
      .all()
      .map((c) => ({
        id: c.id,
        goalId: c.goalId,
        amount: c.amount,
        note: c.note,
        date: c.date,
        createdAt: c.createdAt,
      }));

    res.json(toGoalResponse(row, contributions));
  } catch (error) {
    log.error('Failed to fetch goal', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// POST /api/goals — create goal
goalRouter.post('/goals', validateBody(createGoalSchema), (req, res, next) => {
  try {
    const body = req.body as {
      name: string;
      targetAmount: number;
      deadline?: string | null;
      accountId?: string | null;
      categoryId?: string | null;
    };

    if (body.accountId) {
      const account = db.select().from(schema.accounts).where(eq(schema.accounts.id, body.accountId)).get();
      if (!account) throw new AppError(404, 'NOT_FOUND', 'Account not found');
    }

    if (body.categoryId) {
      const category = db.select().from(schema.categories).where(eq(schema.categories.id, body.categoryId)).get();
      if (!category) throw new AppError(404, 'NOT_FOUND', 'Category not found');
    }

    const now = new Date().toISOString();
    const id = uuidv4();

    db.insert(schema.goals)
      .values({
        id,
        name: body.name,
        targetAmount: body.targetAmount,
        currentAmount: 0,
        deadline: body.deadline ?? null,
        accountId: body.accountId ?? null,
        categoryId: body.categoryId ?? null,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })
      .run();

    log.info('Goal created', { id, name: body.name });

    const created = selectGoalWithJoins().where(eq(schema.goals.id, id)).get()!;
    res.status(201).json(toGoalResponse(created));
  } catch (error) {
    log.error('Failed to create goal', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// PUT /api/goals/:id — update goal
goalRouter.put('/goals/:id', validateBody(updateGoalSchema), (req, res, next) => {
  try {
    const id = req.params.id as string;
    const updates = req.body as Partial<{
      name: string;
      targetAmount: number;
      currentAmount: number;
      deadline: string | null;
      accountId: string | null;
      categoryId: string | null;
      status: GoalStatus;
    }>;

    const existing = db.select().from(schema.goals).where(eq(schema.goals.id, id)).get();
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Goal not found');
    }

    if (updates.accountId) {
      const account = db.select().from(schema.accounts).where(eq(schema.accounts.id, updates.accountId)).get();
      if (!account) throw new AppError(404, 'NOT_FOUND', 'Account not found');
    }

    if (updates.categoryId) {
      const category = db.select().from(schema.categories).where(eq(schema.categories.id, updates.categoryId)).get();
      if (!category) throw new AppError(404, 'NOT_FOUND', 'Category not found');
    }

    const setValues: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (updates.name !== undefined) setValues.name = updates.name;
    if (updates.targetAmount !== undefined) setValues.targetAmount = updates.targetAmount;
    if (updates.currentAmount !== undefined) setValues.currentAmount = updates.currentAmount;
    if (updates.deadline !== undefined) setValues.deadline = updates.deadline;
    if (updates.accountId !== undefined) setValues.accountId = updates.accountId;
    if (updates.categoryId !== undefined) setValues.categoryId = updates.categoryId;
    if (updates.status !== undefined) setValues.status = updates.status;

    db.update(schema.goals).set(setValues).where(eq(schema.goals.id, id)).run();
    log.info('Goal updated', { id });

    const updated = selectGoalWithJoins().where(eq(schema.goals.id, id)).get()!;
    res.json(toGoalResponse(updated));
  } catch (error) {
    log.error('Failed to update goal', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// DELETE /api/goals/:id — delete goal (cascades contributions)
goalRouter.delete('/goals/:id', (req, res, next) => {
  try {
    const id = req.params.id as string;

    const existing = db.select().from(schema.goals).where(eq(schema.goals.id, id)).get();
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Goal not found');
    }

    db.delete(schema.goals).where(eq(schema.goals.id, id)).run();
    log.info('Goal deleted', { id });

    res.status(204).end();
  } catch (error) {
    log.error('Failed to delete goal', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// POST /api/goals/:id/contribute — add contribution
goalRouter.post('/goals/:id/contribute', validateBody(contributeSchema), (req, res, next) => {
  try {
    const goalId = req.params.id as string;
    const body = req.body as {
      amount: number;
      note?: string | null;
      date?: string;
    };

    log.info('Adding contribution to goal', { goalId, amount: body.amount });

    const goal = db.select().from(schema.goals).where(eq(schema.goals.id, goalId)).get();
    if (!goal) {
      throw new AppError(404, 'NOT_FOUND', 'Goal not found');
    }

    const now = new Date().toISOString();
    const contributionDate = body.date ?? now.split('T')[0];
    const contributionId = uuidv4();

    db.insert(schema.goalContributions)
      .values({
        id: contributionId,
        goalId,
        amount: body.amount,
        note: body.note ?? null,
        date: contributionDate,
        createdAt: now,
      })
      .run();

    const newAmount = (goal.currentAmount ?? 0) + body.amount;
    db.update(schema.goals)
      .set({ currentAmount: newAmount, updatedAt: now })
      .where(eq(schema.goals.id, goalId))
      .run();

    log.info('Contribution added', { goalId, contributionId, newAmount });

    const updated = selectGoalWithJoins().where(eq(schema.goals.id, goalId)).get()!;
    const contributions = db
      .select()
      .from(schema.goalContributions)
      .where(eq(schema.goalContributions.goalId, goalId))
      .all()
      .map((c) => ({
        id: c.id,
        goalId: c.goalId,
        amount: c.amount,
        note: c.note,
        date: c.date,
        createdAt: c.createdAt,
      }));

    res.status(201).json(toGoalResponse(updated, contributions));
  } catch (error) {
    log.error('Failed to add contribution', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// POST /api/goals/:id/sync-balance — sync currentAmount from account balance
goalRouter.post('/goals/:id/sync-balance', (req, res, next) => {
  try {
    const goalId = req.params.id as string;
    log.info('Syncing goal balance from account', { goalId });

    const goal = db.select().from(schema.goals).where(eq(schema.goals.id, goalId)).get();
    if (!goal) {
      throw new AppError(404, 'NOT_FOUND', 'Goal not found');
    }

    if (!goal.accountId) {
      throw new AppError(400, 'NO_ACCOUNT', 'Goal has no linked account');
    }

    const account = db.select().from(schema.accounts).where(eq(schema.accounts.id, goal.accountId)).get();
    if (!account) {
      throw new AppError(404, 'NOT_FOUND', 'Linked account not found');
    }

    const accountBalance = account.currentBalance ?? 0;
    const goalCurrentAmount = goal.currentAmount ?? 0;
    const diff = accountBalance - goalCurrentAmount;

    // Insert a balancing contribution so SUM(contributions) always equals currentAmount
    const now = new Date().toISOString();
    const contributionId = uuidv4();

    db.insert(schema.goalContributions)
      .values({
        id: contributionId,
        goalId,
        amount: diff,
        note: 'Synced from account',
        date: now.split('T')[0],
        createdAt: now,
      })
      .run();

    db.update(schema.goals)
      .set({ currentAmount: accountBalance, updatedAt: now })
      .where(eq(schema.goals.id, goalId))
      .run();

    // Check if account is linked to multiple goals
    const goalsWithAccount = db
      .select({ id: schema.goals.id })
      .from(schema.goals)
      .where(and(eq(schema.goals.accountId, goal.accountId), eq(schema.goals.status, 'active')))
      .all();

    const warning = goalsWithAccount.length > 1
      ? `This account is linked to ${goalsWithAccount.length} goals — balance may not represent this goal alone`
      : undefined;

    log.info('Goal balance synced', { goalId, accountBalance, diff, warning });

    const updated = selectGoalWithJoins().where(eq(schema.goals.id, goalId)).get()!;
    const contributions = db
      .select()
      .from(schema.goalContributions)
      .where(eq(schema.goalContributions.goalId, goalId))
      .all()
      .map((c) => ({
        id: c.id,
        goalId: c.goalId,
        amount: c.amount,
        note: c.note,
        date: c.date,
        createdAt: c.createdAt,
      }));

    res.json({ ...toGoalResponse(updated, contributions), ...(warning ? { warning } : {}) });
  } catch (error) {
    log.error('Failed to sync goal balance', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});
