import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { app } from '../../app.js';
import { db, schema } from '../../lib/db/index.js';

// Mock extraction and vision services so they don't actually run
vi.mock('./extraction.service.js', () => ({
  processDocument: vi.fn(),
}));

vi.mock('./vision.service.js', () => ({
  reprocessWithVision: vi.fn(),
}));

function insertDocument(overrides: Partial<typeof schema.documents.$inferInsert> = {}) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.insert(schema.documents)
    .values({
      id,
      filename: 'test.pdf',
      docType: 'bank_statement',
      processingStatus: 'completed',
      filePath: '/tmp/test.pdf',
      createdAt: now,
      updatedAt: now,
      ...overrides,
    })
    .run();
  return id;
}

function insertTransaction(documentId: string) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.insert(schema.transactions)
    .values({
      id,
      documentId,
      date: '2024-01-15',
      description: 'Test transaction',
      amount: 42.5,
      type: 'debit',
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return id;
}

describe('Document routes', () => {
  beforeEach(() => {
    db.delete(schema.transactions).run();
    db.delete(schema.accountSummaries).run();
    db.delete(schema.documents).run();
  });

  afterEach(() => {
    db.delete(schema.transactions).run();
    db.delete(schema.accountSummaries).run();
    db.delete(schema.documents).run();
  });

  describe('GET /api/documents', () => {
    it('returns empty array when no documents', async () => {
      const res = await request(app).get('/api/documents');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns documents with transaction counts', async () => {
      const docId = insertDocument();
      insertTransaction(docId);

      const res = await request(app).get('/api/documents');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(docId);
      expect(res.body[0].transactionCount).toBe(1);
      expect(res.body[0].hasFile).toBe(true);
    });

    it('filters by status', async () => {
      insertDocument({ processingStatus: 'completed' });
      insertDocument({ processingStatus: 'failed' });

      const res = await request(app).get('/api/documents?status=failed');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].processingStatus).toBe('failed');
    });
  });

  describe('GET /api/documents/:id', () => {
    it('returns document by id', async () => {
      const docId = insertDocument({ institution: 'CBA' });

      const res = await request(app).get(`/api/documents/${docId}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(docId);
      expect(res.body.institution).toBe('CBA');
    });

    it('returns 404 for nonexistent id', async () => {
      const res = await request(app).get('/api/documents/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/documents/:id/transactions', () => {
    it('returns transactions for a document', async () => {
      const docId = insertDocument();
      insertTransaction(docId);

      const res = await request(app).get(`/api/documents/${docId}/transactions`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].amount).toBe(42.5);
    });

    it('returns 404 for nonexistent document', async () => {
      const res = await request(app).get('/api/documents/nonexistent/transactions');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/documents/:id/reprocess-vision', () => {
    it('returns 202 for valid document with file', async () => {
      const docId = insertDocument({ filePath: '/tmp/test.pdf' });

      const res = await request(app).post(`/api/documents/${docId}/reprocess-vision`);
      expect(res.status).toBe(202);
      expect(res.body.processingStatus).toBe('processing');
    });

    it('returns 400 when file has been cleaned up', async () => {
      const docId = insertDocument({ filePath: null });

      const res = await request(app).post(`/api/documents/${docId}/reprocess-vision`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('FILE_UNAVAILABLE');
    });

    it('returns 404 for nonexistent document', async () => {
      const res = await request(app).post('/api/documents/nonexistent/reprocess-vision');
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/documents/:id', () => {
    it('deletes document and related records', async () => {
      const docId = insertDocument();
      insertTransaction(docId);

      const res = await request(app).delete(`/api/documents/${docId}`);
      expect(res.status).toBe(204);

      const doc = db.select().from(schema.documents).where(eq(schema.documents.id, docId)).get();
      expect(doc).toBeUndefined();

      const txns = db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.documentId, docId))
        .all();
      expect(txns).toHaveLength(0);
    });

    it('returns 404 for nonexistent document', async () => {
      const res = await request(app).delete('/api/documents/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});

describe('AI Settings routes', () => {
  // These rely on seed data existing; if not seeded, we insert test data
  let testTaskType: string;

  beforeEach(() => {
    testTaskType = `test_task_${uuidv4().slice(0, 8)}`;
    db.insert(schema.aiSettings)
      .values({
        id: uuidv4(),
        taskType: testTaskType,
        provider: 'claude',
        model: 'claude-sonnet-4-5-20250514',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();
  });

  afterEach(() => {
    db.delete(schema.aiSettings)
      .where(eq(schema.aiSettings.taskType, testTaskType))
      .run();
  });

  describe('GET /api/ai-settings', () => {
    it('returns all AI settings', async () => {
      const res = await request(app).get('/api/ai-settings');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const testSetting = res.body.find((s: { taskType: string }) => s.taskType === testTaskType);
      expect(testSetting).toBeDefined();
      expect(testSetting.provider).toBe('claude');
    });
  });

  describe('PUT /api/ai-settings/:taskType', () => {
    it('updates AI settings', async () => {
      const res = await request(app)
        .put(`/api/ai-settings/${testTaskType}`)
        .send({ provider: 'ollama', model: 'llama3' });

      expect(res.status).toBe(200);
      expect(res.body.provider).toBe('ollama');
      expect(res.body.model).toBe('llama3');
    });

    it('returns 404 for unknown task type', async () => {
      const res = await request(app)
        .put('/api/ai-settings/nonexistent_task')
        .send({ provider: 'claude', model: 'test' });

      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid provider', async () => {
      const res = await request(app)
        .put(`/api/ai-settings/${testTaskType}`)
        .send({ provider: 'invalid_provider', model: 'test' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
