import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPromptForDocType } from './index.js';
import { buildPrompt as bankStatementPrompt } from './bank-statement.js';
import { buildPrompt as creditCardPrompt } from './credit-card.js';
import { buildPrompt as payslipPrompt } from './payslip.js';
import { buildPrompt as taxReturnPrompt } from './tax-return.js';
import { buildPrompt as investmentReportPrompt } from './investment-report.js';
import type { DocumentType } from '../../../../shared/types/index.js';

const sampleText = 'Sample document text for testing.';

describe('getPromptForDocType', () => {
  const docTypes: { type: DocumentType; builder: typeof bankStatementPrompt }[] = [
    { type: 'bank_statement', builder: bankStatementPrompt },
    { type: 'credit_card', builder: creditCardPrompt },
    { type: 'payslip', builder: payslipPrompt },
    { type: 'tax_return', builder: taxReturnPrompt },
    { type: 'investment_report', builder: investmentReportPrompt },
  ];

  for (const { type, builder } of docTypes) {
    it(`routes to correct builder for ${type}`, () => {
      const result = getPromptForDocType(type, sampleText, 'TestInst', '2024-01');
      const expected = builder(sampleText, 'TestInst', '2024-01');

      expect(result).toEqual(expected);
    });
  }
});

describe('bank-statement prompt builder', () => {
  it('returns array with system and user messages', () => {
    const result = bankStatementPrompt(sampleText);

    expect(result).toHaveLength(2);
    expect(result[0].role).toBe('system');
    expect(result[1].role).toBe('user');
  });

  it('includes bank-specific rules in system message', () => {
    const result = bankStatementPrompt(sampleText);

    expect(result[0].content).toContain('bank statement');
    expect(result[0].content).toContain('debit');
    expect(result[0].content).toContain('credit');
    expect(result[0].content).toContain('isRecurring');
    expect(result[0].content).toContain('openingBalance');
    expect(result[0].content).toContain('closingBalance');
  });

  it('includes the document text in user message', () => {
    const result = bankStatementPrompt(sampleText);
    expect(result[1].content).toContain(sampleText);
  });

  it('includes institution in context when provided', () => {
    const result = bankStatementPrompt(sampleText, 'CommBank');
    expect(result[1].content).toContain('Institution: CommBank');
  });

  it('includes period in context when provided', () => {
    const result = bankStatementPrompt(sampleText, undefined, '2024-01 to 2024-02');
    expect(result[1].content).toContain('Statement period: 2024-01 to 2024-02');
  });

  it('includes both institution and period when provided', () => {
    const result = bankStatementPrompt(sampleText, 'NAB', '2024-03');
    expect(result[1].content).toContain('Institution: NAB');
    expect(result[1].content).toContain('Statement period: 2024-03');
  });

  it('works without institution or period', () => {
    const result = bankStatementPrompt(sampleText);
    expect(result[1].content).not.toContain('Institution:');
    expect(result[1].content).not.toContain('Statement period:');
    expect(result[1].content).toContain(sampleText);
  });
});

describe('credit-card prompt builder', () => {
  it('returns array with system and user messages', () => {
    const result = creditCardPrompt(sampleText);

    expect(result).toHaveLength(2);
    expect(result[0].role).toBe('system');
    expect(result[1].role).toBe('user');
  });

  it('includes credit card-specific rules in system message', () => {
    const result = creditCardPrompt(sampleText);

    expect(result[0].content).toContain('credit card statement');
    expect(result[0].content).toContain('Purchases, fees, interest charges');
    expect(result[0].content).toContain('Payments, refunds, credits');
    expect(result[0].content).toContain('card number');
  });

  it('includes institution in context when provided', () => {
    const result = creditCardPrompt(sampleText, 'Visa');
    expect(result[1].content).toContain('Institution: Visa');
  });

  it('includes period in context when provided', () => {
    const result = creditCardPrompt(sampleText, undefined, '2024-06');
    expect(result[1].content).toContain('Statement period: 2024-06');
  });

  it('works without institution or period', () => {
    const result = creditCardPrompt(sampleText);
    expect(result[1].content).not.toContain('Institution:');
    expect(result[1].content).toContain(sampleText);
  });
});

