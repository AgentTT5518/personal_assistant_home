import { describe, it, expect } from 'vitest';
import { isLikelyScannedPdf } from './extractor.js';

describe('PDF extractor utilities', () => {
  it('detects scanned PDFs with very little text', () => {
    expect(isLikelyScannedPdf('short', 5)).toBe(true);
  });

  it('does not flag PDFs with normal text density', () => {
    const text = 'a'.repeat(5000);
    expect(isLikelyScannedPdf(text, 5)).toBe(false);
  });
});
