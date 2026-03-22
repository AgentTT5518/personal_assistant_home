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
import { BudgetProgress, useBudgetSummary } from '../../features/budgets/index.js';
import { RecurringSummaryCard, useRecurringSummary } from '../../features/recurring/index.js';
import { AccountOverview } from '../../features/accounts/index.js';
import { UpcomingBillsWidget, useUpcomingBills } from '../../features/bills/index.js';

export function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const currency = useCurrency();

  const { data: stats, isLoading: statsLoading } = useTransactionStats(
    dateRange.dateFrom,
    dateRange.dateTo,
  );

  const [recentPage, setRecentPage] = useState(1);

  const { data: recentData, isLoading: recentLoading } = useTransactions({
    sortBy: 'date',
    sortOrder: 'desc',
    page: recentPage,
    pageSize: 5,
  });

  const { data: budgetSummary } = useBudgetSummary();
  const { data: recurringSummary } = useRecurringSummary();
  const { data: upcomingBills } = useUpcomingBills();

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

          <div className="mb-6">
            <AccountOverview currency={currency} />
          </div>

          {((budgetSummary && budgetSummary.length > 0) || (recurringSummary && recurringSummary.length > 0) || (upcomingBills && upcomingBills.length > 0)) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {upcomingBills && upcomingBills.length > 0 && (
                <UpcomingBillsWidget currency={currency} />
              )}
              {budgetSummary && budgetSummary.length > 0 && (
                <BudgetProgress budgets={budgetSummary} currency={currency} />
              )}
              {recurringSummary && recurringSummary.length > 0 && (
                <RecurringSummaryCard groups={recurringSummary} currency={currency} />
              )}
            </div>
          )}

          <RecentTransactions
            transactions={recentData?.data}
            isLoading={recentLoading}
            currency={currency}
            page={recentData?.page ?? 1}
            totalPages={recentData?.totalPages ?? 1}
            onPageChange={setRecentPage}
          />
        </>
      )}
    </div>
  );
}
