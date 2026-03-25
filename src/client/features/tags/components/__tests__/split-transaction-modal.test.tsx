import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SplitTransactionModal } from '../split-transaction-modal.js';

const mockCreateMutate = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock('../../hooks.js', () => ({
  useSplits: vi.fn(() => ({ data: [] })),
  useCreateSplits: vi.fn(() => ({ mutate: mockCreateMutate, isPending: false })),
  useDeleteSplits: vi.fn(() => ({ mutate: mockDeleteMutate, isPending: false })),
}));

vi.mock('../../../transactions/hooks.js', () => ({
  useCategories: vi.fn(() => ({
    data: [
      { id: 'cat1', name: 'Groceries', color: '#22c55e' },
      { id: 'cat2', name: 'Transport', color: '#3b82f6' },
    ],
  })),
}));

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    X: (props: any) => <span data-testid="x-icon" {...props} />,
    Plus: (props: any) => <span data-testid="plus-icon" {...props} />,
    Trash2: (props: any) => <span data-testid="trash-icon" {...props} />,
  };
});

const mockTransaction = {
  id: 'txn1',
  description: 'Costco Shopping',
  amount: 100,
  date: '2026-01-15',
  type: 'debit' as const,
  isSplit: false,
  tags: [],
  categoryId: null,
  categoryName: null,
  categoryColor: null,
  merchant: 'Costco',
  documentId: null,
  documentFilename: null,
  isRecurring: false,
  recurringGroupId: null,
};

