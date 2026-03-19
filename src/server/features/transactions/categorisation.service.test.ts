import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { db, schema, sqlite } from '../../lib/db/index.js';
import {
  categoriseTransaction,
  categoriseTransactionsBatch,
  runRuleCategorisation,
} from './categorisation.service.js';

function seedCategory(name: string) {
  const now = new Date().toISOString();
  const cat = { id: uuidv4(), name, color: '#ff0000', icon: 'star', isDefault: false, createdAt: now, updatedAt: now };
  db.insert(schema.categories).values(cat).run();
  return cat;
}

function seedRule(categoryId: string, pattern: string, field = 'description', confidence = 1.0) {
  const now = new Date().toISOString();
  const rule = { id: uuidv4(), categoryId, pattern, field, isAiGenerated: false, confidence, createdAt: now, updatedAt: now };
  db.insert(schema.categoryRules).values(rule).run();
  return rule;
}

function seedDocument() {
  const now = new Date().toISOString();
  const doc = { id: uuidv4(), filename: 'test.pdf', docType: 'bank_statement', processingStatus: 'completed', createdAt: now, updatedAt: now };
  db.insert(schema.documents).values(doc).run();
  return doc;
}

function seedTransaction(documentId: string, description: string, merchant: string | null = null, categoryId: string | null = null) {
  const now = new Date().toISOString();
  const txn = { id: uuidv4(), documentId, date: '2026-01-15', description, amount: 50.0, type: 'debit', categoryId, merchant, isRecurring: false, createdAt: now, updatedAt: now };
  db.insert(schema.transactions).values(txn).run();
  return txn;
}

describe('Categorisation Service', () => {
  beforeEach(() => {
    sqlite.exec('DELETE FROM category_rules');
    sqlite.exec('DELETE FROM transactions');
    sqlite.exec('DELETE FROM account_summaries');
    sqlite.exec('DELETE FROM documents');
    sqlite.exec('DELETE FROM categories');
  });

  describe('categoriseTransaction', () => {
    it('returns categoryId when pattern matches description', () => {
      const cat = seedCategory('Groceries');
      const rules = [{ id: uuidv4(), categoryId: cat.id, pattern: 'woolworths|coles', field: 'description', confidence: 1.0 }];

      const result = categoriseTransaction({ description: 'WOOLWORTHS SYDNEY', merchant: null }, rules);
      expect(result).toBe(cat.id);
    });

    it('returns categoryId when pattern matches merchant field', () => {
      const cat = seedCategory('Dining');
      const rules = [{ id: uuidv4(), categoryId: cat.id, pattern: 'mcdonalds', field: 'merchant', confidence: 1.0 }];

      const result = categoriseTransaction({ description: 'Purchase', merchant: 'McDonalds' }, rules);
      expect(result).toBe(cat.id);
    });

    it('returns null when no rules match', () => {
      const rules = [{ id: uuidv4(), categoryId: uuidv4(), pattern: 'nomatch', field: 'description', confidence: 1.0 }];

      const result = categoriseTransaction({ description: 'Random purchase', merchant: null }, rules);
      expect(result).toBeNull();
    });

    it('highest confidence rule wins when multiple match', () => {
      const cat1 = seedCategory('General');
      const cat2 = seedCategory('Specific');
      const rules = [
        { id: uuidv4(), categoryId: cat2.id, pattern: 'purchase', field: 'description', confidence: 0.9 },
        { id: uuidv4(), categoryId: cat1.id, pattern: 'purchase', field: 'description', confidence: 0.5 },
      ];
      // Rules sorted by confidence DESC
      rules.sort((a, b) => b.confidence - a.confidence);

      const result = categoriseTransaction({ description: 'A purchase', merchant: null }, rules);
      expect(result).toBe(cat2.id);
    });

    it('is case-insensitive', () => {
      const cat = seedCategory('Test');
      const rules = [{ id: uuidv4(), categoryId: cat.id, pattern: 'UPPER', field: 'description', confidence: 1.0 }];

      const result = categoriseTransaction({ description: 'upper case test', merchant: null }, rules);
      expect(result).toBe(cat.id);
    });
  });

  describe('categoriseTransactionsBatch', () => {
    it('updates matching transactions in DB', () => {
      const cat = seedCategory('Groceries');
      seedRule(cat.id, 'woolworths');
      const doc = seedDocument();
      const txn = seedTransaction(doc.id, 'WOOLWORTHS SYDNEY');

      const matches = categoriseTransactionsBatch([txn.id]);
      expect(matches.size).toBe(1);
      expect(matches.get(txn.id)).toBe(cat.id);

      // Verify DB update
      const updated = db.select().from(schema.transactions).where(eq(schema.transactions.id, txn.id)).get();
      expect(updated?.categoryId).toBe(cat.id);
    });

    it('returns empty map when no rules exist', () => {
      const doc = seedDocument();
      const txn = seedTransaction(doc.id, 'Some purchase');

      const matches = categoriseTransactionsBatch([txn.id]);
      expect(matches.size).toBe(0);
    });
  });

  describe('runRuleCategorisation', () => {
    it('categorises uncategorised transactions', () => {
      const cat = seedCategory('Transport');
      seedRule(cat.id, 'uber|lyft');
      const doc = seedDocument();
      seedTransaction(doc.id, 'UBER TRIP', null, null);
      seedTransaction(doc.id, 'LYFT RIDE', null, null);
      seedTransaction(doc.id, 'Random purchase', null, null);

      const result = runRuleCategorisation();
      expect(result.total).toBe(3);
      expect(result.categorised).toBe(2);
    });

    it('skips already categorised transactions', () => {
      const cat = seedCategory('Already');
      seedRule(cat.id, '.*'); // matches everything
      const doc = seedDocument();
      seedTransaction(doc.id, 'Has category', null, cat.id);

      const result = runRuleCategorisation();
      expect(result.total).toBe(0);
      expect(result.categorised).toBe(0);
    });
  });
});
