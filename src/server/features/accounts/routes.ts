import { Router, type Request, type Response } from 'express';
import { eq, sql, and, count as drizzleCount } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db, schema } from '../../lib/db/index.js';
import { validateBody, validateQuery } from '../../shared/middleware/validate.js';
import { AppError } from '../../shared/middleware/error-handler.js';
import {
  createAccountSchema,
  updateAccountSchema,
  assignAccountSchema,
  bulkAssignAccountSchema,
} from '../../../shared/types/validation.js';
import type { AccountResponse, NetWorthResponse, AccountType } from '../../../shared/types/index.js';
import { log } from './logger.js';
import { z } from 'zod';

function paramStr(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export const accountRouter = Router();

const accountListQuerySchema = z.object({
  isActive: z.coerce.boolean().optional(),
});

// GET /api/accounts — list accounts
accountRouter.get(
  '/accounts',
  validateQuery(accountListQuerySchema),
  (req: Request, res: Response) => {
    const query = (req as unknown as Record<string, unknown>).validatedQuery as { isActive?: boolean };

    const conditions: ReturnType<typeof eq>[] = [];
    if (query.isActive !== undefined) {
      conditions.push(eq(schema.accounts.isActive, query.isActive));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = db
      .select({
        id: schema.accounts.id,
        name: schema.accounts.name,
        type: schema.accounts.type,
        institution: schema.accounts.institution,
        currency: schema.accounts.currency,
        currentBalance: schema.accounts.currentBalance,
        isActive: schema.accounts.isActive,
        createdAt: schema.accounts.createdAt,
        updatedAt: schema.accounts.updatedAt,
        transactionCount: sql<number>`(SELECT COUNT(*) FROM transactions WHERE transactions.account_id = accounts.id)`,
      })
      .from(schema.accounts)
      .where(whereClause)
      .orderBy(sql`${schema.accounts.name} ASC`)
      .all();

    const data: AccountResponse[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type as AccountType,
      institution: r.institution,
      currency: r.currency ?? 'AUD',
      currentBalance: r.currentBalance ?? 0,
      isActive: r.isActive ?? true,
      transactionCount: r.transactionCount,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    log.info('Listed accounts', { count: data.length });
    res.json(data);
  },
);

// GET /api/accounts/net-worth — MUST be before /:id
accountRouter.get('/accounts/net-worth', (_req: Request, res: Response) => {
  const rows = db
    .select({
      id: schema.accounts.id,
      name: schema.accounts.name,
      type: schema.accounts.type,
      currentBalance: schema.accounts.currentBalance,
    })
    .from(schema.accounts)
    .where(eq(schema.accounts.isActive, true))
    .all();

  const accountsData = rows.map((r) => {
    const balance = r.currentBalance ?? 0;
    const effectiveBalance = r.type === 'credit_card' ? -balance : balance;
    return {
      id: r.id,
      name: r.name,
      type: r.type as AccountType,
      balance,
      effectiveBalance,
    };
  });

  const netWorth = accountsData.reduce((sum, a) => sum + a.effectiveBalance, 0);

  const response: NetWorthResponse = { netWorth, accounts: accountsData };
  log.info('Net worth calculated', { netWorth, accountCount: accountsData.length });
  res.json(response);
});

// GET /api/accounts/:id — single account with transaction count
accountRouter.get('/accounts/:id', (req: Request, res: Response) => {
  const id = paramStr(req.params.id);

  const row = db
    .select({
      id: schema.accounts.id,
      name: schema.accounts.name,
      type: schema.accounts.type,
      institution: schema.accounts.institution,
      currency: schema.accounts.currency,
      currentBalance: schema.accounts.currentBalance,
      isActive: schema.accounts.isActive,
      createdAt: schema.accounts.createdAt,
      updatedAt: schema.accounts.updatedAt,
    })
    .from(schema.accounts)
    .where(eq(schema.accounts.id, id))
    .get();

  if (!row) {
    throw new AppError(404, 'NOT_FOUND', 'Account not found');
  }

  const txCount = db
    .select({ count: drizzleCount() })
    .from(schema.transactions)
    .where(eq(schema.transactions.accountId, id))
    .get();

  const response: AccountResponse = {
    id: row.id,
    name: row.name,
    type: row.type as AccountType,
    institution: row.institution,
    currency: row.currency ?? 'AUD',
    currentBalance: row.currentBalance ?? 0,
    isActive: row.isActive ?? true,
    transactionCount: txCount?.count ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  res.json(response);
});

// POST /api/accounts — create account
accountRouter.post(
  '/accounts',
  validateBody(createAccountSchema),
  (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof createAccountSchema>;
    const now = new Date().toISOString();
    const id = uuidv4();

    db.insert(schema.accounts)
      .values({
        id,
        name: body.name,
        type: body.type,
        institution: body.institution ?? null,
        currency: body.currency ?? 'AUD',
        currentBalance: body.currentBalance ?? 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    log.info('Account created', { id, name: body.name, type: body.type });

    const created = db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.id, id))
      .get()!;

    const response: AccountResponse = {
      id: created.id,
      name: created.name,
      type: created.type as AccountType,
      institution: created.institution,
      currency: created.currency ?? 'AUD',
      currentBalance: created.currentBalance ?? 0,
      isActive: created.isActive ?? true,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };

    res.status(201).json(response);
  },
);

// PUT /api/accounts/:id — update account
accountRouter.put(
  '/accounts/:id',
  validateBody(updateAccountSchema),
  (req: Request, res: Response) => {
    const id = paramStr(req.params.id);
    const body = req.body as z.infer<typeof updateAccountSchema>;

    const existing = db
      .select({ id: schema.accounts.id })
      .from(schema.accounts)
      .where(eq(schema.accounts.id, id))
      .get();

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Account not found');
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.type !== undefined) updates.type = body.type;
    if (body.institution !== undefined) updates.institution = body.institution;
    if (body.currency !== undefined) updates.currency = body.currency;
    if (body.currentBalance !== undefined) updates.currentBalance = body.currentBalance;
    if (body.isActive !== undefined) updates.isActive = body.isActive;

    db.update(schema.accounts)
      .set(updates)
      .where(eq(schema.accounts.id, id))
      .run();

    log.info('Account updated', { id, fields: Object.keys(body) });

    const updated = db.select().from(schema.accounts).where(eq(schema.accounts.id, id)).get()!;
    const txCount = db
      .select({ count: drizzleCount() })
      .from(schema.transactions)
      .where(eq(schema.transactions.accountId, id))
      .get();

    const response: AccountResponse = {
      id: updated.id,
      name: updated.name,
      type: updated.type as AccountType,
      institution: updated.institution,
      currency: updated.currency ?? 'AUD',
      currentBalance: updated.currentBalance ?? 0,
      isActive: updated.isActive ?? true,
      transactionCount: txCount?.count ?? 0,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };

    res.json(response);
  },
);

// DELETE /api/accounts/:id — soft delete; ?hard=true for hard delete
accountRouter.delete('/accounts/:id', (req: Request, res: Response) => {
  const id = paramStr(req.params.id);
  const hard = req.query.hard === 'true';

  const existing = db
    .select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(eq(schema.accounts.id, id))
    .get();

  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Account not found');
  }

  if (hard) {
    // Check for linked transactions
    const txCount = db
      .select({ count: drizzleCount() })
      .from(schema.transactions)
      .where(eq(schema.transactions.accountId, id))
      .get();

    if ((txCount?.count ?? 0) > 0) {
      throw new AppError(
        409,
        'CONFLICT',
        `Cannot hard-delete account with ${txCount!.count} linked transactions. Remove transaction links first or use soft-delete.`,
      );
    }

    // Also check documents
    const docCount = db
      .select({ count: drizzleCount() })
      .from(schema.documents)
      .where(eq(schema.documents.accountId, id))
      .get();

    if ((docCount?.count ?? 0) > 0) {
      throw new AppError(
        409,
        'CONFLICT',
        `Cannot hard-delete account with ${docCount!.count} linked documents. Remove document links first or use soft-delete.`,
      );
    }

    db.delete(schema.accounts).where(eq(schema.accounts.id, id)).run();
    log.info('Account hard-deleted', { id });
  } else {
    // Soft delete
    db.update(schema.accounts)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(eq(schema.accounts.id, id))
      .run();
    log.info('Account soft-deleted', { id });
  }

  res.status(204).end();
});

// POST /api/accounts/:id/recalculate — recalculate balance from linked transactions
accountRouter.post('/accounts/:id/recalculate', (req: Request, res: Response) => {
  const id = paramStr(req.params.id);

  const account = db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.id, id))
    .get();

  if (!account) {
    throw new AppError(404, 'NOT_FOUND', 'Account not found');
  }

  // Check if account has linked transactions
  const txCount = db
    .select({ count: drizzleCount() })
    .from(schema.transactions)
    .where(eq(schema.transactions.accountId, id))
    .get();

  if ((txCount?.count ?? 0) === 0) {
    throw new AppError(400, 'NO_TRANSACTIONS', 'Account has no linked transactions to recalculate from');
  }

  // SUM of credits minus SUM of debits
  const result = db
    .select({
      balance: sql<number>`COALESCE(
        SUM(CASE WHEN ${schema.transactions.type} = 'credit' THEN ${schema.transactions.amount} ELSE 0 END) -
        SUM(CASE WHEN ${schema.transactions.type} = 'debit' THEN ${schema.transactions.amount} ELSE 0 END),
        0
      )`,
    })
    .from(schema.transactions)
    .where(eq(schema.transactions.accountId, id))
    .get();

  const newBalance = result?.balance ?? 0;

  db.update(schema.accounts)
    .set({ currentBalance: newBalance, updatedAt: new Date().toISOString() })
    .where(eq(schema.accounts.id, id))
    .run();

  log.info('Account balance recalculated', { id, newBalance });

  const updated = db.select().from(schema.accounts).where(eq(schema.accounts.id, id)).get()!;

  const response: AccountResponse = {
    id: updated.id,
    name: updated.name,
    type: updated.type as AccountType,
    institution: updated.institution,
    currency: updated.currency ?? 'AUD',
    currentBalance: updated.currentBalance ?? 0,
    isActive: updated.isActive ?? true,
    transactionCount: txCount?.count ?? 0,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };

  res.json(response);
});

