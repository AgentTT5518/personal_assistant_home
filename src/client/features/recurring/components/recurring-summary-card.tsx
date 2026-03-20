import { RefreshCw } from 'lucide-react';
import type { RecurringGroup } from '../../../../shared/types/index.js';
import { formatCurrency } from '../../../shared/utils/format-currency.js';

interface RecurringSummaryCardProps {
  groups: RecurringGroup[];
  currency: string;
}

const MONTHLY_MULTIPLIERS: Record<string, number> = {
  weekly: 4.33,
  biweekly: 2.17,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

export function RecurringSummaryCard({ groups, currency }: RecurringSummaryCardProps) {
  if (groups.length === 0) return null;

  const estimatedMonthly = groups.reduce((sum, g) => {
    const multiplier = MONTHLY_MULTIPLIERS[g.frequency] ?? 1;
    return sum + g.averageAmount * multiplier;
  }, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-3">
        <RefreshCw size={14} />
        Recurring Expenses
      </h3>
      <div className="text-2xl font-bold text-gray-900 mb-1">
        {formatCurrency(estimatedMonthly, currency)}
        <span className="text-sm font-normal text-gray-400"> /month</span>
      </div>
      <p className="text-xs text-gray-400">
        {groups.length} recurring {groups.length === 1 ? 'subscription' : 'subscriptions'} detected
      </p>
    </div>
  );
}
