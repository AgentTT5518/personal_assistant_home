import { describe, it, expect } from 'vitest';
import type { ExtractedTransaction } from '../../../shared/types/index.js';
import { buildTransactionKey, deduplicateTransactions } from './dedup.js';

const txn = (overrides: Partial<ExtractedTransaction> = {}): ExtractedTransaction => ({
  date: '2024-01-15',
  description: 'Woolworths',
  amount: 45.5,
  type: 'debit',
  ...overrides,
});

describe('buildTransactionKey', () => {
  it('builds key from date, description, amount, institution', () => {
    const key = buildTransactionKey(txn(), 'CBA');
    expect(key).toBe('2024-01-15|Woolworths|45.50|CBA');
  });

  it('uses empty string for null institution', () => {
    const key = buildTransactionKey(txn(), null);
    expect(key).toBe('2024-01-15|Woolworths|45.50|');
  });

  it('produces consistent keys for floating-point amounts', () => {
    const key1 = buildTransactionKey(txn({ amount: 0.1 + 0.2 }), null);
    const key2 = buildTransactionKey(txn({ amount: 0.3 }), null);
    expect(key1).toBe(key2);
  });
});

describe('deduplicateTransactions', () => {
  it('returns all when no duplicates', () => {
    const incoming = [txn(), txn({ description: 'Coles', amount: 30 })];
    const result = deduplicateTransactions(incoming, 'CBA', new Set());
    expect(result).toHaveLength(2);
  });

  it('removes intra-batch duplicates', () => {
    const incoming = [txn(), txn(), txn({ description: 'Coles' })];
    const result = deduplicateTransactions(incoming, 'CBA', new Set());
    expect(result).toHaveLength(2);
  });

  it('removes duplicates against existing DB records', () => {
    const existing = new Set(['2024-01-15|Woolworths|45.50|CBA']);
    const incoming = [txn(), txn({ description: 'Coles', amount: 30 })];
    const result = deduplicateTransactions(incoming, 'CBA', existing);
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('Coles');
  });

  it('treats different institutions as non-duplicates', () => {
    const existing = new Set(['2024-01-15|Woolworths|45.50|CBA']);
    const incoming = [txn()];
    const result = deduplicateTransactions(incoming, 'ANZ', existing);
    expect(result).toHaveLength(1);
  });
});
