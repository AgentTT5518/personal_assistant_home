import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useContributeToGoal } from '../hooks.js';
import { formatCurrency } from '../../../shared/utils/format-currency.js';
import type { GoalResponse } from '../../../../shared/types/index.js';

interface ContributeModalProps {
  goal: GoalResponse;
  currency: string;
  onClose: () => void;
}

export function ContributeModal({ goal, currency, onClose }: ContributeModalProps) {
  const contribute = useContributeToGoal();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const remaining = goal.targetAmount - goal.currentAmount;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    contribute.mutate(
      { id: goal.id, amount: parsedAmount, note: note || null },
      { onSuccess: onClose },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Contribute to {goal.name}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="text-sm text-gray-500">
            Remaining: {formatCurrency(remaining > 0 ? remaining : 0, currency)}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              min="0"
              step="0.01"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. March savings"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={contribute.isPending || !amount}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {contribute.isPending && <Loader2 size={14} className="animate-spin" />}
              Contribute
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
