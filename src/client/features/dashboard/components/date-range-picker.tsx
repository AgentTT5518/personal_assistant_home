import { useState } from 'react';
import { Calendar } from 'lucide-react';

export interface DateRange {
  dateFrom: string | undefined;
  dateTo: string | undefined;
}

type Preset = 'this-month' | 'last-3' | 'last-6' | 'this-year' | 'all';

const PRESET_LABELS: Record<Preset, string> = {
  'this-month': 'This Month',
  'last-3': 'Last 3 Months',
  'last-6': 'Last 6 Months',
  'this-year': 'This Year',
  'all': 'All Time',
};

function computePresetRange(preset: Preset): DateRange {
  if (preset === 'all') {
    return { dateFrom: undefined, dateTo: undefined };
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  let fromDate: Date;
  switch (preset) {
    case 'this-month':
      fromDate = new Date(year, month, 1);
      break;
    case 'last-3':
      fromDate = new Date(year, month - 3, 1);
      break;
    case 'last-6':
      fromDate = new Date(year, month - 6, 1);
      break;
    case 'this-year':
      fromDate = new Date(year, 0, 1);
      break;
  }

  return {
    dateFrom: fromDate.toISOString().split('T')[0],
    dateTo: now.toISOString().split('T')[0],
  };
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [activePreset, setActivePreset] = useState<Preset | 'custom'>('last-3');
  const [showCustom, setShowCustom] = useState(false);

  function handlePreset(preset: Preset) {
    setActivePreset(preset);
    setShowCustom(false);
    onChange(computePresetRange(preset));
  }

  function handleCustomToggle() {
    setActivePreset('custom');
    setShowCustom(true);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {(Object.keys(PRESET_LABELS) as Preset[]).map((preset) => (
        <button
          key={preset}
          onClick={() => handlePreset(preset)}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            activePreset === preset
              ? 'bg-blue-100 text-blue-700 font-medium'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          {PRESET_LABELS[preset]}
        </button>
      ))}
      <button
        onClick={handleCustomToggle}
        className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
          activePreset === 'custom'
            ? 'bg-blue-100 text-blue-700 font-medium'
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
        }`}
      >
        <Calendar size={14} />
        Custom
      </button>

      {showCustom && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={value.dateFrom ?? ''}
            onChange={(e) => onChange({ ...value, dateFrom: e.target.value || undefined })}
            className="px-2 py-1 text-sm border border-gray-200 rounded-lg"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={value.dateTo ?? ''}
            onChange={(e) => onChange({ ...value, dateTo: e.target.value || undefined })}
            className="px-2 py-1 text-sm border border-gray-200 rounded-lg"
          />
        </div>
      )}
    </div>
  );
}

export function getDefaultDateRange(): DateRange {
  return computePresetRange('last-3');
}
