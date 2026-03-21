import { Wallet } from 'lucide-react';
import { useNetWorth } from '../hooks.js';
import { formatCurrency } from '../../../shared/utils/format-currency.js';

interface AccountOverviewProps {
  currency: string;
}

const TYPE_LABELS: Record<string, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit_card: 'Credit Card',
  investment: 'Investment',
};

export function AccountOverview({ currency }: AccountOverviewProps) {
  const { data, isLoading } = useNetWorth();

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-8 bg-gray-200 rounded w-32" />
        </div>
      </div>
    );
  }

  if (!data || data.accounts.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Wallet size={20} className="text-blue-600" />
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Accounts</h3>
      </div>

      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-1">Net Worth</p>
        <p className={`text-2xl font-bold ${data.netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatCurrency(data.netWorth, currency)}
        </p>
      </div>

      <div className="space-y-2">
        {data.accounts.map((account) => (
          <div key={account.id} className="flex items-center justify-between text-sm">
            <div>
              <span className="text-gray-700">{account.name}</span>
              <span className="text-gray-400 ml-1.5 text-xs">{TYPE_LABELS[account.type] ?? account.type}</span>
            </div>
            <span className={`font-medium ${account.effectiveBalance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {formatCurrency(account.effectiveBalance, currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
