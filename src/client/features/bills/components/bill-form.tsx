import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { AccountSelector } from '../../accounts/index.js';
import { useCategories } from '../../transactions/hooks.js';
import { useCreateBill, useUpdateBill } from '../hooks.js';
import type { BillResponse, BillFrequency } from '../../../../shared/types/index.js';

const FREQUENCY_OPTIONS: { value: BillFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

interface BillFormProps {
  bill?: BillResponse | null;
  onClose: () => void;
}

export function BillForm({ bill, onClose }: BillFormProps) {
  const { data: categories } = useCategories();
  const createBill = useCreateBill();
  const updateBill = useUpdateBill();

  const [name, setName] = useState(bill?.name ?? '');
  const [expectedAmount, setExpectedAmount] = useState(bill ? String(bill.expectedAmount) : '');
  const [frequency, setFrequency] = useState<BillFrequency>(bill?.frequency ?? 'monthly');
  const [nextDueDate, setNextDueDate] = useState(bill?.nextDueDate ?? '');
  const [accountId, setAccountId] = useState<string | null>(bill?.accountId ?? null);
  const [categoryId, setCategoryId] = useState<string | null>(bill?.categoryId ?? null);
  const [notes, setNotes] = useState(bill?.notes ?? '');

  useEffect(() => {
    if (bill) {
      setName(bill.name);
      setExpectedAmount(String(bill.expectedAmount));
      setFrequency(bill.frequency);
      setNextDueDate(bill.nextDueDate);
      setAccountId(bill.accountId);
      setCategoryId(bill.categoryId);
      setNotes(bill.notes ?? '');
    }
  }, [bill]);

  const isEditing = !!bill;
  const isPending = createBill.isPending || updateBill.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(expectedAmount);
    if (!name || isNaN(amount) || amount <= 0 || !nextDueDate) return;

    const data = {
      name,
      expectedAmount: amount,
      frequency,
      nextDueDate,
      accountId,
      categoryId,
      notes: notes || null,
    };

    if (isEditing) {
      updateBill.mutate({ id: bill.id, ...data }, { onSuccess: onClose });
    } else {
      createBill.mutate(data, { onSuccess: onClose });
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
            {isEditing ? 'Edit Bill' : 'Add Bill'}
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
              placeholder="e.g. Netflix, Rent, Electricity"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                value={expectedAmount}
                onChange={(e) => setExpectedAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as BillFrequency)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              >
                {FREQUENCY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Next Due Date</label>
            <input
              type="date"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
            <AccountSelector value={accountId} onChange={setAccountId} includeAll={false} className="w-full" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none"
              rows={2}
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
              disabled={isPending || !name || !expectedAmount || !nextDueDate}
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
