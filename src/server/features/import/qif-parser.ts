import type { ExtractedTransaction } from '../../../shared/types/index.js';
import { log } from './logger.js';

/**
 * Hand-written QIF parser.
 * QIF format is line-based:
 *   !Type:Bank (header)
 *   D<date>
 *   T<amount>
 *   P<payee>
 *   M<memo>
 *   L<category>
 *   ^ (record separator)
 */
export function parseQif(content: string): ExtractedTransaction[] {
  const transactions: ExtractedTransaction[] = [];
  const lines = content.split(/\r?\n/);

  let current: Partial<{
    date: string;
    amount: string;
    payee: string;
    memo: string;
  }> = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith('!')) {
      continue;
    }

    if (line === '^') {
      // Record separator — process current transaction
      if (current.date && current.amount) {
        try {
          const date = normaliseQifDate(current.date);
          if (!date) {
            log.warn('Skipping QIF record with unparseable date', { date: current.date });
            current = {};
            continue;
          }

          const amount = parseFloat(current.amount.replace(/,/g, ''));
          if (isNaN(amount)) {
            log.warn('Skipping QIF record with invalid amount', { amount: current.amount });
            current = {};
            continue;
          }

          const description = current.payee || current.memo || 'Unknown transaction';
          const merchant = current.payee || undefined;
          const type: 'debit' | 'credit' = amount < 0 ? 'debit' : 'credit';

          transactions.push({
            date,
            description: description.trim(),
            amount: Math.abs(amount),
            type,
            ...(merchant ? { merchant: merchant.trim() } : {}),
          });
        } catch (error) {
          log.warn('Skipping malformed QIF record', { error: error instanceof Error ? error.message : String(error) });
        }
      }
      current = {};
      continue;
    }

    const code = line[0];
    const value = line.slice(1).trim();

    switch (code) {
      case 'D':
        current.date = value;
        break;
      case 'T':
      case 'U':
        current.amount = value;
        break;
      case 'P':
        current.payee = value;
        break;
      case 'M':
        current.memo = value;
        break;
      // L (category), N (check number), C (cleared) — ignored
    }
  }

  return transactions;
}

function normaliseQifDate(raw: string): string | null {
  // QIF dates can be: MM/DD/YYYY, MM-DD-YYYY, MM/DD'YY, DD/MM/YYYY, etc.
  // Most common: MM/DD/YYYY or M/D/YYYY

  // Try MM/DD/YYYY or M/D/YYYY
  const slashMatch = raw.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})$/);
  if (slashMatch) {
    let [, m, d, y] = slashMatch;
    if (y.length === 2) {
      const yearNum = parseInt(y);
      y = yearNum > 50 ? `19${y}` : `20${y}`;
    }
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // QIF apostrophe format: M/D'YY
  const apoMatch = raw.match(/^(\d{1,2})[/\-](\d{1,2})'(\d{2})$/);
  if (apoMatch) {
    const [, m, d, yy] = apoMatch;
    const yearNum = parseInt(yy);
    const y = yearNum > 50 ? `19${yy}` : `20${yy}`;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  return null;
}
