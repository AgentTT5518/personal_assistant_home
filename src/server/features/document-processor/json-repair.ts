/**
 * JSON Repair Utility for Local LLM Output
 *
 * Local models (Ollama) frequently produce malformed JSON when extracting
 * financial data. This module applies a series of deterministic repairs
 * to maximise parse success without altering valid JSON.
 *
 * Each repair is tracked so callers can distinguish "repair attempted but
 * failed" from "no repair needed".
 */

import { log } from './logger.js';

export interface RepairResult {
  /** The (possibly repaired) string ready for JSON.parse() */
  repaired: string;
  /** Human-readable list of repairs that were applied */
  repairs: string[];
}

/**
 * Attempt to repair common LLM JSON output issues.
 *
 * Repair order matters — earlier steps expose content for later steps:
 * 1. Strip markdown code fences (content may be inside fences)
 * 2. Strip DeepSeek-R1 <think> reasoning blocks
 * 3. Trim to outermost { … }
 * 4. Fix unquoted property names
 * 5. Fix single-quoted strings → double-quoted
 * 6. Remove trailing commas
 * 7. Replace null for known string fields → ""
 * 8. Replace null for known number fields → 0
 */
export function repairJson(raw: string): RepairResult {
  const repairs: string[] = [];
  let text = raw;

  // 1. Strip markdown code fences
  const fenceMatch = /```(?:json)?\s*([\s\S]*?)\s*```/.exec(text);
  if (fenceMatch) {
    text = fenceMatch[1];
    repairs.push('stripped markdown code fences');
  }

  // 2. Strip DeepSeek-R1 <think> reasoning blocks
  const thinkPattern = /<think>[\s\S]*?<\/think>/g;
  if (thinkPattern.test(text)) {
    text = text.replace(thinkPattern, '').trim();
    repairs.push('stripped <think> reasoning blocks');
  }

  // 3. Trim to outermost { … }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const trimmed = text.slice(firstBrace, lastBrace + 1);
    if (trimmed !== text) {
      text = trimmed;
      repairs.push('trimmed to outermost braces');
    }
  }

  // 4. Fix unquoted property names: `  merchant:` → `  "merchant":`
  // Matches word characters after { , [ or newline followed by :
  const unquotedKeyPattern = /(?<=[\{,\[\n]\s*)([a-zA-Z_]\w*)\s*:/g;
  if (unquotedKeyPattern.test(text)) {
    text = text.replace(unquotedKeyPattern, '"$1":');
    repairs.push('fixed unquoted property names');
  }

  // 5. Fix single-quoted strings → double-quoted
  // Only replace single quotes that look like string delimiters (after : or in arrays)
  const singleQuotePattern = /(?<=:\s*)'([^']*?)'(?=\s*[,}\]])/g;
  if (singleQuotePattern.test(text)) {
    text = text.replace(singleQuotePattern, '"$1"');
    repairs.push('fixed single-quoted strings');
  }

  // 6. Remove trailing commas before } or ]
  const trailingCommaPattern = /,\s*([}\]])/g;
  if (trailingCommaPattern.test(text)) {
    text = text.replace(trailingCommaPattern, '$1');
    repairs.push('removed trailing commas');
  }

  // 7. Replace null for known string fields → ""
  const stringFields = ['merchant', 'description', 'institution', 'period', 'accountNumber', 'currency'];
  for (const field of stringFields) {
    const nullFieldPattern = new RegExp(`"${field}"\\s*:\\s*null`, 'g');
    if (nullFieldPattern.test(text)) {
      text = text.replace(nullFieldPattern, `"${field}": ""`);
      repairs.push(`replaced null → "" for "${field}"`);
    }
  }

  // 8. Replace null for known number fields → 0
  const numberFields = ['openingBalance', 'closingBalance', 'totalCredits', 'totalDebits', 'amount'];
  for (const field of numberFields) {
    const nullFieldPattern = new RegExp(`"${field}"\\s*:\\s*null`, 'g');
    if (nullFieldPattern.test(text)) {
      text = text.replace(nullFieldPattern, `"${field}": 0`);
      repairs.push(`replaced null → 0 for "${field}"`);
    }
  }

  if (repairs.length > 0) {
    log.info('JSON repair applied', { repairs });
  }

  return { repaired: text, repairs };
}

/**
 * Parse raw AI response into a JavaScript object.
 *
 * Applies repairJson first, then JSON.parse. Throws on failure with
 * the original parse error message.
 */
export function parseAiResponse(raw: string): { parsed: unknown; repairs: string[] } {
  const { repaired, repairs } = repairJson(raw);

  try {
    return { parsed: JSON.parse(repaired), repairs };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse AI response as JSON: ${message}`);
  }
}
