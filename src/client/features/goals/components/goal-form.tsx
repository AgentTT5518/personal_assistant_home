import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { AccountSelector } from '../../accounts/index.js';
import { useCategories } from '../../transactions/hooks.js';
import { useCreateGoal, useUpdateGoal } from '../hooks.js';
import type { GoalResponse, GoalStatus } from '../../../../shared/types/index.js';

const STATUS_OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

interface GoalFormProps {
  goal?: GoalResponse | null;
  onClose: () => void;
}

export function GoalForm({ goal, onClose }: GoalFormProps) {
  const { data: categories } = useCategories();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();

  const [name, setName] = useState(goal?.name ?? '');
  const [targetAmount, setTargetAmount] = useState(goal ? String(goal.targetAmount) : '');
  const [deadline, setDeadline] = useState(goal?.deadline ?? '');
  const [accountId, setAccountId] = useState<string | null>(goal?.accountId ?? null);
  const [categoryId, setCategoryId] = useState<string | null>(goal?.categoryId ?? null);
  const [status, setStatus] = useState<GoalStatus>(goal?.status ?? 'active');

  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setTargetAmount(String(goal.targetAmount));
      setDeadline(goal.deadline ?? '');
      setAccountId(goal.accountId);
      setCategoryId(goal.categoryId);
      setStatus(goal.status);
    }
  }, [goal]);

  const isEditing = !!goal;
  const isPending = createGoal.isPending || updateGoal.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(targetAmount);
    if (!name || isNaN(amount) || amount <= 0) return;

    if (isEditing) {
      updateGoal.mutate({
        id: goal.id,
        name,
        targetAmount: amount,
        deadline: deadline || null,
        accountId,
        categoryId,
        status,
      }, {
        onSuccess: () => { toast.success('Goal updated'); onClose(); },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update goal'),
      });
    } else {
      createGoal.mutate({
        name,
        targetAmount: amount,
        deadline: deadline || null,
        accountId,
        categoryId,
      }, {
        onSuccess: () => { toast.success('Goal created'); onClose(); },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create goal'),
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Goal' : 'Add Goal'}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Emergency Fund, Holiday Trip"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Amount</label>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deadline (optional)</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account (optional)</label>
            <AccountSelector value={accountId} onChange={setAccountId} includeAll={false} className="w-full" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category (optional)</label>
            <select
              value={categoryId ?? ''}
              onChange={(e) => setCategoryId(e.target.value || null)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
            >
              <option value="">No Category</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as GoalStatus)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}

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
              disabled={isPending || !name || !targetAmount}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isEditing ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
