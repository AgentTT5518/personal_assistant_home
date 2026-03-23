import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { GenerateReportPanel, ReportViewer, ReportHistory, useReport } from '../../features/reports/index.js';
import { useCurrency } from '../../features/settings/index.js';

export function ReportsPage() {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const currency = useCurrency();
  const { data: selectedReport, isLoading: reportLoading } = useReport(selectedReportId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Generate + History */}
        <div className="space-y-6">
          <GenerateReportPanel onGenerated={setSelectedReportId} />
          <ReportHistory onSelect={setSelectedReportId} selectedId={selectedReportId} />
        </div>

        {/* Right: Report Viewer */}
        <div className="lg:col-span-2">
          {selectedReportId && reportLoading && (
            <div className="bg-white rounded-lg border border-gray-200 p-12 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )}

          {selectedReport && (
            <ReportViewer
              reportId={selectedReport.id}
              title={selectedReport.title}
              periodFrom={selectedReport.periodFrom}
              periodTo={selectedReport.periodTo}
              data={selectedReport.data}
              currency={currency}
            />
          )}

          {!selectedReportId && !reportLoading && (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500">
              <p className="text-sm">Generate a report or select one from the history to view it here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
