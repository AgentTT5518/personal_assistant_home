import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('../../../features/transactions/hooks.js', () => ({
  useTransactionStats: () => ({
    data: { totalIncome: 1000, totalExpenses: 500, netAmount: 500, transactionCount: 10, uncategorisedCount: 0, byCategory: [], byMonth: [] },
    isLoading: false,
  }),
  useTransactions: () => ({ data: { data: [], page: 1, totalPages: 1 }, isLoading: false }),
}));

vi.mock('../../../features/settings/index.js', () => ({
  useCurrency: () => 'AUD',
}));

vi.mock('../../../shared/components/date-range-picker.js', () => ({
  DateRangePicker: () => <div data-testid="date-range-picker">DateRangePicker</div>,
  getDefaultDateRange: () => ({ dateFrom: '2026-01-01', dateTo: '2026-01-31' }),
}));

vi.mock('../../../features/dashboard/components/summary-cards.js', () => ({
  SummaryCards: () => <div data-testid="summary-cards">SummaryCards</div>,
}));

vi.mock('../../../features/dashboard/components/category-chart.js', () => ({
  CategoryChart: () => <div data-testid="category-chart">CategoryChart</div>,
}));

vi.mock('../../../features/dashboard/components/monthly-trend-chart.js', () => ({
  MonthlyTrendChart: () => <div data-testid="monthly-trend-chart">MonthlyTrendChart</div>,
}));

vi.mock('../../../features/dashboard/components/recent-transactions.js', () => ({
  RecentTransactions: () => <div data-testid="recent-transactions">RecentTransactions</div>,
}));

vi.mock('../../../features/dashboard/components/empty-state.js', () => ({
  EmptyState: () => <div data-testid="empty-state">EmptyState</div>,
}));

vi.mock('../../../features/budgets/index.js', () => ({
  BudgetProgress: () => null,
  useBudgetSummary: () => ({ data: null }),
}));

vi.mock('../../../features/recurring/index.js', () => ({
  RecurringSummaryCard: () => null,
  useRecurringSummary: () => ({ data: null }),
}));

vi.mock('../../../features/accounts/index.js', () => ({
  AccountOverview: () => <div data-testid="account-overview">AccountOverview</div>,
}));

vi.mock('../../../features/bills/index.js', () => ({
  UpcomingBillsWidget: () => null,
  useUpcomingBills: () => ({ data: null }),
}));

vi.mock('../../../features/goals/index.js', () => ({
  GoalProgressWidget: () => null,
  useActiveGoals: () => ({ data: null }),
}));

import { DashboardPage } from '../dashboard.js';

afterEach(cleanup);

describe('DashboardPage', () => {
  it('renders Dashboard heading', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders date range picker when data exists', () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('date-range-picker')).toBeInTheDocument();
  });

  it('renders summary cards', () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('summary-cards')).toBeInTheDocument();
  });

  it('renders chart components', () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('category-chart')).toBeInTheDocument();
    expect(screen.getByTestId('monthly-trend-chart')).toBeInTheDocument();
  });
});
