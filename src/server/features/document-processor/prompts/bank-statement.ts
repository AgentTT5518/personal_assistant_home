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

Output ONLY a single JSON object. No explanations, no markdown, no code fences, no text before or after the JSON.

Schema:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "transaction description",
      "amount": 123.45,
      "type": "debit",
      "merchant": "merchant name",
      "isRecurring": false
    }
  ],
  "accountSummary": {
    "openingBalance": 1000.00,
    "closingBalance": 900.00,
    "totalCredits": 500.00,
    "totalDebits": 600.00,
    "currency": "SGD"
  },
  "metadata": {
    "institution": "bank name",
    "period": "YYYY-MM-DD to YYYY-MM-DD",
    "accountNumber": "last 4 digits only"
  }
}

Example output for two transactions:
{"transactions":[{"date":"2025-11-01","description":"GRAB* A-12345678","amount":15.50,"type":"debit","merchant":"Grab","isRecurring":false},{"date":"2025-11-02","description":"SALARY NOV","amount":3500.00,"type":"credit","merchant":"","isRecurring":true}],"accountSummary":{"openingBalance":2000.00,"closingBalance":1984.50,"totalCredits":3500.00,"totalDebits":15.50,"currency":"SGD"},"metadata":{"institution":"DBS Bank","period":"2025-11-01 to 2025-11-30","accountNumber":"1234"}}

Rules:
- All dates must be ISO format (YYYY-MM-DD)
- Amounts are always positive numbers — use "type" to indicate direction
- Withdrawals, payments, fees, charges → "debit"
- Deposits, refunds, interest received → "credit"
- Set isRecurring to true for regular payments (rent, subscriptions, utilities). If uncertain, set to false
- Extract merchant names from descriptions when identifiable. If merchant cannot be determined, use an empty string ""
- Only include the last 4 digits of any account number for privacy
- All string fields MUST be strings, never null. Use "" for unknown values
- All number fields in accountSummary MUST be numbers, never null. Use 0 if unknown`,
    },
    {
      role: 'user',
      content: `${context ? context + '\n\n' : ''}Extract all transactions and account details from this bank statement:\n\n${text}`,
    },
  ];
}
