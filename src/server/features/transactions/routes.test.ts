import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { app } from '../../app.js';
import { db, schema, sqlite } from '../../lib/db/index.js';

// Mock AI router for ai-categorise tests
vi.mock('../../lib/ai/router.js', () => ({
  routeToProvider: vi.fn().mockResolvedValue('{"categorisations":[]}'),
}));

function seedCategory(name: string, overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  const cat = { id: uuidv4(), name, color: '#ff0000', icon: 'star', isDefault: false, createdAt: now, updatedAt: now, ...overrides };
  db.insert(schema.categories).values(cat).run();
  return cat;
}

function seedDocument(filename = 'test.pdf') {
  const now = new Date().toISOString();
  const doc = { id: uuidv4(), filename, docType: 'bank_statement', processingStatus: 'completed', createdAt: now, updatedAt: now };
  db.insert(schema.documents).values(doc).run();
  return doc;
}

function seedTransaction(documentId: string, overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  const txn = {
    id: uuidv4(),
    documentId,
    date: '2026-01-15',
    description: 'Test purchase',
    amount: 50.0,
    type: 'debit',
    categoryId: null,
    merchant: 'Test Shop',
    isRecurring: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  db.insert(schema.transactions).values(txn).run();
  return txn;
}

describe('Transaction Routes', () => {
  beforeEach(() => {
    sqlite.exec('DELETE FROM reports');
    sqlite.exec('DELETE FROM goal_contributions');
    sqlite.exec('DELETE FROM goals');
    sqlite.exec('DELETE FROM split_transactions');
    sqlite.exec('DELETE FROM transaction_tags');
    sqlite.exec('DELETE FROM tags');
    sqlite.exec('DELETE FROM budgets');
    sqlite.exec('DELETE FROM bills');
    sqlite.exec('DELETE FROM category_rules');
    sqlite.exec('DELETE FROM transactions');
    sqlite.exec('DELETE FROM import_sessions');
    sqlite.exec('DELETE FROM account_summaries');
    sqlite.exec('DELETE FROM documents');
    sqlite.exec('DELETE FROM accounts');
    sqlite.exec('DELETE FROM categories');
  });

  describe('GET /api/transactions', () => {
    it('returns paginated transactions', async () => {
      const doc = seedDocument();
      seedTransaction(doc.id);
      seedTransaction(doc.id);

      const res = await request(app).get('/api/transactions');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(2);
      expect(res.body.page).toBe(1);
      expect(res.body.totalPages).toBe(1);
    });

    it('filters by search term', async () => {
      const doc = seedDocument();
      seedTransaction(doc.id, { description: 'WOOLWORTHS SYDNEY' });
      seedTransaction(doc.id, { description: 'UBER TRIP' });

      const res = await request(app).get('/api/transactions?search=woolworths');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].description).toBe('WOOLWORTHS SYDNEY');
    });

    it('filters uncategorised transactions', async () => {
      const cat = seedCategory('Test');
      const doc = seedDocument();
      seedTransaction(doc.id, { categoryId: cat.id });
      seedTransaction(doc.id, { categoryId: null });

      const res = await request(app).get('/api/transactions?categoryId=uncategorised');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].categoryId).toBeNull();
    });

    it('filters by type', async () => {
      const doc = seedDocument();
      seedTransaction(doc.id, { type: 'debit' });
      seedTransaction(doc.id, { type: 'credit' });

      const res = await request(app).get('/api/transactions?type=credit');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].type).toBe('credit');
    });

    it('sorts by amount ascending', async () => {
      const doc = seedDocument();
      seedTransaction(doc.id, { amount: 100 });
      seedTransaction(doc.id, { amount: 25 });
      seedTransaction(doc.id, { amount: 75 });

      const res = await request(app).get('/api/transactions?sortBy=amount&sortOrder=asc');
      expect(res.status).toBe(200);
      expect(res.body.data[0].amount).toBe(25);
      expect(res.body.data[2].amount).toBe(100);
    });

    it('paginates correctly', async () => {
      const doc = seedDocument();
      for (let i = 0; i < 5; i++) {
        seedTransaction(doc.id, { description: `Txn ${i}` });
      }

      const res = await request(app).get('/api/transactions?page=2&pageSize=2');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(5);
      expect(res.body.totalPages).toBe(3);
    });

    it('includes category and document info via joins', async () => {
      const cat = seedCategory('Groceries');
      const doc = seedDocument('statement.pdf');
      seedTransaction(doc.id, { categoryId: cat.id });

      const res = await request(app).get('/api/transactions');
      expect(res.status).toBe(200);
      expect(res.body.data[0].categoryName).toBe('Groceries');
      expect(res.body.data[0].categoryColor).toBe('#ff0000');
      expect(res.body.data[0].documentFilename).toBe('statement.pdf');
    });
  });

  describe('GET /api/transactions/stats', () => {
    it('returns correct aggregation', async () => {
      const cat = seedCategory('Food');
      const doc = seedDocument();
      seedTransaction(doc.id, { type: 'credit', amount: 5000, categoryId: cat.id });
      seedTransaction(doc.id, { type: 'debit', amount: 200, categoryId: cat.id });
      seedTransaction(doc.id, { type: 'debit', amount: 100 });

      const res = await request(app).get('/api/transactions/stats');
      expect(res.status).toBe(200);
      expect(res.body.totalIncome).toBe(5000);
      expect(res.body.totalExpenses).toBe(300);
      expect(res.body.netAmount).toBe(4700);
      expect(res.body.transactionCount).toBe(3);
      expect(res.body.uncategorisedCount).toBe(1);
      expect(res.body.byCategory).toHaveLength(1);
      expect(res.body.byCategory[0].categoryName).toBe('Food');
    });
  });

  describe('PUT /api/transactions/:id', () => {
    it('updates transaction category', async () => {
      const cat = seedCategory('New Cat');
      const doc = seedDocument();
      const txn = seedTransaction(doc.id);

      const res = await request(app)
        .put(`/api/transactions/${txn.id}`)
        .send({ categoryId: cat.id });

      expect(res.status).toBe(200);
      expect(res.body.categoryId).toBe(cat.id);
      expect(res.body.categoryName).toBe('New Cat');
    });

    it('allows setting category to null', async () => {
      const cat = seedCategory('Cat');
      const doc = seedDocument();
      const txn = seedTransaction(doc.id, { categoryId: cat.id });

      const res = await request(app)
        .put(`/api/transactions/${txn.id}`)
        .send({ categoryId: null });

      expect(res.status).toBe(200);
      expect(res.body.categoryId).toBeNull();
    });
  });

  describe('POST /api/transactions/bulk-categorise', () => {
    it('updates multiple transactions', async () => {
      const cat = seedCategory('Bulk Cat');
      const doc = seedDocument();
      const txn1 = seedTransaction(doc.id);
      const txn2 = seedTransaction(doc.id);

      const res = await request(app)
        .post('/api/transactions/bulk-categorise')
        .send({ transactionIds: [txn1.id, txn2.id], categoryId: cat.id });

      expect(res.status).toBe(200);
      expect(res.body.updated).toBe(2);

      const updated1 = db.select().from(schema.transactions).where(eq(schema.transactions.id, txn1.id)).get();
      const updated2 = db.select().from(schema.transactions).where(eq(schema.transactions.id, txn2.id)).get();
      expect(updated1?.categoryId).toBe(cat.id);
      expect(updated2?.categoryId).toBe(cat.id);
    });
  });

  describe('POST /api/transactions/ai-categorise', () => {
    it('returns 202 and fires categorisation asynchronously', async () => {
      const doc = seedDocument();
      const txn = seedTransaction(doc.id);

      const res = await request(app)
        .post('/api/transactions/ai-categorise')
        .send({ transactionIds: [txn.id] });

      expect(res.status).toBe(202);
      expect(res.body.status).toBe('processing');
      expect(res.body.count).toBe(1);
    });

    it('rejects empty transactionIds array', async () => {
      const res = await request(app)
        .post('/api/transactions/ai-categorise')
        .send({ transactionIds: [] });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/transactions/export/csv', () => {
    it('returns CSV with headers when transactions exist', async () => {
      const cat = seedCategory('Food');
      const doc = seedDocument();
      seedTransaction(doc.id, { date: '2026-01-10', description: 'WOOLWORTHS', amount: 42.5, type: 'debit', merchant: 'Woolworths', categoryId: cat.id });

      const res = await request(app).get('/api/transactions/export/csv');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('transactions-');

      const lines = res.text.split('\n');
      expect(lines[0]).toBe('date,description,amount,type,merchant,category,is_recurring');
      expect(lines[1]).toContain('2026-01-10');
      expect(lines[1]).toContain('WOOLWORTHS');
      expect(lines[1]).toContain('Food');
    });

    it('returns only header when no transactions exist', async () => {
      const res = await request(app).get('/api/transactions/export/csv');
      expect(res.status).toBe(200);
      const lines = res.text.trim().split('\n');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toBe('date,description,amount,type,merchant,category,is_recurring');
    });

    it('filters by date range', async () => {
      const doc = seedDocument();
      seedTransaction(doc.id, { date: '2026-01-01', description: 'January' });
      seedTransaction(doc.id, { date: '2026-03-01', description: 'March' });

      const res = await request(app).get('/api/transactions/export/csv?from=2026-02-01&to=2026-04-01');
      expect(res.status).toBe(200);
      const lines = res.text.trim().split('\n');
      expect(lines).toHaveLength(2); // header + 1 transaction
      expect(lines[1]).toContain('March');
    });

    it('escapes CSV fields with commas', async () => {
      const doc = seedDocument();
      seedTransaction(doc.id, { description: 'Item, with comma' });

      const res = await request(app).get('/api/transactions/export/csv');
      expect(res.status).toBe(200);
      expect(res.text).toContain('"Item, with comma"');
    });
  });

  describe('POST /api/transactions/auto-categorise', () => {
    it('runs rule categorisation and returns stats', async () => {
      const cat = seedCategory('Transport');
      const now = new Date().toISOString();
      db.insert(schema.categoryRules).values({
        id: uuidv4(),
        categoryId: cat.id,
        pattern: 'uber',
        field: 'description',
        isAiGenerated: false,
        confidence: 1.0,
        createdAt: now,
        updatedAt: now,
      }).run();

      const doc = seedDocument();
      seedTransaction(doc.id, { description: 'UBER TRIP' });
      seedTransaction(doc.id, { description: 'Random purchase' });

      const res = await request(app).post('/api/transactions/auto-categorise');
      expect(res.status).toBe(200);
      expect(res.body.categorised).toBe(1);
      expect(res.body.total).toBe(2);
    });
  });
});
