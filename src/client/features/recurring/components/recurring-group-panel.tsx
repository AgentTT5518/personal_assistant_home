import { Loader2 } from 'lucide-react';
import type { RecurringGroup } from '../../../../shared/types/index.js';
import { formatCurrency } from '../../../shared/utils/format-currency.js';

interface RecurringGroupPanelProps {
  groups: RecurringGroup[] | undefined;
  isLoading: boolean;
  currency: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function RecurringGroupPanel({ groups, isLoading, currency }: RecurringGroupPanelProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="animate-spin text-gray-400" size={16} />
      </div>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-sm text-blue-700">
        No recurring transactions detected. Try running detection first.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg mb-4 overflow-hidden">
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Recurring Groups ({groups.length})
        </h3>
      </div>
      <div className="divide-y divide-gray-100">
        {groups.map((g, i) => (
          <div key={i} className="px-4 py-3 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{g.merchant}</div>
              <div className="text-xs text-gray-400">
                {g.frequency} &middot; {g.transactionCount} transactions &middot; Next: {formatDate(g.nextExpectedDate)}
              </div>
            </div>
            <div className="text-sm font-medium text-red-600 shrink-0 ml-4">
              {formatCurrency(g.averageAmount, currency)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
