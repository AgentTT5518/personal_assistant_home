import type { DocumentType, Message } from '../../../../shared/types/index.js';
import { buildPrompt as bankStatement } from './bank-statement.js';
import { buildPrompt as creditCard } from './credit-card.js';
import { buildPrompt as payslip } from './payslip.js';
import { buildPrompt as taxReturn } from './tax-return.js';
import { buildPrompt as investmentReport } from './investment-report.js';

const promptBuilders: Record<
  DocumentType,
  (text: string, institution?: string, period?: string) => Message[]
> = {
  bank_statement: bankStatement,
  credit_card: creditCard,
  payslip,
  tax_return: taxReturn,
  investment_report: investmentReport,
};

export function getPromptForDocType(
  docType: DocumentType,
  text: string,
  institution?: string,
  period?: string,
): Message[] {
  const builder = promptBuilders[docType];
  return builder(text, institution, period);
}
