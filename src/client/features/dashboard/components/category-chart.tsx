import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { TransactionStats } from '../../../../shared/types/index.js';
import { formatCurrency } from '../../../shared/utils/format-currency.js';

interface CategoryChartProps {
  byCategory: TransactionStats['byCategory'];
  currency: string;
}

export function CategoryChart({ byCategory, currency }: CategoryChartProps) {
  // Filter to expenses only (negative totals) and take absolute values
  const data = byCategory
    .filter((c) => c.total > 0)
    .map((c) => ({
      name: c.categoryName,
      value: c.total,
      color: c.categoryColor,
    }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-4">Spending by Category</h3>
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          No categorised expenses yet
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-sm font-medium text-gray-500 mb-4">Spending by Category</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => {
              const num = Number(value);
              return [`${formatCurrency(num, currency)} (${((num / total) * 100).toFixed(1)}%)`, name];
            }}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            formatter={(value: string) => (
              <span className="text-xs text-gray-600">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
