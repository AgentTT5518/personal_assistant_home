import { Loader2, TrendingUp, TrendingDown, DollarSign, HelpCircle, Zap } from 'lucide-react';
import { useTransactionStats, useAutoCategorise } from '../hooks.js';
import { formatCurrency } from '../../../shared/utils/format-currency.js';
import { useCurrency } from '../../dashboard/hooks.js';

interface StatsSummaryProps {
  dateFrom?: string;
  dateTo?: string;
  refetchInterval?: number | false;
}

export function StatsSummary({ dateFrom, dateTo, refetchInterval }: StatsSummaryProps) {
  const { data: stats, isLoading } = useTransactionStats(dateFrom, dateTo, { refetchInterval });
  const autoCategorise = useAutoCategorise();
  const currency = useCurrency();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  if (!stats) return null;

  const fmt = (value: number) => formatCurrency(value, currency);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <TrendingUp size={14} className="text-green-500" />
          Income
        </div>
        <div className="text-xl font-semibold text-green-600">
          {fmt(stats.totalIncome)}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <TrendingDown size={14} className="text-red-500" />
          Expenses
        </div>
        <div className="text-xl font-semibold text-red-600">
          {fmt(stats.totalExpenses)}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <DollarSign size={14} />
          Net
        </div>
        <div className={`text-xl font-semibold ${stats.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {fmt(stats.netAmount)}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <HelpCircle size={14} className="text-amber-500" />
          Uncategorised
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold text-gray-900">{stats.uncategorisedCount}</span>
          {stats.uncategorisedCount > 0 && (
            <button
              onClick={() => autoCategorise.mutate()}
              disabled={autoCategorise.isPending}
              className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded hover:bg-blue-100 disabled:opacity-50"
            >
              {autoCategorise.isPending ? (
                <Loader2 className="animate-spin inline" size={12} />
              ) : (
                <span className="flex items-center gap-1"><Zap size={10} /> Auto</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
