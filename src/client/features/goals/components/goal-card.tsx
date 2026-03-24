import { Target, Calendar, Pencil, Trash2, Plus, RefreshCw } from 'lucide-react';
import type { GoalResponse } from '../../../../shared/types/index.js';
import { formatCurrency } from '../../../shared/utils/format-currency.js';

interface GoalCardProps {
  goal: GoalResponse;
  currency: string;
  onEdit: (goal: GoalResponse) => void;
  onDelete: (id: string) => void;
  onContribute: (goal: GoalResponse) => void;
  onSyncBalance?: (id: string) => void;
}

function getDeadlineLabel(deadline: string | null): { text: string; className: string } | null {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(deadline + 'T00:00:00');
  const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: 'Overdue', className: 'text-red-600' };
  if (diffDays === 0) return { text: 'Due today', className: 'text-amber-600' };
  if (diffDays <= 30) return { text: `${diffDays}d left`, className: 'text-amber-600' };
  return { text: `${diffDays}d left`, className: 'text-gray-500' };
}

export function GoalCard({ goal, currency, onEdit, onDelete, onContribute, onSyncBalance }: GoalCardProps) {
  const percent = goal.targetAmount > 0
    ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
    : 0;
  const deadlineLabel = getDeadlineLabel(goal.deadline);

  const barColor = goal.status === 'completed'
    ? 'bg-green-500'
    : goal.status === 'cancelled'
      ? 'bg-gray-400'
      : percent >= 100
        ? 'bg-green-500'
        : percent >= 75
          ? 'bg-blue-500'
          : percent >= 50
            ? 'bg-blue-400'
            : 'bg-blue-300';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Target size={16} className="text-blue-500 shrink-0" />
          <h3 className="text-sm font-semibold text-gray-900 truncate">{goal.name}</h3>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {goal.status === 'active' && (
            <button
              onClick={() => onContribute(goal)}
              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Add contribution"
              aria-label="Add contribution"
            >
              <Plus size={14} />
            </button>
          )}
          {goal.status === 'active' && goal.accountId && onSyncBalance && (
            <button
              onClick={() => onSyncBalance(goal.id)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Sync from account balance"
              aria-label="Sync from account balance"
            >
              <RefreshCw size={14} />
            </button>
          )}
          <button
            onClick={() => onEdit(goal)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Edit goal"
            aria-label="Edit goal"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(goal.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Delete goal"
            aria-label="Delete goal"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all ${barColor}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs mb-2">
        <span className="text-gray-600">
          {formatCurrency(goal.currentAmount, currency)} / {formatCurrency(goal.targetAmount, currency)}
        </span>
        <span className="font-medium text-gray-700">{percent}%</span>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500">
        {deadlineLabel && (
          <span className={`flex items-center gap-1 ${deadlineLabel.className}`}>
            <Calendar size={12} />
            {deadlineLabel.text}
          </span>
        )}
        {goal.categoryName && (
          <span className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: goal.categoryColor ?? '#6b7280' }}
            />
            {goal.categoryName}
          </span>
        )}
        {goal.accountName && (
          <span className="truncate">{goal.accountName}</span>
        )}
        {goal.status !== 'active' && (
          <span className={`capitalize font-medium ${goal.status === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
            {goal.status}
          </span>
        )}
      </div>
    </div>
  );
}
