import { ImportWizard, ImportHistory } from '../../features/import/index.js';

export function ImportPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Import Data</h2>
      <div className="space-y-8">
        <div className="bg-white border rounded-xl p-6">
          <ImportWizard />
        </div>
        <div className="bg-white border rounded-xl p-6">
          <ImportHistory />
        </div>
      </div>
    </div>
  );
}
