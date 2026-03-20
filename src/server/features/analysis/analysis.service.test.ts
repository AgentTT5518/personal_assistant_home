import { describe, it, expect, beforeEach, vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { db, schema, sqlite } from '../../lib/db/index.js';
import type { AnalysisInsights } from '../../../shared/types/index.js';

// Mock the AI router before importing the service
vi.mock('../../lib/ai/router.js', () => ({
  routeToProvider: vi.fn(),
}));

import { generateAnalysis, listSnapshots, getSnapshot, deleteSnapshot } from './analysis.service.js';
import { routeToProvider } from '../../lib/ai/router.js';

const mockedRouteToProvider = vi.mocked(routeToProvider);

const MOCK_INSIGHTS: AnalysisInsights = {
  period: { from: '2026-01-01', to: '2026-01-31' },
  currency: 'AUD',
  summary: {
    totalIncome: 5000,
    totalExpenses: 3000,
    netAmount: 2000,
    transactionCount: 10,
  },
  sections: [
    { title: 'Spending Overview', type: 'overview', content: 'Overview text', highlights: ['Point 1'] },
    { title: 'Top Categories', type: 'categories', content: 'Categories text', highlights: ['Point 1'] },
    { title: 'Trends', type: 'trends', content: 'Trends text', highlights: ['Point 1'] },
    { title: 'Anomalies', type: 'anomalies', content: 'Anomalies text', highlights: ['Point 1'] },
    { title: 'Recommendations', type: 'recommendations', content: 'Recommendations text', highlights: ['Point 1'] },
  ],
};

function seedDocument() {
  const now = new Date().toISOString();
  const doc = { id: uuidv4(), filename: 'test.pdf', docType: 'bank_statement', processingStatus: 'completed', createdAt: now, updatedAt: now };
  db.insert(schema.documents).values(doc).run();
  return doc;
}

function seedTransaction(documentId: string, opts: { date?: string; type?: string; amount?: number; merchant?: string | null; categoryId?: string | null } = {}) {
  const now = new Date().toISOString();
  const txn = {
    id: uuidv4(),
    documentId,
    date: opts.date ?? '2026-01-15',
    description: 'Test transaction',
    amount: opts.amount ?? 50.0,
    type: opts.type ?? 'debit',
    categoryId: opts.categoryId ?? null,
    merchant: opts.merchant ?? null,
    isRecurring: false,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(schema.transactions).values(txn).run();
  return txn;
}

function seedSnapshot(data: AnalysisInsights) {
  const now = new Date().toISOString();
  const id = uuidv4();
  db.insert(schema.analysisSnapshots).values({
    id,
    snapshotType: 'analysis_insights',
    data: JSON.stringify(data),
    generatedAt: now,
    createdAt: now,
    updatedAt: now,
  }).run();
  return id;
}

describe('Analysis Service', () => {
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

  describe('generateAnalysis', () => {
    it('generates analysis from AI and saves snapshot', async () => {
      const doc = seedDocument();
      seedTransaction(doc.id, { type: 'debit', amount: 100 });
      seedTransaction(doc.id, { type: 'credit', amount: 200 });

      mockedRouteToProvider.mockResolvedValueOnce(JSON.stringify(MOCK_INSIGHTS));

      const result = await generateAnalysis('2026-01-01', '2026-01-31');

      expect(result.id).toBeDefined();
      expect(result.snapshotType).toBe('analysis_insights');
      expect(result.data.sections).toHaveLength(5);
      expect(result.generatedAt).toBeDefined();

      // Verify snapshot was saved to DB
      const saved = db.select().from(schema.analysisSnapshots).all();
      expect(saved).toHaveLength(1);
      expect(saved[0].id).toBe(result.id);
    });

    it('throws when no transactions exist', async () => {
      await expect(generateAnalysis('2026-01-01', '2026-01-31'))
        .rejects.toThrow('No transactions found');

      expect(mockedRouteToProvider).not.toHaveBeenCalled();
    });

    it('retries on malformed AI response and succeeds', async () => {
      const doc = seedDocument();
      seedTransaction(doc.id);

      // First call returns invalid JSON, second returns valid
      mockedRouteToProvider
        .mockResolvedValueOnce('not valid json')
        .mockResolvedValueOnce(JSON.stringify(MOCK_INSIGHTS));

      const result = await generateAnalysis();

      expect(mockedRouteToProvider).toHaveBeenCalledTimes(2);
      expect(result.data.sections).toHaveLength(5);
    });

    it('throws AI_PARSE_ERROR after two failed attempts', async () => {
      const doc = seedDocument();
      seedTransaction(doc.id);

      mockedRouteToProvider
        .mockResolvedValueOnce('bad json')
        .mockResolvedValueOnce('still bad json');

      await expect(generateAnalysis()).rejects.toThrow('Failed to parse AI response after retry');
    });

    it('includes merchant data in prompt', async () => {
      const doc = seedDocument();
      seedTransaction(doc.id, { merchant: 'Woolworths', amount: 100 });
      seedTransaction(doc.id, { merchant: 'Woolworths', amount: 50 });

      mockedRouteToProvider.mockResolvedValueOnce(JSON.stringify(MOCK_INSIGHTS));

      await generateAnalysis();

      const callArgs = mockedRouteToProvider.mock.calls[0];
      const userMessage = callArgs[1].find((m) => m.role === 'user');
      expect(userMessage?.content).toContain('Woolworths');
    });

    it('sends system message in messages array', async () => {
      const doc = seedDocument();
      seedTransaction(doc.id);

      mockedRouteToProvider.mockResolvedValueOnce(JSON.stringify(MOCK_INSIGHTS));

      await generateAnalysis();

      const callArgs = mockedRouteToProvider.mock.calls[0];
      const systemMessage = callArgs[1].find((m) => m.role === 'system');
      expect(systemMessage).toBeDefined();
      expect(systemMessage?.content).toContain('personal finance analyst');
    });
  });

  describe('listSnapshots', () => {
    it('returns empty array when no snapshots exist', () => {
      const result = listSnapshots();
      expect(result).toEqual([]);
    });

    it('returns snapshots with period extracted via JSON_EXTRACT', () => {
      seedSnapshot(MOCK_INSIGHTS);

      const result = listSnapshots();
      expect(result).toHaveLength(1);
      expect(result[0].period.from).toBe('2026-01-01');
      expect(result[0].period.to).toBe('2026-01-31');
      expect(result[0].snapshotType).toBe('analysis_insights');
    });

    it('returns snapshots ordered by generatedAt descending', () => {
      const insights1 = { ...MOCK_INSIGHTS, period: { from: '2026-01-01', to: '2026-01-31' } };
      const insights2 = { ...MOCK_INSIGHTS, period: { from: '2026-02-01', to: '2026-02-28' } };
      seedSnapshot(insights1);
      seedSnapshot(insights2);

      const result = listSnapshots();
      expect(result).toHaveLength(2);
      // Most recent first
      expect(result[0].generatedAt >= result[1].generatedAt).toBe(true);
    });
  });

  describe('getSnapshot', () => {
    it('returns full snapshot with parsed data', () => {
      const id = seedSnapshot(MOCK_INSIGHTS);

      const result = getSnapshot(id);
      expect(result).not.toBeNull();
      expect(result!.data.sections).toHaveLength(5);
      expect(result!.data.currency).toBe('AUD');
    });

    it('returns null for non-existent snapshot', () => {
      const result = getSnapshot(uuidv4());
      expect(result).toBeNull();
    });
  });

  describe('deleteSnapshot', () => {
    it('deletes existing snapshot', () => {
      const id = seedSnapshot(MOCK_INSIGHTS);

      const deleted = deleteSnapshot(id);
      expect(deleted).toBe(true);

      const remaining = db.select().from(schema.analysisSnapshots).all();
      expect(remaining).toHaveLength(0);
    });

    it('returns false for non-existent snapshot', () => {
      const deleted = deleteSnapshot(uuidv4());
      expect(deleted).toBe(false);
    });
  });
});
