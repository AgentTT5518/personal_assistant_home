import { AiSettingsPanel } from '../../features/document-upload/index.js';
import { CurrencySelector, CsvExport, DataManagement, DbStats } from '../../features/settings/index.js';

export function SettingsPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Settings</h2>
      <CurrencySelector />
      <AiSettingsPanel />
      <CsvExport />
      <DataManagement />
      <DbStats />
    </div>
  );
}
