import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ContributeModal } from '../contribute-modal.js';
import type { GoalResponse } from '../../../../../shared/types/index.js';

vi.mock('lucide-react', () => ({
  X: () => <span>X</span>,
  Loader2: () => <span>Loader2</span>,
}));

vi.mock('../../../../shared/utils/format-currency.js', () => ({
  formatCurrency: (val: number) => `$${val.toFixed(2)}`,
}));

const mockContributeMutate = vi.fn();

vi.mock('../../hooks.js', () => ({
  useContributeToGoal: () => ({ mutate: mockContributeMutate, isPending: false }),
}));

const mockGoal: GoalResponse = {
  id: 'goal-1',
  name: 'Emergency Fund',
  targetAmount: 10000,
  currentAmount: 3000,
  deadline: '2026-12-31',
  accountId: null,
  categoryId: null,
  status: 'active',
  accountName: null,
  categoryName: null,
  categoryColor: null,
  createdAt: '2026-01-01',
  updatedAt: '2026-03-01',
};

describe('ContributeModal', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders modal title with goal name', () => {
    render(<ContributeModal goal={mockGoal} currency="AUD" onClose={vi.fn()} />);
    expect(screen.getByText('Contribute to Emergency Fund')).toBeInTheDocument();
  });

  it('renders remaining amount', () => {
    render(<ContributeModal goal={mockGoal} currency="AUD" onClose={vi.fn()} />);
    expect(screen.getByText(/\$7000\.00/)).toBeInTheDocument();
  });

  it('renders amount input', () => {
    render(<ContributeModal goal={mockGoal} currency="AUD" onClose={vi.fn()} />);
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
  });

  it('renders note input', () => {
    render(<ContributeModal goal={mockGoal} currency="AUD" onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText('e.g. March savings')).toBeInTheDocument();
  });

  it('calls contribute.mutate on submit', () => {
    render(<ContributeModal goal={mockGoal} currency="AUD" onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '500' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. March savings'), { target: { value: 'March savings' } });
    fireEvent.submit(screen.getByText('Contribute').closest('form')!);
    expect(mockContributeMutate).toHaveBeenCalledWith(
      { id: 'goal-1', amount: 500, note: 'March savings' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('calls contribute with null note when note is empty', () => {
    render(<ContributeModal goal={mockGoal} currency="AUD" onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '100' } });
    fireEvent.submit(screen.getByText('Contribute').closest('form')!);
    expect(mockContributeMutate).toHaveBeenCalledWith(
      { id: 'goal-1', amount: 100, note: null },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<ContributeModal goal={mockGoal} currency="AUD" onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not submit when amount is empty', () => {
    render(<ContributeModal goal={mockGoal} currency="AUD" onClose={vi.fn()} />);
    fireEvent.submit(screen.getByText('Contribute').closest('form')!);
    expect(mockContributeMutate).not.toHaveBeenCalled();
  });

  it('shows $0.00 remaining when goal is already met', () => {
    const completedGoal = { ...mockGoal, currentAmount: 12000 };
    render(<ContributeModal goal={completedGoal} currency="AUD" onClose={vi.fn()} />);
    expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();
  });
});
