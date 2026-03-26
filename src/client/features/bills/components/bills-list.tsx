import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, RefreshCw, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useBills, useDeleteBill, useMarkBillPaid, usePopulateFromRecurring } from '../hooks.js';
import { useCurrency } from '../../settings/index.js';
import { formatCurrency } from '../../../shared/utils/format-currency.js';
import { BillForm } from './bill-form.js';
import type { BillResponse } from '../../../../shared/types/index.js';

function getDueStatus(nextDueDate: string): 'overdue' | 'due-soon' | 'normal' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(nextDueDate + 'T00:00:00');
  const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'due-soon';
  return 'normal';
}

function dueStatusStyles(status: 'overdue' | 'due-soon' | 'normal'): string {
  switch (status) {
    case 'overdue': return 'bg-red-50 border-l-4 border-l-red-500';
    case 'due-soon': return 'bg-amber-50 border-l-4 border-l-amber-500';
    default: return '';
  }
}

export function BillsList() {
  const currency = useCurrency();
  const { data: bills, isLoading } = useBills({ isActive: true });
  const deleteBill = useDeleteBill();
  const markPaid = useMarkBillPaid();
  const populate = usePopulateFromRecurring();

  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState<BillResponse | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  const sorted = [...(bills ?? [])].sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={() => { setEditingBill(null); setShowForm(true); }}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 min-h-[44px]"
        >
          <Plus size={16} />
          Add Bill
        </button>
        <button
          onClick={() => populate.mutate(undefined, {
            onSuccess: (data) => toast.success(`Created ${data.created} bills, skipped ${data.skipped}`),
            onError: (err) => toast.error(err.message),
          })}
          disabled={populate.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
        >
          <RefreshCw size={14} className={populate.isPending ? 'animate-spin' : ''} />
          Import from Recurring
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-sm text-gray-400">
          No bills yet. Add one manually or import from recurring transactions.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {sorted.map((bill) => {
            const status = getDueStatus(bill.nextDueDate);
            return (
              <div key={bill.id} className={`px-4 py-3 flex flex-wrap items-center gap-3 ${dueStatusStyles(status)}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">{bill.name}</span>
                    {bill.categoryName && (
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 text-xs rounded"
                        style={{ backgroundColor: `${bill.categoryColor}20`, color: bill.categoryColor ?? undefined }}
                      >
                        {bill.categoryName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    <span>{formatCurrency(bill.expectedAmount, currency)}</span>
                    <span className="capitalize">{bill.frequency}</span>
                    {bill.accountName && <span>{bill.accountName}</span>}
                    {status === 'overdue' && <span className="text-red-600 font-medium">Overdue</span>}
                    {status === 'due-soon' && <span className="text-amber-600 font-medium">Due soon</span>}
                  </div>
                </div>

                <div className="text-sm text-gray-600 shrink-0">
                  {bill.nextDueDate}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => markPaid.mutate(bill.id, {
                      onSuccess: () => toast.success('Bill marked as paid'),
                      onError: (err) => toast.error(err.message),
                    })}
                    disabled={markPaid.isPending}
                    className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Mark as paid"
                    aria-label="Mark as paid"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => { setEditingBill(bill); setShowForm(true); }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Edit"
                    aria-label="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => deleteBill.mutate(bill.id, {
                      onSuccess: () => toast.success('Bill deleted'),
                      onError: (err) => toast.error(err.message),
                    })}
                    disabled={deleteBill.isPending}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Delete"
                    aria-label="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <BillForm
          bill={editingBill}
          onClose={() => { setShowForm(false); setEditingBill(null); }}
        />
      )}
    </div>
  );
}
