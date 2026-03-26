import { useState } from 'react';
import { Loader2, Plus, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCategories } from '../../transactions/hooks.js';
import { useBudgets, useCreateBudget, useUpdateBudget, useDeleteBudget } from '../hooks.js';
import { useCurrency } from '../../settings/index.js';
import { formatCurrency } from '../../../shared/utils/format-currency.js';
import type { BudgetPeriod } from '../../../../shared/types/index.js';

const PERIOD_OPTIONS: { value: BudgetPeriod; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'yearly', label: 'Yearly' },
];

export function BudgetSettings() {
  const currency = useCurrency();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: budgets, isLoading: budgetsLoading } = useBudgets();
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const deleteBudget = useDeleteBudget();

  const [newCategoryId, setNewCategoryId] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newPeriod, setNewPeriod] = useState<BudgetPeriod>('monthly');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editPeriod, setEditPeriod] = useState<BudgetPeriod>('monthly');

  if (categoriesLoading || budgetsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  const budgetedCategoryIds = new Set(budgets?.map((b) => b.categoryId) ?? []);
  const availableCategories = categories?.filter((c) => !budgetedCategoryIds.has(c.id)) ?? [];

  function handleCreate() {
    if (!newCategoryId || !newAmount) return;
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) return;

    createBudget.mutate(
      { categoryId: newCategoryId, amount, period: newPeriod },
      {
        onSuccess: () => {
          toast.success('Budget created');
          setNewCategoryId('');
          setNewAmount('');
          setNewPeriod('monthly');
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function startEdit(budget: { id: string; amount: number; period: BudgetPeriod }) {
    setEditingId(budget.id);
    setEditAmount(String(budget.amount));
    setEditPeriod(budget.period);
  }

  function handleUpdate(id: string) {
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount <= 0) return;
    updateBudget.mutate(
      { id, amount, period: editPeriod },
      {
        onSuccess: () => { toast.success('Budget updated'); setEditingId(null); },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Budget Settings</h2>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700">Spending Limits by Category</h3>
        </div>

        {/* Existing budgets */}
        <div className="divide-y divide-gray-100">
          {budgets?.map((budget) => (
            <div key={budget.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: budget.categoryColor }}
              />
              <span className="text-sm text-gray-900 w-40 shrink-0">{budget.categoryName}</span>

              {editingId === budget.id ? (
                <>
                  <input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-28 px-2 py-1 text-sm border border-gray-300 rounded"
                    min="0"
                    step="0.01"
                  />
                  <select
                    value={editPeriod}
                    onChange={(e) => setEditPeriod(e.target.value as BudgetPeriod)}
                    className="px-2 py-1 text-sm border border-gray-300 rounded"
                  >
                    {PERIOD_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleUpdate(budget.id)}
                    disabled={updateBudget.isPending}
                    className="p-1 text-blue-600 hover:text-blue-700"
                  >
                    <Save size={16} />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-gray-700 w-28">
                    {formatCurrency(budget.amount, currency)}
                  </span>
                  <span className="text-xs text-gray-400 capitalize">{budget.period}</span>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => startEdit(budget)}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteBudget.mutate(budget.id, {
                        onSuccess: () => toast.success('Budget deleted'),
                        onError: (err) => toast.error(err.message),
                      })}
                      disabled={deleteBudget.isPending}
                      className="p-1 text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {(!budgets || budgets.length === 0) && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              No budgets set. Add one below.
            </div>
          )}
        </div>

        {/* Add new budget */}
        {availableCategories.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 flex flex-wrap items-center gap-3 bg-gray-50 rounded-b-lg">
            <select
              value={newCategoryId}
              onChange={(e) => setNewCategoryId(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded flex-1"
            >
              <option value="">Select category...</option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input
              type="number"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="Amount"
              className="w-28 px-2 py-1.5 text-sm border border-gray-300 rounded"
              min="0"
              step="0.01"
            />
            <select
              value={newPeriod}
              onChange={(e) => setNewPeriod(e.target.value as BudgetPeriod)}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded"
            >
              {PERIOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button
              onClick={handleCreate}
              disabled={!newCategoryId || !newAmount || createBudget.isPending}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus size={14} />
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
