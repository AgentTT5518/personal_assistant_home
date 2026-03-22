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

function seedAccount(overrides: Partial<typeof schema.accounts.$inferInsert> = {}) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.insert(schema.accounts)
    .values({
      id,
      name: `Account ${id.slice(0, 6)}`,
      type: 'checking',
      createdAt: now,
      updatedAt: now,
      ...overrides,
    })
    .run();
  return id;
}

function seedBill(overrides: Partial<typeof schema.bills.$inferInsert> = {}) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.insert(schema.bills)
    .values({
      id,
      name: `Bill ${id.slice(0, 6)}`,
      expectedAmount: 50,
      frequency: 'monthly',
      nextDueDate: '2026-04-01',
      createdAt: now,
      updatedAt: now,
      ...overrides,
    })
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

function seedRecurringTransactions(merchant: string, accountId: string | null = null) {
  const catId = seedCategory({ name: `${merchant} cat` });
  const docId = seedDocument();
  const now = new Date().toISOString();
  // Seed 4 monthly recurring debit transactions
  for (let i = 0; i < 4; i++) {
    const month = String(i + 1).padStart(2, '0');
    db.insert(schema.transactions)
      .values({
        id: uuidv4(),
        documentId: docId,
        date: `2026-${month}-15`,
        description: merchant,
        amount: 15.99,
        type: 'debit',
        merchant,
        isRecurring: true,
        categoryId: catId,
        accountId,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }
  return catId;
}

// Suppress server logs in tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Bill routes', () => {
  beforeEach(() => {
    db.delete(schema.bills).run();
    db.delete(schema.splitTransactions).run();
    db.delete(schema.transactionTags).run();
    db.delete(schema.budgets).run();
    db.delete(schema.importSessions).run();
    db.delete(schema.transactions).run();
    db.delete(schema.accountSummaries).run();
    db.delete(schema.documents).run();
    db.delete(schema.categoryRules).run();
    db.delete(schema.categories).run();
    db.delete(schema.accounts).run();
  });

  describe('GET /api/bills', () => {
    it('returns empty array when no bills', async () => {
      const res = await request(app).get('/api/bills');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns bills with account and category info', async () => {
      const catId = seedCategory({ name: 'Subscriptions', color: '#8b5cf6' });
      const accId = seedAccount({ name: 'Main Checking' });
      seedBill({ name: 'Netflix', accountId: accId, categoryId: catId, expectedAmount: 15.99, frequency: 'monthly' });

      const res = await request(app).get('/api/bills');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Netflix');
      expect(res.body[0].accountName).toBe('Main Checking');
      expect(res.body[0].categoryName).toBe('Subscriptions');
      expect(res.body[0].categoryColor).toBe('#8b5cf6');
      expect(res.body[0].expectedAmount).toBe(15.99);
    });

    it('filters by isActive', async () => {
      seedBill({ name: 'Active Bill', isActive: true });
      seedBill({ name: 'Inactive Bill', isActive: false });

      const res = await request(app).get('/api/bills?isActive=true');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Active Bill');
    });

    it('filters by upcoming days', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const farFuture = new Date(today);
      farFuture.setDate(today.getDate() + 30);

      seedBill({ name: 'Soon', nextDueDate: tomorrow.toISOString().split('T')[0] });
      seedBill({ name: 'Far', nextDueDate: farFuture.toISOString().split('T')[0] });

      const res = await request(app).get('/api/bills?upcoming=7');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Soon');
    });
  });

  describe('POST /api/bills', () => {
    it('creates a bill', async () => {
      const res = await request(app)
        .post('/api/bills')
        .send({
          name: 'Rent',
          expectedAmount: 2000,
          frequency: 'monthly',
          nextDueDate: '2026-04-01',
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Rent');
      expect(res.body.expectedAmount).toBe(2000);
      expect(res.body.frequency).toBe('monthly');
      expect(res.body.nextDueDate).toBe('2026-04-01');
      expect(res.body.isActive).toBe(true);
    });

    it('creates a bill with account and category', async () => {
      const catId = seedCategory();
      const accId = seedAccount();

      const res = await request(app)
        .post('/api/bills')
        .send({
          name: 'Electricity',
          expectedAmount: 120,
          frequency: 'monthly',
          nextDueDate: '2026-04-15',
          accountId: accId,
          categoryId: catId,
          notes: 'Quarterly estimate',
        });

      expect(res.status).toBe(201);
      expect(res.body.accountId).toBe(accId);
      expect(res.body.categoryId).toBe(catId);
      expect(res.body.notes).toBe('Quarterly estimate');
    });

    it('returns 404 for nonexistent account', async () => {
      const res = await request(app)
        .post('/api/bills')
        .send({
          name: 'Test',
          expectedAmount: 10,
          frequency: 'monthly',
          nextDueDate: '2026-04-01',
          accountId: uuidv4(),
        });

      expect(res.status).toBe(404);
    });

    it('returns 404 for nonexistent category', async () => {
      const res = await request(app)
        .post('/api/bills')
        .send({
          name: 'Test',
          expectedAmount: 10,
          frequency: 'monthly',
          nextDueDate: '2026-04-01',
          categoryId: uuidv4(),
        });

      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid data', async () => {
      const res = await request(app)
        .post('/api/bills')
        .send({ name: '', expectedAmount: -5 });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/bills/:id', () => {
    it('returns a single bill', async () => {
      const billId = seedBill({ name: 'Internet' });

      const res = await request(app).get(`/api/bills/${billId}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Internet');
    });

    it('returns 404 for nonexistent bill', async () => {
      const res = await request(app).get(`/api/bills/${uuidv4()}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/bills/:id', () => {
    it('updates bill fields', async () => {
      const billId = seedBill({ name: 'Old Name', expectedAmount: 50 });

      const res = await request(app)
        .put(`/api/bills/${billId}`)
        .send({ name: 'New Name', expectedAmount: 75 });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('New Name');
      expect(res.body.expectedAmount).toBe(75);
    });

    it('deactivates a bill', async () => {
      const billId = seedBill();

      const res = await request(app)
        .put(`/api/bills/${billId}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.isActive).toBe(false);
    });

    it('returns 404 for nonexistent bill', async () => {
      const res = await request(app)
        .put(`/api/bills/${uuidv4()}`)
        .send({ name: 'Test' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/bills/:id', () => {
    it('deletes a bill', async () => {
      const billId = seedBill();

      const res = await request(app).delete(`/api/bills/${billId}`);
      expect(res.status).toBe(204);

      const check = await request(app).get('/api/bills');
      expect(check.body).toEqual([]);
    });

    it('returns 404 for nonexistent bill', async () => {
      const res = await request(app).delete(`/api/bills/${uuidv4()}`);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/bills/:id/mark-paid', () => {
    it('advances monthly bill by 1 month', async () => {
      const billId = seedBill({ frequency: 'monthly', nextDueDate: '2026-03-15' });

      const res = await request(app).post(`/api/bills/${billId}/mark-paid`);
      expect(res.status).toBe(200);
      expect(res.body.nextDueDate).toBe('2026-04-15');
    });

    it('advances weekly bill by 7 days', async () => {
      const billId = seedBill({ frequency: 'weekly', nextDueDate: '2026-03-15' });

      const res = await request(app).post(`/api/bills/${billId}/mark-paid`);
      expect(res.status).toBe(200);
      expect(res.body.nextDueDate).toBe('2026-03-22');
    });

    it('advances biweekly bill by 14 days', async () => {
      const billId = seedBill({ frequency: 'biweekly', nextDueDate: '2026-03-15' });

      const res = await request(app).post(`/api/bills/${billId}/mark-paid`);
      expect(res.status).toBe(200);
      expect(res.body.nextDueDate).toBe('2026-03-29');
    });

    it('advances quarterly bill by 3 months', async () => {
      const billId = seedBill({ frequency: 'quarterly', nextDueDate: '2026-01-15' });

      const res = await request(app).post(`/api/bills/${billId}/mark-paid`);
      expect(res.status).toBe(200);
      expect(res.body.nextDueDate).toBe('2026-04-15');
    });

    it('advances yearly bill by 1 year', async () => {
      const billId = seedBill({ frequency: 'yearly', nextDueDate: '2026-03-15' });

      const res = await request(app).post(`/api/bills/${billId}/mark-paid`);
      expect(res.status).toBe(200);
      expect(res.body.nextDueDate).toBe('2027-03-15');
    });

    it('clamps monthly advance to month end (Jan 31 → Feb 28)', async () => {
      const billId = seedBill({ frequency: 'monthly', nextDueDate: '2026-01-31' });

      const res = await request(app).post(`/api/bills/${billId}/mark-paid`);
      expect(res.status).toBe(200);
      expect(res.body.nextDueDate).toBe('2026-02-28');
    });

    it('returns 404 for nonexistent bill', async () => {
      const res = await request(app).post(`/api/bills/${uuidv4()}/mark-paid`);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/bills/calendar', () => {
    it('returns bills grouped by date within range', async () => {
      seedBill({ name: 'A', nextDueDate: '2026-04-01' });
      seedBill({ name: 'B', nextDueDate: '2026-04-01' });
      seedBill({ name: 'C', nextDueDate: '2026-04-15' });

      const res = await request(app).get('/api/bills/calendar?from=2026-04-01&to=2026-04-30');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].date).toBe('2026-04-01');
      expect(res.body[0].bills).toHaveLength(2);
      expect(res.body[1].date).toBe('2026-04-15');
      expect(res.body[1].bills).toHaveLength(1);
    });

    it('excludes inactive bills', async () => {
      seedBill({ name: 'Active', nextDueDate: '2026-04-01', isActive: true });
      seedBill({ name: 'Inactive', nextDueDate: '2026-04-01', isActive: false });

      const res = await request(app).get('/api/bills/calendar?from=2026-04-01&to=2026-04-30');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].bills).toHaveLength(1);
      expect(res.body[0].bills[0].name).toBe('Active');
    });

    it('returns 400 without from/to params', async () => {
      const res = await request(app).get('/api/bills/calendar');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/bills/populate-from-recurring', () => {
    it('creates bills from recurring transactions', async () => {
      const accId = seedAccount({ name: 'Checking' });
      seedRecurringTransactions('Netflix', accId);

      const res = await request(app).post('/api/bills/populate-from-recurring');
      expect(res.status).toBe(201);
      expect(res.body.created).toBe(1);
      expect(res.body.bills[0].name).toBe('Netflix');
      expect(res.body.bills[0].accountId).toBe(accId);
    });

    it('skips duplicate bills (same name, similar amount)', async () => {
      seedRecurringTransactions('Netflix');
      // Create existing bill with similar name and amount
      seedBill({ name: 'Netflix', expectedAmount: 15.99 });

      const res = await request(app).post('/api/bills/populate-from-recurring');
      expect(res.status).toBe(201);
      expect(res.body.created).toBe(0);
      expect(res.body.skipped).toBe(1);
    });

    it('returns zero when no recurring transactions exist', async () => {
      const res = await request(app).post('/api/bills/populate-from-recurring');
      expect(res.status).toBe(201);
      expect(res.body.created).toBe(0);
      expect(res.body.skipped).toBe(0);
    });
  });
});
