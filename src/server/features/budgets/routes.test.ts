import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../../app.js';
import { db, schema } from '../../lib/db/index.js';

function seedCategory(overrides: Partial<typeof schema.categories.$inferInsert> = {}) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.insert(schema.categories)
    .values({
      id,
      name: `Category ${id.slice(0, 6)}`,
      color: '#3b82f6',
      icon: 'tag',
      createdAt: now,
      updatedAt: now,
      ...overrides,
    })
    .run();
  return id;
}

function seedBudget(categoryId: string, amount = 500, period = 'monthly') {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.insert(schema.budgets)
    .values({ id, categoryId, amount, period, createdAt: now, updatedAt: now })
    .run();
  return id;
}

function seedDocument() {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.insert(schema.documents)
    .values({
      id,
      filename: 'test.pdf',
      docType: 'bank_statement',
      processingStatus: 'completed',
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return id;
}

function seedTransaction(documentId: string, categoryId: string, amount: number, date: string) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.insert(schema.transactions)
    .values({
      id,
      documentId,
      date,
      description: 'Test transaction',
      amount,
      type: 'debit',
      categoryId,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return id;
}

// Suppress server logs in tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Budget routes', () => {
  beforeEach(() => {
    db.delete(schema.budgets).run();
    db.delete(schema.transactions).run();
    db.delete(schema.accountSummaries).run();
    db.delete(schema.documents).run();
    db.delete(schema.categoryRules).run();
    db.delete(schema.budgets).run();
    db.delete(schema.categories).run();
  });

  describe('GET /api/budgets', () => {
    it('returns empty array when no budgets', async () => {
      const res = await request(app).get('/api/budgets');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns budgets with category info', async () => {
      const catId = seedCategory({ name: 'Groceries', color: '#22c55e' });
      seedBudget(catId, 300, 'monthly');

      const res = await request(app).get('/api/budgets');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].categoryName).toBe('Groceries');
      expect(res.body[0].categoryColor).toBe('#22c55e');
      expect(res.body[0].amount).toBe(300);
      expect(res.body[0].period).toBe('monthly');
    });
  });

  describe('GET /api/budgets/summary', () => {
    it('returns empty array when no budgets', async () => {
      const res = await request(app).get('/api/budgets/summary');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('calculates current period spend for monthly budget', async () => {
      const catId = seedCategory({ name: 'Food' });
      seedBudget(catId, 500, 'monthly');

      const docId = seedDocument();
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const currentDate = `${now.getFullYear()}-${month}-15`;
      seedTransaction(docId, catId, 100, currentDate);
      seedTransaction(docId, catId, 50, currentDate);

      const res = await request(app).get('/api/budgets/summary');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].budgetAmount).toBe(500);
      expect(res.body[0].spent).toBe(150);
      expect(res.body[0].remaining).toBe(350);
      expect(res.body[0].percentUsed).toBe(30);
    });
  });

  describe('POST /api/budgets', () => {
    it('creates a budget', async () => {
      const catId = seedCategory();

      const res = await request(app)
        .post('/api/budgets')
        .send({ categoryId: catId, amount: 200, period: 'monthly' });

      expect(res.status).toBe(201);
      expect(res.body.categoryId).toBe(catId);
      expect(res.body.amount).toBe(200);
      expect(res.body.period).toBe('monthly');
    });

    it('returns 404 for nonexistent category', async () => {
      const res = await request(app)
        .post('/api/budgets')
        .send({ categoryId: uuidv4(), amount: 200 });

      expect(res.status).toBe(404);
    });

    it('returns 409 for duplicate budget on same category', async () => {
      const catId = seedCategory();
      seedBudget(catId);

      const res = await request(app)
        .post('/api/budgets')
        .send({ categoryId: catId, amount: 100 });

      expect(res.status).toBe(409);
    });

    it('returns 400 for invalid amount', async () => {
      const catId = seedCategory();

      const res = await request(app)
        .post('/api/budgets')
        .send({ categoryId: catId, amount: -10 });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/budgets/:id', () => {
    it('updates budget amount', async () => {
      const catId = seedCategory();
      const budgetId = seedBudget(catId, 500);

      const res = await request(app)
        .put(`/api/budgets/${budgetId}`)
        .send({ amount: 750 });

      expect(res.status).toBe(200);
      expect(res.body.amount).toBe(750);
    });

    it('updates budget period', async () => {
      const catId = seedCategory();
      const budgetId = seedBudget(catId, 500, 'monthly');

      const res = await request(app)
        .put(`/api/budgets/${budgetId}`)
        .send({ period: 'weekly' });

      expect(res.status).toBe(200);
      expect(res.body.period).toBe('weekly');
    });

    it('returns 404 for nonexistent budget', async () => {
      const res = await request(app)
        .put(`/api/budgets/${uuidv4()}`)
        .send({ amount: 100 });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/budgets/:id', () => {
    it('deletes a budget', async () => {
      const catId = seedCategory();
      const budgetId = seedBudget(catId);

      const res = await request(app).delete(`/api/budgets/${budgetId}`);
      expect(res.status).toBe(204);

      const check = await request(app).get('/api/budgets');
      expect(check.body).toEqual([]);
    });

    it('returns 404 for nonexistent budget', async () => {
      const res = await request(app).delete(`/api/budgets/${uuidv4()}`);
      expect(res.status).toBe(404);
    });
  });
});
