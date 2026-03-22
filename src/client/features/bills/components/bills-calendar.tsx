import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useBillsCalendar, useMarkBillPaid } from '../hooks.js';
import { useCurrency } from '../../settings/index.js';
import { formatCurrency } from '../../../shared/utils/format-currency.js';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function BillsCalendar() {
  const [viewDate, setViewDate] = useState(() => new Date());
  const currency = useCurrency();
  const markPaid = useMarkBillPaid();

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data: calendar, isLoading } = useBillsCalendar(from, to);

  const billsByDate = useMemo(() => {
    const map = new Map<string, typeof calendar>();
    if (!calendar) return map;
    for (const entry of calendar) {
      map.set(entry.date, [entry]);
    }
    return map;
  }, [calendar]);

  const calendarDays = useMemo(() => {
    const firstDow = new Date(year, month, 1).getDay();
    const days: Array<{ date: number; dateStr: string } | null> = [];

    // Pad start
    for (let i = 0; i < firstDow; i++) days.push(null);
    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ date: d, dateStr });
    }
    return days;
  }, [year, month, lastDay]);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="p-2 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ChevronLeft size={20} />
        </button>
        <h3 className="text-sm font-medium text-gray-700">
          {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        <button
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="p-2 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-gray-400" size={24} />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="grid grid-cols-7 border-b border-gray-200">
            {DAY_LABELS.map((d) => (
              <div key={d} className="px-1 py-2 text-center text-xs font-medium text-gray-500">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              if (!day) {
                return <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-gray-100" />;
              }

              const entries = billsByDate.get(day.dateStr);
              const isToday = day.dateStr === todayStr;
              const isPast = day.dateStr < todayStr;

              return (
                <div
                  key={day.dateStr}
                  className={`min-h-[80px] border-b border-r border-gray-100 p-1 ${isToday ? 'bg-blue-50' : ''}`}
                >
                  <div className={`text-xs mb-1 ${isToday ? 'font-bold text-blue-700' : 'text-gray-400'}`}>
                    {day.date}
                  </div>
                  {entries?.map((entry) =>
                    entry.bills.map((bill) => (
                      <button
                        key={bill.id}
                        onClick={() => markPaid.mutate(bill.id)}
                        className={`w-full text-left px-1 py-0.5 text-xs rounded mb-0.5 truncate ${
                          isPast ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                        } hover:opacity-80`}
                        title={`${bill.name} — ${formatCurrency(bill.expectedAmount, currency)} (click to mark paid)`}
                      >
                        {bill.name}
                      </button>
                    )),
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