// PUT /api/transactions/:id/account — assign transaction to account
accountRouter.put(
  '/transactions/:id/account',
  validateBody(assignAccountSchema),
  (req: Request, res: Response) => {
    const id = paramStr(req.params.id);
    const { accountId } = req.body as { accountId: string | null };

    const existing = db
      .select({ id: schema.transactions.id })
      .from(schema.transactions)
      .where(eq(schema.transactions.id, id))
      .get();

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Transaction not found');
    }

    // Validate account exists if not null
    if (accountId) {
      const account = db
        .select({ id: schema.accounts.id })
        .from(schema.accounts)
        .where(eq(schema.accounts.id, accountId))
        .get();
      if (!account) {
        throw new AppError(400, 'INVALID_ACCOUNT', 'Account not found');
      }
    }

    db.update(schema.transactions)
      .set({ accountId, updatedAt: new Date().toISOString() })
      .where(eq(schema.transactions.id, id))
      .run();

    log.info('Transaction account assigned', { transactionId: id, accountId });

    res.json({ id, accountId });
  },
);

// POST /api/transactions/bulk-assign-account — bulk assign
accountRouter.post(
  '/transactions/bulk-assign-account',
  validateBody(bulkAssignAccountSchema),
  (req: Request, res: Response) => {
    const { transactionIds, accountId } = req.body as {
      transactionIds: string[];
      accountId: string | null;
    };

    // Validate account exists if not null
    if (accountId) {
      const account = db
        .select({ id: schema.accounts.id })
        .from(schema.accounts)
        .where(eq(schema.accounts.id, accountId))
        .get();
      if (!account) {
        throw new AppError(400, 'INVALID_ACCOUNT', 'Account not found');
      }
    }

    const now = new Date().toISOString();
    let updated = 0;

    db.transaction((tx) => {
      for (const txnId of transactionIds) {
        const result = tx
          .update(schema.transactions)
          .set({ accountId, updatedAt: now })
          .where(eq(schema.transactions.id, txnId))
          .run();
        if (result.changes > 0) updated++;
      }
    });

    log.info('Bulk account assign complete', { count: updated, accountId });

    res.json({ updated, accountId });
  },
);
