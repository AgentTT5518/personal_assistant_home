import { Link } from 'react-router-dom';
import { CalendarDays, Check } from 'lucide-react';
import { useUpcomingBills, useMarkBillPaid } from '../hooks.js';
import { formatCurrency } from '../../../shared/utils/format-currency.js';

interface UpcomingBillsWidgetProps {
  currency: string;
}

function getDueLabel(nextDueDate: string): { text: string; className: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(nextDueDate + 'T00:00:00');
  const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: 'Overdue', className: 'text-red-600 font-medium' };
  if (diffDays === 0) return { text: 'Today', className: 'text-amber-600 font-medium' };
  if (diffDays === 1) return { text: 'Tomorrow', className: 'text-amber-600' };
  return { text: `${diffDays}d`, className: 'text-gray-500' };
}

export function UpcomingBillsWidget({ currency }: UpcomingBillsWidgetProps) {
  const { data: bills } = useUpcomingBills();
  const markPaid = useMarkBillPaid();

  if (!bills || bills.length === 0) return null;

  const sorted = [...bills].sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
  const totalDue = sorted.reduce((sum, b) => sum + b.expectedAmount, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2">
          <CalendarDays size={14} />
          Upcoming Bills (7 days)
        </h3>
        <Link to="/bills" className="text-xs text-blue-600 hover:text-blue-700">
          View All
        </Link>
      </div>
      <div className="space-y-2">
        {sorted.map((bill) => {
          const due = getDueLabel(bill.nextDueDate);
          return (
            <div key={bill.id} className="flex items-center gap-2">
              <button
                onClick={() => markPaid.mutate(bill.id)}
                disabled={markPaid.isPending}
                className="p-0.5 text-gray-300 hover:text-green-500 shrink-0"
                title="Mark paid"
              >
                <Check size={14} />
              </button>
              <span className="text-sm text-gray-700 truncate flex-1">{bill.name}</span>
              <span className={`text-xs ${due.className}`}>{due.text}</span>
              <span className="text-sm text-gray-600 tabular-nums">
                {formatCurrency(bill.expectedAmount, currency)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-500">Total due</span>
        <span className="text-sm font-medium text-gray-900">{formatCurrency(totalDue, currency)}</span>
      </div>
    </div>
  );
}
