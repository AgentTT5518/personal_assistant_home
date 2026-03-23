import { describe, it, expect, beforeEach } from 'vitest';
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

function seedAccount(overrides: Partial<typeof schema.accounts.$inferInsert> = {}) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.insert(schema.accounts)
    .values({
      id,
      name: `Account ${id.slice(0, 6)}`,
      type: 'checking',
      currentBalance: 5000,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    })
    .run();
  return id;
}

function seedDocument(filename = 'test.pdf') {
  const now = new Date().toISOString();
  const doc = { id: uuidv4(), filename, docType: 'bank_statement', processingStatus: 'completed', createdAt: now, updatedAt: now };
  db.insert(schema.documents).values(doc).run();
  return doc.id;
}

// Shared document ID for convenience — seeded once per test via beforeEach
let defaultDocId: string;

function seedTransaction(overrides: Partial<typeof schema.transactions.$inferInsert> = {}) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.insert(schema.transactions)
    .values({
      id,
      documentId: defaultDocId,
      date: '2026-03-15',
      description: `Transaction ${id.slice(0, 6)}`,
      amount: 100,
      type: 'debit',
      createdAt: now,
      updatedAt: now,
      ...overrides,
    })
    .run();
  return id;
}

function seedBudget(categoryId: string, amount = 500) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.insert(schema.budgets)
    .values({ id, categoryId, amount, period: 'monthly', createdAt: now, updatedAt: now })
    .run();
  return id;
}

beforeEach(() => {
  // Delete in FK-safe order
  db.delete(schema.reports).run();
  db.delete(schema.goalContributions).run();
  db.delete(schema.goals).run();
  db.delete(schema.splitTransactions).run();
  db.delete(schema.transactionTags).run();
  db.delete(schema.budgets).run();
  db.delete(schema.bills).run();
  db.delete(schema.categoryRules).run();
  db.delete(schema.transactions).run();
  db.delete(schema.accountSummaries).run();
  db.delete(schema.documents).run();
  db.delete(schema.accounts).run();
  db.delete(schema.categories).run();

  // Seed a default document for transactions
  defaultDocId = seedDocument();
});

