import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('../hooks.js', () => ({
  useTransactions: () => ({
    data: { data: [], page: 1, totalPages: 1, total: 0 },
    isLoading: false,
  }),
  useTransactionStats: () => ({
    data: {
      totalIncome: 0,
      totalExpenses: 0,
      netAmount: 0,
      transactionCount: 0,
      uncategorisedCount: 0,
      byCategory: [],
      byMonth: [],
    },
  }),
  useAiCategorise: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('../../recurring/index.js', () => ({
  useDetectRecurring: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useRecurringSummary: () => ({
    data: [],
    isLoading: false,
  }),
  RecurringGroupPanel: () => null,
}));

vi.mock('../../settings/index.js', () => ({
  useCurrency: () => 'AUD',
}));

vi.mock('../components/stats-summary.js', () => ({
  StatsSummary: () => <div data-testid="stats-summary">StatsSummary</div>,
}));

vi.mock('../components/transaction-filters.js', () => ({
  TransactionFiltersBar: () => <div data-testid="filters-bar">TransactionFiltersBar</div>,
}));

vi.mock('../components/transaction-table.js', () => ({
  TransactionTable: () => <div data-testid="transaction-table">TransactionTable</div>,
}));

vi.mock('../components/bulk-actions-bar.js', () => ({
  BulkActionsBar: () => <div data-testid="bulk-actions-bar">BulkActionsBar</div>,
}));

vi.mock('../components/category-manager.js', () => ({
  CategoryManager: () => <div data-testid="category-manager">CategoryManager</div>,
}));

import { TransactionsPage } from '../transactions-page.js';

afterEach(cleanup);

describe('TransactionsPage (feature)', () => {
  it('renders Transactions heading', () => {
    render(<TransactionsPage />);
    expect(screen.getByText('Transactions')).toBeInTheDocument();
  });

  it('renders Categories button', () => {
    render(<TransactionsPage />);
    expect(screen.getByText('Categories')).toBeInTheDocument();
  });

  it('renders Detect Recurring button', () => {
    render(<TransactionsPage />);
    expect(screen.getByText('Detect Recurring')).toBeInTheDocument();
  });

  it('renders StatsSummary component', () => {
    render(<TransactionsPage />);
    expect(screen.getByTestId('stats-summary')).toBeInTheDocument();
  });

  it('renders TransactionFiltersBar component', () => {
    render(<TransactionsPage />);
    expect(screen.getByTestId('filters-bar')).toBeInTheDocument();
  });

  it('renders TransactionTable component', () => {
    render(<TransactionsPage />);
    expect(screen.getByTestId('transaction-table')).toBeInTheDocument();
  });

  it('renders BulkActionsBar component', () => {
    render(<TransactionsPage />);
    expect(screen.getByTestId('bulk-actions-bar')).toBeInTheDocument();
  });

  it('does not show AI Categorise button when uncategorisedCount is 0', () => {
    render(<TransactionsPage />);
    expect(screen.queryByText('AI Categorise')).not.toBeInTheDocument();
  });
});
