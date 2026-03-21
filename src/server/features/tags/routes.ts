import { Router } from 'express';
import { eq, sql, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db, schema } from '../../lib/db/index.js';
import { validateBody } from '../../shared/middleware/validate.js';
import { AppError } from '../../shared/middleware/error-handler.js';
import {
  createTagSchema,
  updateTagSchema,
  addTagsSchema,
  bulkTagSchema,
  createSplitsSchema,
} from '../../../shared/types/validation.js';
import type { TagResponse, SplitTransactionResponse } from '../../../shared/types/index.js';
import { log } from './logger.js';

export const tagRouter = Router();

// --- Tag CRUD ---

// GET /api/tags — list tags with usage counts
tagRouter.get('/tags', (_req, res, next) => {
  try {
    log.info('Listing tags');
    const rows = db
      .select({
        id: schema.tags.id,
        name: schema.tags.name,
        color: schema.tags.color,
        createdAt: schema.tags.createdAt,
        updatedAt: schema.tags.updatedAt,
        usageCount: sql<number>`(SELECT COUNT(*) FROM transaction_tags WHERE tag_id = ${schema.tags.id})`,
      })
      .from(schema.tags)
      .orderBy(schema.tags.name)
      .all();

    const result: TagResponse[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color ?? '#6b7280',
      usageCount: r.usageCount,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    res.json(result);
  } catch (error) {
    log.error('Failed to list tags', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// POST /api/tags — create tag
tagRouter.post('/tags', validateBody(createTagSchema), (req, res, next) => {
  try {
    const { name, color } = req.body as { name: string; color: string };
    const now = new Date().toISOString();
    const id = uuidv4();

    db.insert(schema.tags).values({ id, name, color, createdAt: now, updatedAt: now }).run();
    log.info('Tag created', { id, name });

    const result: TagResponse = { id, name, color, usageCount: 0, createdAt: now, updatedAt: now };
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
      next(new AppError(409, 'DUPLICATE', 'A tag with this name already exists'));
      return;
    }
    log.error('Failed to create tag', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// PUT /api/tags/:id — update tag
tagRouter.put('/tags/:id', validateBody(updateTagSchema), (req, res, next) => {
  try {
    const id = req.params.id as string;
    const updates = req.body as { name?: string; color?: string };

    const existing = db.select().from(schema.tags).where(eq(schema.tags.id, id)).get();
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Tag not found');
    }

    const now = new Date().toISOString();
    db.update(schema.tags)
      .set({
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.color !== undefined && { color: updates.color }),
        updatedAt: now,
      })
      .where(eq(schema.tags.id, id))
      .run();

    log.info('Tag updated', { id, ...updates });

    const updated = db
      .select({
        id: schema.tags.id,
        name: schema.tags.name,
        color: schema.tags.color,
        createdAt: schema.tags.createdAt,
        updatedAt: schema.tags.updatedAt,
        usageCount: sql<number>`(SELECT COUNT(*) FROM transaction_tags WHERE tag_id = ${schema.tags.id})`,
      })
      .from(schema.tags)
      .where(eq(schema.tags.id, id))
      .get()!;

    const result: TagResponse = {
      id: updated.id,
      name: updated.name,
      color: updated.color ?? '#6b7280',
      usageCount: updated.usageCount,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
      next(new AppError(409, 'DUPLICATE', 'A tag with this name already exists'));
      return;
    }
    log.error('Failed to update tag', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// DELETE /api/tags/:id — delete tag (cascades junction rows)
tagRouter.delete('/tags/:id', (req, res, next) => {
  try {
    const id = req.params.id as string;

    const existing = db.select().from(schema.tags).where(eq(schema.tags.id, id)).get();
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Tag not found');
    }

    db.delete(schema.tags).where(eq(schema.tags.id, id)).run();
    log.info('Tag deleted', { id });
    res.status(204).end();
  } catch (error) {
    log.error('Failed to delete tag', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// --- Transaction-Tag Junction ---

// POST /api/transactions/:id/tags — add tags to transaction
tagRouter.post('/transactions/:id/tags', validateBody(addTagsSchema), (req, res, next) => {
  try {
    const transactionId = req.params.id as string;
    const { tagIds } = req.body as { tagIds: string[] };

    // Verify transaction exists
    const txn = db.select({ id: schema.transactions.id }).from(schema.transactions).where(eq(schema.transactions.id, transactionId)).get();
    if (!txn) {
      throw new AppError(404, 'NOT_FOUND', 'Transaction not found');
    }

    let added = 0;
    db.transaction((tx) => {
      for (const tagId of tagIds) {
        // Verify tag exists
        const tag = tx.select({ id: schema.tags.id }).from(schema.tags).where(eq(schema.tags.id, tagId)).get();
        if (!tag) continue;

        // Insert if not already linked (ignore duplicate)
        try {
          tx.insert(schema.transactionTags).values({ transactionId, tagId }).run();
          added++;
        } catch (err) {
          // Unique constraint violation — already linked, skip
          if (err instanceof Error && err.message.includes('UNIQUE constraint')) continue;
          throw err;
        }
      }
    });

    log.info('Tags added to transaction', { transactionId, tagIds, added });
    res.json({ added });
  } catch (error) {
    log.error('Failed to add tags', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// DELETE /api/transactions/:id/tags/:tagId — remove tag from transaction
tagRouter.delete('/transactions/:id/tags/:tagId', (req, res, next) => {
  try {
    const transactionId = req.params.id as string;
    const tagId = req.params.tagId as string;

    const result = db
      .delete(schema.transactionTags)
      .where(
        and(
          eq(schema.transactionTags.transactionId, transactionId),
          eq(schema.transactionTags.tagId, tagId),
        ),
      )
      .run();

    if (result.changes === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Tag not linked to this transaction');
    }

    log.info('Tag removed from transaction', { transactionId, tagId });
    res.status(204).end();
  } catch (error) {
    log.error('Failed to remove tag', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// POST /api/transactions/bulk-tag — bulk add tag to multiple transactions
tagRouter.post('/transactions/bulk-tag', validateBody(bulkTagSchema), (req, res, next) => {
  try {
    const { transactionIds, tagId } = req.body as { transactionIds: string[]; tagId: string };

    // Verify tag exists
    const tag = db.select({ id: schema.tags.id }).from(schema.tags).where(eq(schema.tags.id, tagId)).get();
    if (!tag) {
      throw new AppError(404, 'NOT_FOUND', 'Tag not found');
    }

    let added = 0;
    db.transaction((tx) => {
      for (const transactionId of transactionIds) {
        try {
          tx.insert(schema.transactionTags).values({ transactionId, tagId }).run();
          added++;
        } catch (err) {
          if (err instanceof Error && err.message.includes('UNIQUE constraint')) continue;
          throw err;
        }
      }
    });

    log.info('Bulk tag complete', { tagId, count: added });
    res.json({ added, tagId });
  } catch (error) {
    log.error('Failed to bulk tag', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// --- Split Transactions ---

// GET /api/transactions/:id/splits — get splits for a transaction
tagRouter.get('/transactions/:id/splits', (req, res, next) => {
  try {
    const parentTransactionId = req.params.id as string;

    const rows = db
      .select({
        id: schema.splitTransactions.id,
        parentTransactionId: schema.splitTransactions.parentTransactionId,
        categoryId: schema.splitTransactions.categoryId,
        amount: schema.splitTransactions.amount,
        description: schema.splitTransactions.description,
        createdAt: schema.splitTransactions.createdAt,
        updatedAt: schema.splitTransactions.updatedAt,
        categoryName: schema.categories.name,
        categoryColor: schema.categories.color,
      })
      .from(schema.splitTransactions)
      .leftJoin(schema.categories, eq(schema.splitTransactions.categoryId, schema.categories.id))
      .where(eq(schema.splitTransactions.parentTransactionId, parentTransactionId))
      .all();

    const result: SplitTransactionResponse[] = rows.map((r) => ({
      id: r.id,
      parentTransactionId: r.parentTransactionId,
      categoryId: r.categoryId,
      categoryName: r.categoryName ?? null,
      categoryColor: r.categoryColor ?? null,
      amount: r.amount,
      description: r.description,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    res.json(result);
  } catch (error) {
    log.error('Failed to get splits', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// POST /api/transactions/:id/splits — create/replace splits
tagRouter.post(
  '/transactions/:id/splits',
  validateBody(createSplitsSchema),
  (req, res, next) => {
    try {
      const parentTransactionId = req.params.id as string;
      const { splits } = req.body as { splits: Array<{ categoryId: string | null; amount: number; description: string }> };

      // Verify parent transaction exists
      const parent = db
        .select({
          id: schema.transactions.id,
          amount: schema.transactions.amount,
          categoryId: schema.transactions.categoryId,
          isSplit: schema.transactions.isSplit,
          previousCategoryId: schema.transactions.previousCategoryId,
        })
        .from(schema.transactions)
        .where(eq(schema.transactions.id, parentTransactionId))
        .get();

      if (!parent) {
        throw new AppError(404, 'NOT_FOUND', 'Transaction not found');
      }

      // Validate sum = parent amount (with tolerance for floating point)
      const splitSum = splits.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(splitSum - parent.amount) > 0.01) {
        throw new AppError(
          400,
          'SPLIT_SUM_MISMATCH',
          `Split amounts must sum to ${parent.amount}, got ${splitSum}`,
        );
      }

      const now = new Date().toISOString();

      db.transaction((tx) => {
        // Delete existing splits if any
        tx.delete(schema.splitTransactions)
          .where(eq(schema.splitTransactions.parentTransactionId, parentTransactionId))
          .run();

        // Save previousCategoryId and NULL categoryId on parent, set isSplit=1
        const previousCategoryId = parent.isSplit ? parent.previousCategoryId : parent.categoryId;
        tx.update(schema.transactions)
          .set({
            categoryId: null,
            previousCategoryId,
            isSplit: true,
            updatedAt: now,
          })
          .where(eq(schema.transactions.id, parentTransactionId))
          .run();

        // Insert new splits
        for (const split of splits) {
          tx.insert(schema.splitTransactions)
            .values({
              id: uuidv4(),
              parentTransactionId,
              categoryId: split.categoryId,
              amount: split.amount,
              description: split.description,
              createdAt: now,
              updatedAt: now,
            })
            .run();
        }
      });

      log.info('Splits created', { parentTransactionId, splitCount: splits.length });

      // Return the created splits
      const created = db
        .select({
          id: schema.splitTransactions.id,
          parentTransactionId: schema.splitTransactions.parentTransactionId,
          categoryId: schema.splitTransactions.categoryId,
          amount: schema.splitTransactions.amount,
          description: schema.splitTransactions.description,
          createdAt: schema.splitTransactions.createdAt,
          updatedAt: schema.splitTransactions.updatedAt,
          categoryName: schema.categories.name,
          categoryColor: schema.categories.color,
        })
        .from(schema.splitTransactions)
        .leftJoin(schema.categories, eq(schema.splitTransactions.categoryId, schema.categories.id))
        .where(eq(schema.splitTransactions.parentTransactionId, parentTransactionId))
        .all();

      const result: SplitTransactionResponse[] = created.map((r) => ({
        id: r.id,
        parentTransactionId: r.parentTransactionId,
        categoryId: r.categoryId,
        categoryName: r.categoryName ?? null,
        categoryColor: r.categoryColor ?? null,
        amount: r.amount,
        description: r.description,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));

      res.status(201).json(result);
    } catch (error) {
      log.error('Failed to create splits', error instanceof Error ? error : new Error(String(error)));
      next(error);
    }
  },
);

// DELETE /api/transactions/:id/splits — remove all splits, restore categoryId
tagRouter.delete('/transactions/:id/splits', (req, res, next) => {
  try {
    const parentTransactionId = req.params.id as string;

    const parent = db
      .select({
        id: schema.transactions.id,
        isSplit: schema.transactions.isSplit,
        previousCategoryId: schema.transactions.previousCategoryId,
      })
      .from(schema.transactions)
      .where(eq(schema.transactions.id, parentTransactionId))
      .get();

    if (!parent) {
      throw new AppError(404, 'NOT_FOUND', 'Transaction not found');
    }

    if (!parent.isSplit) {
      throw new AppError(400, 'NOT_SPLIT', 'Transaction is not split');
    }

    const now = new Date().toISOString();

    db.transaction((tx) => {
      // Delete splits
      tx.delete(schema.splitTransactions)
        .where(eq(schema.splitTransactions.parentTransactionId, parentTransactionId))
        .run();

      // Restore categoryId from previousCategoryId
      tx.update(schema.transactions)
        .set({
          categoryId: parent.previousCategoryId,
          previousCategoryId: null,
          isSplit: false,
          updatedAt: now,
        })
        .where(eq(schema.transactions.id, parentTransactionId))
        .run();
    });

    log.info('Splits removed', { parentTransactionId });
    res.status(204).end();
  } catch (error) {
    log.error('Failed to remove splits', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});
