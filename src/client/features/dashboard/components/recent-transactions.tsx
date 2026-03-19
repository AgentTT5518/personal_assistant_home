import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import type { TransactionResponse } from '../../../../shared/types/index.js';
import { formatCurrency } from '../../../shared/utils/format-currency.js';

interface RecentTransactionsProps {
  transactions: TransactionResponse[] | undefined;
  isLoading: boolean;
  currency: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

export function RecentTransactions({ transactions, isLoading, currency }: RecentTransactionsProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-4">Recent Transactions</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-gray-400" size={20} />
        </div>
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-4">Recent Transactions</h3>
        <p className="text-gray-400 text-sm text-center py-4">No transactions yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500">Recent Transactions</h3>
        <Link
          to="/transactions"
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
        >
          View all <ArrowRight size={12} />
        </Link>
      </div>
      <div className="space-y-2">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs text-gray-400 w-12 shrink-0">{formatDate(tx.date)}</span>
              <span className="text-sm text-gray-900 truncate">{tx.description}</span>
              {tx.categoryName && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: `${tx.categoryColor}20`,
                    color: tx.categoryColor ?? '#6b7280',
                  }}
                >
                  {tx.categoryName}
                </span>
              )}
            </div>
            <span
              className={`text-sm font-medium shrink-0 ml-3 ${
                tx.type === 'credit' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
