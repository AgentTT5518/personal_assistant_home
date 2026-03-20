import { Link } from 'react-router-dom';
import { Target } from 'lucide-react';
import type { BudgetSummaryResponse } from '../../../../shared/types/index.js';
import { formatCurrency } from '../../../shared/utils/format-currency.js';

interface BudgetProgressProps {
  budgets: BudgetSummaryResponse[];
  currency: string;
}

function getProgressColor(percent: number): string {
  if (percent >= 100) return 'bg-red-500';
  if (percent >= 75) return 'bg-amber-500';
  return 'bg-green-500';
}

export function BudgetProgress({ budgets, currency }: BudgetProgressProps) {
  if (budgets.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2">
          <Target size={14} />
          Budget Progress
        </h3>
        <Link
          to="/budgets"
          className="text-xs text-blue-600 hover:text-blue-700"
        >
          Manage
        </Link>
      </div>
      <div className="space-y-3">
        {budgets.map((b) => (
          <div key={b.id}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-700">{b.categoryName}</span>
              <span className="text-gray-500">
                {formatCurrency(b.spent, currency)} / {formatCurrency(b.budgetAmount, currency)}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getProgressColor(b.percentUsed)}`}
                style={{ width: `${Math.min(b.percentUsed, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
