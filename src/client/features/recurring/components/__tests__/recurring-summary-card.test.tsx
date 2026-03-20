import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { RecurringSummaryCard } from '../recurring-summary-card.js';
import type { RecurringGroup } from '../../../../../shared/types/index.js';

afterEach(cleanup);

const mockGroups: RecurringGroup[] = [
  {
    merchant: 'Netflix',
    categoryId: null,
    categoryName: null,
    categoryColor: null,
    averageAmount: 15,
    frequency: 'monthly',
    lastDate: '2026-03-01',
    nextExpectedDate: '2026-04-01',
    transactionCount: 3,
  },
  {
    merchant: 'Gym',
    categoryId: null,
    categoryName: null,
    categoryColor: null,
    averageAmount: 20,
    frequency: 'weekly',
    lastDate: '2026-03-15',
    nextExpectedDate: '2026-03-22',
    transactionCount: 8,
  },
];

describe('RecurringSummaryCard', () => {
  it('renders nothing when groups is empty', () => {
    const { container } = render(<RecurringSummaryCard groups={[]} currency="AUD" />);
    expect(container.innerHTML).toBe('');
  });

  it('renders estimated monthly total', () => {
    render(<RecurringSummaryCard groups={mockGroups} currency="AUD" />);
    expect(screen.getByText('Recurring Expenses')).toBeInTheDocument();
    expect(screen.getByText('2 recurring subscriptions detected')).toBeInTheDocument();
  });

  it('shows /month label', () => {
    render(<RecurringSummaryCard groups={mockGroups} currency="AUD" />);
    expect(screen.getByText('/month')).toBeInTheDocument();
  });
});
