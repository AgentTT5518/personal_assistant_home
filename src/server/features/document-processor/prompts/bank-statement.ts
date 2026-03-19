import type { Message } from '../../../../shared/types/index.js';

export function buildPrompt(text: string, institution?: string, period?: string): Message[] {
  const context = [
    institution && `Institution: ${institution}`,
    period && `Statement period: ${period}`,
  ]
    .filter(Boolean)
    .join('\n');

  return [
    {
      role: 'system',
      content: `You are a financial document parser. Extract structured data from bank statements into JSON.

Output ONLY valid JSON matching this exact schema (no markdown, no code fences):
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "transaction description",
      "amount": 123.45,
      "type": "debit" | "credit",
      "merchant": "merchant name or null",
      "isRecurring": true | false
    }
  ],
  "accountSummary": {
    "openingBalance": number or null,
    "closingBalance": number or null,
    "totalCredits": number or null,
    "totalDebits": number or null,
    "currency": "AUD" (or detected currency)
  },
  "metadata": {
    "institution": "bank name",
    "period": "YYYY-MM-DD to YYYY-MM-DD",
    "accountNumber": "last 4 digits only"
  }
}

Rules:
- All dates must be ISO format (YYYY-MM-DD)
- Amounts are always positive numbers — use "type" to indicate direction
- Withdrawals, payments, fees, charges → "debit"
- Deposits, refunds, interest received → "credit"
- Set isRecurring to true for regular payments (rent, subscriptions, utilities)
- Extract merchant names from descriptions when identifiable
- Only include the last 4 digits of any account number for privacy
- If a field cannot be determined, omit it or set to null`,
    },
    {
      role: 'user',
      content: `${context ? context + '\n\n' : ''}Extract all transactions and account details from this bank statement:\n\n${text}`,
    },
  ];
}
