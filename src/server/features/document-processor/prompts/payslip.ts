import type { Message } from '../../../../shared/types/index.js';

export function buildPrompt(text: string, institution?: string, period?: string): Message[] {
  const context = [
    institution && `Employer: ${institution}`,
    period && `Pay period: ${period}`,
  ]
    .filter(Boolean)
    .join('\n');

  return [
    {
      role: 'system',
      content: `You are a financial document parser. Extract structured data from payslips into JSON.

Output ONLY valid JSON matching this exact schema (no markdown, no code fences):
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "line item description",
      "amount": 123.45,
      "type": "debit" | "credit",
      "merchant": null,
      "isRecurring": true
    }
  ],
  "accountSummary": {
    "totalCredits": number (gross pay),
    "totalDebits": number (total deductions),
    "currency": "AUD" (or detected currency)
  },
  "metadata": {
    "institution": "employer name",
    "period": "YYYY-MM-DD to YYYY-MM-DD"
  }
}

Rules:
- All dates must be ISO format (YYYY-MM-DD). Use the pay date for all line items.
- Map payslip components to transactions:
  - Gross salary, allowances, bonuses → "credit"
  - Tax, super, deductions, levies → "debit"
- Amounts are always positive numbers
- Set isRecurring to true for all regular pay components
- Net pay should NOT be a separate transaction (it's derived from credits - debits)`,
    },
    {
      role: 'user',
      content: `${context ? context + '\n\n' : ''}Extract all pay components and deductions from this payslip:\n\n${text}`,
    },
  ];
}
