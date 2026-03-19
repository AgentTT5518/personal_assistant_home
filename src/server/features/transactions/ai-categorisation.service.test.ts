import { describe, it, expect, beforeEach, vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { db, schema, sqlite } from '../../lib/db/index.js';

// Mock the AI router before importing the service
vi.mock('../../lib/ai/router.js', () => ({
  routeToProvider: vi.fn(),
}));

import { aiCategoriseTransactions } from './ai-categorisation.service.js';
import { routeToProvider } from '../../lib/ai/router.js';

const mockedRouteToProvider = vi.mocked(routeToProvider);

function seedCategory(name: string) {
  const now = new Date().toISOString();
  const cat = { id: uuidv4(), name, color: '#ff0000', icon: 'star', isDefault: false, createdAt: now, updatedAt: now };
  db.insert(schema.categories).values(cat).run();
  return cat;
}

function seedDocument() {
  const now = new Date().toISOString();
  const doc = { id: uuidv4(), filename: 'test.pdf', docType: 'bank_statement', processingStatus: 'completed', createdAt: now, updatedAt: now };
  db.insert(schema.documents).values(doc).run();
  return doc;
}

function seedTransaction(documentId: string, description: string, merchant: string | null = null) {
  const now = new Date().toISOString();
  const txn = { id: uuidv4(), documentId, date: '2026-01-15', description, amount: 50.0, type: 'debit', categoryId: null, merchant, isRecurring: false, createdAt: now, updatedAt: now };
  db.insert(schema.transactions).values(txn).run();
  return txn;
}

describe('AI Categorisation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sqlite.exec('DELETE FROM category_rules');
    sqlite.exec('DELETE FROM transactions');
    sqlite.exec('DELETE FROM account_summaries');
    sqlite.exec('DELETE FROM documents');
    sqlite.exec('DELETE FROM categories');
  });

  it('categorises transactions from AI response', async () => {
    const cat = seedCategory('Groceries');
    const doc = seedDocument();
    const txn = seedTransaction(doc.id, 'WOOLWORTHS SYDNEY', 'Woolworths');

    mockedRouteToProvider.mockResolvedValueOnce(
      JSON.stringify({
        categorisations: [
          { transactionId: txn.id, categoryId: cat.id, confidence: 0.95 },
        ],
      }),
    );

    const result = await aiCategoriseTransactions([txn.id]);
    expect(result.categorised).toBe(1);
    expect(result.failed).toBe(0);

    const updated = db.select().from(schema.transactions).where(eq(schema.transactions.id, txn.id)).get();
    expect(updated?.categoryId).toBe(cat.id);
  });

  it('filters out low confidence results', async () => {
    const cat = seedCategory('Random');
    const doc = seedDocument();
    const txn = seedTransaction(doc.id, 'Mystery charge');

    mockedRouteToProvider.mockResolvedValueOnce(
      JSON.stringify({
        categorisations: [
          { transactionId: txn.id, categoryId: cat.id, confidence: 0.3 },
        ],
      }),
    );

    const result = await aiCategoriseTransactions([txn.id]);
    expect(result.categorised).toBe(0);

    const updated = db.select().from(schema.transactions).where(eq(schema.transactions.id, txn.id)).get();
    expect(updated?.categoryId).toBeNull();
  });

  it('auto-generates rules for high confidence matches', async () => {
    const cat = seedCategory('Transport');
    const doc = seedDocument();
    const txn = seedTransaction(doc.id, 'UBER TRIP', 'Uber');

    mockedRouteToProvider.mockResolvedValueOnce(
      JSON.stringify({
        categorisations: [
          { transactionId: txn.id, categoryId: cat.id, confidence: 0.95 },
        ],
      }),
    );

    await aiCategoriseTransactions([txn.id]);

    const rules = db.select().from(schema.categoryRules).where(eq(schema.categoryRules.categoryId, cat.id)).all();
    expect(rules.length).toBe(1);
    expect(rules[0].isAiGenerated).toBe(true);
    expect(rules[0].field).toBe('merchant');
  });

  it('handles AI response parsing errors gracefully', async () => {
    const doc = seedDocument();
    const txn = seedTransaction(doc.id, 'Some purchase');

    mockedRouteToProvider.mockResolvedValueOnce('not valid json at all');

    const result = await aiCategoriseTransactions([txn.id]);
    expect(result.categorised).toBe(0);
    expect(result.failed).toBe(1);
  });

  it('returns zero when all transactions already categorised', async () => {
    const cat = seedCategory('Already');
    const doc = seedDocument();
    const now = new Date().toISOString();
    const txnId = uuidv4();
    db.insert(schema.transactions).values({
      id: txnId,
      documentId: doc.id,
      date: '2026-01-15',
      description: 'Has category',
      amount: 50.0,
      type: 'debit',
      categoryId: cat.id,
      merchant: null,
      isRecurring: false,
      createdAt: now,
      updatedAt: now,
    }).run();

    const result = await aiCategoriseTransactions([txnId]);
    expect(result.categorised).toBe(0);
    expect(mockedRouteToProvider).not.toHaveBeenCalled();
  });
});
