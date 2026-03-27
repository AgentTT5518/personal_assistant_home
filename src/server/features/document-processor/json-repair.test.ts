import { describe, it, expect } from 'vitest';
import { repairJson, parseAiResponse } from './json-repair.js';

describe('repairJson', () => {
  it('returns valid JSON unchanged', () => {
    const valid = '{"transactions":[],"accountSummary":{"currency":"SGD"}}';
    const result = repairJson(valid);
    expect(result.repaired).toBe(valid);
    expect(result.repairs).toHaveLength(0);
  });

  it('strips markdown code fences', () => {
    const input = '```json\n{"transactions":[]}\n```';
    const result = repairJson(input);
    expect(JSON.parse(result.repaired)).toEqual({ transactions: [] });
    expect(result.repairs).toContain('stripped markdown code fences');
  });

  it('strips markdown code fences without language tag', () => {
    const input = '```\n{"transactions":[]}\n```';
    const result = repairJson(input);
    expect(JSON.parse(result.repaired)).toEqual({ transactions: [] });
  });

  it('strips DeepSeek-R1 <think> blocks', () => {
    const input = '<think>\nLet me analyze this...\n</think>\n{"transactions":[]}';
    const result = repairJson(input);
    expect(JSON.parse(result.repaired)).toEqual({ transactions: [] });
    expect(result.repairs).toContain('stripped <think> reasoning blocks');
  });

  it('trims text before first { and after last }', () => {
    const input = 'Here is the JSON:\n{"transactions":[]}\nDone!';
    const result = repairJson(input);
    expect(JSON.parse(result.repaired)).toEqual({ transactions: [] });
    expect(result.repairs).toContain('trimmed to outermost braces');
  });

  it('fixes unquoted property names', () => {
    const input = '{transactions: [], accountSummary: {currency: "SGD"}}';
    const result = repairJson(input);
    expect(result.repairs).toContain('fixed unquoted property names');
    expect(JSON.parse(result.repaired)).toEqual({
      transactions: [],
      accountSummary: { currency: 'SGD' },
    });
  });

  it('removes trailing commas', () => {
    const input = '{"transactions":[{"date":"2025-01-01","amount":10,},],"accountSummary":{},}';
    const result = repairJson(input);
    expect(result.repairs).toContain('removed trailing commas');
    expect(() => JSON.parse(result.repaired)).not.toThrow();
  });

  it('replaces null for known string fields with ""', () => {
    const input = '{"transactions":[{"date":"2025-01-01","description":null,"amount":10,"type":"debit","merchant":null}]}';
    const result = repairJson(input);
    const parsed = JSON.parse(result.repaired);
    expect(parsed.transactions[0].merchant).toBe('');
    expect(parsed.transactions[0].description).toBe('');
    expect(result.repairs).toContain('replaced null → "" for "merchant"');
    expect(result.repairs).toContain('replaced null → "" for "description"');
  });

  it('replaces null for known number fields with 0', () => {
    const input = '{"transactions":[],"accountSummary":{"totalCredits":null,"totalDebits":null,"openingBalance":null}}';
    const result = repairJson(input);
    const parsed = JSON.parse(result.repaired);
    expect(parsed.accountSummary.totalCredits).toBe(0);
    expect(parsed.accountSummary.totalDebits).toBe(0);
    expect(parsed.accountSummary.openingBalance).toBe(0);
  });

  it('handles multiple repairs in combination', () => {
    const input = `<think>Analyzing the statement...</think>
\`\`\`json
{
  transactions: [
    {
      "date": "2025-01-01",
      "description": null,
      "amount": 50.00,
      "type": "debit",
      "merchant": null,
      "isRecurring": false,
    },
  ],
  "accountSummary": {
    "totalCredits": null,
    "totalDebits": null,
  },
}
\`\`\``;
    const result = repairJson(input);
    expect(() => JSON.parse(result.repaired)).not.toThrow();
    const parsed = JSON.parse(result.repaired);
    expect(parsed.transactions[0].merchant).toBe('');
    expect(parsed.transactions[0].description).toBe('');
    expect(parsed.accountSummary.totalCredits).toBe(0);
    expect(result.repairs.length).toBeGreaterThan(2);
  });

  it('preserves valid null values for non-targeted fields', () => {
    const input = '{"transactions":[],"metadata":null}';
    const result = repairJson(input);
    const parsed = JSON.parse(result.repaired);
    expect(parsed.metadata).toBeNull();
  });
});

describe('parseAiResponse', () => {
  it('parses valid JSON and returns empty repairs', () => {
    const result = parseAiResponse('{"transactions":[]}');
    expect(result.parsed).toEqual({ transactions: [] });
    expect(result.repairs).toHaveLength(0);
  });

  it('repairs and parses malformed JSON', () => {
    const input = '```json\n{"transactions":[],"accountSummary":{"totalCredits":null,}}\n```';
    const result = parseAiResponse(input);
    expect(result.parsed).toBeDefined();
    expect(result.repairs.length).toBeGreaterThan(0);
  });

  it('throws with descriptive error for unparseable input', () => {
    expect(() => parseAiResponse('this is not json at all')).toThrow(
      'Failed to parse AI response as JSON',
    );
  });

  it('throws for truncated JSON that repair cannot fix', () => {
    expect(() => parseAiResponse('{"transactions":[{"date":"2025-01-01"')).toThrow(
      'Failed to parse AI response as JSON',
    );
  });
});
