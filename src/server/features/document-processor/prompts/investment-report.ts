import type { Message } from '../../../../shared/types/index.js';

export function buildPrompt(text: string, institution?: string, period?: string): Message[] {
  const context = [
    institution && `Institution: ${institution}`,
    period && `Report period: ${period}`,
  ]
    .filter(Boolean)
    .join('\n');

  return [
    {
      role: 'system',
      content: `You are a financial document parser. Extract structured data from investment reports into JSON.

Output ONLY valid JSON matching this exact schema (no markdown, no code fences):
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "transaction description",
      "amount": 123.45,
      "type": "debit" | "credit",
      "merchant": "fund/asset name or null",
      "isRecurring": true | false
    }
  ],
  "accountSummary": {
    "openingBalance": number (portfolio value start),
    "closingBalance": number (portfolio value end),
    "totalCredits": number (total inflows + gains),
    "totalDebits": number (total outflows + losses),
    "currency": "AUD" (or detected currency)
  },
  "metadata": {
    "institution": "broker/platform name",
    "period": "YYYY-MM-DD to YYYY-MM-DD",
    "accountNumber": "last 4 digits only"
  }
}

Rules:
- All dates must be ISO format (YYYY-MM-DD)
- Map investment activities to transactions:
  - Dividends, distributions, interest, capital gains → "credit"
  - Management fees, brokerage, capital losses → "debit"
  - Contributions/deposits → "credit"; Withdrawals → "debit"
- Use fund/asset name as the merchant field
- Amounts are always positive numbers
- Set isRecurring for regular distributions and contributions`,
    },
    {
      role: 'user',
      content: `${context ? context + '\n\n' : ''}Extract all investment transactions and portfolio details from this report:\n\n${text}`,
    },
  ];
}
