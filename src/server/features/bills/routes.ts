import { Router } from 'express';
import { eq, and, gte, lte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db, schema } from '../../lib/db/index.js';
import { validateBody, validateQuery } from '../../shared/middleware/validate.js';
import { AppError } from '../../shared/middleware/error-handler.js';
import { createBillSchema, updateBillSchema } from '../../../shared/types/validation.js';
import type { BillFrequency, BillResponse, BillCalendarEntry } from '../../../shared/types/index.js';
import { getRecurringSummary } from '../transactions/recurring-detection.service.js';
import { log } from './logger.js';
import { z } from 'zod';

export const billRouter = Router();

// --- Helpers ---

function toBillResponse(row: {
  id: string;
  name: string;
  accountId: string | null;
  accountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  expectedAmount: number;
  frequency: string;
  nextDueDate: string;
  isActive: boolean | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}): BillResponse {
  return {
    ...row,
    accountName: row.accountName ?? null,
    categoryName: row.categoryName ?? null,
    categoryColor: row.categoryColor ?? null,
    frequency: row.frequency as BillFrequency,
    isActive: row.isActive ?? true,
  };
}

function selectBillWithJoins() {
  return db
    .select({
      id: schema.bills.id,
      name: schema.bills.name,
      accountId: schema.bills.accountId,
      accountName: schema.accounts.name,
      categoryId: schema.bills.categoryId,
      categoryName: schema.categories.name,
      categoryColor: schema.categories.color,
      expectedAmount: schema.bills.expectedAmount,
      frequency: schema.bills.frequency,
      nextDueDate: schema.bills.nextDueDate,
      isActive: schema.bills.isActive,
      notes: schema.bills.notes,
      createdAt: schema.bills.createdAt,
      updatedAt: schema.bills.updatedAt,
    })
    .from(schema.bills)
    .leftJoin(schema.accounts, eq(schema.bills.accountId, schema.accounts.id))
    .leftJoin(schema.categories, eq(schema.bills.categoryId, schema.categories.id));
}

function advanceDueDate(current: string, frequency: BillFrequency): string {
  const date = new Date(current + 'T00:00:00Z');
  const day = date.getUTCDate();

  switch (frequency) {
    case 'weekly':
      date.setUTCDate(day + 7);
      break;
    case 'biweekly':
      date.setUTCDate(day + 14);
      break;
    case 'monthly': {
      const month = date.getUTCMonth() + 1;
      const year = date.getUTCFullYear() + (month > 11 ? 1 : 0);
      const newMonth = month > 11 ? 0 : month;
      const lastDay = new Date(Date.UTC(year, newMonth + 1, 0)).getUTCDate();
      date.setUTCFullYear(year, newMonth, Math.min(day, lastDay));
      break;
    }
    case 'quarterly': {
      const qMonth = date.getUTCMonth() + 3;
      const qYear = date.getUTCFullYear() + Math.floor(qMonth / 12);
      const qNewMonth = qMonth % 12;
      const qLastDay = new Date(Date.UTC(qYear, qNewMonth + 1, 0)).getUTCDate();
      date.setUTCFullYear(qYear, qNewMonth, Math.min(day, qLastDay));
      break;
    }
    case 'yearly': {
      const yYear = date.getUTCFullYear() + 1;
      const yLastDay = new Date(Date.UTC(yYear, date.getUTCMonth() + 1, 0)).getUTCDate();
      date.setUTCFullYear(yYear, date.getUTCMonth(), Math.min(day, yLastDay));
      break;
    }
  }

  return date.toISOString().split('T')[0];
}

// --- Routes ---

const billListQuerySchema = z.object({
  isActive: z.coerce.boolean().optional(),
  upcoming: z.coerce.number().int().min(1).max(365).optional(),
});

// GET /api/bills — list bills
billRouter.get('/bills', validateQuery(billListQuerySchema), (req, res, next) => {
  try {
    log.info('Listing bills');
    const query = (req as unknown as Record<string, unknown>).validatedQuery as {
      isActive?: boolean;
      upcoming?: number;
    };

    const conditions: ReturnType<typeof eq>[] = [];
    if (query.isActive !== undefined) {
      conditions.push(eq(schema.bills.isActive, query.isActive));
    }
    if (query.upcoming !== undefined) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + query.upcoming);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      conditions.push(lte(schema.bills.nextDueDate, futureDateStr));
      // Include overdue bills too (nextDueDate <= futureDate covers both)
    }

    const baseQuery = selectBillWithJoins();
    const rows = conditions.length > 0
      ? baseQuery.where(and(...conditions)).all()
      : baseQuery.all();

    res.json(rows.map(toBillResponse));
  } catch (error) {
    log.error('Failed to list bills', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

const calendarQuerySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
});

