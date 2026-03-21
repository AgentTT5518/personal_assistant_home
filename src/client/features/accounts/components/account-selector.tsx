import { useAccounts } from '../hooks.js';

interface AccountSelectorProps {
  value: string | null;
  onChange: (accountId: string | null) => void;
  className?: string;
  includeAll?: boolean;
}

export function AccountSelector({ value, onChange, className = '', includeAll = true }: AccountSelectorProps) {
  const { data: accounts } = useAccounts(true);

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className={`border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-h-[44px] ${className}`}
    >
      {includeAll && <option value="">All Accounts</option>}
      {!includeAll && <option value="">No Account</option>}
      {accounts?.map((account) => (
        <option key={account.id} value={account.id}>
          {account.name} ({account.type.replace('_', ' ')})
        </option>
      ))}
    </select>
  );
}
