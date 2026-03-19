import type { ExtractedTransaction } from '../../../shared/types/index.js';

export function buildTransactionKey(t: ExtractedTransaction, institution: string | null): string {
  return `${t.date}|${t.description}|${t.amount.toFixed(2)}|${institution ?? ''}`;
}

export function deduplicateTransactions(
  incoming: ExtractedTransaction[],
  institution: string | null,
  existingKeys: Set<string>,
): ExtractedTransaction[] {
  const seen = new Set<string>();
  const result: ExtractedTransaction[] = [];

  for (const t of incoming) {
    const key = buildTransactionKey(t, institution);
    if (seen.has(key) || existingKeys.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(t);
  }

  return result;
}
