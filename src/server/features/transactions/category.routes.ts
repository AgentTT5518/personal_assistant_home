import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eq, count, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '../../lib/db/index.js';
import { validateBody } from '../../shared/middleware/validate.js';
import { AppError } from '../../shared/middleware/error-handler.js';
import {
  createCategorySchema,
  updateCategorySchema,
  createCategoryRuleSchema,
} from '../../../shared/types/validation.js';
import type { CategoryResponse, CategoryRuleResponse } from '../../../shared/types/index.js';
import { seedDefaultCategories } from '../../lib/db/seed-categories.js';
import { log } from './logger.js';

function paramStr(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export const categoryRouter = Router();

// GET /api/categories — list all categories with transaction counts
categoryRouter.get('/categories', (_req: Request, res: Response) => {
  const cats = db.select().from(schema.categories).all();

  // Transaction count per category
  const txnCounts = db
    .select({
      categoryId: schema.transactions.categoryId,
      count: count(),
    })
    .from(schema.transactions)
    .where(sql`${schema.transactions.categoryId} IS NOT NULL`)
    .groupBy(schema.transactions.categoryId)
    .all();

  const countMap = new Map(txnCounts.map((r) => [r.categoryId, r.count]));

  const response: (CategoryResponse & { transactionCount: number })[] = cats.map((c) => ({
    id: c.id,
    name: c.name,
    parentId: c.parentId,
    color: c.color ?? '#6b7280',
    icon: c.icon ?? 'help-circle',
    isDefault: c.isDefault ?? false,
    createdAt: c.createdAt,
    transactionCount: countMap.get(c.id) ?? 0,
  }));

  res.json(response);
});

// POST /api/categories — create category
categoryRouter.post(
  '/categories',
  validateBody(createCategorySchema),
  (req: Request, res: Response) => {
    const { name, parentId, color, icon } = req.body as {
      name: string;
      parentId?: string | null;
      color: string;
      icon: string;
    };

    // Validate parent exists if specified
    if (parentId) {
      const parent = db
        .select({ id: schema.categories.id })
        .from(schema.categories)
        .where(eq(schema.categories.id, parentId))
        .get();
      if (!parent) {
        throw new AppError(400, 'INVALID_PARENT', 'Parent category not found');
      }
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    try {
      db.insert(schema.categories)
        .values({
          id,
          name,
          parentId: parentId ?? null,
          color,
          icon,
          isDefault: false,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        throw new AppError(409, 'DUPLICATE_NAME', `Category '${name}' already exists`);
      }
      throw error;
    }

    log.info('Category created', { id, name });

    const response: CategoryResponse = {
      id,
      name,
      parentId: parentId ?? null,
      color,
      icon,
      isDefault: false,
      createdAt: now,
    };

    res.status(201).json(response);
  },
);

// PUT /api/categories/:id — update category
categoryRouter.put(
  '/categories/:id',
  validateBody(updateCategorySchema),
  (req: Request, res: Response) => {
    const id = paramStr(req.params.id);

    const existing = db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.id, id))
      .get();

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Category not found');
    }

    const updates = req.body as {
      name?: string;
      parentId?: string | null;
      color?: string;
      icon?: string;
    };

    // Validate parent if specified
    if (updates.parentId) {
      if (updates.parentId === id) {
        throw new AppError(400, 'INVALID_PARENT', 'Category cannot be its own parent');
      }
      const parent = db
        .select({ id: schema.categories.id })
        .from(schema.categories)
        .where(eq(schema.categories.id, updates.parentId))
        .get();
      if (!parent) {
        throw new AppError(400, 'INVALID_PARENT', 'Parent category not found');
      }
    }

    const now = new Date().toISOString();

    try {
      db.update(schema.categories)
        .set({
          ...(updates.name !== undefined && { name: updates.name }),
          ...(updates.parentId !== undefined && { parentId: updates.parentId }),
          ...(updates.color !== undefined && { color: updates.color }),
          ...(updates.icon !== undefined && { icon: updates.icon }),
          updatedAt: now,
        })
        .where(eq(schema.categories.id, id))
        .run();
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        throw new AppError(409, 'DUPLICATE_NAME', `Category '${updates.name}' already exists`);
      }
      throw error;
    }

    const updated = db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.id, id))
      .get()!;

    log.info('Category updated', { id, name: updated.name });

    const response: CategoryResponse = {
      id: updated.id,
      name: updated.name,
      parentId: updated.parentId,
      color: updated.color ?? '#6b7280',
      icon: updated.icon ?? 'help-circle',
      isDefault: updated.isDefault ?? false,
      createdAt: updated.createdAt,
    };

    res.json(response);
  },
);

