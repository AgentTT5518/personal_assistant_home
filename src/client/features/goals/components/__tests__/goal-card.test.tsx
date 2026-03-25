import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { GoalCard } from '../goal-card.js';
import type { GoalResponse } from '../../../../../shared/types/index.js';

vi.mock('lucide-react', () => ({
  Target: () => <span>Target</span>,
  Calendar: () => <span>Calendar</span>,
  Pencil: () => <span>Pencil</span>,
  Trash2: () => <span>Trash2</span>,
  Plus: () => <span>Plus</span>,
  RefreshCw: () => <span>RefreshCw</span>,
}));

vi.mock('../../../../shared/utils/format-currency.js', () => ({
  formatCurrency: (val: number) => `$${val.toFixed(2)}`,
}));

const baseGoal: GoalResponse = {
  id: 'goal-1',
  name: 'Emergency Fund',
  targetAmount: 10000,
  currentAmount: 5000,
  deadline: '2026-12-31',
  accountId: 'acc-1',
  categoryId: 'cat-1',
  status: 'active',
  accountName: 'My Savings Acct',
  categoryName: 'Personal Savings',
  categoryColor: '#10b981',
  createdAt: '2026-01-01',
  updatedAt: '2026-03-01',
};

describe('GoalCard', () => {
  const defaultProps = {
    goal: baseGoal,
    currency: 'AUD',
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onContribute: vi.fn(),
    onSyncBalance: vi.fn(),
  };

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders goal name', () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
  });

  it('renders progress percentage', () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders current and target amounts', () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByText(/\$5000\.00/)).toBeInTheDocument();
    expect(screen.getByText(/\$10000\.00/)).toBeInTheDocument();
  });

  it('renders category name', () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByText('Personal Savings')).toBeInTheDocument();
  });

  it('renders account name', () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByText('My Savings Acct')).toBeInTheDocument();
  });

  it('renders deadline label', () => {
    const { container } = render(<GoalCard {...defaultProps} />);
    expect(container.textContent).toMatch(/\d+d left|Overdue|Due today/);
  });

  it('calls onEdit when edit button is clicked', () => {
    render(<GoalCard {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Edit goal'));
    expect(defaultProps.onEdit).toHaveBeenCalledWith(baseGoal);
  });

  it('calls onDelete when delete button is clicked', () => {
    render(<GoalCard {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Delete goal'));
    expect(defaultProps.onDelete).toHaveBeenCalledWith('goal-1');
  });

  it('calls onContribute when contribute button is clicked', () => {
    render(<GoalCard {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Add contribution'));
    expect(defaultProps.onContribute).toHaveBeenCalledWith(baseGoal);
  });

  it('shows sync button when goal has accountId and onSyncBalance', () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByLabelText('Sync from account balance')).toBeInTheDocument();
  });

  it('hides sync button when no accountId', () => {
    const goal = { ...baseGoal, accountId: null, accountName: null };
    render(<GoalCard {...defaultProps} goal={goal} />);
    expect(screen.queryByLabelText('Sync from account balance')).not.toBeInTheDocument();
  });

  it('hides contribute and sync buttons when goal is completed', () => {
    const goal = { ...baseGoal, status: 'completed' as const };
    render(<GoalCard {...defaultProps} goal={goal} />);
    expect(screen.queryByLabelText('Add contribution')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Sync from account balance')).not.toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('caps progress at 100%', () => {
    const goal = { ...baseGoal, currentAmount: 15000 };
    render(<GoalCard {...defaultProps} goal={goal} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('renders 0% when targetAmount is 0', () => {
    const goal = { ...baseGoal, targetAmount: 0, currentAmount: 0 };
    render(<GoalCard {...defaultProps} goal={goal} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
