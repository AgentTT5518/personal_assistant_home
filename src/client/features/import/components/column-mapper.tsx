import { useState } from 'react';
import type { ColumnMapping } from '@shared/types/index.js';

interface ColumnMapperProps {
  headers: string[];
  onSubmit: (mapping: ColumnMapping) => void;
  isLoading: boolean;
}

const REQUIRED_FIELDS = ['date', 'description'] as const;
const OPTIONAL_FIELDS = [
  { key: 'type', label: 'Type (debit/credit)' },
  { key: 'merchant', label: 'Merchant / Payee' },
] as const;

export function ColumnMapper({ headers, onSubmit, isLoading }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [amountMode, setAmountMode] = useState<'single' | 'split'>('single');

  const update = (field: string, value: string) => {
    setMapping((prev) => ({ ...prev, [field]: value }));
  };

  const canSubmit = () => {
    if (!mapping.date || !mapping.description) return false;
    if (amountMode === 'single' && !mapping.amount) return false;
    if (amountMode === 'split' && (!mapping.debitAmount || !mapping.creditAmount)) return false;
    return true;
  };

  const handleSubmit = () => {
    const result: ColumnMapping = {
      date: mapping.date,
      description: mapping.description,
      amount: mapping.amount || mapping.debitAmount,
      ...(mapping.type ? { type: mapping.type } : {}),
      ...(amountMode === 'split' ? { debitAmount: mapping.debitAmount, creditAmount: mapping.creditAmount } : {}),
      ...(mapping.merchant ? { merchant: mapping.merchant } : {}),
    };
    onSubmit(result);
  };

  const renderSelect = (field: string, label: string, required: boolean) => (
    <div key={field} className="flex items-center gap-3">
      <label className="w-40 text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={mapping[field] || ''}
        onChange={(e) => update(field, e.target.value)}
        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
      >
        <option value="">Select column...</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Map Columns</h3>
      <p className="text-sm text-gray-600">
        Map your CSV columns to the required transaction fields.
      </p>

      <div className="space-y-3">
        {REQUIRED_FIELDS.map((field) =>
          renderSelect(field, field.charAt(0).toUpperCase() + field.slice(1), true),
        )}

        <div className="pt-2 border-t">
          <label className="block text-sm font-medium text-gray-700 mb-2">Amount Format</label>
          <div className="flex gap-4 mb-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={amountMode === 'single'}
                onChange={() => setAmountMode('single')}
              />
              Single column
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={amountMode === 'split'}
                onChange={() => setAmountMode('split')}
              />
              Separate debit/credit columns
            </label>
          </div>

          {amountMode === 'single'
            ? renderSelect('amount', 'Amount', true)
            : (
                <>
                  {renderSelect('debitAmount', 'Debit Amount', true)}
                  {renderSelect('creditAmount', 'Credit Amount', true)}
                </>
              )}
        </div>

        <div className="pt-2 border-t">
          <p className="text-sm text-gray-500 mb-2">Optional fields</p>
          {OPTIONAL_FIELDS.map(({ key, label }) => renderSelect(key, label, false))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit() || isLoading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Mapping...' : 'Apply Mapping'}
      </button>
    </div>
  );
}
