import type { Message } from '../../../../shared/types/index.js';

export function buildPrompt(text: string, institution?: string, period?: string): Message[] {
  const context = [
    institution && `Preparer: ${institution}`,
    period && `Tax year: ${period}`,
  ]
    .filter(Boolean)
    .join('\n');

  return [
    {
      role: 'system',
      content: `You are a financial document parser. Extract structured data from tax returns into JSON.

Output ONLY valid JSON matching this exact schema (no markdown, no code fences):
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "line item description",
      "amount": 123.45,
      "type": "debit" | "credit",
      "merchant": null,
      "isRecurring": false
    }
  ],
  "accountSummary": {
    "totalCredits": number (total income),
    "totalDebits": number (total deductions),
    "currency": "AUD" (or detected currency)
  },
  "metadata": {
    "institution": "tax preparer or ATO",
    "period": "YYYY-MM-DD to YYYY-MM-DD (financial year)"
  }
}

Rules:
- All dates must be ISO format (YYYY-MM-DD). Use the financial year end date for all items.
- Map tax return components to transactions:
  - Income sources (salary, interest, dividends, rental) → "credit"
  - Deductions (work expenses, donations, self-education) → "debit"
  - Tax payable → "debit"; Tax refund → "credit"
- Amounts are always positive numbers
- isRecurring is generally false for tax items`,
    },
    {
      role: 'user',
      content: `${context ? context + '\n\n' : ''}Extract all income and deduction line items from this tax return:\n\n${text}`,
    },
  ];
}