describe('SplitTransactionModal', () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it('renders the modal with transaction info', () => {
    render(<SplitTransactionModal transaction={mockTransaction} onClose={vi.fn()} />);
    expect(screen.getByText('Split Transaction')).toBeDefined();
    expect(screen.getByText('Costco Shopping')).toBeDefined();
  });

  it('renders two initial split rows', () => {
    render(<SplitTransactionModal transaction={mockTransaction} onClose={vi.fn()} />);
    const descInputs = screen.getAllByPlaceholderText('Description');
    expect(descInputs.length).toBe(2);
  });

  it('adds a new split row', () => {
    render(<SplitTransactionModal transaction={mockTransaction} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Add row'));
    const descInputs = screen.getAllByPlaceholderText('Description');
    expect(descInputs.length).toBe(3);
  });

  it('removes a split row when there are more than 2', () => {
    render(<SplitTransactionModal transaction={mockTransaction} onClose={vi.fn()} />);
    // Add a row first (need 3+ to allow removal)
    fireEvent.click(screen.getByText('Add row'));
    expect(screen.getAllByPlaceholderText('Description').length).toBe(3);

    // Click a remove button
    const removeButtons = screen.getAllByLabelText('Remove split row');
    fireEvent.click(removeButtons[0]);
    expect(screen.getAllByPlaceholderText('Description').length).toBe(2);
  });

  it('does not show remove buttons when only 2 rows', () => {
    render(<SplitTransactionModal transaction={mockTransaction} onClose={vi.fn()} />);
    expect(screen.queryByLabelText('Remove split row')).toBeNull();
  });

  it('shows remaining amount', () => {
    render(<SplitTransactionModal transaction={mockTransaction} onClose={vi.fn()} />);
    expect(screen.getByText(/Remaining:/)).toBeDefined();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<SplitTransactionModal transaction={mockTransaction} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows Edit Split title when transaction is already split', () => {
    const splitTxn = { ...mockTransaction, isSplit: true };
    render(<SplitTransactionModal transaction={splitTxn} onClose={vi.fn()} />);
    expect(screen.getByText('Edit Split')).toBeDefined();
  });

  it('shows Remove Split button for already-split transactions', () => {
    const splitTxn = { ...mockTransaction, isSplit: true };
    render(<SplitTransactionModal transaction={splitTxn} onClose={vi.fn()} />);
    expect(screen.getByText('Remove Split')).toBeDefined();
  });

  it('renders category selects with options', () => {
    render(<SplitTransactionModal transaction={mockTransaction} onClose={vi.fn()} />);
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBe(2);
  });

  it('updates description field in a split row', () => {
    render(<SplitTransactionModal transaction={mockTransaction} onClose={vi.fn()} />);
    const descInputs = screen.getAllByPlaceholderText('Description');
    fireEvent.change(descInputs[0], { target: { value: 'Groceries' } });
    expect((descInputs[0] as HTMLInputElement).value).toBe('Groceries');
  });

  it('updates amount field in a split row', () => {
    render(<SplitTransactionModal transaction={mockTransaction} onClose={vi.fn()} />);
    const amountInputs = screen.getAllByPlaceholderText('0.00');
    fireEvent.change(amountInputs[0], { target: { value: '60' } });
    expect((amountInputs[0] as HTMLInputElement).value).toBe('60');
  });

  // Removed: "shows validation error when amounts do not sum to total"
  // The Save Split button is disabled when amounts don't sum to total,
  // so the validation error in handleSave is unreachable via click.

  it('shows validation error when a description is missing', () => {
    render(<SplitTransactionModal transaction={mockTransaction} onClose={vi.fn()} />);

    const amountInputs = screen.getAllByPlaceholderText('0.00');
    const descInputs = screen.getAllByPlaceholderText('Description');

    // Fill amounts correctly but leave one description empty
    fireEvent.change(descInputs[0], { target: { value: 'A' } });
    fireEvent.change(amountInputs[0], { target: { value: '50' } });
    fireEvent.change(amountInputs[1], { target: { value: '50' } });

    fireEvent.click(screen.getByText('Save Split'));

    expect(screen.getByText('All splits must have a description')).toBeDefined();
  });

  // Removed: "shows validation error for zero amounts"
  // The Save Split button is disabled when amounts don't sum to total (0 != 100),
  // so the validation error in handleSave is unreachable via click.

  it('calls createSplits.mutate when save is valid', () => {
    render(<SplitTransactionModal transaction={mockTransaction} onClose={vi.fn()} />);

    const descInputs = screen.getAllByPlaceholderText('Description');
    const amountInputs = screen.getAllByPlaceholderText('0.00');

    fireEvent.change(descInputs[0], { target: { value: 'Part A' } });
    fireEvent.change(amountInputs[0], { target: { value: '60' } });
    fireEvent.change(descInputs[1], { target: { value: 'Part B' } });
    fireEvent.change(amountInputs[1], { target: { value: '40' } });

    fireEvent.click(screen.getByText('Save Split'));

    expect(mockCreateMutate).toHaveBeenCalledWith(
      {
        transactionId: 'txn1',
        splits: [
          { categoryId: null, amount: 60, description: 'Part A' },
          { categoryId: null, amount: 40, description: 'Part B' },
        ],
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('calls deleteSplits when Remove Split is clicked', () => {
    const splitTxn = { ...mockTransaction, isSplit: true };
    const onClose = vi.fn();
    render(<SplitTransactionModal transaction={splitTxn} onClose={onClose} />);

    fireEvent.click(screen.getByText('Remove Split'));
    expect(mockDeleteMutate).toHaveBeenCalledWith('txn1', expect.objectContaining({ onSuccess: onClose }));
  });

  it('displays remaining amount that updates as amounts change', () => {
    render(<SplitTransactionModal transaction={mockTransaction} onClose={vi.fn()} />);

    // Initially remaining should be $100.00 (no amounts filled)
    expect(screen.getByText('Remaining: $100.00')).toBeDefined();

    const amountInputs = screen.getAllByPlaceholderText('0.00');
    fireEvent.change(amountInputs[0], { target: { value: '60' } });

    expect(screen.getByText('Remaining: $40.00')).toBeDefined();
  });

  it('changes category in a split row', () => {
    render(<SplitTransactionModal transaction={mockTransaction} onClose={vi.fn()} />);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'cat1' } });
    expect((selects[0] as HTMLSelectElement).value).toBe('cat1');
  });
});
