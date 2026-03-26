import { useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import type { AccountResponse } from '../../../../shared/types/index.js';
import { formatCurrency } from '../../../shared/utils/format-currency.js';
import { useCurrency } from '../../settings/index.js';
import { useAccounts, useDeleteAccount, useRecalculateBalance } from '../hooks.js';
import { AccountForm } from './account-form.js';

const TYPE_LABELS: Record<string, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit_card: 'Credit Card',
  investment: 'Investment',
};

export function AccountList() {
  const [showInactive, setShowInactive] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountResponse | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: accounts, isLoading } = useAccounts(showInactive ? undefined : true);
  const deleteMutation = useDeleteAccount();
  const recalculateMutation = useRecalculateBalance();
  const currency = useCurrency();

  const handleDelete = (account: AccountResponse) => {
    const message = (account.transactionCount ?? 0) > 0
      ? `This will deactivate "${account.name}". It has ${account.transactionCount} linked transactions.`
      : `Delete "${account.name}"? This account has no linked transactions and can be permanently removed.`;

    if (!confirm(message)) return;

    const hard = (account.transactionCount ?? 0) === 0;
    deleteMutation.mutate({ id: account.id, hard }, {
      onSuccess: () => toast.success('Account deleted'),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleRecalculate = (id: string) => {
    recalculateMutation.mutate(id, {
      onSuccess: () => toast.success('Balance recalculated'),
      onError: (err) => toast.error(err.message),
    });
  };

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading accounts...</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded"
            />
            Show inactive
          </label>
        </div>
        <button
          onClick={() => { setEditingAccount(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 min-h-[44px]"
        >
          <Plus size={16} />
          Add Account
        </button>
      </div>

      {(!accounts || accounts.length === 0) ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium mb-1">No accounts yet</p>
          <p className="text-sm">Add your first financial account to start tracking balances.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-3 font-medium text-gray-500">Name</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500">Type</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500 hidden sm:table-cell">Institution</th>
                <th className="text-right py-3 px-3 font-medium text-gray-500">Balance</th>
                <th className="text-right py-3 px-3 font-medium text-gray-500 hidden md:table-cell">Transactions</th>
                <th className="text-right py-3 px-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr
                  key={account.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${!account.isActive ? 'opacity-50' : ''}`}
                >
                  <td className="py-3 px-3 font-medium text-gray-900">{account.name}</td>
                  <td className="py-3 px-3 text-gray-600">{TYPE_LABELS[account.type] ?? account.type}</td>
                  <td className="py-3 px-3 text-gray-600 hidden sm:table-cell">{account.institution ?? '—'}</td>
                  <td className={`py-3 px-3 text-right font-medium ${account.type === 'credit_card' ? 'text-red-600' : 'text-gray-900'}`}>
                    {account.type === 'credit_card' ? '-' : ''}{formatCurrency(account.currentBalance, currency)}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-600 hidden md:table-cell">{account.transactionCount ?? 0}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center justify-end gap-1">
                      {(account.transactionCount ?? 0) > 0 && (
                        <button
                          onClick={() => handleRecalculate(account.id)}
                          disabled={recalculateMutation.isPending}
                          className="p-1.5 text-gray-400 hover:text-blue-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="Recalculate balance"
                        >
                          <RefreshCw size={16} className={recalculateMutation.isPending ? 'animate-spin' : ''} />
                        </button>
                      )}
                      <button
                        onClick={() => { setEditingAccount(account); setShowForm(true); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(account)}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 text-gray-400 hover:text-red-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <AccountForm
          account={editingAccount}
          onClose={() => { setShowForm(false); setEditingAccount(null); }}
        />
      )}
    </div>
  );
}
