import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

afterEach(cleanup);
import { BrowserRouter } from 'react-router-dom';
import { RecentTransactions } from '../components/recent-transactions.js';
import type { TransactionResponse } from '../../../../shared/types/index.js';

const mockTransactions: TransactionResponse[] = [
  {
    id: '1',
    documentId: 'doc1',
    date: '2026-03-15',
    description: 'WOOLWORTHS SYDNEY',
    amount: 85.5,
    type: 'debit',
    merchant: 'Woolworths',
    isRecurring: false,
    categoryId: 'cat1',
    categoryName: 'Groceries',
    categoryColor: '#ef4444',
    documentFilename: 'test.pdf',
    createdAt: '2026-03-15T00:00:00Z',
  },
  {
    id: '2',
    documentId: 'doc1',
    date: '2026-03-14',
    description: 'SALARY DEPOSIT',
    amount: 5000,
    type: 'credit',
    merchant: null,
    isRecurring: true,
    categoryId: null,
    categoryName: null,
    categoryColor: null,
    documentFilename: 'test.pdf',
    createdAt: '2026-03-14T00:00:00Z',
  },
];

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('RecentTransactions', () => {
  it('renders loading state', () => {
    renderWithRouter(
      <RecentTransactions transactions={undefined} isLoading={true} currency="AUD" />,
    );
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders empty state when no transactions', () => {
    renderWithRouter(
      <RecentTransactions transactions={[]} isLoading={false} currency="AUD" />,
    );
    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
  });

  it('renders transaction descriptions', () => {
    renderWithRouter(
      <RecentTransactions transactions={mockTransactions} isLoading={false} currency="AUD" />,
    );
    expect(screen.getByText('WOOLWORTHS SYDNEY')).toBeInTheDocument();
    expect(screen.getByText('SALARY DEPOSIT')).toBeInTheDocument();
  });

  it('renders category badge', () => {
    renderWithRouter(
      <RecentTransactions transactions={mockTransactions} isLoading={false} currency="AUD" />,
    );
    expect(screen.getByText('Groceries')).toBeInTheDocument();
  });

  it('has a link to transactions page', () => {
    renderWithRouter(
      <RecentTransactions transactions={mockTransactions} isLoading={false} currency="AUD" />,
    );
    const link = screen.getByRole('link', { name: /view all/i });
    expect(link).toHaveAttribute('href', '/transactions');
  });
});
