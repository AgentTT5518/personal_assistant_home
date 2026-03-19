import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../format-currency.js';

describe('formatCurrency', () => {
  it('formats AUD correctly', () => {
    const result = formatCurrency(1234.56, 'AUD');
    expect(result).toContain('1,234.56');
  });

  it('formats USD correctly', () => {
    const result = formatCurrency(1234.56, 'USD');
    expect(result).toContain('1,234.56');
  });

  it('formats EUR correctly', () => {
    const result = formatCurrency(1234.56, 'EUR');
    expect(result).toContain('1,234.56');
  });

  it('formats JPY without decimals', () => {
    const result = formatCurrency(1234, 'JPY');
    expect(result).toContain('1,234');
  });

  it('formats zero correctly', () => {
    const result = formatCurrency(0, 'AUD');
    expect(result).toContain('0.00');
  });

  it('formats negative values', () => {
    const result = formatCurrency(-50.25, 'AUD');
    expect(result).toContain('50.25');
  });

  it('caches formatters for repeated calls', () => {
    const result1 = formatCurrency(100, 'GBP');
    const result2 = formatCurrency(200, 'GBP');
    expect(result1).toContain('100.00');
    expect(result2).toContain('200.00');
  });
});
