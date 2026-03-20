import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { DateRangePicker, getDefaultDateRange } from '../../../shared/components/date-range-picker.js';
import type { DateRange } from '../../../shared/components/date-range-picker.js';
import { log } from '../logger.js';

export function CsvExport() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleExport() {
    setIsLoading(true);
    setError(null);
    setInfo(null);

    try {
      const params = new URLSearchParams();
      if (dateRange.dateFrom) params.set('from', dateRange.dateFrom);
      if (dateRange.dateTo) params.set('to', dateRange.dateTo);

      const url = `/api/transactions/export/csv${params.toString() ? `?${params}` : ''}`;
      const res = await fetch(url);

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
        throw new Error(body.error?.message ?? `Export failed: ${res.status}`);
      }

      const text = await res.text();

      // Check if empty (only header or no content)
      const lines = text.trim().split('\n');
      if (lines.length <= 1) {
        setInfo('No transactions to export');
        return;
      }

      // Trigger browser download
      const blob = new Blob([text], { type: 'text/csv' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const today = new Date().toISOString().split('T')[0];
      a.href = blobUrl;
      a.download = `transactions-${today}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export CSV';
      setError(message);
      log.error('CSV export failed', err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Export Transactions</h3>
      <p className="text-sm text-gray-500 mb-4">
        Download your transactions as a CSV file.
      </p>

      <DateRangePicker value={dateRange} onChange={setDateRange} />

      <button
        onClick={handleExport}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {isLoading ? 'Exporting...' : 'Export CSV'}
      </button>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
      {info && (
        <p className="mt-2 text-sm text-amber-600">{info}</p>
      )}
    </div>
  );
}
