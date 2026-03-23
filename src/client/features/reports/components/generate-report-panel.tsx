import { useState } from 'react';
import { FileBarChart, Loader2 } from 'lucide-react';
import { useGenerateReport } from '../hooks.js';
import type { ReportType } from '../../../../shared/types/index.js';

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom' },
];

interface GenerateReportPanelProps {
  onGenerated?: (reportId: string) => void;
}

export function GenerateReportPanel({ onGenerated }: GenerateReportPanelProps) {
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [periodFrom, setPeriodFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [periodTo, setPeriodTo] = useState(() => {
    const d = new Date();
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  });

  const generateReport = useGenerateReport();

  function handleTypeChange(type: ReportType) {
    setReportType(type);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    switch (type) {
      case 'monthly': {
        const lastDay = new Date(year, month + 1, 0).getDate();
        setPeriodFrom(`${year}-${String(month + 1).padStart(2, '0')}-01`);
        setPeriodTo(`${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
        break;
      }
      case 'quarterly': {
        const quarter = Math.floor(month / 3);
        const qStart = quarter * 3;
        const qEnd = qStart + 2;
        const lastDay = new Date(year, qEnd + 1, 0).getDate();
        setPeriodFrom(`${year}-${String(qStart + 1).padStart(2, '0')}-01`);
        setPeriodTo(`${year}-${String(qEnd + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
        break;
      }
      case 'yearly': {
        setPeriodFrom(`${year}-01-01`);
        setPeriodTo(`${year}-12-31`);
        break;
      }
      // custom: keep current dates
    }
  }

  function handleGenerate() {
    generateReport.mutate(
      { periodFrom, periodTo, reportType },
      { onSuccess: (report) => onGenerated?.(report.id) },
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FileBarChart className="h-5 w-5" />
        Generate Report
      </h2>

      <div className="space-y-4">
        {/* Report Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
          <div className="flex flex-wrap gap-2">
            {REPORT_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => handleTypeChange(t.value)}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  reportType === t.value
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="periodFrom" className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <input
              id="periodFrom"
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="periodTo" className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              id="periodTo"
              type="date"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={generateReport.isPending || !periodFrom || !periodTo}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {generateReport.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileBarChart className="h-4 w-4" />
              Generate Report
            </>
          )}
        </button>

        {generateReport.isError && (
          <p className="text-sm text-red-600">
            {generateReport.error instanceof Error ? generateReport.error.message : 'Failed to generate report'}
          </p>
        )}
      </div>
    </div>
  );
}
