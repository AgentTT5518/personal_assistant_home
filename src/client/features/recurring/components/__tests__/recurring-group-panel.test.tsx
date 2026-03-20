import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { RecurringGroupPanel } from '../recurring-group-panel.js';
import type { RecurringGroup } from '../../../../../shared/types/index.js';

afterEach(cleanup);

const mockGroups: RecurringGroup[] = [
  {
    merchant: 'Netflix',
    categoryId: null,
    categoryName: null,
    categoryColor: null,
    averageAmount: 14.99,
    frequency: 'monthly',
    lastDate: '2026-03-01',
    nextExpectedDate: '2026-04-01',
    transactionCount: 3,
  },
];

describe('RecurringGroupPanel', () => {
  it('shows loading state', () => {
    render(<RecurringGroupPanel groups={undefined} isLoading={true} currency="AUD" />);
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('shows empty state when no groups', () => {
    render(<RecurringGroupPanel groups={[]} isLoading={false} currency="AUD" />);
    expect(screen.getByText(/No recurring transactions detected/)).toBeInTheDocument();
  });

  it('renders group list with merchant and frequency', () => {
    render(<RecurringGroupPanel groups={mockGroups} isLoading={false} currency="AUD" />);
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText(/monthly/)).toBeInTheDocument();
    expect(screen.getByText(/3 transactions/)).toBeInTheDocument();
  });
});
