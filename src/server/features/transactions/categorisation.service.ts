import { eq, isNull, inArray } from 'drizzle-orm';
import { db, schema } from '../../lib/db/index.js';
import { log } from './logger.js';

const BATCH_UPDATE_SIZE = 100;

interface RuleRow {
  id: string;
  categoryId: string;
  pattern: string;
  field: string;
  confidence: number | null;
}

function loadRules(): RuleRow[] {
  return db
    .select()
    .from(schema.categoryRules)
    .all()
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
}

/**
 * Match a single transaction against all rules. Returns categoryId or null.
 */
export function categoriseTransaction(
  transaction: { description: string; merchant: string | null },
  rules?: RuleRow[],
): string | null {
  const allRules = rules ?? loadRules();

  for (const rule of allRules) {
    try {
      const regex = new RegExp(rule.pattern, 'i');
      const fieldValue = rule.field === 'merchant' ? transaction.merchant : transaction.description;
      if (fieldValue && regex.test(fieldValue)) {
        return rule.categoryId;
      }
    } catch {
      // Skip invalid regex patterns
      log.warn('Invalid regex pattern in category rule', { ruleId: rule.id, pattern: rule.pattern });
    }
  }

  return null;
}

/**
 * Batch categorise specific transactions. Returns map of transactionId → categoryId.
 */
export function categoriseTransactionsBatch(
  transactionIds: string[],
): Map<string, string> {
  if (transactionIds.length === 0) return new Map();

  const rules = loadRules();
  if (rules.length === 0) return new Map();

  const txns = db
    .select()
    .from(schema.transactions)
    .where(inArray(schema.transactions.id, transactionIds))
    .all();

  const matches = new Map<string, string>();

  for (const txn of txns) {
    const categoryId = categoriseTransaction(
      { description: txn.description, merchant: txn.merchant },
      rules,
    );
    if (categoryId) {
      matches.set(txn.id, categoryId);
    }
  }

  // Batch update in DB
  if (matches.size > 0) {
    const entries = Array.from(matches.entries());
    const now = new Date().toISOString();

    db.transaction((tx) => {
      for (let i = 0; i < entries.length; i += BATCH_UPDATE_SIZE) {
        const batch = entries.slice(i, i + BATCH_UPDATE_SIZE);
        for (const [txnId, catId] of batch) {
          tx.update(schema.transactions)
            .set({ categoryId: catId, updatedAt: now })
            .where(eq(schema.transactions.id, txnId))
            .run();
        }
      }
    });
  }

  return matches;
}

/**
 * Run rule categorisation on all uncategorised transactions.
 */
export function runRuleCategorisation(): { categorised: number; total: number } {
  const uncategorised = db
    .select({ id: schema.transactions.id })
    .from(schema.transactions)
    .where(isNull(schema.transactions.categoryId))
    .all();

  if (uncategorised.length === 0) {
    return { categorised: 0, total: 0 };
  }

  const ids = uncategorised.map((t) => t.id);
  const matches = categoriseTransactionsBatch(ids);

  log.info('Rule categorisation complete', {
    categorised: matches.size,
    total: uncategorised.length,
  });

  return { categorised: matches.size, total: uncategorised.length };
}
