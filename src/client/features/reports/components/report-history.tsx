import { Download, Trash2, Loader2, FileText } from 'lucide-react';
import { useState } from 'react';
import { useReports, useDeleteReport } from '../hooks.js';
import { downloadReportPdf } from '../api.js';
import { log } from '../logger.js';
import type { ReportListItem } from '../../../../shared/types/index.js';

interface ReportHistoryProps {
  onSelect: (reportId: string) => void;
  selectedId: string | null;
}

export function ReportHistory({ onSelect, selectedId }: ReportHistoryProps) {
  const { data: reports, isLoading } = useReports();
  const deleteReport = useDeleteReport();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function handleDownload(report: ReportListItem) {
    setDownloadingId(report.id);
    try {
      await downloadReportPdf(report.id, report.title);
    } catch (error) {
      log.error('PDF download failed', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setDownloadingId(null);
    }
  }

  function handleDelete(id: string) {
    if (confirm('Delete this report?')) {
      deleteReport.mutate(id);
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-500 text-sm">
        No reports generated yet. Use the panel above to create your first report.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-base font-semibold text-gray-900">Report History</h3>
      </div>
      <ul className="divide-y divide-gray-100">
        {reports.map((report) => (
          <li
            key={report.id}
            className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${
              selectedId === report.id ? 'bg-blue-50' : ''
            }`}
            onClick={() => onSelect(report.id)}
          >
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-5 w-5 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{report.title}</p>
                <p className="text-xs text-gray-500">
                  {report.periodFrom} to {report.periodTo} &middot;{' '}
                  {new Date(report.generatedAt).toLocaleDateString('en-AU')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(report);
                }}
                disabled={downloadingId === report.id}
                className="p-1.5 text-gray-400 hover:text-green-600 transition-colors"
                title="Download PDF"
              >
                {downloadingId === report.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(report.id);
                }}
                disabled={deleteReport.isPending}
                className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                title="Delete report"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
