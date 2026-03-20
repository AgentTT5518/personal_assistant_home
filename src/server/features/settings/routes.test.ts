import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../../app.js';
import { db, schema, sqlite } from '../../lib/db/index.js';

function seedAppSetting(key: string, value: string) {
  const now = new Date().toISOString();
  db.insert(schema.appSettings).values({ key, value, updatedAt: now }).run();
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
    id: uuidv4(), documentId, date: '2026-01-15', description: 'Test purchase',
    amount: 50.0, type: 'debit', categoryId: null, merchant: 'Test Shop',
    isRecurring: false, createdAt: now, updatedAt: now, ...overrides,
  };
  db.insert(schema.transactions).values(txn).run();
  return txn;
}

function seedAccountSummary(documentId: string) {
  const now = new Date().toISOString();
  const summary = {
    id: uuidv4(), documentId, openingBalance: 1000, closingBalance: 900,
    totalCredits: 500, totalDebits: 600, currency: 'AUD',
    createdAt: now, updatedAt: now,
  };
  db.insert(schema.accountSummaries).values(summary).run();
  return summary;
}

function seedCategory(name?: string) {
  const now = new Date().toISOString();
  const cat = { id: uuidv4(), name: name ?? `Cat ${uuidv4().slice(0, 8)}`, color: '#ff0000', icon: 'star', isDefault: false, createdAt: now, updatedAt: now };
  db.insert(schema.categories).values(cat).run();
  return cat;
}

describe('App Settings Routes', () => {
  beforeEach(() => {
    sqlite.exec('DELETE FROM app_settings');
  });

  describe('GET /api/settings/app', () => {
    it('returns empty object when no settings exist', async () => {
      const res = await request(app).get('/api/settings/app');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
    });

    it('returns all settings as key-value pairs', async () => {
      seedAppSetting('currency', 'AUD');
      seedAppSetting('locale', 'en-AU');

      const res = await request(app).get('/api/settings/app');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ currency: 'AUD', locale: 'en-AU' });
    });
  });

  describe('PUT /api/settings/app/:key', () => {
    it('creates a new setting', async () => {
      const res = await request(app)
        .put('/api/settings/app/currency')
        .send({ value: 'USD' });
      expect(res.status).toBe(200);
      expect(res.body.key).toBe('currency');
      expect(res.body.value).toBe('USD');
    });

    it('updates an existing setting', async () => {
      seedAppSetting('currency', 'AUD');

      const res = await request(app)
        .put('/api/settings/app/currency')
        .send({ value: 'EUR' });
      expect(res.status).toBe(200);
      expect(res.body.value).toBe('EUR');

      const getRes = await request(app).get('/api/settings/app');
      expect(getRes.body.currency).toBe('EUR');
    });

    it('rejects invalid currency code', async () => {
      const res = await request(app)
        .put('/api/settings/app/currency')
        .send({ value: 'NOTACURRENCY' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects empty value', async () => {
      const res = await request(app)
        .put('/api/settings/app/currency')
        .send({ value: '' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('accepts valid non-currency settings', async () => {
      const res = await request(app)
        .put('/api/settings/app/locale')
        .send({ value: 'en-AU' });
      expect(res.status).toBe(200);
      expect(res.body.value).toBe('en-AU');
    });
  });
});

describe('GET /api/settings/stats', () => {
  beforeEach(() => {
    sqlite.exec('DELETE FROM category_rules');
    sqlite.exec('DELETE FROM transactions');
    sqlite.exec('DELETE FROM account_summaries');
    sqlite.exec('DELETE FROM documents');
    sqlite.exec('DELETE FROM categories');
  });

  it('returns zero counts when DB is empty', async () => {
    const res = await request(app).get('/api/settings/stats');
    expect(res.status).toBe(200);
    expect(res.body.documentCount).toBe(0);
    expect(res.body.transactionCount).toBe(0);
    expect(res.body.categoryCount).toBe(0);
    expect(res.body.appVersion).toBeDefined();
    expect(typeof res.body.dbSizeBytes).toBe('number');
  });

  it('returns correct counts', async () => {
    const doc = seedDocument();
    seedTransaction(doc.id);
    seedTransaction(doc.id);
    seedCategory('Test Cat');

    const res = await request(app).get('/api/settings/stats');
    expect(res.status).toBe(200);
    expect(res.body.documentCount).toBe(1);
    expect(res.body.transactionCount).toBe(2);
    expect(res.body.categoryCount).toBe(1);
  });
});

describe('DELETE /api/data/all', () => {
  beforeEach(() => {
    sqlite.exec('DELETE FROM category_rules');
    sqlite.exec('DELETE FROM transactions');
    sqlite.exec('DELETE FROM account_summaries');
    sqlite.exec('DELETE FROM documents');
    sqlite.exec('DELETE FROM categories');
  });

  it('rejects without confirm: true', async () => {
    const res = await request(app)
      .delete('/api/data/all')
      .send({});
    expect(res.status).toBe(400);
  });

  it('rejects with confirm: false', async () => {
    const res = await request(app)
      .delete('/api/data/all')
      .send({ confirm: false });
    expect(res.status).toBe(400);
  });

  it('deletes all data and returns counts', async () => {
    const doc = seedDocument();
    seedTransaction(doc.id);
    seedTransaction(doc.id);
    seedAccountSummary(doc.id);

    const res = await request(app)
      .delete('/api/data/all')
      .send({ confirm: true });

    expect(res.status).toBe(200);
    expect(res.body.deletedTransactions).toBe(2);
    expect(res.body.deletedAccountSummaries).toBe(1);
    expect(res.body.deletedDocuments).toBe(1);

    // Verify DB is empty
    const txns = db.select().from(schema.transactions).all();
    const docs = db.select().from(schema.documents).all();
    const summaries = db.select().from(schema.accountSummaries).all();
    expect(txns).toHaveLength(0);
    expect(docs).toHaveLength(0);
    expect(summaries).toHaveLength(0);
  });

  it('returns zero counts when no data exists', async () => {
    const res = await request(app)
      .delete('/api/data/all')
      .send({ confirm: true });

    expect(res.status).toBe(200);
    expect(res.body.deletedTransactions).toBe(0);
    expect(res.body.deletedDocuments).toBe(0);
  });
});
