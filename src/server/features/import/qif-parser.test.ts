import { describe, it, expect } from 'vitest';
import { parseQif } from './qif-parser.js';

describe('parseQif', () => {
  it('parses a standard QIF transaction', () => {
    const qif = `!Type:Bank
D01/15/2026
T-50.00
PTest Merchant
MGroceries
^`;
    const result = parseQif(qif);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-01-15');
    expect(result[0].amount).toBe(50);
    expect(result[0].type).toBe('debit');
    expect(result[0].description).toBe('Test Merchant');
    expect(result[0].merchant).toBe('Test Merchant');
  });

  it('parses credit transactions', () => {
    const qif = `D01/15/2026
T3000.00
PSalary
^`;
    const result = parseQif(qif);
    expect(result[0].type).toBe('credit');
    expect(result[0].amount).toBe(3000);
  });

  it('parses multiple transactions', () => {
    const qif = `D01/15/2026
T-50.00
PFirst
^
D01/16/2026
T-30.00
PSecond
^
D01/17/2026
T100.00
PThird
^`;
    const result = parseQif(qif);
    expect(result).toHaveLength(3);
  });

  it('uses memo as description when payee is missing', () => {
    const qif = `D01/15/2026
T-10.00
MTransfer to savings
^`;
    const result = parseQif(qif);
    expect(result[0].description).toBe('Transfer to savings');
  });

  it('skips transactions with missing date', () => {
    const qif = `T-50.00
PNo date
^`;
    const result = parseQif(qif);
    expect(result).toHaveLength(0);
  });

  it('skips transactions with missing amount', () => {
    const qif = `D01/15/2026
PNo amount
^`;
    const result = parseQif(qif);
    expect(result).toHaveLength(0);
  });

  it('handles U amount field (unit price)', () => {
    const qif = `D01/15/2026
U-75.00
PTest
^`;
    const result = parseQif(qif);
    expect(result[0].amount).toBe(75);
  });

  it('handles 2-digit year (>50 as 19xx)', () => {
    const qif = `D01/15/99
T-10.00
PTest
^`;
    const result = parseQif(qif);
    expect(result[0].date).toBe('1999-01-15');
  });

  it('handles 2-digit year (<50 as 20xx)', () => {
    const qif = `D01/15/26
T-10.00
PTest
^`;
    const result = parseQif(qif);
    expect(result[0].date).toBe('2026-01-15');
  });

  it('handles apostrophe date format', () => {
    const qif = `D01/15'26
T-10.00
PTest
^`;
    const result = parseQif(qif);
    expect(result[0].date).toBe('2026-01-15');
  });

  it('handles ISO date format', () => {
    const qif = `D2026-01-15
T-10.00
PTest
^`;
    const result = parseQif(qif);
    expect(result[0].date).toBe('2026-01-15');
  });

  it('handles amounts with commas', () => {
    const qif = `D01/15/2026
T-1,234.56
PBig purchase
^`;
    const result = parseQif(qif);
    expect(result[0].amount).toBe(1234.56);
  });

  it('ignores header lines starting with !', () => {
    const qif = `!Type:Bank
!Option:AutoSwitch
D01/15/2026
T-50.00
PTest
^`;
    const result = parseQif(qif);
    expect(result).toHaveLength(1);
  });

  it('ignores category (L) and check number (N) lines', () => {
    const qif = `D01/15/2026
T-50.00
PTest
LGroceries
N1234
^`;
    const result = parseQif(qif);
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('Test');
  });

  it('returns empty array for empty input', () => {
    const result = parseQif('');
    expect(result).toHaveLength(0);
  });
});
