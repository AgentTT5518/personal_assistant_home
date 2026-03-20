import { eq } from 'drizzle-orm';
import { db, schema } from '../../lib/db/index.js';
import { log } from './logger.js';

export interface RecurringGroup {
  merchant: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  averageAmount: number;
  frequency: string;
  lastDate: string;
  nextExpectedDate: string;
  transactionCount: number;
}

function classifyFrequency(medianDays: number): string {
  if (medianDays <= 10) return 'weekly';
  if (medianDays <= 20) return 'biweekly';
  if (medianDays <= 45) return 'monthly';
  if (medianDays <= 120) return 'quarterly';
  return 'yearly';
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function daysBetween(a: string, b: string): number {
  const d1 = new Date(a + 'T00:00:00Z').getTime();
  const d2 = new Date(b + 'T00:00:00Z').getTime();
  return Math.abs(d2 - d1) / (1000 * 60 * 60 * 24);
}

export function detectRecurringTransactions(): RecurringGroup[] {
  const allTx = db
    .select({
      id: schema.transactions.id,
      date: schema.transactions.date,
      description: schema.transactions.description,
      amount: schema.transactions.amount,
      type: schema.transactions.type,
      merchant: schema.transactions.merchant,
      categoryId: schema.transactions.categoryId,
    })
    .from(schema.transactions)
    .where(eq(schema.transactions.type, 'debit'))
    .all();

  // Group by normalized merchant (or description if no merchant)
  const groups = new Map<string, typeof allTx>();
  for (const tx of allTx) {
    const key = (tx.merchant || tx.description).toLowerCase().trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(tx);
  }

  const detectedGroups: RecurringGroup[] = [];
  const recurringTxIds: string[] = [];

  for (const [, txs] of groups) {
    // Need at least 3 occurrences
    if (txs.length < 3) continue;

    // Check amount tolerance: within 10% of median
    const amounts = txs.map((t) => t.amount);
    const medianAmount = median(amounts);
    const tolerance = medianAmount * 0.1;
    const amountMatch = amounts.every((a) => Math.abs(a - medianAmount) <= tolerance);
    if (!amountMatch) continue;

    // Check regular intervals
    const sortedDates = txs.map((t) => t.date).sort();
    const intervals: number[] = [];
    for (let i = 1; i < sortedDates.length; i++) {
      intervals.push(daysBetween(sortedDates[i - 1], sortedDates[i]));
    }

    const medianInterval = median(intervals);
    // Skip if intervals are too erratic (any interval deviates >5 days from median)
    const regularEnough = intervals.every((d) => Math.abs(d - medianInterval) <= 5);
    if (!regularEnough) continue;

    const frequency = classifyFrequency(medianInterval);
    const lastDate = sortedDates[sortedDates.length - 1];
    const nextExpectedDate = addDays(lastDate, Math.round(medianInterval));

    // Look up category info from the first transaction with a category
    const withCategory = txs.find((t) => t.categoryId);
    let categoryName: string | null = null;
    let categoryColor: string | null = null;
    const categoryId = withCategory?.categoryId ?? null;

    if (categoryId) {
      const cat = db
        .select({ name: schema.categories.name, color: schema.categories.color })
        .from(schema.categories)
        .where(eq(schema.categories.id, categoryId))
        .get();
      if (cat) {
        categoryName = cat.name;
        categoryColor = cat.color;
      }
    }

    detectedGroups.push({
      merchant: (txs[0].merchant || txs[0].description),
      categoryId,
      categoryName,
      categoryColor,
      averageAmount: Math.round((amounts.reduce((s, a) => s + a, 0) / amounts.length) * 100) / 100,
      frequency,
      lastDate,
      nextExpectedDate,
      transactionCount: txs.length,
    });

    recurringTxIds.push(...txs.map((t) => t.id));
  }

  // Update all detected transactions as recurring
  if (recurringTxIds.length > 0) {
    const now = new Date().toISOString();
    db.transaction((trx) => {
      for (const txId of recurringTxIds) {
        trx
          .update(schema.transactions)
          .set({ isRecurring: true, updatedAt: now })
          .where(eq(schema.transactions.id, txId))
          .run();
      }
    });
    log.info('Marked transactions as recurring', { count: recurringTxIds.length });
  }

  return detectedGroups;
}

export function getRecurringSummary(): RecurringGroup[] {
  // Get all transactions marked as recurring
  const allTx = db
    .select({
      id: schema.transactions.id,
      date: schema.transactions.date,
      description: schema.transactions.description,
      amount: schema.transactions.amount,
      merchant: schema.transactions.merchant,
      categoryId: schema.transactions.categoryId,
    })
    .from(schema.transactions)
    .where(eq(schema.transactions.isRecurring, true))
    .all();

  if (allTx.length === 0) return [];

  // Group by normalized merchant
  const groups = new Map<string, typeof allTx>();
  for (const tx of allTx) {
    const key = (tx.merchant || tx.description).toLowerCase().trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(tx);
  }

  const result: RecurringGroup[] = [];
  for (const [, txs] of groups) {
    const amounts = txs.map((t) => t.amount);
    const sortedDates = txs.map((t) => t.date).sort();
    const intervals: number[] = [];
    for (let i = 1; i < sortedDates.length; i++) {
      intervals.push(daysBetween(sortedDates[i - 1], sortedDates[i]));
    }
    const medianInterval = intervals.length > 0 ? median(intervals) : 30;
    const frequency = classifyFrequency(medianInterval);
    const lastDate = sortedDates[sortedDates.length - 1];
    const nextExpectedDate = addDays(lastDate, Math.round(medianInterval));

    const withCategory = txs.find((t) => t.categoryId);
    let categoryName: string | null = null;
    let categoryColor: string | null = null;
    const categoryId = withCategory?.categoryId ?? null;

    if (categoryId) {
      const cat = db
        .select({ name: schema.categories.name, color: schema.categories.color })
        .from(schema.categories)
        .where(eq(schema.categories.id, categoryId))
        .get();
      if (cat) {
        categoryName = cat.name;
        categoryColor = cat.color;
      }
    }

    result.push({
      merchant: (txs[0].merchant || txs[0].description),
      categoryId,
      categoryName,
      categoryColor,
      averageAmount: Math.round((amounts.reduce((s, a) => s + a, 0) / amounts.length) * 100) / 100,
      frequency,
      lastDate,
      nextExpectedDate,
      transactionCount: txs.length,
    });
  }

  return result;
}
