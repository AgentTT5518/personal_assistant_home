import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('../../../features/budgets/index.js', () => ({
  BudgetSettings: () => <div data-testid="budget-settings">Budget Settings</div>,
}));

import { BudgetsPage } from '../budgets.js';

afterEach(cleanup);

describe('BudgetsPage', () => {
  it('renders BudgetSettings component', () => {
    render(<BudgetsPage />);
    expect(screen.getByTestId('budget-settings')).toBeInTheDocument();
  });
});