describe('Reports CRUD', () => {
  it('GET /api/reports returns empty list', async () => {
    const res = await request(app).get('/api/reports');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST /api/reports/generate creates a report with correct aggregation', async () => {
    const catId = seedCategory({ name: 'Groceries' });
    seedTransaction({ date: '2026-03-01', amount: 50, type: 'debit', categoryId: catId, merchant: 'Coles' });
    seedTransaction({ date: '2026-03-10', amount: 75, type: 'debit', categoryId: catId, merchant: 'Woolworths' });
    seedTransaction({ date: '2026-03-05', amount: 2000, type: 'credit', merchant: 'Employer' });

    const res = await request(app)
      .post('/api/reports/generate')
      .send({ periodFrom: '2026-03-01', periodTo: '2026-03-31', reportType: 'monthly' });

    expect(res.status).toBe(201);
    expect(res.body.reportType).toBe('monthly');
    expect(res.body.data.summary.income).toBe(2000);
    expect(res.body.data.summary.expenses).toBe(125);
    expect(res.body.data.summary.net).toBe(1875);
    expect(res.body.data.summary.transactionCount).toBe(3);
    expect(res.body.data.categoryBreakdown.length).toBeGreaterThan(0);
    expect(res.body.data.topMerchants.length).toBe(2);
  });

  it('POST /api/reports/generate validates date range', async () => {
    const res = await request(app)
      .post('/api/reports/generate')
      .send({ periodFrom: '2026-03-31', periodTo: '2026-03-01', reportType: 'monthly' });

    expect(res.status).toBe(400);
  });

  it('POST /api/reports/generate includes budget vs actual', async () => {
    const catId = seedCategory({ name: 'Food' });
    seedBudget(catId, 300);
    seedTransaction({ date: '2026-03-15', amount: 150, type: 'debit', categoryId: catId });

    const res = await request(app)
      .post('/api/reports/generate')
      .send({ periodFrom: '2026-03-01', periodTo: '2026-03-31', reportType: 'monthly' });

    expect(res.status).toBe(201);
    expect(res.body.data.budgetVsActual.length).toBe(1);
    expect(res.body.data.budgetVsActual[0].categoryName).toBe('Food');
    expect(res.body.data.budgetVsActual[0].budgetAmount).toBe(300);
    expect(res.body.data.budgetVsActual[0].actualSpent).toBe(150);
    expect(res.body.data.budgetVsActual[0].percentUsed).toBe(50);
  });

  it('POST /api/reports/generate includes account breakdown', async () => {
    const accountId = seedAccount({ name: 'Checking' });
    seedTransaction({ date: '2026-03-10', amount: 500, type: 'debit', accountId });
    seedTransaction({ date: '2026-03-15', amount: 3000, type: 'credit', accountId });

    const res = await request(app)
      .post('/api/reports/generate')
      .send({ periodFrom: '2026-03-01', periodTo: '2026-03-31', reportType: 'monthly' });

    expect(res.status).toBe(201);
    expect(res.body.data.accountBreakdown).toBeDefined();
    expect(res.body.data.accountBreakdown.length).toBe(1);
    expect(res.body.data.accountBreakdown[0].accountName).toBe('Checking');
    expect(res.body.data.accountBreakdown[0].income).toBe(3000);
    expect(res.body.data.accountBreakdown[0].expenses).toBe(500);
  });

  it('GET /api/reports/:id returns full report data', async () => {
    seedTransaction({ date: '2026-03-15', amount: 100, type: 'debit' });

    const genRes = await request(app)
      .post('/api/reports/generate')
      .send({ periodFrom: '2026-03-01', periodTo: '2026-03-31', reportType: 'monthly' });

    const res = await request(app).get(`/api/reports/${genRes.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(genRes.body.id);
    expect(res.body.data.summary).toBeDefined();
  });

  it('GET /api/reports/:id returns 404 for nonexistent report', async () => {
    const res = await request(app).get(`/api/reports/${uuidv4()}`);
    expect(res.status).toBe(404);
  });

  it('GET /api/reports lists reports metadata', async () => {
    await request(app)
      .post('/api/reports/generate')
      .send({ periodFrom: '2026-03-01', periodTo: '2026-03-31', reportType: 'monthly' });

    await request(app)
      .post('/api/reports/generate')
      .send({ periodFrom: '2026-01-01', periodTo: '2026-03-31', reportType: 'quarterly' });

    const res = await request(app).get('/api/reports');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    // Should have metadata but NOT full data
    expect(res.body[0].hasPdf).toBeDefined();
    expect(res.body[0].data).toBeUndefined();
  });

  it('DELETE /api/reports/:id deletes report', async () => {
    const genRes = await request(app)
      .post('/api/reports/generate')
      .send({ periodFrom: '2026-03-01', periodTo: '2026-03-31', reportType: 'monthly' });

    const delRes = await request(app).delete(`/api/reports/${genRes.body.id}`);
    expect(delRes.status).toBe(204);

    const getRes = await request(app).get(`/api/reports/${genRes.body.id}`);
    expect(getRes.status).toBe(404);
  });

  it('DELETE /api/reports/:id returns 404 for nonexistent', async () => {
    const res = await request(app).delete(`/api/reports/${uuidv4()}`);
    expect(res.status).toBe(404);
  });
});

describe('Reports PDF', () => {
  it('GET /api/reports/:id/pdf generates and returns a PDF', async () => {
    seedTransaction({ date: '2026-03-15', amount: 100, type: 'debit', merchant: 'Test' });

    const genRes = await request(app)
      .post('/api/reports/generate')
      .send({ periodFrom: '2026-03-01', periodTo: '2026-03-31', reportType: 'monthly' });

    const pdfRes = await request(app).get(`/api/reports/${genRes.body.id}/pdf`);
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toContain('application/pdf');
    // PDF starts with %PDF
    expect(pdfRes.body.slice(0, 5).toString()).toContain('%PDF');
  });

  it('GET /api/reports/:id/pdf returns 404 for nonexistent report', async () => {
    const res = await request(app).get(`/api/reports/${uuidv4()}/pdf`);
    expect(res.status).toBe(404);
  });
});

describe('Report generation with various date ranges', () => {
  it('generates report for empty date range (no transactions)', async () => {
    const res = await request(app)
      .post('/api/reports/generate')
      .send({ periodFrom: '2025-01-01', periodTo: '2025-01-31', reportType: 'monthly' });

    expect(res.status).toBe(201);
    expect(res.body.data.summary.income).toBe(0);
    expect(res.body.data.summary.expenses).toBe(0);
    expect(res.body.data.summary.transactionCount).toBe(0);
  });

  it('generates quarterly report with monthly comparison', async () => {
    seedTransaction({ date: '2026-01-15', amount: 100, type: 'debit' });
    seedTransaction({ date: '2026-02-15', amount: 200, type: 'debit' });
    seedTransaction({ date: '2026-03-15', amount: 300, type: 'debit' });

    const res = await request(app)
      .post('/api/reports/generate')
      .send({ periodFrom: '2026-01-01', periodTo: '2026-03-31', reportType: 'quarterly' });

    expect(res.status).toBe(201);
    expect(res.body.data.summary.expenses).toBe(600);
    expect(res.body.data.monthlyComparison).toBeDefined();
    expect(res.body.data.monthlyComparison.length).toBe(3);
  });

  it('generates yearly report title correctly', async () => {
    const res = await request(app)
      .post('/api/reports/generate')
      .send({ periodFrom: '2026-01-01', periodTo: '2026-12-31', reportType: 'yearly' });

    expect(res.status).toBe(201);
    expect(res.body.title).toContain('2026');
  });
});
