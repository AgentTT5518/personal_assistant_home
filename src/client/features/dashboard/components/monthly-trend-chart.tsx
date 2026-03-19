import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { TransactionStats } from '../../../../shared/types/index.js';
import { formatCurrency } from '../../../shared/utils/format-currency.js';

interface MonthlyTrendChartProps {
  byMonth: TransactionStats['byMonth'];
  currency: string;
}

function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-');
  const date = new Date(Number(year), Number(m) - 1);
  return date.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' });
}

export function MonthlyTrendChart({ byMonth, currency }: MonthlyTrendChartProps) {
  if (byMonth.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-4">Monthly Trend</h3>
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          No monthly data available
        </div>
      </div>
    );
  }

  const data = byMonth.map((m) => ({
    month: formatMonthLabel(m.month),
    Income: m.income,
    Expenses: m.expenses,
    Net: m.income - m.expenses,
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-sm font-medium text-gray-500 mb-4">Monthly Trend</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(v: number) => formatCurrency(v, currency).replace(/\.00$/, '')}
            width={80}
          />
          <Tooltip
            formatter={(value, name) => [formatCurrency(Number(value), currency), name]}
          />
          <Legend />
          <Bar dataKey="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