// GET /api/bills/calendar — bills grouped by date (registered before /:id)
billRouter.get('/bills/calendar', validateQuery(calendarQuerySchema), (req, res, next) => {
  try {
    log.info('Fetching bills calendar');
    const query = (req as unknown as Record<string, unknown>).validatedQuery as {
      from: string;
      to: string;
    };

    const rows = selectBillWithJoins()
      .where(
        and(
          gte(schema.bills.nextDueDate, query.from),
          lte(schema.bills.nextDueDate, query.to),
          eq(schema.bills.isActive, true),
        ),
      )
      .all();

    // Group by date
    const byDate = new Map<string, BillResponse[]>();
    for (const row of rows) {
      const date = row.nextDueDate;
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date)!.push(toBillResponse(row));
    }

    const calendar: BillCalendarEntry[] = Array.from(byDate.entries())
      .map(([date, bills]) => ({ date, bills }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json(calendar);
  } catch (error) {
    log.error('Failed to fetch bills calendar', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// POST /api/bills/populate-from-recurring — auto-create bills from recurring detection (registered before /:id)
billRouter.post('/bills/populate-from-recurring', (_req, res, next) => {
  try {
    log.info('Populating bills from recurring transactions');
    const recurringGroups = getRecurringSummary();

    if (recurringGroups.length === 0) {
      res.status(201).json({ created: 0, skipped: 0, bills: [] });
      return;
    }

    // Get existing bills for duplicate check
    const existingBills = db.select({ name: schema.bills.name, expectedAmount: schema.bills.expectedAmount })
      .from(schema.bills)
      .all();

    const now = new Date().toISOString();
    const created: BillResponse[] = [];
    let skipped = 0;

    for (const group of recurringGroups) {
      // Check for duplicate: same name (case-insensitive) and amount within 10% tolerance
      const nameNorm = group.merchant.toLowerCase().trim();
      const isDuplicate = existingBills.some((b) => {
        const existNameNorm = b.name.toLowerCase().trim();
        if (existNameNorm !== nameNorm) return false;
        const tolerance = b.expectedAmount * 0.1;
        return Math.abs(b.expectedAmount - group.averageAmount) <= tolerance;
      });

      if (isDuplicate) {
        skipped++;
        continue;
      }

      // Determine accountId: check if all transactions in group share same account
      const allRecurringTxs = db
        .select({
          merchant: schema.transactions.merchant,
          description: schema.transactions.description,
          accountId: schema.transactions.accountId,
        })
        .from(schema.transactions)
        .where(eq(schema.transactions.isRecurring, true))
        .all();

      const groupTxs = allRecurringTxs.filter((tx) => {
        const key = (tx.merchant || tx.description).toLowerCase().trim();
        return key === nameNorm;
      });

      let accountId: string | null = null;
      const accountIds = [...new Set(groupTxs.map((t) => t.accountId).filter(Boolean))];
      if (accountIds.length === 1) {
        accountId = accountIds[0] as string;
      }

      const id = uuidv4();
      db.insert(schema.bills)
        .values({
          id,
          name: group.merchant,
          accountId,
          categoryId: group.categoryId,
          expectedAmount: group.averageAmount,
          frequency: group.frequency,
          nextDueDate: group.nextExpectedDate,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      // Fetch the created bill with joins
      const bill = selectBillWithJoins().where(eq(schema.bills.id, id)).get();
      if (bill) created.push(toBillResponse(bill));
    }

    log.info('Populated bills from recurring', { created: created.length, skipped });
    res.status(201).json({ created: created.length, skipped, bills: created });
  } catch (error) {
    log.error('Failed to populate bills from recurring', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// GET /api/bills/:id — get single bill
billRouter.get('/bills/:id', (req, res, next) => {
  try {
    const id = req.params.id as string;
    log.info('Fetching bill', { id });

    const row = selectBillWithJoins().where(eq(schema.bills.id, id)).get();
    if (!row) {
      throw new AppError(404, 'NOT_FOUND', 'Bill not found');
    }

    res.json(toBillResponse(row));
  } catch (error) {
    log.error('Failed to fetch bill', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// POST /api/bills — create bill
billRouter.post('/bills', validateBody(createBillSchema), (req, res, next) => {
  try {
    const body = req.body as {
      name: string;
      accountId?: string | null;
      categoryId?: string | null;
      expectedAmount: number;
      frequency: BillFrequency;
      nextDueDate: string;
      notes?: string | null;
    };

    // Validate account exists if provided
    if (body.accountId) {
      const account = db.select().from(schema.accounts).where(eq(schema.accounts.id, body.accountId)).get();
      if (!account) throw new AppError(404, 'NOT_FOUND', 'Account not found');
    }

    // Validate category exists if provided
    if (body.categoryId) {
      const category = db.select().from(schema.categories).where(eq(schema.categories.id, body.categoryId)).get();
      if (!category) throw new AppError(404, 'NOT_FOUND', 'Category not found');
    }

    const now = new Date().toISOString();
    const id = uuidv4();

    db.insert(schema.bills)
      .values({
        id,
        name: body.name,
        accountId: body.accountId ?? null,
        categoryId: body.categoryId ?? null,
        expectedAmount: body.expectedAmount,
        frequency: body.frequency,
        nextDueDate: body.nextDueDate,
        notes: body.notes ?? null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    log.info('Bill created', { id, name: body.name });

    const created = selectBillWithJoins().where(eq(schema.bills.id, id)).get()!;
    res.status(201).json(toBillResponse(created));
  } catch (error) {
    log.error('Failed to create bill', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// PUT /api/bills/:id — update bill
billRouter.put('/bills/:id', validateBody(updateBillSchema), (req, res, next) => {
  try {
    const id = req.params.id as string;
    const updates = req.body as Partial<{
      name: string;
      accountId: string | null;
      categoryId: string | null;
      expectedAmount: number;
      frequency: BillFrequency;
      nextDueDate: string;
      isActive: boolean;
      notes: string | null;
    }>;

    const existing = db.select().from(schema.bills).where(eq(schema.bills.id, id)).get();
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Bill not found');
    }

    // Validate account if provided
    if (updates.accountId) {
      const account = db.select().from(schema.accounts).where(eq(schema.accounts.id, updates.accountId)).get();
      if (!account) throw new AppError(404, 'NOT_FOUND', 'Account not found');
    }

    // Validate category if provided
    if (updates.categoryId) {
      const category = db.select().from(schema.categories).where(eq(schema.categories.id, updates.categoryId)).get();
      if (!category) throw new AppError(404, 'NOT_FOUND', 'Category not found');
    }

    const setValues: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (updates.name !== undefined) setValues.name = updates.name;
    if (updates.accountId !== undefined) setValues.accountId = updates.accountId;
    if (updates.categoryId !== undefined) setValues.categoryId = updates.categoryId;
    if (updates.expectedAmount !== undefined) setValues.expectedAmount = updates.expectedAmount;
    if (updates.frequency !== undefined) setValues.frequency = updates.frequency;
    if (updates.nextDueDate !== undefined) setValues.nextDueDate = updates.nextDueDate;
    if (updates.isActive !== undefined) setValues.isActive = updates.isActive;
    if (updates.notes !== undefined) setValues.notes = updates.notes;

    db.update(schema.bills).set(setValues).where(eq(schema.bills.id, id)).run();
    log.info('Bill updated', { id });

    const updated = selectBillWithJoins().where(eq(schema.bills.id, id)).get()!;
    res.json(toBillResponse(updated));
  } catch (error) {
    log.error('Failed to update bill', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// DELETE /api/bills/:id — delete bill
billRouter.delete('/bills/:id', (req, res, next) => {
  try {
    const id = req.params.id as string;

    const existing = db.select().from(schema.bills).where(eq(schema.bills.id, id)).get();
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Bill not found');
    }

    db.delete(schema.bills).where(eq(schema.bills.id, id)).run();
    log.info('Bill deleted', { id });

    res.status(204).end();
  } catch (error) {
    log.error('Failed to delete bill', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// POST /api/bills/:id/mark-paid — advance nextDueDate to next occurrence
billRouter.post('/bills/:id/mark-paid', (req, res, next) => {
  try {
    const id = req.params.id as string;
    log.info('Marking bill as paid', { id });

    const existing = db.select().from(schema.bills).where(eq(schema.bills.id, id)).get();
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Bill not found');
    }

    const newDueDate = advanceDueDate(existing.nextDueDate, existing.frequency as BillFrequency);

    db.update(schema.bills)
      .set({ nextDueDate: newDueDate, updatedAt: new Date().toISOString() })
      .where(eq(schema.bills.id, id))
      .run();

    log.info('Bill marked paid — due date advanced', { id, from: existing.nextDueDate, to: newDueDate });

    const updated = selectBillWithJoins().where(eq(schema.bills.id, id)).get()!;
    res.json(toBillResponse(updated));
  } catch (error) {
    log.error('Failed to mark bill as paid', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});
