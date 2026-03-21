import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { app } from '../../app.js';
import { db, schema, sqlite } from '../../lib/db/index.js';

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
    amount: 100.0,
    type: 'debit',
    categoryId: null,
    merchant: 'Test Shop',
    isRecurring: false,
    isSplit: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  db.insert(schema.transactions).values(txn).run();
  return txn;
}

function seedTag(name: string, color = '#3b82f6') {
  const now = new Date().toISOString();
  const tag = { id: uuidv4(), name, color, createdAt: now, updatedAt: now };
  db.insert(schema.tags).values(tag).run();
  return tag;
}

describe('Tag Routes', () => {
  beforeEach(() => {
    sqlite.exec('DELETE FROM split_transactions');
    sqlite.exec('DELETE FROM transaction_tags');
    sqlite.exec('DELETE FROM budgets');
    sqlite.exec('DELETE FROM category_rules');
    sqlite.exec('DELETE FROM transactions');
    sqlite.exec('DELETE FROM categories');
    sqlite.exec('DELETE FROM documents');
    sqlite.exec('DELETE FROM tags');
  });

  // --- Tag CRUD ---

  describe('GET /api/tags', () => {
    it('returns empty array when no tags', async () => {
      const res = await request(app).get('/api/tags');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns tags with usage counts', async () => {
      const tag = seedTag('Holiday');
      const doc = seedDocument();
      const txn = seedTransaction(doc.id);
      db.insert(schema.transactionTags).values({ transactionId: txn.id, tagId: tag.id }).run();

      const res = await request(app).get('/api/tags');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Holiday');
      expect(res.body[0].usageCount).toBe(1);
    });
  });

  describe('POST /api/tags', () => {
    it('creates a tag', async () => {
      const res = await request(app).post('/api/tags').send({ name: 'Tax Deductible', color: '#22c55e' });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Tax Deductible');
      expect(res.body.color).toBe('#22c55e');
    });

    it('rejects duplicate names', async () => {
      seedTag('Holiday');
      const res = await request(app).post('/api/tags').send({ name: 'Holiday' });
      expect(res.status).toBe(409);
    });
  });

  describe('PUT /api/tags/:id', () => {
    it('updates a tag', async () => {
      const tag = seedTag('Old');
      const res = await request(app).put(`/api/tags/${tag.id}`).send({ name: 'New', color: '#ef4444' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('New');
      expect(res.body.color).toBe('#ef4444');
    });

    it('returns 404 for non-existent tag', async () => {
      const res = await request(app).put(`/api/tags/${uuidv4()}`).send({ name: 'Test' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/tags/:id', () => {
    it('deletes a tag and cascades junction rows', async () => {
      const tag = seedTag('ToDelete');
      const doc = seedDocument();
      const txn = seedTransaction(doc.id);
      db.insert(schema.transactionTags).values({ transactionId: txn.id, tagId: tag.id }).run();

      const res = await request(app).delete(`/api/tags/${tag.id}`);
      expect(res.status).toBe(204);

      // Verify junction row is gone
      const junctions = db.select().from(schema.transactionTags).all();
      expect(junctions).toHaveLength(0);
    });
  });

  // --- Transaction-Tag Junction ---

  describe('POST /api/transactions/:id/tags', () => {
    it('adds tags to a transaction', async () => {
      const doc = seedDocument();
      const txn = seedTransaction(doc.id);
      const tag1 = seedTag('A');
      const tag2 = seedTag('B');

      const res = await request(app)
        .post(`/api/transactions/${txn.id}/tags`)
        .send({ tagIds: [tag1.id, tag2.id] });
      expect(res.status).toBe(200);
      expect(res.body.added).toBe(2);
    });

    it('skips duplicate tag assignments', async () => {
      const doc = seedDocument();
      const txn = seedTransaction(doc.id);
      const tag = seedTag('A');
      db.insert(schema.transactionTags).values({ transactionId: txn.id, tagId: tag.id }).run();

      const res = await request(app)
        .post(`/api/transactions/${txn.id}/tags`)
        .send({ tagIds: [tag.id] });
      expect(res.status).toBe(200);
      expect(res.body.added).toBe(0);
    });
  });

  describe('DELETE /api/transactions/:id/tags/:tagId', () => {
    it('removes a tag from a transaction', async () => {
      const doc = seedDocument();
      const txn = seedTransaction(doc.id);
      const tag = seedTag('A');
      db.insert(schema.transactionTags).values({ transactionId: txn.id, tagId: tag.id }).run();

      const res = await request(app).delete(`/api/transactions/${txn.id}/tags/${tag.id}`);
      expect(res.status).toBe(204);
    });

    it('returns 404 for non-linked tag', async () => {
      const doc = seedDocument();
      const txn = seedTransaction(doc.id);
      const tag = seedTag('A');

      const res = await request(app).delete(`/api/transactions/${txn.id}/tags/${tag.id}`);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/transactions/bulk-tag', () => {
    it('bulk adds tag to multiple transactions', async () => {
      const doc = seedDocument();
      const txn1 = seedTransaction(doc.id);
      const txn2 = seedTransaction(doc.id, { description: 'Second' });
      const tag = seedTag('Bulk');

      const res = await request(app)
        .post('/api/transactions/bulk-tag')
        .send({ transactionIds: [txn1.id, txn2.id], tagId: tag.id });
      expect(res.status).toBe(200);
      expect(res.body.added).toBe(2);
    });
  });

  // --- Tags in Transaction Listing ---

  describe('GET /api/transactions (tags)', () => {
    it('includes tags in transaction response', async () => {
      const doc = seedDocument();
      const txn = seedTransaction(doc.id);
      const tag = seedTag('Holiday', '#22c55e');
      db.insert(schema.transactionTags).values({ transactionId: txn.id, tagId: tag.id }).run();

      const res = await request(app).get('/api/transactions');
      expect(res.status).toBe(200);
      const transaction = res.body.data[0];
      expect(transaction.tags).toHaveLength(1);
      expect(transaction.tags[0].name).toBe('Holiday');
      expect(transaction.tags[0].color).toBe('#22c55e');
      expect(transaction.isSplit).toBe(false);
    });

    it('filters by tagIds', async () => {
      const doc = seedDocument();
      const txn1 = seedTransaction(doc.id, { description: 'Tagged' });
      seedTransaction(doc.id, { description: 'Not tagged' });
      const tag = seedTag('Filter');
      db.insert(schema.transactionTags).values({ transactionId: txn1.id, tagId: tag.id }).run();

      const res = await request(app).get(`/api/transactions?tagIds=${tag.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].description).toBe('Tagged');
    });
  });

  // --- Split Transactions ---

  describe('POST /api/transactions/:id/splits', () => {
    it('creates splits and updates parent', async () => {
      const doc = seedDocument();
      const cat = seedCategory('Food');
      const txn = seedTransaction(doc.id, { amount: 100, categoryId: cat.id });

      const res = await request(app)
        .post(`/api/transactions/${txn.id}/splits`)
        .send({
          splits: [
            { categoryId: cat.id, amount: 60, description: 'Groceries' },
            { categoryId: null, amount: 40, description: 'Household' },
          ],
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].amount).toBe(60);

      // Verify parent updated
      const parent = db.select().from(schema.transactions).where(eq(schema.transactions.id, txn.id)).get();
      expect(parent!.isSplit).toBe(true);
      expect(parent!.categoryId).toBeNull();
      expect(parent!.previousCategoryId).toBe(cat.id);
    });

    it('rejects mismatched split sum', async () => {
      const doc = seedDocument();
      const txn = seedTransaction(doc.id, { amount: 100 });

      const res = await request(app)
        .post(`/api/transactions/${txn.id}/splits`)
        .send({
          splits: [
            { categoryId: null, amount: 60, description: 'A' },
            { categoryId: null, amount: 30, description: 'B' },
          ],
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('SPLIT_SUM_MISMATCH');
    });

    it('replaces existing splits', async () => {
      const doc = seedDocument();
      const txn = seedTransaction(doc.id, { amount: 100 });

      // Create initial splits
      await request(app)
        .post(`/api/transactions/${txn.id}/splits`)
        .send({
          splits: [
            { categoryId: null, amount: 50, description: 'First' },
            { categoryId: null, amount: 50, description: 'Second' },
          ],
        });

      // Replace with new splits
      const res = await request(app)
        .post(`/api/transactions/${txn.id}/splits`)
        .send({
          splits: [
            { categoryId: null, amount: 70, description: 'New A' },
            { categoryId: null, amount: 30, description: 'New B' },
          ],
        });
      expect(res.status).toBe(201);
      expect(res.body[0].description).toBe('New A');
    });
  });

  describe('GET /api/transactions/:id/splits', () => {
    it('returns splits for a transaction', async () => {
      const doc = seedDocument();
      const cat = seedCategory('Food');
      const txn = seedTransaction(doc.id, { amount: 100 });

      await request(app)
        .post(`/api/transactions/${txn.id}/splits`)
        .send({
          splits: [
            { categoryId: cat.id, amount: 60, description: 'Food portion' },
            { categoryId: null, amount: 40, description: 'Other' },
          ],
        });

      const res = await request(app).get(`/api/transactions/${txn.id}/splits`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].categoryName).toBe('Food');
    });
  });

  describe('DELETE /api/transactions/:id/splits', () => {
    it('removes splits and restores categoryId', async () => {
      const doc = seedDocument();
      const cat = seedCategory('Food');
      const txn = seedTransaction(doc.id, { amount: 100, categoryId: cat.id });

      // Create splits
      await request(app)
        .post(`/api/transactions/${txn.id}/splits`)
        .send({
          splits: [
            { categoryId: null, amount: 50, description: 'A' },
            { categoryId: null, amount: 50, description: 'B' },
          ],
        });

      // Remove splits
      const res = await request(app).delete(`/api/transactions/${txn.id}/splits`);
      expect(res.status).toBe(204);

      // Verify parent restored
      const parent = db.select().from(schema.transactions).where(eq(schema.transactions.id, txn.id)).get();
      expect(parent!.isSplit).toBe(false);
      expect(parent!.categoryId).toBe(cat.id);
      expect(parent!.previousCategoryId).toBeNull();
    });

    it('works when original categoryId was null', async () => {
      const doc = seedDocument();
      const txn = seedTransaction(doc.id, { amount: 100, categoryId: null });

      await request(app)
        .post(`/api/transactions/${txn.id}/splits`)
        .send({
          splits: [
            { categoryId: null, amount: 50, description: 'A' },
            { categoryId: null, amount: 50, description: 'B' },
          ],
        });

      const res = await request(app).delete(`/api/transactions/${txn.id}/splits`);
      expect(res.status).toBe(204);

      const parent = db.select().from(schema.transactions).where(eq(schema.transactions.id, txn.id)).get();
      expect(parent!.isSplit).toBe(false);
      expect(parent!.categoryId).toBeNull();
    });

    it('returns 400 if transaction is not split', async () => {
      const doc = seedDocument();
      const txn = seedTransaction(doc.id);

      const res = await request(app).delete(`/api/transactions/${txn.id}/splits`);
      expect(res.status).toBe(400);
    });
  });

  // --- Budget double-counting prevention ---

  describe('Budget split-aware spend', () => {
    it('calculates spend correctly for split transactions', async () => {
      const cat = seedCategory('Food');
      const doc = seedDocument();

      // Regular (unsplit) transaction: $50 Food
      seedTransaction(doc.id, { amount: 50, categoryId: cat.id, type: 'debit', date: new Date().toISOString().split('T')[0] });

      // Split transaction: parent $100 → $60 Food + $40 uncategorised
      const splitParent = seedTransaction(doc.id, { amount: 100, type: 'debit', date: new Date().toISOString().split('T')[0] });

      await request(app)
        .post(`/api/transactions/${splitParent.id}/splits`)
        .send({
          splits: [
            { categoryId: cat.id, amount: 60, description: 'Food portion' },
            { categoryId: null, amount: 40, description: 'Other' },
          ],
        });

      // Create budget for Food category
      const budgetRes = await request(app)
        .post('/api/budgets')
        .send({ categoryId: cat.id, amount: 200, period: 'monthly' });
      expect(budgetRes.status).toBe(201);

      // Get budget summary — should show $110 spent (50 regular + 60 split)
      const summaryRes = await request(app).get('/api/budgets/summary');
      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body).toHaveLength(1);
      expect(summaryRes.body[0].spent).toBe(110);
    });
  });

  // --- Split + category edit guard ---

  describe('PUT /api/transactions/:id (split guard)', () => {
    it('rejects category change on split transaction', async () => {
      const doc = seedDocument();
      const cat = seedCategory('Food');
      const txn = seedTransaction(doc.id, { amount: 100 });

      await request(app)
        .post(`/api/transactions/${txn.id}/splits`)
        .send({
          splits: [
            { categoryId: null, amount: 50, description: 'A' },
            { categoryId: null, amount: 50, description: 'B' },
          ],
        });

      const res = await request(app)
        .put(`/api/transactions/${txn.id}`)
        .send({ categoryId: cat.id });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('TRANSACTION_IS_SPLIT');
    });
  });
});