// DELETE /api/categories/:id — delete category
categoryRouter.delete('/categories/:id', (req: Request, res: Response) => {
  const id = paramStr(req.params.id);

  const existing = db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.id, id))
    .get();

  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Category not found');
  }

  if (existing.isDefault) {
    throw new AppError(400, 'CANNOT_DELETE_DEFAULT', 'Cannot delete a default category');
  }

  db.transaction((tx) => {
    // Nullify categoryId on linked transactions
    tx.update(schema.transactions)
      .set({ categoryId: null, updatedAt: new Date().toISOString() })
      .where(eq(schema.transactions.categoryId, id))
      .run();

    // Delete all rules for this category
    tx.delete(schema.categoryRules)
      .where(eq(schema.categoryRules.categoryId, id))
      .run();

    // Delete the category
    tx.delete(schema.categories)
      .where(eq(schema.categories.id, id))
      .run();
  });

  log.info('Category deleted', { id, name: existing.name });

  res.status(204).end();
});

// GET /api/categories/:id/rules — list rules for category
categoryRouter.get('/categories/:id/rules', (req: Request, res: Response) => {
  const categoryId = paramStr(req.params.id);

  const category = db
    .select({ id: schema.categories.id, name: schema.categories.name })
    .from(schema.categories)
    .where(eq(schema.categories.id, categoryId))
    .get();

  if (!category) {
    throw new AppError(404, 'NOT_FOUND', 'Category not found');
  }

  const rules = db
    .select()
    .from(schema.categoryRules)
    .where(eq(schema.categoryRules.categoryId, categoryId))
    .all();

  const response: CategoryRuleResponse[] = rules.map((r) => ({
    id: r.id,
    categoryId: r.categoryId,
    categoryName: category.name,
    pattern: r.pattern,
    field: r.field,
    isAiGenerated: r.isAiGenerated ?? false,
    confidence: r.confidence ?? 1.0,
    createdAt: r.createdAt,
  }));

  res.json(response);
});

// POST /api/categories/rules — create rule
categoryRouter.post(
  '/categories/rules',
  validateBody(createCategoryRuleSchema),
  (req: Request, res: Response) => {
    const { categoryId, pattern, field } = req.body as {
      categoryId: string;
      pattern: string;
      field: string;
    };

    // Validate category exists
    const category = db
      .select({ id: schema.categories.id, name: schema.categories.name })
      .from(schema.categories)
      .where(eq(schema.categories.id, categoryId))
      .get();

    if (!category) {
      throw new AppError(400, 'INVALID_CATEGORY', 'Category not found');
    }

    // Validate pattern is a valid regex
    try {
      new RegExp(pattern, 'i');
    } catch {
      throw new AppError(400, 'INVALID_PATTERN', 'Pattern is not a valid regular expression');
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.insert(schema.categoryRules)
      .values({
        id,
        categoryId,
        pattern,
        field,
        isAiGenerated: false,
        confidence: 1.0,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    log.info('Category rule created', { id, categoryId, pattern, field });

    const response: CategoryRuleResponse = {
      id,
      categoryId,
      categoryName: category.name,
      pattern,
      field,
      isAiGenerated: false,
      confidence: 1.0,
      createdAt: now,
    };

    res.status(201).json(response);
  },
);

// DELETE /api/categories/rules/:id — delete rule
categoryRouter.delete('/categories/rules/:id', (req: Request, res: Response) => {
  const id = paramStr(req.params.id);

  const existing = db
    .select()
    .from(schema.categoryRules)
    .where(eq(schema.categoryRules.id, id))
    .get();

  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Category rule not found');
  }

  db.delete(schema.categoryRules)
    .where(eq(schema.categoryRules.id, id))
    .run();

  log.info('Category rule deleted', { id });

  res.status(204).end();
});

// POST /api/categories/re-seed — re-seed default categories
const confirmSchema = z.object({ confirm: z.literal(true) });

categoryRouter.post(
  '/categories/re-seed',
  validateBody(confirmSchema),
  (_req: Request, res: Response) => {
    log.info('Re-seeding default categories');

    db.transaction((tx) => {
      // Nullify category_id on all transactions (FK has no ON DELETE cascade)
      tx.update(schema.transactions)
        .set({ categoryId: null, updatedAt: new Date().toISOString() })
        .run();

      // Delete all rules then all categories
      tx.delete(schema.categoryRules).run();
      tx.delete(schema.categories).run();
    });

    // Re-seed defaults
    seedDefaultCategories();

    const seededCount = db.select({ count: count() }).from(schema.categories).get();

    log.info('Re-seed complete', { categoriesSeeded: seededCount?.count ?? 0 });

    res.json({ message: 'Default categories re-seeded', categoriesSeeded: seededCount?.count ?? 0 });
  },
);
