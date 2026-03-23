import { describe, it, expect } from 'vitest';
import { parseOfx } from './ofx-parser.js';

describe('parseOfx', () => {
  it('parses a standard OFX transaction block', () => {
    const ofx = `
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260115120000
<TRNAMT>-50.00
<NAME>Coles Supermarket
<MEMO>Groceries purchase
</STMTTRN>`;
    const result = parseOfx(ofx);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-01-15');
    expect(result[0].amount).toBe(50);
    expect(result[0].type).toBe('debit');
    expect(result[0].description).toBe('Coles Supermarket');
    expect(result[0].merchant).toBe('Coles Supermarket');
  });

  it('parses credit transactions', () => {
    const ofx = `
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260115
<TRNAMT>3000.00
<NAME>Salary
</STMTTRN>`;
    const result = parseOfx(ofx);
    expect(result[0].type).toBe('credit');
    expect(result[0].amount).toBe(3000);
  });

  it('infers type from amount sign when no TRNTYPE', () => {
    const ofx = `
<STMTTRN>
<DTPOSTED>20260115
<TRNAMT>-25.50
<NAME>ATM Withdrawal
</STMTTRN>`;
    const result = parseOfx(ofx);
    expect(result[0].type).toBe('debit');
    expect(result[0].amount).toBe(25.5);
  });

  it('handles multiple transactions', () => {
    const ofx = `
<STMTTRN>
<DTPOSTED>20260115
<TRNAMT>-50.00
<NAME>First
</STMTTRN>
<STMTTRN>
<DTPOSTED>20260116
<TRNAMT>-30.00
<NAME>Second
</STMTTRN>
<STMTTRN>
<DTPOSTED>20260117
<TRNAMT>100.00
<NAME>Third
</STMTTRN>`;
    const result = parseOfx(ofx);
    expect(result).toHaveLength(3);
  });

  it('skips blocks with missing DTPOSTED', () => {
    const ofx = `
<STMTTRN>
<TRNAMT>-50.00
<NAME>No date
</STMTTRN>`;
    const result = parseOfx(ofx);
    expect(result).toHaveLength(0);
  });

  it('skips blocks with missing TRNAMT', () => {
    const ofx = `
<STMTTRN>
<DTPOSTED>20260115
<NAME>No amount
</STMTTRN>`;
    const result = parseOfx(ofx);
    expect(result).toHaveLength(0);
  });

  it('uses MEMO as description when NAME is missing', () => {
    const ofx = `
<STMTTRN>
<DTPOSTED>20260115
<TRNAMT>-10.00
<MEMO>Transfer to savings
</STMTTRN>`;
    const result = parseOfx(ofx);
    expect(result[0].description).toBe('Transfer to savings');
  });

  it('handles DIRECTDEP as credit type', () => {
    const ofx = `
<STMTTRN>
<TRNTYPE>DIRECTDEP
<DTPOSTED>20260115
<TRNAMT>2000.00
<NAME>Payroll
</STMTTRN>`;
    const result = parseOfx(ofx);
    expect(result[0].type).toBe('credit');
  });

  it('handles DEP as credit type', () => {
    const ofx = `
<STMTTRN>
<TRNTYPE>DEP
<DTPOSTED>20260115
<TRNAMT>500.00
<NAME>Deposit
</STMTTRN>`;
    const result = parseOfx(ofx);
    expect(result[0].type).toBe('credit');
  });

  it('handles OFX date with timezone info', () => {
    const ofx = `
<STMTTRN>
<DTPOSTED>20260115120000.000[+10:EST]
<TRNAMT>-50.00
<NAME>Test
</STMTTRN>`;
    const result = parseOfx(ofx);
    expect(result[0].date).toBe('2026-01-15');
  });

  it('returns empty array for content with no STMTTRN blocks', () => {
    const result = parseOfx('Just some random text without OFX blocks');
    expect(result).toHaveLength(0);
  });
});
