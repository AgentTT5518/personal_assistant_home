import Papa from 'papaparse';
import type { ExtractedTransaction } from '../../../shared/types/index.js';
import type { ColumnMapping } from '../../../shared/types/index.js';
import { log } from './logger.js';

export interface CsvParseResult {
  headers: string[];
  rawRows: Record<string, string>[];
  transactions: ExtractedTransaction[];
}

export function parseCsvRaw(content: string): { headers: string[]; rawRows: Record<string, string>[] } {
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0) {
    log.warn('CSV parse warnings', { errors: result.errors.slice(0, 5) });
  }

  return {
    headers: result.meta.fields ?? [],
    rawRows: result.data,
  };
}

export function mapCsvRows(
  rawRows: Record<string, string>[],
  mapping: ColumnMapping,
): ExtractedTransaction[] {
  const transactions: ExtractedTransaction[] = [];

  for (const row of rawRows) {
    try {
      const dateRaw = row[mapping.date]?.trim();
      const descRaw = row[mapping.description]?.trim();

      if (!dateRaw || !descRaw) {
        continue;
      }

      const date = normaliseDate(dateRaw);
      if (!date) {
        log.warn('Skipping row with unparseable date', { dateRaw });
        continue;
      }

      let amount: number;
      let type: 'debit' | 'credit';

      if (mapping.debitAmount && mapping.creditAmount) {
        const debit = parseAmount(row[mapping.debitAmount]);
        const credit = parseAmount(row[mapping.creditAmount]);
        if (credit > 0) {
          amount = credit;
          type = 'credit';
        } else {
          amount = Math.abs(debit);
          type = 'debit';
        }
      } else {
        const rawAmount = parseAmount(row[mapping.amount]);
        if (rawAmount === 0 && !row[mapping.amount]?.trim()) {
          continue;
        }
        if (mapping.type && row[mapping.type]) {
          const typeVal = row[mapping.type].trim().toLowerCase();
          type = typeVal === 'credit' || typeVal === 'cr' ? 'credit' : 'debit';
          amount = Math.abs(rawAmount);
        } else {
          type = rawAmount < 0 ? 'debit' : 'credit';
          amount = Math.abs(rawAmount);
        }
      }

      const merchant = mapping.merchant ? (row[mapping.merchant]?.trim() || null) : null;

      transactions.push({
        date,
        description: descRaw,
        amount,
        type,
        ...(merchant ? { merchant } : {}),
      });
    } catch (error) {
      log.warn('Skipping malformed CSV row', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  return transactions;
}

function parseAmount(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[$,\s]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function normaliseDate(raw: string): string | null {
  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // MM/DD/YYYY — ambiguous, but try if day > 12
  const mdyMatch = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (mdyMatch) {
    const [, a, b, y] = mdyMatch;
    if (parseInt(a) > 12) {
      return `${y}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
    }
    return `${y}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
  }

  // YYYYMMDD
  const compactMatch = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) {
    const [, y, m, d] = compactMatch;
    return `${y}-${m}-${d}`;
  }

  // Try JS Date parse as fallback
  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}
