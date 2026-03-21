import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Target, Tag } from 'lucide-react';
import { AiSettingsPanel } from '../../features/document-upload/index.js';
import { CurrencySelector, CsvExport, DataManagement, DbStats } from '../../features/settings/index.js';
import { TagManager } from '../../features/tags/index.js';

export function SettingsPage() {
  const [tagManagerOpen, setTagManagerOpen] = useState(false);

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
      <button
        type="button"
        onClick={() => setTagManagerOpen(true)}
        className="flex w-full items-center gap-2 mb-4 px-4 py-3 bg-white rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
      >
        <Tag size={16} className="text-gray-400" />
        <span>Manage Tags</span>
        <span className="ml-auto text-gray-400">&rarr;</span>
      </button>
      <AiSettingsPanel />
      <CsvExport />
      <DataManagement />
      <DbStats />
      <TagManager isOpen={tagManagerOpen} onClose={() => setTagManagerOpen(false)} />
    </div>
  );
}
