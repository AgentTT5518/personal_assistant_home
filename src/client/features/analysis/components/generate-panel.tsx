import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { DateRangePicker, getDefaultDateRange } from '../../../shared/components/date-range-picker.js';
import type { DateRange } from '../../../shared/components/date-range-picker.js';

interface GeneratePanelProps {
  onGenerate: (dateFrom?: string, dateTo?: string) => void;
  isGenerating: boolean;
  error: string | null;
}

export function GeneratePanel({ onGenerate, isGenerating, error }: GeneratePanelProps) {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);

  function handleGenerate() {
    onGenerate(dateRange.dateFrom, dateRange.dateTo);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <DateRangePicker value={dateRange} onChange={setDateRange} />

      <div className="flex items-center gap-4">
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analysing your spending...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Insights
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
