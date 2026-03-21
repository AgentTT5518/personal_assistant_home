import type { ExtractedTransaction } from '../../../shared/types/index.js';
import { log } from './logger.js';

/**
 * Hand-written OFX/QFX parser.
 * OFX files are SGML-based. We extract <STMTTRN> blocks and pull out
 * DTPOSTED, TRNAMT, NAME, MEMO, TRNTYPE fields.
 */
export function parseOfx(content: string): ExtractedTransaction[] {
  const transactions: ExtractedTransaction[] = [];

  // Find all STMTTRN blocks
  const txnRegex = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>))/gi;
  let match: RegExpExecArray | null;

  while ((match = txnRegex.exec(content)) !== null) {
    try {
      const block = match[1];

      const dtPosted = extractTag(block, 'DTPOSTED');
      const trnAmt = extractTag(block, 'TRNAMT');
      const name = extractTag(block, 'NAME');
      const memo = extractTag(block, 'MEMO');
      const trnType = extractTag(block, 'TRNTYPE');

      if (!dtPosted || !trnAmt) {
        log.warn('Skipping OFX transaction without date or amount');
        continue;
      }

      const date = parseOfxDate(dtPosted);
      if (!date) {
        log.warn('Skipping OFX transaction with unparseable date', { dtPosted });
        continue;
      }

      const amount = parseFloat(trnAmt);
      if (isNaN(amount)) {
        log.warn('Skipping OFX transaction with invalid amount', { trnAmt });
        continue;
      }

      const description = name || memo || 'Unknown transaction';
      const merchant = name && memo ? name : undefined;

      // OFX: negative amounts are debits, positive are credits
      // TRNTYPE can also indicate: DEBIT, CREDIT, CHECK, etc.
      let type: 'debit' | 'credit';
      if (trnType) {
        const upper = trnType.toUpperCase();
        type = upper === 'CREDIT' || upper === 'DEP' || upper === 'DIRECTDEP' ? 'credit' : 'debit';
      } else {
        type = amount < 0 ? 'debit' : 'credit';
      }

      transactions.push({
        date,
        description: description.trim(),
        amount: Math.abs(amount),
        type,
        ...(merchant ? { merchant: merchant.trim() } : {}),
      });
    } catch (error) {
      log.warn('Skipping malformed OFX transaction', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  return transactions;
}

function extractTag(block: string, tagName: string): string | null {
  // OFX SGML format: <TAGNAME>value (no closing tag, value ends at newline or next tag)
  const regex = new RegExp(`<${tagName}>([^<\\r\\n]+)`, 'i');
  const match = block.match(regex);
  return match ? match[1].trim() : null;
}

function parseOfxDate(raw: string): string | null {
  // OFX dates: YYYYMMDD or YYYYMMDDHHMMSS[.XXX:TZ]
  const dateMatch = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (dateMatch) {
    const [, y, m, d] = dateMatch;
    return `${y}-${m}-${d}`;
  }
  return null;
}
