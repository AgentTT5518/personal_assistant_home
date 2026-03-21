import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { TransactionResponse } from '../../../../shared/types/index.js';
import { useCategories } from '../../transactions/hooks.js';
import { useCreateSplits, useDeleteSplits, useSplits } from '../hooks.js';

interface SplitRow {
  categoryId: string | null;
  amount: string;
  description: string;
}

interface SplitTransactionModalProps {
  transaction: TransactionResponse;
  onClose: () => void;
}

export function SplitTransactionModal({ transaction, onClose }: SplitTransactionModalProps) {
  const { data: categories = [] } = useCategories();
  const { data: existingSplits = [] } = useSplits(transaction.id, transaction.isSplit);
  const createSplits = useCreateSplits();
  const deleteSplits = useDeleteSplits();

  const [rows, setRows] = useState<SplitRow[]>([
    { categoryId: null, amount: '', description: '' },
    { categoryId: null, amount: '', description: '' },
  ]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingSplits.length > 0) {
      setRows(
        existingSplits.map((s) => ({
          categoryId: s.categoryId,
          amount: String(s.amount),
          description: s.description,
        })),
      );
    }
  }, [existingSplits]);

  const totalAmount = transaction.amount;
  const splitSum = rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const remaining = totalAmount - splitSum;

  const updateRow = (index: number, field: keyof SplitRow, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { categoryId: null, amount: '', description: '' }]);
  };

  const removeRow = (index: number) => {
    if (rows.length <= 2) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    setError(null);

    const splits = rows.map((r) => ({
      categoryId: r.categoryId,
      amount: parseFloat(r.amount) || 0,
      description: r.description.trim(),
    }));

    // Validate
    if (splits.some((s) => s.amount <= 0)) {
      setError('All split amounts must be positive');
      return;
    }
    if (splits.some((s) => !s.description)) {
      setError('All splits must have a description');
      return;
    }
    if (Math.abs(splitSum - totalAmount) > 0.01) {
      setError(`Split amounts must sum to ${totalAmount.toFixed(2)} (currently ${splitSum.toFixed(2)})`);
      return;
    }

    createSplits.mutate(
      { transactionId: transaction.id, splits },
      { onSuccess: onClose, onError: (err) => setError(err.message) },
    );
  };

  const handleUnsplit = () => {
    deleteSplits.mutate(transaction.id, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {transaction.isSplit ? 'Edit Split' : 'Split Transaction'}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 rounded-md bg-gray-50 p-3 text-sm">
          <div className="font-medium text-gray-700">{transaction.description}</div>
          <div className="text-gray-500">
            Total: ${totalAmount.toFixed(2)} &middot; {transaction.date}
          </div>
        </div>

        {/* Split rows */}
        <div className="mb-3 max-h-[300px] space-y-3 overflow-y-auto">
          {rows.map((row, index) => (
            <div key={index} className="flex items-start gap-2 rounded-md border border-gray-100 p-2">
              <div className="flex-1 space-y-1.5">
                <input
                  type="text"
                  value={row.description}
                  onChange={(e) => updateRow(index, 'description', e.target.value)}
                  placeholder="Description"
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
                <div className="flex gap-2">
                  <select
                    value={row.categoryId ?? ''}
                    onChange={(e) => updateRow(index, 'categoryId', e.target.value || '')}
                    className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                  >
                    <option value="">No category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={row.amount}
                    onChange={(e) => updateRow(index, 'amount', e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm"
                  />
                </div>
              </div>
              {rows.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="mt-1 text-gray-400 hover:text-red-500"
                  aria-label="Remove split row"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add row + summary */}
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            <Plus size={14} /> Add row
          </button>
          <div className="text-sm">
            <span className={Math.abs(remaining) < 0.01 ? 'text-green-600' : 'text-red-600'}>
              Remaining: ${remaining.toFixed(2)}
            </span>
          </div>
        </div>

        {error && (
          <p className="mb-3 text-sm text-red-600">{error}</p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div>
            {transaction.isSplit && (
              <button
                type="button"
                onClick={handleUnsplit}
                disabled={deleteSplits.isPending}
                className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
              >
                Remove Split
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={createSplits.isPending || Math.abs(remaining) > 0.01}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createSplits.isPending ? 'Saving...' : 'Save Split'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
