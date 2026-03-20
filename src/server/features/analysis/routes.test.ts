import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../../app.js';
import { db, schema, sqlite } from '../../lib/db/index.js';
import type { AnalysisInsights } from '../../../shared/types/index.js';

// Mock the AI router
vi.mock('../../lib/ai/router.js', () => ({
  routeToProvider: vi.fn(),
}));

import { routeToProvider } from '../../lib/ai/router.js';

const mockedRouteToProvider = vi.mocked(routeToProvider);

const MOCK_INSIGHTS: AnalysisInsights = {
  period: { from: '2026-01-01', to: '2026-01-31' },
  currency: 'AUD',
  summary: { totalIncome: 5000, totalExpenses: 3000, netAmount: 2000, transactionCount: 10 },
  sections: [
    { title: 'Spending Overview', type: 'overview', content: 'Text', highlights: ['P1'] },
    { title: 'Top Categories', type: 'categories', content: 'Text', highlights: ['P1'] },
    { title: 'Trends', type: 'trends', content: 'Text', highlights: ['P1'] },
    { title: 'Anomalies', type: 'anomalies', content: 'Text', highlights: ['P1'] },
    { title: 'Recommendations', type: 'recommendations', content: 'Text', highlights: ['P1'] },
  ],
};

function seedDocument() {
  const now = new Date().toISOString();
  const doc = { id: uuidv4(), filename: 'test.pdf', docType: 'bank_statement', processingStatus: 'completed', createdAt: now, updatedAt: now };
  db.insert(schema.documents).values(doc).run();
  return doc;
}

function seedTransaction(documentId: string) {
  const now = new Date().toISOString();
  db.insert(schema.transactions).values({
    id: uuidv4(), documentId, date: '2026-01-15', description: 'Test', amount: 50, type: 'debit',
    categoryId: null, merchant: null, isRecurring: false, createdAt: now, updatedAt: now,
  }).run();
}

function seedSnapshot() {
  const now = new Date().toISOString();
  const id = uuidv4();
  db.insert(schema.analysisSnapshots).values({
    id, snapshotType: 'analysis_insights', data: JSON.stringify(MOCK_INSIGHTS),
    generatedAt: now, createdAt: now, updatedAt: now,
  }).run();
  return id;
}

describe('Analysis Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sqlite.exec('DELETE FROM analysis_snapshots');
    sqlite.exec('DELETE FROM category_rules');
    sqlite.exec('DELETE FROM transactions');
    sqlite.exec('DELETE FROM account_summaries');
    sqlite.exec('DELETE FROM documents');
    sqlite.exec('DELETE FROM categories');
    sqlite.exec('DELETE FROM app_settings');
  });

  describe('POST /api/analysis/generate', () => {
    it('generates analysis and returns snapshot', async () => {
      const doc = seedDocument();
      seedTransaction(doc.id);
      mockedRouteToProvider.mockResolvedValueOnce(JSON.stringify(MOCK_INSIGHTS));

      const res = await request(app)
        .post('/api/analysis/generate')
        .send({ dateFrom: '2026-01-01', dateTo: '2026-01-31' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();
      expect(res.body.data.sections).toHaveLength(5);
    });

    it('returns 400 when no transactions exist', async () => {
      const res = await request(app)
        .post('/api/analysis/generate')
        .send({ dateFrom: '2026-01-01', dateTo: '2026-01-31' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('NO_TRANSACTIONS');
    });

    it('returns 502 when AI response is unparseable after retry', async () => {
      const doc = seedDocument();
      seedTransaction(doc.id);
      mockedRouteToProvider
        .mockResolvedValueOnce('bad')
        .mockResolvedValueOnce('still bad');

      const res = await request(app)
        .post('/api/analysis/generate')
        .send({});

      expect(res.status).toBe(502);
      expect(res.body.error.code).toBe('AI_PARSE_ERROR');
    });

    it('validates date format', async () => {
      const res = await request(app)
        .post('/api/analysis/generate')
        .send({ dateFrom: 'not-a-date' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/analysis/snapshots', () => {
    it('returns empty list', async () => {
      const res = await request(app).get('/api/analysis/snapshots');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns snapshot metadata with period', async () => {
      seedSnapshot();

      const res = await request(app).get('/api/analysis/snapshots');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].period.from).toBe('2026-01-01');
      expect(res.body[0].period.to).toBe('2026-01-31');
    });
  });

  describe('GET /api/analysis/snapshots/:id', () => {
    it('returns full snapshot', async () => {
      const id = seedSnapshot();

      const res = await request(app).get(`/api/analysis/snapshots/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.sections).toHaveLength(5);
    });

    it('returns 404 for non-existent snapshot', async () => {
      const res = await request(app).get(`/api/analysis/snapshots/${uuidv4()}`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('SNAPSHOT_NOT_FOUND');
    });
  });

  describe('DELETE /api/analysis/snapshots/:id', () => {
    it('deletes existing snapshot', async () => {
      const id = seedSnapshot();

      const res = await request(app).delete(`/api/analysis/snapshots/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const getRes = await request(app).get(`/api/analysis/snapshots/${id}`);
      expect(getRes.status).toBe(404);
    });

    it('returns 404 for non-existent snapshot', async () => {
      const res = await request(app).delete(`/api/analysis/snapshots/${uuidv4()}`);
      expect(res.status).toBe(404);
    });
  });
});
