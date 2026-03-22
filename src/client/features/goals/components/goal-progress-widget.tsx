import { Link } from 'react-router-dom';
import { Target } from 'lucide-react';
import { useActiveGoals } from '../hooks.js';
import { formatCurrency } from '../../../shared/utils/format-currency.js';

interface GoalProgressWidgetProps {
  currency: string;
}

export function GoalProgressWidget({ currency }: GoalProgressWidgetProps) {
  const { data: goals } = useActiveGoals();

  if (!goals || goals.length === 0) return null;

  // Show top 3 active goals sorted by progress (highest first)
  const sorted = [...goals]
    .sort((a, b) => {
      const pA = a.targetAmount > 0 ? a.currentAmount / a.targetAmount : 0;
      const pB = b.targetAmount > 0 ? b.currentAmount / b.targetAmount : 0;
      return pB - pA;
    })
    .slice(0, 3);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2">
          <Target size={14} />
          Goals
        </h3>
        <Link to="/goals" className="text-xs text-blue-600 hover:text-blue-700">
          View All
        </Link>
      </div>
      <div className="space-y-3">
        {sorted.map((goal) => {
          const percent = goal.targetAmount > 0
            ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
            : 0;
          return (
            <div key={goal.id}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-700 truncate mr-2">{goal.name}</span>
                <span className="text-gray-500 tabular-nums shrink-0">{percent}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${percent >= 100 ? 'bg-green-500' : 'bg-blue-400'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>{formatCurrency(goal.currentAmount, currency)}</span>
                <span>{formatCurrency(goal.targetAmount, currency)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
