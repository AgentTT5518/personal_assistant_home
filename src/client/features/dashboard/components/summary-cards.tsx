import { TrendingUp, TrendingDown, DollarSign, Receipt } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import type { TransactionStats } from '../../../../shared/types/index.js';
import { formatCurrency } from '../../../shared/utils/format-currency.js';

interface SummaryCardsProps {
  stats: TransactionStats | undefined;
  isLoading: boolean;
  currency: string;
}

export function SummaryCards({ stats, isLoading, currency }: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      label: 'Income',
      value: formatCurrency(stats.totalIncome, currency),
      icon: TrendingUp,
      iconColor: 'text-green-500',
      valueColor: 'text-green-600',
    },
    {
      label: 'Expenses',
      value: formatCurrency(stats.totalExpenses, currency),
      icon: TrendingDown,
      iconColor: 'text-red-500',
      valueColor: 'text-red-600',
    },
    {
      label: 'Net',
      value: formatCurrency(stats.netAmount, currency),
      icon: DollarSign,
      iconColor: '',
      valueColor: stats.netAmount >= 0 ? 'text-green-600' : 'text-red-600',
    },
    {
      label: 'Transactions',
      value: stats.transactionCount.toLocaleString(),
      icon: Receipt,
      iconColor: 'text-blue-500',
      valueColor: 'text-gray-900',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <card.icon size={14} className={card.iconColor} />
            {card.label}
          </div>
          <div className={`text-xl font-semibold ${card.valueColor}`}>{card.value}</div>
        </div>
      ))}
    </div>
  );
}
