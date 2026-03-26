import { useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGoals, useDeleteGoal, useSyncGoalBalance, GoalCard, GoalForm, ContributeModal } from '../../features/goals/index.js';
import { useCurrency } from '../../features/settings/index.js';
import type { GoalResponse, GoalStatus } from '../../../shared/types/index.js';

const STATUS_TABS: { value: GoalStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function GoalsPage() {
  const [statusFilter, setStatusFilter] = useState<GoalStatus | 'all'>('active');
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalResponse | null>(null);
  const [contributingGoal, setContributingGoal] = useState<GoalResponse | null>(null);

  const currency = useCurrency();
  const { data: goals, isLoading } = useGoals(
    statusFilter !== 'all' ? { status: statusFilter } : undefined,
  );
  const deleteGoal = useDeleteGoal();
  const syncBalance = useSyncGoalBalance();

  function handleDelete(id: string) {
    if (confirm('Delete this goal and all its contributions?')) {
      deleteGoal.mutate(id, {
        onSuccess: () => toast.success('Goal deleted'),
        onError: (err) => toast.error(err.message),
      });
    }
  }

  function handleSyncBalance(id: string) {
    syncBalance.mutate(id, {
      onSuccess: (data) => {
        if ('warning' in data && data.warning) {
          toast(data.warning, { icon: '\u26a0\ufe0f', duration: 5000 });
        } else {
          toast.success('Balance synced');
        }
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Goals</h2>
        <button
          onClick={() => { setEditingGoal(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 min-h-[44px]"
        >
          <Plus size={16} />
          Add Goal
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${
              statusFilter === tab.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center text-gray-500 py-12">Loading goals...</div>
      ) : !goals || goals.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          {statusFilter === 'active'
            ? 'No active goals yet. Create your first savings goal!'
            : 'No goals found.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currency={currency}
              onEdit={(g) => { setEditingGoal(g); setShowForm(true); }}
              onDelete={handleDelete}
              onContribute={setContributingGoal}
              onSyncBalance={handleSyncBalance}
            />
          ))}
        </div>
      )}

      {showForm && (
        <GoalForm
          goal={editingGoal}
          onClose={() => { setShowForm(false); setEditingGoal(null); }}
        />
      )}

      {contributingGoal && (
        <ContributeModal
          goal={contributingGoal}
          currency={currency}
          onClose={() => setContributingGoal(null)}
        />
      )}
    </div>
  );
}
