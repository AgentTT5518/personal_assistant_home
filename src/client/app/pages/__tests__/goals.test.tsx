import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('../../../features/goals/index.js', () => ({
  useGoals: () => ({ data: [], isLoading: false }),
  useDeleteGoal: () => ({ mutate: vi.fn() }),
  useSyncGoalBalance: () => ({ mutate: vi.fn() }),
  GoalCard: () => null,
  GoalForm: () => null,
  ContributeModal: () => null,
}));

vi.mock('../../../features/settings/index.js', () => ({
  useCurrency: () => 'AUD',
}));

import { GoalsPage } from '../goals.js';

afterEach(cleanup);

describe('GoalsPage', () => {
  it('renders Goals heading', () => {
    render(<GoalsPage />);
    expect(screen.getByText('Goals')).toBeInTheDocument();
  });

  it('renders Add Goal button', () => {
    render(<GoalsPage />);
    expect(screen.getByText('Add Goal')).toBeInTheDocument();
  });

  it('renders status tabs', () => {
    render(<GoalsPage />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('renders empty state for active filter with no goals', () => {
    render(<GoalsPage />);
    expect(screen.getByText(/No active goals yet/)).toBeInTheDocument();
  });
});
