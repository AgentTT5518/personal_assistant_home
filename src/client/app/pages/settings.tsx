import { Link } from 'react-router-dom';
import { Target } from 'lucide-react';
import { AiSettingsPanel } from '../../features/document-upload/index.js';
import { CurrencySelector, CsvExport, DataManagement, DbStats } from '../../features/settings/index.js';

export function SettingsPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Settings</h2>
      <CurrencySelector />
      <Link
        to="/budgets"
        className="flex items-center gap-2 mb-4 px-4 py-3 bg-white rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
      >
        <Target size={16} className="text-gray-400" />
        <span>Manage Budget Goals</span>
        <span className="ml-auto text-gray-400">&rarr;</span>
      </Link>
      <AiSettingsPanel />
      <CsvExport />
      <DataManagement />
      <DbStats />
    </div>
  );
}
