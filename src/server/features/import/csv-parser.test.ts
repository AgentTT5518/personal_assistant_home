import { describe, it, expect } from 'vitest';
import { parseCsvRaw, mapCsvRows } from './csv-parser.js';
import type { ColumnMapping } from '../../../shared/types/index.js';

describe('parseCsvRaw', () => {
  it('parses a simple CSV with headers', () => {
    const csv = 'Date,Description,Amount\n2026-01-15,Coles,-50.00\n2026-01-16,Woolworths,-30.00';
    const result = parseCsvRaw(csv);
    expect(result.headers).toEqual(['Date', 'Description', 'Amount']);
    expect(result.rawRows).toHaveLength(2);
    expect(result.rawRows[0]['Date']).toBe('2026-01-15');
    expect(result.rawRows[0]['Description']).toBe('Coles');
    expect(result.rawRows[0]['Amount']).toBe('-50.00');
  });

  it('handles quoted fields with commas', () => {
    const csv = 'Date,Description,Amount\n2026-01-15,"Coles, Sydney",50.00';
    const result = parseCsvRaw(csv);
    expect(result.rawRows[0]['Description']).toBe('Coles, Sydney');
  });

  it('handles empty CSV', () => {
    const csv = '';
    const result = parseCsvRaw(csv);
    expect(result.headers).toEqual([]);
    expect(result.rawRows).toHaveLength(0);
  });

  it('trims header whitespace', () => {
    const csv = ' Date , Description , Amount \n2026-01-15,Test,100';
    const result = parseCsvRaw(csv);
    expect(result.headers).toEqual(['Date', 'Description', 'Amount']);
  });

  it('skips empty lines', () => {
    const csv = 'Date,Description,Amount\n2026-01-15,A,10\n\n2026-01-16,B,20\n';
    const result = parseCsvRaw(csv);
    expect(result.rawRows).toHaveLength(2);
  });
});

describe('mapCsvRows', () => {
  const mapping: ColumnMapping = {
    date: 'Date',
    description: 'Description',
    amount: 'Amount',
  };

  it('maps rows correctly with basic columns', () => {
    const rawRows = [
      { Date: '2026-01-15', Description: 'Coles', Amount: '-50.00' },
      { Date: '2026-01-16', Description: 'Woolworths', Amount: '-30.00' },
    ];
    const result = mapCsvRows(rawRows, mapping);
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2026-01-15');
    expect(result[0].description).toBe('Coles');
    expect(result[0].amount).toBe(50);
    expect(result[0].type).toBe('debit');
  });

  it('handles positive amounts as credit', () => {
    const rawRows = [
      { Date: '2026-01-15', Description: 'Salary', Amount: '3000.00' },
    ];
    const result = mapCsvRows(rawRows, mapping);
    expect(result[0].type).toBe('credit');
    expect(result[0].amount).toBe(3000);
  });

  it('handles debit/credit columns', () => {
    const dualMapping: ColumnMapping = {
      date: 'Date',
      description: 'Description',
      amount: 'Amount',
      debitAmount: 'Debit',
      creditAmount: 'Credit',
    };
    const rawRows = [
      { Date: '2026-01-15', Description: 'Purchase', Debit: '50.00', Credit: '', Amount: '' },
      { Date: '2026-01-16', Description: 'Refund', Debit: '', Credit: '25.00', Amount: '' },
    ];
    const result = mapCsvRows(rawRows, dualMapping);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('debit');
    expect(result[0].amount).toBe(50);
    expect(result[1].type).toBe('credit');
    expect(result[1].amount).toBe(25);
  });

  it('handles DD/MM/YYYY date format', () => {
    const rawRows = [
      { Date: '15/01/2026', Description: 'Test', Amount: '10' },
    ];
    const result = mapCsvRows(rawRows, mapping);
    expect(result[0].date).toBe('2026-01-15');
  });

  it('skips rows with missing date or description', () => {
    const rawRows = [
      { Date: '', Description: 'Test', Amount: '10' },
      { Date: '2026-01-15', Description: '', Amount: '10' },
      { Date: '2026-01-15', Description: 'Valid', Amount: '10' },
    ];
    const result = mapCsvRows(rawRows, mapping);
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('Valid');
  });

  it('extracts merchant from mapping', () => {
    const merchantMapping: ColumnMapping = {
      date: 'Date',
      description: 'Description',
      amount: 'Amount',
      merchant: 'Merchant',
    };
    const rawRows = [
      { Date: '2026-01-15', Description: 'Groceries', Amount: '50', Merchant: 'Coles' },
    ];
    const result = mapCsvRows(rawRows, merchantMapping);
    expect(result[0].merchant).toBe('Coles');
  });

  it('handles amount with currency symbols and commas', () => {
    const rawRows = [
      { Date: '2026-01-15', Description: 'Big purchase', Amount: '$1,234.56' },
    ];
    const result = mapCsvRows(rawRows, mapping);
    expect(result[0].amount).toBe(1234.56);
  });

  it('handles type column with cr/dr values', () => {
    const typeMapping: ColumnMapping = {
      date: 'Date',
      description: 'Description',
      amount: 'Amount',
      type: 'Type',
    };
    const rawRows = [
      { Date: '2026-01-15', Description: 'Payment', Amount: '100', Type: 'CR' },
      { Date: '2026-01-16', Description: 'Purchase', Amount: '50', Type: 'DR' },
    ];
    const result = mapCsvRows(rawRows, typeMapping);
    expect(result[0].type).toBe('credit');
    expect(result[1].type).toBe('debit');
  });
});