describe('payslip prompt builder', () => {
  it('returns array with system and user messages', () => {
    const result = payslipPrompt(sampleText);

    expect(result).toHaveLength(2);
    expect(result[0].role).toBe('system');
    expect(result[1].role).toBe('user');
  });

  it('includes payslip-specific rules in system message', () => {
    const result = payslipPrompt(sampleText);

    expect(result[0].content).toContain('payslip');
    expect(result[0].content).toContain('Gross salary');
    expect(result[0].content).toContain('Tax, super, deductions');
    expect(result[0].content).toContain('Net pay');
  });

  it('includes institution as Employer when provided', () => {
    const result = payslipPrompt(sampleText, 'Acme Corp');
    expect(result[1].content).toContain('Employer: Acme Corp');
  });

  it('includes period as Pay period when provided', () => {
    const result = payslipPrompt(sampleText, undefined, '2024-01-01 to 2024-01-15');
    expect(result[1].content).toContain('Pay period: 2024-01-01 to 2024-01-15');
  });

  it('works without institution or period', () => {
    const result = payslipPrompt(sampleText);
    expect(result[1].content).not.toContain('Employer:');
    expect(result[1].content).not.toContain('Pay period:');
    expect(result[1].content).toContain(sampleText);
  });
});

describe('tax-return prompt builder', () => {
  it('returns array with system and user messages', () => {
    const result = taxReturnPrompt(sampleText);

    expect(result).toHaveLength(2);
    expect(result[0].role).toBe('system');
    expect(result[1].role).toBe('user');
  });

  it('includes tax-specific rules in system message', () => {
    const result = taxReturnPrompt(sampleText);

    expect(result[0].content).toContain('tax return');
    expect(result[0].content).toContain('Income sources');
    expect(result[0].content).toContain('Deductions');
    expect(result[0].content).toContain('Tax payable');
    expect(result[0].content).toContain('Tax refund');
  });

  it('includes institution as Preparer when provided', () => {
    const result = taxReturnPrompt(sampleText, 'H&R Block');
    expect(result[1].content).toContain('Preparer: H&R Block');
  });

  it('includes period as Tax year when provided', () => {
    const result = taxReturnPrompt(sampleText, undefined, '2023-2024');
    expect(result[1].content).toContain('Tax year: 2023-2024');
  });

  it('works without institution or period', () => {
    const result = taxReturnPrompt(sampleText);
    expect(result[1].content).not.toContain('Preparer:');
    expect(result[1].content).not.toContain('Tax year:');
    expect(result[1].content).toContain(sampleText);
  });
});

describe('investment-report prompt builder', () => {
  it('returns array with system and user messages', () => {
    const result = investmentReportPrompt(sampleText);

    expect(result).toHaveLength(2);
    expect(result[0].role).toBe('system');
    expect(result[1].role).toBe('user');
  });

  it('includes investment-specific rules in system message', () => {
    const result = investmentReportPrompt(sampleText);

    expect(result[0].content).toContain('investment report');
    expect(result[0].content).toContain('Dividends, distributions');
    expect(result[0].content).toContain('Management fees');
    expect(result[0].content).toContain('portfolio');
    expect(result[0].content).toContain('fund/asset name');
  });

  it('includes institution in context when provided', () => {
    const result = investmentReportPrompt(sampleText, 'Vanguard');
    expect(result[1].content).toContain('Institution: Vanguard');
  });

  it('includes period as Report period when provided', () => {
    const result = investmentReportPrompt(sampleText, undefined, 'Q1 2024');
    expect(result[1].content).toContain('Report period: Q1 2024');
  });

  it('works without institution or period', () => {
    const result = investmentReportPrompt(sampleText);
    expect(result[1].content).not.toContain('Institution:');
    expect(result[1].content).not.toContain('Report period:');
    expect(result[1].content).toContain(sampleText);
  });
});
