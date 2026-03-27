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
      content: `You are a financial document parser. Extract structured data from credit card statements into JSON.

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
    "institution": "card issuer name",
    "period": "YYYY-MM-DD to YYYY-MM-DD",
    "accountNumber": "last 4 digits only"
  }
}

Example output for two transactions:
{"transactions":[{"date":"2025-12-01","description":"SPOTIFY SINGAPORE","amount":14.98,"type":"debit","merchant":"Spotify","isRecurring":true},{"date":"2025-12-05","description":"PAYMENT RECEIVED - THANK YOU","amount":500.00,"type":"credit","merchant":"","isRecurring":false}],"accountSummary":{"openingBalance":1200.00,"closingBalance":714.98,"totalCredits":500.00,"totalDebits":14.98,"currency":"SGD"},"metadata":{"institution":"OCBC","period":"2025-12-01 to 2025-12-31","accountNumber":"6844"}}

Rules:
- All dates must be ISO format (YYYY-MM-DD)
- Amounts are always positive numbers
- Purchases, fees, interest charges → "debit"
- Payments, refunds, credits → "credit"
- Set isRecurring to true for subscriptions and regular charges. If uncertain, set to false
- Extract merchant names from descriptions. If merchant cannot be determined, use an empty string ""
- openingBalance = previous statement balance; closingBalance = new balance
- Only include last 4 digits of card number
- All string fields MUST be strings, never null. Use "" for unknown values
- All number fields in accountSummary MUST be numbers, never null. Use 0 if unknown`,
    },
    {
      role: 'user',
      content: `${context ? context + '\n\n' : ''}Extract all transactions and account details from this credit card statement:\n\n${text}`,
    },
  ];
}
