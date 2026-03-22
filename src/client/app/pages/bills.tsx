import { useState } from 'react';
import { List, CalendarDays } from 'lucide-react';
import { BillsList, BillsCalendar } from '../../features/bills/index.js';

type ViewMode = 'list' | 'calendar';

export function BillsPage() {
  const [view, setView] = useState<ViewMode>('list');

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Bills</h2>
        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
          <button
            onClick={() => setView('list')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm min-h-[44px] ${
              view === 'list' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <List size={14} />
            List
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm min-h-[44px] ${
              view === 'calendar' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <CalendarDays size={14} />
            Calendar
          </button>
        </div>
      </div>

      {view === 'list' ? <BillsList /> : <BillsCalendar />}
    </div>
  );
}
