import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AccountForm } from '../account-form.js';
import type { AccountResponse } from '../../../../../shared/types/index.js';

vi.mock('lucide-react', () => ({
  X: () => <span>X</span>,
}));

const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();

vi.mock('../../hooks.js', () => ({
  useCreateAccount: () => ({
    mutate: mockCreateMutate,
    isPending: false,
  }),
  useUpdateAccount: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
}));

const mockAccount: AccountResponse = {
  id: 'acc-1',
  name: 'Main Checking',
  type: 'checking',
  institution: 'Commonwealth Bank',
  currency: 'AUD',
  currentBalance: 1500.5,
  isActive: true,
  transactionCount: 10,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

describe('AccountForm', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders form fields for new account', () => {
    render(<AccountForm onClose={vi.fn()} />);
    expect(screen.getByText('New Account')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Institution')).toBeInTheDocument();
    expect(screen.getByText('Currency')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Main Checking')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('renders edit mode with pre-filled values', () => {
    render(<AccountForm account={mockAccount} onClose={vi.fn()} />);
    expect(screen.getByText('Edit Account')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Main Checking')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Commonwealth Bank')).toBeInTheDocument();
    expect(screen.getByDisplayValue('AUD')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1500.5')).toBeInTheDocument();
    expect(screen.getByText('Update')).toBeInTheDocument();
  });

  it('calls createMutation on submit for new account', () => {
    render(<AccountForm onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Main Checking'), { target: { value: 'Savings' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Commonwealth Bank'), { target: { value: 'NAB' } });
    fireEvent.submit(screen.getByText('Create').closest('form')!);
    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Savings',
        type: 'checking',
        institution: 'NAB',
        currency: 'AUD',
        currentBalance: 0,
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('calls updateMutation on submit for edit mode', () => {
    render(<AccountForm account={mockAccount} onClose={vi.fn()} />);
    fireEvent.change(screen.getByDisplayValue('Main Checking'), { target: { value: 'Updated Name' } });
    fireEvent.submit(screen.getByText('Update').closest('form')!);
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'acc-1',
        name: 'Updated Name',
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('shows error when balance is invalid', () => {
    render(<AccountForm onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Main Checking'), { target: { value: 'Test' } });
    // The balance input is the number input
    const numberInputs = screen.getAllByRole('spinbutton');
    fireEvent.change(numberInputs[0], { target: { value: 'abc' } });
    fireEvent.submit(screen.getByText('Create').closest('form')!);
    expect(screen.getByText('Invalid balance amount')).toBeInTheDocument();
    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  it('shows error when name is empty', () => {
    render(<AccountForm onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Main Checking'), { target: { value: '   ' } });
    fireEvent.submit(screen.getByText('Create').closest('form')!);
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<AccountForm onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows Balance Owed label for credit card type', () => {
    render(<AccountForm onClose={vi.fn()} />);
    // Select credit_card type from the type dropdown
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'credit_card' } });
    expect(screen.getByText('Balance Owed')).toBeInTheDocument();
  });
});
