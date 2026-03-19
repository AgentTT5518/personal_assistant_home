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
    "institution": "card issuer name",
    "period": "YYYY-MM-DD to YYYY-MM-DD",
    "accountNumber": "last 4 digits only"
  }
}

Rules:
- All dates must be ISO format (YYYY-MM-DD)
- Amounts are always positive numbers
- Purchases, fees, interest charges → "debit"
- Payments, refunds, credits → "credit"
- Set isRecurring to true for subscriptions and regular charges
- Extract merchant names from descriptions
- openingBalance = previous statement balance; closingBalance = new balance
- Only include last 4 digits of card number`,
    },
    {
      role: 'user',
      content: `${context ? context + '\n\n' : ''}Extract all transactions and account details from this credit card statement:\n\n${text}`,
    },
  ];
}
