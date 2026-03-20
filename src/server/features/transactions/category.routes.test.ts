import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../../app.js';
import { db, schema, sqlite } from '../../lib/db/index.js';
import { eq } from 'drizzle-orm';

function seedCategory(overrides: Partial<typeof schema.categories.$inferInsert> = {}) {
  const now = new Date().toISOString();
  const cat = {
    id: uuidv4(),
    name: `Test Category ${uuidv4().slice(0, 8)}`,
    parentId: null,
    color: '#ff0000',
    icon: 'star',
    isDefault: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  db.insert(schema.categories).values(cat).run();
  return cat;
}

function seedDocument() {
  const now = new Date().toISOString();
  const doc = {
    id: uuidv4(),
    filename: 'test.pdf',
    docType: 'bank_statement',
    processingStatus: 'completed',
    createdAt: now,
    updatedAt: now,
  };
  db.insert(schema.documents).values(doc).run();
  return doc;
}

function seedTransaction(documentId: string, categoryId: string | null = null) {
  const now = new Date().toISOString();
  const txn = {
    id: uuidv4(),
    documentId,
    date: '2026-01-15',
    description: 'Test transaction',
    amount: 50.0,
    type: 'debit',
    categoryId,
    merchant: null,
    isRecurring: false,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(schema.transactions).values(txn).run();
  return txn;
}

describe('Category Routes', () => {
  beforeEach(() => {
    sqlite.exec('DELETE FROM category_rules');
    sqlite.exec('DELETE FROM transactions');
    sqlite.exec('DELETE FROM account_summaries');
    sqlite.exec('DELETE FROM documents');
    sqlite.exec('DELETE FROM categories');
  });

  describe('GET /api/categories', () => {
    it('returns empty array when no categories exist', async () => {
      const res = await request(app).get('/api/categories');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns categories with transaction counts', async () => {
      const cat = seedCategory();
      const doc = seedDocument();
      seedTransaction(doc.id, cat.id);
      seedTransaction(doc.id, cat.id);

      const res = await request(app).get('/api/categories');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe(cat.name);
      expect(res.body[0].transactionCount).toBe(2);
    });
  });

  describe('POST /api/categories', () => {
    it('creates a category', async () => {
      const res = await request(app)
        .post('/api/categories')
        .send({ name: 'New Cat', color: '#abcdef', icon: 'star' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('New Cat');
      expect(res.body.color).toBe('#abcdef');
      expect(res.body.isDefault).toBe(false);
    });

    it('rejects duplicate name', async () => {
      seedCategory({ name: 'Unique' });
      const res = await request(app)
        .post('/api/categories')
        .send({ name: 'Unique', color: '#000000', icon: 'star' });

      expect(res.status).toBe(409);
    });

    it('validates input', async () => {
      const res = await request(app)
        .post('/api/categories')
        .send({ name: '', color: 'invalid', icon: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/categories/:id', () => {
    it('updates a category', async () => {
      const cat = seedCategory();
      const res = await request(app)
        .put(`/api/categories/${cat.id}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated');
    });

    it('returns 404 for non-existent category', async () => {
      const res = await request(app)
        .put(`/api/categories/${uuidv4()}`)
        .send({ name: 'Test' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('deletes category and uncategorises transactions', async () => {
      const cat = seedCategory();
      const doc = seedDocument();
      const txn = seedTransaction(doc.id, cat.id);

      // Add a rule
      db.insert(schema.categoryRules).values({
        id: uuidv4(),
        categoryId: cat.id,
        pattern: 'test',
        field: 'description',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).run();

      const res = await request(app).delete(`/api/categories/${cat.id}`);
      expect(res.status).toBe(204);

      // Transaction should be uncategorised
      const updated = db.select().from(schema.transactions).where(eq(schema.transactions.id, txn.id)).get();
      expect(updated?.categoryId).toBeNull();

      // Rules should be deleted
      const rules = db.select().from(schema.categoryRules).where(eq(schema.categoryRules.categoryId, cat.id)).all();
      expect(rules).toHaveLength(0);

      // Category should be deleted
      const deleted = db.select().from(schema.categories).where(eq(schema.categories.id, cat.id)).get();
      expect(deleted).toBeUndefined();
    });

    it('rejects deleting default category', async () => {
      const cat = seedCategory({ isDefault: true });
      const res = await request(app).delete(`/api/categories/${cat.id}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_DELETE_DEFAULT');
    });
  });

  describe('Category Rules', () => {
    it('creates a valid regex rule', async () => {
      const cat = seedCategory();
      const res = await request(app)
        .post('/api/categories/rules')
        .send({ categoryId: cat.id, pattern: 'grocery|woolworths', field: 'description' });

      expect(res.status).toBe(201);
      expect(res.body.pattern).toBe('grocery|woolworths');
      expect(res.body.categoryName).toBe(cat.name);
    });

    it('rejects invalid regex pattern', async () => {
      const cat = seedCategory();
      const res = await request(app)
        .post('/api/categories/rules')
        .send({ categoryId: cat.id, pattern: '[invalid(', field: 'description' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PATTERN');
    });

    it('lists rules for a category', async () => {
      const cat = seedCategory();
      const now = new Date().toISOString();
      db.insert(schema.categoryRules).values({
        id: uuidv4(),
        categoryId: cat.id,
        pattern: 'test.*pattern',
        field: 'description',
        isAiGenerated: false,
        confidence: 1.0,
        createdAt: now,
        updatedAt: now,
      }).run();

      const res = await request(app).get(`/api/categories/${cat.id}/rules`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].pattern).toBe('test.*pattern');
    });

    it('deletes a rule', async () => {
      const cat = seedCategory();
      const ruleId = uuidv4();
      const now = new Date().toISOString();
      db.insert(schema.categoryRules).values({
        id: ruleId,
        categoryId: cat.id,
        pattern: 'test',
        field: 'description',
        createdAt: now,
        updatedAt: now,
      }).run();

      const res = await request(app).delete(`/api/categories/rules/${ruleId}`);
      expect(res.status).toBe(204);

      const deleted = db.select().from(schema.categoryRules).where(eq(schema.categoryRules.id, ruleId)).get();
      expect(deleted).toBeUndefined();
    });
  });

  describe('POST /api/categories/re-seed', () => {
    it('rejects without confirm: true', async () => {
      const res = await request(app)
        .post('/api/categories/re-seed')
        .send({});
      expect(res.status).toBe(400);
    });

    it('drops all categories and re-seeds defaults', async () => {
      // Create some custom categories
      seedCategory({ name: 'Custom One' });
      seedCategory({ name: 'Custom Two' });

      const res = await request(app)
        .post('/api/categories/re-seed')
        .send({ confirm: true });

      expect(res.status).toBe(200);
      expect(res.body.categoriesSeeded).toBeGreaterThan(0);

      // Custom categories should be gone, defaults should exist
      const cats = db.select().from(schema.categories).all();
      const names = cats.map((c) => c.name);
      expect(names).not.toContain('Custom One');
      expect(names).toContain('Income');
      expect(names).toContain('Housing');
    });

    it('nullifies category_id on transactions before dropping categories', async () => {
      const cat = seedCategory({ name: 'ToDelete' });
      const doc = seedDocument();
      const txn = seedTransaction(doc.id, cat.id);

      await request(app)
        .post('/api/categories/re-seed')
        .send({ confirm: true });

      const updated = db.select().from(schema.transactions).where(eq(schema.transactions.id, txn.id)).get();
      expect(updated?.categoryId).toBeNull();
    });
  });
});
