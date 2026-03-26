import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BillsList } from '../bills-list.js';
import type { BillResponse } from '../../../../../shared/types/index.js';

vi.mock('lucide-react', () => ({
  Plus: () => <span>Plus</span>,
  Pencil: () => <span>Pencil</span>,
  Trash2: () => <span>Trash2</span>,
  Check: () => <span>Check</span>,
  RefreshCw: () => <span>RefreshCw</span>,
  Loader2: () => <span data-testid="loader">Loader2</span>,
  X: () => <span>X</span>,
}));

vi.mock('../../../../shared/utils/format-currency.js', () => ({
  formatCurrency: (val: number) => `$${val.toFixed(2)}`,
}));

vi.mock('../../../settings/index.js', () => ({
  useCurrency: () => 'AUD',
}));

const mockBills: BillResponse[] = [
  {
    id: 'bill-1',
    name: 'Netflix',
    expectedAmount: 15.99,
    frequency: 'monthly',
    nextDueDate: '2026-12-01',
    accountId: null,
    categoryId: null,
    notes: null,
    isActive: true,
    accountName: null,
    categoryName: null,
    categoryColor: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'bill-2',
    name: 'Rent',
    expectedAmount: 1200,
    frequency: 'monthly',
    nextDueDate: '2026-12-15',
    accountId: 'acc-1',
    categoryId: 'cat-1',
    notes: null,
    isActive: true,
    accountName: 'Checking',
    categoryName: 'Housing',
    categoryColor: '#ef4444',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const mockDeleteMutate = vi.fn();
const mockMarkPaidMutate = vi.fn();
const mockPopulateMutate = vi.fn();

let mockBillsReturn: { data: BillResponse[] | undefined; isLoading: boolean } = {
  data: mockBills,
  isLoading: false,
};

vi.mock('../../hooks.js', () => ({
  useBills: () => mockBillsReturn,
  useDeleteBill: () => ({ mutate: mockDeleteMutate, isPending: false }),
  useMarkBillPaid: () => ({ mutate: mockMarkPaidMutate, isPending: false }),
  usePopulateFromRecurring: () => ({
    mutate: mockPopulateMutate,
    isPending: false,
    isSuccess: false,
    data: null,
  }),
}));

// Mock BillForm to avoid nested hook issues
vi.mock('../bill-form.js', () => ({
  BillForm: () => <div data-testid="bill-form">BillForm</div>,
}));

describe('BillsList', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockBillsReturn = { data: mockBills, isLoading: false };
  });

  it('renders bill names', () => {
    render(<BillsList />);
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText('Rent')).toBeInTheDocument();
  });

  it('renders bill amounts', () => {
    render(<BillsList />);
    expect(screen.getByText('$15.99')).toBeInTheDocument();
    expect(screen.getByText('$1200.00')).toBeInTheDocument();
  });

  it('renders category name when present', () => {
    render(<BillsList />);
    expect(screen.getByText('Housing')).toBeInTheDocument();
  });

  it('renders Add Bill button', () => {
    render(<BillsList />);
    expect(screen.getByText('Add Bill')).toBeInTheDocument();
  });

  it('renders Import from Recurring button', () => {
    render(<BillsList />);
    expect(screen.getByText('Import from Recurring')).toBeInTheDocument();
  });

  it('renders empty state when no bills', () => {
    mockBillsReturn = { data: [], isLoading: false };
    render(<BillsList />);
    expect(screen.getByText(/no bills yet/i)).toBeInTheDocument();
  });

  it('renders loading state', () => {
    mockBillsReturn = { data: undefined, isLoading: true };
    render(<BillsList />);
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('has mark as paid buttons', () => {
    render(<BillsList />);
    const markPaidButtons = screen.getAllByLabelText('Mark as paid');
    expect(markPaidButtons).toHaveLength(2);
  });

  it('calls markPaid when mark as paid button is clicked', () => {
    render(<BillsList />);
    fireEvent.click(screen.getAllByLabelText('Mark as paid')[0]);
    expect(mockMarkPaidMutate).toHaveBeenCalledWith('bill-1', expect.any(Object));
  });

  it('calls deleteBill when delete button is clicked', () => {
    render(<BillsList />);
    fireEvent.click(screen.getAllByLabelText('Delete')[0]);
    expect(mockDeleteMutate).toHaveBeenCalledWith('bill-1', expect.any(Object));
  });

  it('shows bill form when Add Bill is clicked', () => {
    render(<BillsList />);
    fireEvent.click(screen.getByText('Add Bill'));
    expect(screen.getByTestId('bill-form')).toBeInTheDocument();
  });

  it('shows overdue styling for overdue bills', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const overdueBills: BillResponse[] = [
      {
        ...mockBills[0],
        nextDueDate: yesterday.toISOString().split('T')[0],
      },
    ];
    mockBillsReturn = { data: overdueBills, isLoading: false };
    render(<BillsList />);
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    // The bill row should have overdue styling
    const row = screen.getByText('Netflix').closest('.px-4')!;
    expect(row.className).toContain('bg-red-50');
  });

  it('shows due-soon styling for bills due within 3 days', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueSoonBills: BillResponse[] = [
      {
        ...mockBills[0],
        nextDueDate: tomorrow.toISOString().split('T')[0],
      },
    ];
    mockBillsReturn = { data: dueSoonBills, isLoading: false };
    render(<BillsList />);
    expect(screen.getByText('Due soon')).toBeInTheDocument();
    const row = screen.getByText('Netflix').closest('.px-4')!;
    expect(row.className).toContain('bg-amber-50');
  });

  it('renders account name when present', () => {
    render(<BillsList />);
    expect(screen.getByText('Checking')).toBeInTheDocument();
  });

  it('shows bill form in edit mode when edit is clicked', () => {
    render(<BillsList />);
    const editButtons = screen.getAllByLabelText('Edit');
    fireEvent.click(editButtons[0]);
    expect(screen.getByTestId('bill-form')).toBeInTheDocument();
  });

  it('renders frequency for each bill', () => {
    render(<BillsList />);
    const monthlyTexts = screen.getAllByText('monthly');
    expect(monthlyTexts.length).toBe(2);
  });

  it('sorts bills by next due date', () => {
    render(<BillsList />);
    // Netflix (2026-12-01) should appear before Rent (2026-12-15)
    const billNames = screen.getAllByText(/Netflix|Rent/).map((el) => el.textContent);
    expect(billNames.indexOf('Netflix')).toBeLessThan(billNames.indexOf('Rent'));
  });

  it('calls populate mutation when Import from Recurring is clicked', () => {
    render(<BillsList />);
    fireEvent.click(screen.getByText('Import from Recurring'));
    expect(mockPopulateMutate).toHaveBeenCalled();
  });

  it('renders next due date for each bill', () => {
    render(<BillsList />);
    expect(screen.getByText('2026-12-01')).toBeInTheDocument();
    expect(screen.getByText('2026-12-15')).toBeInTheDocument();
  });
});
