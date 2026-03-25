import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { GoalForm } from '../goal-form.js';
import type { GoalResponse } from '../../../../../shared/types/index.js';

vi.mock('lucide-react', () => ({
  X: () => <span>X</span>,
  Loader2: () => <span>Loader2</span>,
}));

vi.mock('../../../accounts/index.js', () => ({
  AccountSelector: ({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) => (
    <select data-testid="account-selector" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">No Account</option>
      <option value="acc-1">Savings</option>
    </select>
  ),
}));

vi.mock('../../../transactions/hooks.js', () => ({
  useCategories: () => ({
    data: [
      { id: 'cat-1', name: 'Savings' },
      { id: 'cat-2', name: 'Travel' },
    ],
  }),
}));

const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();

vi.mock('../../hooks.js', () => ({
  useCreateGoal: () => ({ mutate: mockCreateMutate, isPending: false }),
  useUpdateGoal: () => ({ mutate: mockUpdateMutate, isPending: false }),
}));

const mockGoal: GoalResponse = {
  id: 'goal-1',
  name: 'Emergency Fund',
  targetAmount: 10000,
  currentAmount: 5000,
  deadline: '2026-12-31',
  accountId: 'acc-1',
  categoryId: 'cat-1',
  status: 'active',
  accountName: 'Savings',
  categoryName: 'Savings',
  categoryColor: '#10b981',
  createdAt: '2026-01-01',
  updatedAt: '2026-03-01',
};

describe('GoalForm', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders Add Goal form for new goal', () => {
    render(<GoalForm onClose={vi.fn()} />);
    expect(screen.getByText('Add Goal')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Target Amount')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Emergency Fund, Holiday Trip')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('renders Edit Goal form with pre-filled values', () => {
    render(<GoalForm goal={mockGoal} onClose={vi.fn()} />);
    expect(screen.getByText('Edit Goal')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Emergency Fund')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-12-31')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('shows status selector only in edit mode', () => {
    render(<GoalForm onClose={vi.fn()} />);
    expect(screen.queryByText('Status')).not.toBeInTheDocument();

    cleanup();

    render(<GoalForm goal={mockGoal} onClose={vi.fn()} />);
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('calls createGoal.mutate on submit for new goal', () => {
    render(<GoalForm onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Emergency Fund, Holiday Trip'), { target: { value: 'Vacation' } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '5000' } });
    fireEvent.submit(screen.getByText('Create').closest('form')!);
    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Vacation',
        targetAmount: 5000,
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('calls updateGoal.mutate on submit for existing goal', () => {
    render(<GoalForm goal={mockGoal} onClose={vi.fn()} />);
    fireEvent.change(screen.getByDisplayValue('Emergency Fund'), { target: { value: 'Updated Fund' } });
    fireEvent.submit(screen.getByText('Save').closest('form')!);
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'goal-1',
        name: 'Updated Fund',
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<GoalForm onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders category options', () => {
    render(<GoalForm onClose={vi.fn()} />);
    expect(screen.getByText('No Category')).toBeInTheDocument();
    expect(screen.getByText('Travel')).toBeInTheDocument();
  });

  it('does not submit when name is empty', () => {
    render(<GoalForm onClose={vi.fn()} />);
    // Only fill amount, leave name empty
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '1000' } });
    fireEvent.submit(screen.getByText('Create').closest('form')!);
    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  it('does not submit when target amount is invalid', () => {
    render(<GoalForm onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Emergency Fund, Holiday Trip'), { target: { value: 'Goal' } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '0' } });
    fireEvent.submit(screen.getByText('Create').closest('form')!);
    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  it('selects a category for new goal', () => {
    render(<GoalForm onClose={vi.fn()} />);
    const categorySelect = screen.getByText('No Category').closest('select')!;
    fireEvent.change(categorySelect, { target: { value: 'cat-2' } });
    expect((categorySelect as HTMLSelectElement).value).toBe('cat-2');
  });

  it('selects an account for new goal', () => {
    render(<GoalForm onClose={vi.fn()} />);
    const accountSelect = screen.getByTestId('account-selector');
    fireEvent.change(accountSelect, { target: { value: 'acc-1' } });
    expect((accountSelect as HTMLSelectElement).value).toBe('acc-1');
  });

  it('sets a deadline for new goal', () => {
    const { container } = render(<GoalForm onClose={vi.fn()} />);
    const dateInput = container.querySelector('input[type="date"]')!;
    fireEvent.change(dateInput, { target: { value: '2026-06-30' } });
    expect((dateInput as HTMLInputElement).value).toBe('2026-06-30');
  });

  it('creates a goal with all fields', () => {
    render(<GoalForm onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Emergency Fund, Holiday Trip'), { target: { value: 'Trip' } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '3000' } });

    const categorySelect = screen.getByText('No Category').closest('select')!;
    fireEvent.change(categorySelect, { target: { value: 'cat-2' } });

    const accountSelect = screen.getByTestId('account-selector');
    fireEvent.change(accountSelect, { target: { value: 'acc-1' } });

    fireEvent.submit(screen.getByText('Create').closest('form')!);

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Trip',
        targetAmount: 3000,
        accountId: 'acc-1',
        categoryId: 'cat-2',
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('updates status when editing a goal', () => {
    render(<GoalForm goal={mockGoal} onClose={vi.fn()} />);
    const statusSelect = screen.getByText('Active').closest('select')!;
    fireEvent.change(statusSelect, { target: { value: 'completed' } });

    fireEvent.submit(screen.getByText('Save').closest('form')!);

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'goal-1',
        status: 'completed',
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('calls onClose when clicking the overlay backdrop', () => {
    const onClose = vi.fn();
    render(<GoalForm onClose={onClose} />);
    // Click the fixed overlay
    const overlay = screen.getByText('Add Goal').closest('.fixed')!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });
});
