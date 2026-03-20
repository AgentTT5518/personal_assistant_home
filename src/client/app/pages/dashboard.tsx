import { useState } from 'react';
import { useTransactionStats, useTransactions } from '../../features/transactions/hooks.js';
import { useCurrency } from '../../features/settings/index.js';
import { DateRangePicker, getDefaultDateRange } from '../../shared/components/date-range-picker.js';
import type { DateRange } from '../../shared/components/date-range-picker.js';
import { SummaryCards } from '../../features/dashboard/components/summary-cards.js';
import { CategoryChart } from '../../features/dashboard/components/category-chart.js';
import { MonthlyTrendChart } from '../../features/dashboard/components/monthly-trend-chart.js';
import { RecentTransactions } from '../../features/dashboard/components/recent-transactions.js';
import { EmptyState } from '../../features/dashboard/components/empty-state.js';

export function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const currency = useCurrency();

  const { data: stats, isLoading: statsLoading } = useTransactionStats(
    dateRange.dateFrom,
    dateRange.dateTo,
  );

  const { data: recentData, isLoading: recentLoading } = useTransactions({
    sortBy: 'date',
    sortOrder: 'desc',
    page: 1,
    pageSize: 5,
  });

  const hasData = stats && stats.transactionCount > 0;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

      {!statsLoading && !hasData ? (
        <EmptyState />
      ) : (
        <>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <SummaryCards stats={stats} isLoading={statsLoading} currency={currency} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <CategoryChart byCategory={stats?.byCategory ?? []} currency={currency} />
            <MonthlyTrendChart byMonth={stats?.byMonth ?? []} currency={currency} />
          </div>

          <RecentTransactions
            transactions={recentData?.data}
            isLoading={recentLoading}
            currency={currency}
          />
        </>
      )}
    </div>
  );
}
