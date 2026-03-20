import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BudgetProgress } from '../budget-progress.js';
import type { BudgetSummaryResponse } from '../../../../../shared/types/index.js';

afterEach(cleanup);

const mockBudgets: BudgetSummaryResponse[] = [
  {
    id: '1',
    categoryId: 'c1',
    categoryName: 'Groceries',
    categoryColor: '#22c55e',
    budgetAmount: 500,
    period: 'monthly',
    spent: 150,
    remaining: 350,
    percentUsed: 30,
  },
  {
    id: '2',
    categoryId: 'c2',
    categoryName: 'Entertainment',
    categoryColor: '#8b5cf6',
    budgetAmount: 200,
    period: 'monthly',
    spent: 180,
    remaining: 20,
    percentUsed: 90,
  },
  {
    id: '3',
    categoryId: 'c3',
    categoryName: 'Dining Out',
    categoryColor: '#ef4444',
    budgetAmount: 100,
    period: 'monthly',
    spent: 120,
    remaining: -20,
    percentUsed: 120,
  },
];

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('BudgetProgress', () => {
  it('renders nothing when budgets array is empty', () => {
    const { container } = renderWithRouter(<BudgetProgress budgets={[]} currency="AUD" />);
    expect(container.innerHTML).toBe('');
  });

  it('renders budget progress bars', () => {
    renderWithRouter(<BudgetProgress budgets={mockBudgets} currency="AUD" />);
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Entertainment')).toBeInTheDocument();
    expect(screen.getByText('Dining Out')).toBeInTheDocument();
  });

  it('shows the Manage link', () => {
    renderWithRouter(<BudgetProgress budgets={mockBudgets} currency="AUD" />);
    expect(screen.getByText('Manage')).toBeInTheDocument();
  });
});
