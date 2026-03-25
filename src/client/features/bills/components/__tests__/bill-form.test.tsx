import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BillForm } from '../bill-form.js';
import type { BillResponse } from '../../../../../shared/types/index.js';

vi.mock('lucide-react', () => ({
  X: () => <span>X</span>,
  Loader2: () => <span>Loader2</span>,
}));

vi.mock('../../../accounts/index.js', () => ({
  AccountSelector: ({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) => (
    <select data-testid="account-selector" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">No Account</option>
      <option value="acc-1">Checking</option>
    </select>
  ),
}));

vi.mock('../../../transactions/hooks.js', () => ({
  useCategories: () => ({
    data: [
      { id: 'cat-1', name: 'Utilities' },
      { id: 'cat-2', name: 'Entertainment' },
    ],
  }),
}));

const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();

vi.mock('../../hooks.js', () => ({
  useCreateBill: () => ({ mutate: mockCreateMutate, isPending: false }),
  useUpdateBill: () => ({ mutate: mockUpdateMutate, isPending: false }),
}));

const mockBill: BillResponse = {
  id: 'bill-1',
  name: 'Netflix',
  expectedAmount: 15.99,
  frequency: 'monthly',
  nextDueDate: '2026-04-01',
  accountId: 'acc-1',
  categoryId: 'cat-2',
  notes: 'Streaming',
  isActive: true,
  accountName: 'Checking',
  categoryName: 'Entertainment',
  categoryColor: '#3b82f6',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

describe('BillForm', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders Add Bill form for new bill', () => {
    render(<BillForm onClose={vi.fn()} />);
    expect(screen.getByText('Add Bill')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Frequency')).toBeInTheDocument();
    expect(screen.getByText('Next Due Date')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Netflix, Rent, Electricity')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('renders Edit Bill form with pre-filled values', () => {
    render(<BillForm bill={mockBill} onClose={vi.fn()} />);
    expect(screen.getByText('Edit Bill')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Netflix')).toBeInTheDocument();
    expect(screen.getByDisplayValue('15.99')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-04-01')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('calls createBill.mutate on submit for new bill', () => {
    render(<BillForm onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Netflix, Rent, Electricity'), { target: { value: 'Rent' } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '1200' } });
    // Find the date input
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-05-01' } });
    fireEvent.submit(screen.getByText('Create').closest('form')!);
    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Rent',
        expectedAmount: 1200,
        frequency: 'monthly',
        nextDueDate: '2026-05-01',
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('calls updateBill.mutate on submit for existing bill', () => {
    render(<BillForm bill={mockBill} onClose={vi.fn()} />);
    fireEvent.change(screen.getByDisplayValue('Netflix'), { target: { value: 'Netflix Premium' } });
    fireEvent.submit(screen.getByText('Save').closest('form')!);
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'bill-1',
        name: 'Netflix Premium',
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<BillForm onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders frequency options', () => {
    render(<BillForm onClose={vi.fn()} />);
    expect(screen.getByText('Weekly')).toBeInTheDocument();
    expect(screen.getByText('Biweekly')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
    expect(screen.getByText('Quarterly')).toBeInTheDocument();
    expect(screen.getByText('Yearly')).toBeInTheDocument();
  });

  it('renders category options', () => {
    render(<BillForm onClose={vi.fn()} />);
    expect(screen.getByText('No Category')).toBeInTheDocument();
    expect(screen.getByText('Utilities')).toBeInTheDocument();
    expect(screen.getByText('Entertainment')).toBeInTheDocument();
  });
});
