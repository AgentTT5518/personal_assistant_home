import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { db, schema } from '../../lib/db/index.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

function createTestAccount(overrides: Partial<typeof schema.accounts.$inferInsert> = {}) {
  const now = new Date().toISOString();
  const id = overrides.id ?? uuidv4();
  const account = {
    id,
    name: 'Test Account',
    type: 'checking',
    institution: 'Test Bank',
    currency: 'AUD',
    currentBalance: 1000,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  db.insert(schema.accounts).values(account).run();
  return account;
}

function createTestTransaction(documentId: string, accountId: string | null, overrides: Partial<typeof schema.transactions.$inferInsert> = {}) {
  const now = new Date().toISOString();
  const id = overrides.id ?? uuidv4();
  const txn = {
    id,
    documentId,
    date: '2026-03-15',
    description: 'Test Txn',
    amount: 100,
    type: 'debit',
    accountId,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  db.insert(schema.transactions).values(txn).run();
  return txn;
}

function createTestDocument() {
  const now = new Date().toISOString();
  const id = uuidv4();
  db.insert(schema.documents).values({
    id,
    filename: 'test.pdf',
    docType: 'bank_statement',
    processingStatus: 'completed',
    createdAt: now,
    updatedAt: now,
  }).run();
  return id;
}

describe('Account routes', () => {
  beforeEach(() => {
    db.delete(schema.transactions).run();
    db.delete(schema.accounts).run();
    db.delete(schema.documents).run();
  });

  describe('GET /api/accounts', () => {
    it('returns empty array when no accounts', async () => {
      const res = await request(app).get('/api/accounts');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns all accounts', async () => {
      createTestAccount({ name: 'Checking' });
      createTestAccount({ name: 'Savings', type: 'savings' });

      const res = await request(app).get('/api/accounts');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('filters by isActive', async () => {
      createTestAccount({ name: 'Active', isActive: true });
      createTestAccount({ name: 'Inactive', isActive: false });

      const res = await request(app).get('/api/accounts?isActive=true');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Active');
    });

    it('includes transaction count', async () => {
      const account = createTestAccount();
      const docId = createTestDocument();
      createTestTransaction(docId, account.id);
      createTestTransaction(docId, account.id);

      const res = await request(app).get('/api/accounts');
      expect(res.status).toBe(200);
      expect(res.body[0].transactionCount).toBe(2);
    });
  });

  describe('GET /api/accounts/net-worth', () => {
    it('calculates net worth with credit card as negative', async () => {
      createTestAccount({ name: 'Checking', type: 'checking', currentBalance: 5000 });
      createTestAccount({ name: 'Credit Card', type: 'credit_card', currentBalance: 2000 });
      createTestAccount({ name: 'Savings', type: 'savings', currentBalance: 10000 });

      const res = await request(app).get('/api/accounts/net-worth');
      expect(res.status).toBe(200);
      expect(res.body.netWorth).toBe(13000); // 5000 + 10000 - 2000
      expect(res.body.accounts).toHaveLength(3);

      const cc = res.body.accounts.find((a: { name: string }) => a.name === 'Credit Card');
      expect(cc.balance).toBe(2000);
      expect(cc.effectiveBalance).toBe(-2000);
    });

    it('excludes inactive accounts', async () => {
      createTestAccount({ name: 'Active', currentBalance: 5000, isActive: true });
      createTestAccount({ name: 'Inactive', currentBalance: 3000, isActive: false });

      const res = await request(app).get('/api/accounts/net-worth');
      expect(res.status).toBe(200);
      expect(res.body.netWorth).toBe(5000);
      expect(res.body.accounts).toHaveLength(1);
    });
  });

  describe('GET /api/accounts/:id', () => {
    it('returns account with transaction count', async () => {
      const account = createTestAccount();
      const docId = createTestDocument();
      createTestTransaction(docId, account.id);

      const res = await request(app).get(`/api/accounts/${account.id}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Test Account');
      expect(res.body.transactionCount).toBe(1);
    });

    it('returns 404 for non-existent account', async () => {
      const res = await request(app).get(`/api/accounts/${uuidv4()}`);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/accounts', () => {
    it('creates an account', async () => {
      const res = await request(app)
        .post('/api/accounts')
        .send({ name: 'New Account', type: 'checking' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('New Account');
      expect(res.body.type).toBe('checking');
      expect(res.body.currency).toBe('AUD');
      expect(res.body.currentBalance).toBe(0);
      expect(res.body.isActive).toBe(true);
      expect(res.body.id).toBeDefined();
    });

    it('creates with custom balance and institution', async () => {
      const res = await request(app)
        .post('/api/accounts')
        .send({
          name: 'Savings',
          type: 'savings',
          institution: 'CBA',
          currentBalance: 5000,
          currency: 'USD',
        });

      expect(res.status).toBe(201);
      expect(res.body.institution).toBe('CBA');
      expect(res.body.currentBalance).toBe(5000);
      expect(res.body.currency).toBe('USD');
    });

    it('validates required fields', async () => {
      const res = await request(app)
        .post('/api/accounts')
        .send({ type: 'checking' }); // missing name

      expect(res.status).toBe(400);
    });

    it('validates account type', async () => {
      const res = await request(app)
        .post('/api/accounts')
        .send({ name: 'Test', type: 'invalid' });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/accounts/:id', () => {
    it('updates account fields', async () => {
      const account = createTestAccount();

      const res = await request(app)
        .put(`/api/accounts/${account.id}`)
        .send({ name: 'Updated Name', currentBalance: 2000 });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Name');
      expect(res.body.currentBalance).toBe(2000);
    });

    it('returns 404 for non-existent account', async () => {
      const res = await request(app)
        .put(`/api/accounts/${uuidv4()}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/accounts/:id', () => {
    it('soft-deletes by default', async () => {
      const account = createTestAccount();

      const res = await request(app).delete(`/api/accounts/${account.id}`);
      expect(res.status).toBe(204);

      const row = db.select().from(schema.accounts).where(eq(schema.accounts.id, account.id)).get();
      expect(row).toBeDefined();
      expect(row!.isActive).toBe(false);
    });

    it('hard-deletes when no linked transactions', async () => {
      const account = createTestAccount();

      const res = await request(app).delete(`/api/accounts/${account.id}?hard=true`);
      expect(res.status).toBe(204);

      const row = db.select().from(schema.accounts).where(eq(schema.accounts.id, account.id)).get();
      expect(row).toBeUndefined();
    });

    it('returns 409 on hard-delete with linked transactions', async () => {
      const account = createTestAccount();
      const docId = createTestDocument();
      createTestTransaction(docId, account.id);

      const res = await request(app).delete(`/api/accounts/${account.id}?hard=true`);
      expect(res.status).toBe(409);
    });

    it('returns 404 for non-existent account', async () => {
      const res = await request(app).delete(`/api/accounts/${uuidv4()}`);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/accounts/:id/recalculate', () => {
    it('recalculates balance from transactions', async () => {
      const account = createTestAccount({ currentBalance: 0 });
      const docId = createTestDocument();
      createTestTransaction(docId, account.id, { type: 'credit', amount: 5000 });
      createTestTransaction(docId, account.id, { type: 'debit', amount: 1200 });
      createTestTransaction(docId, account.id, { type: 'debit', amount: 300 });

      const res = await request(app).post(`/api/accounts/${account.id}/recalculate`);
      expect(res.status).toBe(200);
      expect(res.body.currentBalance).toBe(3500); // 5000 - 1200 - 300
    });

    it('returns 400 when no linked transactions', async () => {
      const account = createTestAccount();

      const res = await request(app).post(`/api/accounts/${account.id}/recalculate`);
      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent account', async () => {
      const res = await request(app).post(`/api/accounts/${uuidv4()}/recalculate`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/transactions/:id/account', () => {
    it('assigns transaction to account', async () => {
      const account = createTestAccount();
      const docId = createTestDocument();
      const txn = createTestTransaction(docId, null);

      const res = await request(app)
        .put(`/api/transactions/${txn.id}/account`)
        .send({ accountId: account.id });

      expect(res.status).toBe(200);
      expect(res.body.accountId).toBe(account.id);
    });

    it('removes account assignment with null', async () => {
      const account = createTestAccount();
      const docId = createTestDocument();
      const txn = createTestTransaction(docId, account.id);

      const res = await request(app)
        .put(`/api/transactions/${txn.id}/account`)
        .send({ accountId: null });

      expect(res.status).toBe(200);
      expect(res.body.accountId).toBeNull();
    });

    it('returns 404 for non-existent transaction', async () => {
      const res = await request(app)
        .put(`/api/transactions/${uuidv4()}/account`)
        .send({ accountId: null });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/transactions/bulk-assign-account', () => {
    it('bulk assigns transactions to account', async () => {
      const account = createTestAccount();
      const docId = createTestDocument();
      const txn1 = createTestTransaction(docId, null);
      const txn2 = createTestTransaction(docId, null);

      const res = await request(app)
        .post('/api/transactions/bulk-assign-account')
        .send({ transactionIds: [txn1.id, txn2.id], accountId: account.id });

      expect(res.status).toBe(200);
      expect(res.body.updated).toBe(2);
      expect(res.body.accountId).toBe(account.id);
    });

    it('returns 400 for invalid account', async () => {
      const docId = createTestDocument();
      const txn = createTestTransaction(docId, null);

      const res = await request(app)
        .post('/api/transactions/bulk-assign-account')
        .send({ transactionIds: [txn.id], accountId: uuidv4() });

      expect(res.status).toBe(400);
    });
  });

  describe('backward compatibility', () => {
    it('GET /api/transactions works without accountId', async () => {
      const docId = createTestDocument();
      createTestTransaction(docId, null, { description: 'No account' });

      const res = await request(app).get('/api/transactions');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].accountId).toBeNull();
      expect(res.body.data[0].accountName).toBeNull();
    });

    it('GET /api/transactions includes accountName when linked', async () => {
      const account = createTestAccount({ name: 'My Checking' });
      const docId = createTestDocument();
      createTestTransaction(docId, account.id);

      const res = await request(app).get('/api/transactions');
      expect(res.status).toBe(200);
      expect(res.body.data[0].accountId).toBe(account.id);
      expect(res.body.data[0].accountName).toBe('My Checking');
    });

    it('GET /api/transactions filters by accountId', async () => {
      const account = createTestAccount();
      const docId = createTestDocument();
      createTestTransaction(docId, account.id, { description: 'Linked' });
      createTestTransaction(docId, null, { description: 'Unlinked' });

      const res = await request(app).get(`/api/transactions?accountId=${account.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].description).toBe('Linked');
    });
  });
});
