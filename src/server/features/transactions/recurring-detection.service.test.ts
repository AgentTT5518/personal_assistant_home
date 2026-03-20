import { describe, it, expect, beforeEach, vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { db, schema } from '../../lib/db/index.js';
import { detectRecurringTransactions, getRecurringSummary } from './recurring-detection.service.js';

vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

function seedDocument() {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.insert(schema.documents)
    .values({ id, filename: 'test.pdf', docType: 'bank_statement', processingStatus: 'completed', createdAt: now, updatedAt: now })
    .run();
  return id;
}

function seedTransaction(documentId: string, overrides: Partial<typeof schema.transactions.$inferInsert> = {}) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.insert(schema.transactions)
    .values({
      id,
      documentId,
      date: '2026-01-15',
      description: 'Test',
      amount: 10,
      type: 'debit',
      createdAt: now,
      updatedAt: now,
      ...overrides,
    })
    .run();
  return id;
}

describe('Recurring Detection Service', () => {
  beforeEach(() => {
    db.delete(schema.transactions).run();
    db.delete(schema.accountSummaries).run();
    db.delete(schema.documents).run();
  });

  describe('detectRecurringTransactions', () => {
    it('returns empty array when no transactions', () => {
      const groups = detectRecurringTransactions();
      expect(groups).toEqual([]);
    });

    it('detects monthly recurring transactions by merchant', () => {
      const docId = seedDocument();
      // Netflix subscription — ~$15 monthly for 4 months
      seedTransaction(docId, { merchant: 'Netflix', amount: 14.99, date: '2026-01-01' });
      seedTransaction(docId, { merchant: 'Netflix', amount: 14.99, date: '2026-02-01' });
      seedTransaction(docId, { merchant: 'Netflix', amount: 14.99, date: '2026-03-01' });
      seedTransaction(docId, { merchant: 'Netflix', amount: 15.49, date: '2026-03-29' });

      const groups = detectRecurringTransactions();
      expect(groups).toHaveLength(1);
      expect(groups[0].merchant).toBe('Netflix');
      expect(groups[0].frequency).toBe('monthly');
      expect(groups[0].transactionCount).toBe(4);
    });

    it('does not detect irregular transactions', () => {
      const docId = seedDocument();
      // Random grocery purchases at varying amounts and intervals
      seedTransaction(docId, { merchant: 'Coles', amount: 45, date: '2026-01-05' });
      seedTransaction(docId, { merchant: 'Coles', amount: 120, date: '2026-01-18' });
      seedTransaction(docId, { merchant: 'Coles', amount: 30, date: '2026-02-02' });

      const groups = detectRecurringTransactions();
      expect(groups).toHaveLength(0);
    });

    it('requires at least 3 transactions', () => {
      const docId = seedDocument();
      seedTransaction(docId, { merchant: 'Spotify', amount: 12.99, date: '2026-01-01' });
      seedTransaction(docId, { merchant: 'Spotify', amount: 12.99, date: '2026-02-01' });

      const groups = detectRecurringTransactions();
      expect(groups).toHaveLength(0);
    });

    it('marks detected transactions as isRecurring', () => {
      const docId = seedDocument();
      const txIds = [
        seedTransaction(docId, { merchant: 'Netflix', amount: 14.99, date: '2026-01-01' }),
        seedTransaction(docId, { merchant: 'Netflix', amount: 14.99, date: '2026-02-01' }),
        seedTransaction(docId, { merchant: 'Netflix', amount: 14.99, date: '2026-03-01' }),
      ];

      detectRecurringTransactions();

      for (const txId of txIds) {
        const tx = db.select().from(schema.transactions).where(
          eq(schema.transactions.id, txId),
        ).get();
        expect(tx?.isRecurring).toBe(true);
      }
    });
  });

  describe('getRecurringSummary', () => {
    it('returns empty array when no recurring transactions', () => {
      const groups = getRecurringSummary();
      expect(groups).toEqual([]);
    });

    it('returns grouped summary of recurring transactions', () => {
      const docId = seedDocument();
      seedTransaction(docId, { merchant: 'Netflix', amount: 14.99, date: '2026-01-01', isRecurring: true });
      seedTransaction(docId, { merchant: 'Netflix', amount: 14.99, date: '2026-02-01', isRecurring: true });
      seedTransaction(docId, { merchant: 'Netflix', amount: 14.99, date: '2026-03-01', isRecurring: true });

      const groups = getRecurringSummary();
      expect(groups).toHaveLength(1);
      expect(groups[0].merchant).toBe('Netflix');
      expect(groups[0].averageAmount).toBe(14.99);
      expect(groups[0].transactionCount).toBe(3);
    });
  });
});
