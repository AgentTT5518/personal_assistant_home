import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SummaryCards } from '../components/summary-cards.js';
import type { TransactionStats } from '../../../../shared/types/index.js';

const mockStats: TransactionStats = {
  totalIncome: 5000,
  totalExpenses: 3200,
  netAmount: 1800,
  transactionCount: 42,
  uncategorisedCount: 5,
  byCategory: [],
  byMonth: [],
};

describe('SummaryCards', () => {
  it('renders loading state', () => {
    render(<SummaryCards stats={undefined} isLoading={true} currency="AUD" />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders nothing when no stats', () => {
    const { container } = render(<SummaryCards stats={undefined} isLoading={false} currency="AUD" />);
    expect(container.innerHTML).toBe('');
  });

  it('renders all 4 stat cards', () => {
    render(<SummaryCards stats={mockStats} isLoading={false} currency="AUD" />);
    expect(screen.getByText('Income')).toBeInTheDocument();
    expect(screen.getByText('Expenses')).toBeInTheDocument();
    expect(screen.getByText('Net')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
  });

  it('displays formatted values', () => {
    const { container } = render(<SummaryCards stats={mockStats} isLoading={false} currency="AUD" />);
    const text = container.textContent ?? '';
    expect(text).toContain('5,000');
    expect(text).toContain('3,200');
    expect(text).toContain('1,800');
    expect(text).toContain('42');
  });
});
