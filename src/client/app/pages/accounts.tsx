import { AccountList } from '../../features/accounts/index.js';

export function AccountsPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Accounts</h2>
      <AccountList />
    </div>
  );
}
