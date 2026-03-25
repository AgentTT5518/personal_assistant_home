import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AccountList } from '../account-list.js';
import type { AccountResponse } from '../../../../../shared/types/index.js';

vi.mock('lucide-react', () => ({
  Plus: () => <span>Plus</span>,
  Pencil: () => <span>Pencil</span>,
  Trash2: () => <span>Trash2</span>,
  RefreshCw: () => <span>RefreshCw</span>,
  X: () => <span>X</span>,
}));

vi.mock('../../../../shared/utils/format-currency.js', () => ({
  formatCurrency: (val: number) => `$${val.toFixed(2)}`,
}));

vi.mock('../../../settings/index.js', () => ({
  useCurrency: () => 'AUD',
}));

const mockAccounts: AccountResponse[] = [
  {
    id: 'acc-1',
    name: 'Main Checking',
    type: 'checking',
    institution: 'Commonwealth Bank',
    currency: 'AUD',
    currentBalance: 1500,
    isActive: true,
    transactionCount: 10,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'acc-2',
    name: 'My Credit Card',
    type: 'credit_card',
    institution: null,
    currency: 'AUD',
    currentBalance: 500,
    isActive: true,
    transactionCount: 0,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const mockDeleteMutate = vi.fn();
const mockRecalculateMutate = vi.fn();

let mockAccountsReturn: { data: AccountResponse[] | undefined; isLoading: boolean } = {
  data: mockAccounts,
  isLoading: false,
};

vi.mock('../../hooks.js', () => ({
  useAccounts: () => mockAccountsReturn,
  useDeleteAccount: () => ({ mutate: mockDeleteMutate, isPending: false }),
  useRecalculateBalance: () => ({ mutate: mockRecalculateMutate, isPending: false }),
}));

// Mock AccountForm to avoid nested hook issues
vi.mock('../account-form.js', () => ({
  AccountForm: () => <div data-testid="account-form">AccountForm</div>,
}));

describe('AccountList', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockAccountsReturn = { data: mockAccounts, isLoading: false };
  });

  it('renders account rows', () => {
    render(<AccountList />);
    expect(screen.getByText('Main Checking')).toBeInTheDocument();
    expect(screen.getByText('My Credit Card')).toBeInTheDocument();
  });

  it('renders type labels', () => {
    render(<AccountList />);
    expect(screen.getByText('Checking')).toBeInTheDocument();
    expect(screen.getByText('Credit Card')).toBeInTheDocument();
  });

  it('renders Add Account button', () => {
    render(<AccountList />);
    expect(screen.getByText('Add Account')).toBeInTheDocument();
  });

  it('renders show inactive checkbox', () => {
    render(<AccountList />);
    expect(screen.getByText('Show inactive')).toBeInTheDocument();
  });

  it('shows institution or dash', () => {
    render(<AccountList />);
    expect(screen.getByText('Commonwealth Bank')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    mockAccountsReturn = { data: undefined, isLoading: true };
    render(<AccountList />);
    expect(screen.getByText('Loading accounts...')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    mockAccountsReturn = { data: [], isLoading: false };
    render(<AccountList />);
    expect(screen.getByText('No accounts yet')).toBeInTheDocument();
  });

  it('formats credit card balance with minus prefix', () => {
    render(<AccountList />);
    // Credit card (acc-2) should have a minus prefix
    expect(screen.getByText('-$500.00')).toBeInTheDocument();
  });

  it('renders transaction count for accounts', () => {
    render(<AccountList />);
    // acc-1 has transactionCount: 10
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('renders recalculate button only for accounts with transactions', () => {
    render(<AccountList />);
    // acc-1 has transactionCount > 0, so recalculate button should appear
    const recalcButtons = screen.getAllByTitle('Recalculate balance');
    expect(recalcButtons).toHaveLength(1);
  });

  it('calls recalculateMutation when recalculate button is clicked', () => {
    render(<AccountList />);
    const recalcButton = screen.getByTitle('Recalculate balance');
    fireEvent.click(recalcButton);
    expect(mockRecalculateMutate).toHaveBeenCalledWith('acc-1');
  });

  it('calls deleteMutation when delete is confirmed for account with no transactions', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<AccountList />);
    // acc-2 has transactionCount: 0
    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[1]); // second delete button = acc-2
    expect(mockDeleteMutate).toHaveBeenCalledWith({ id: 'acc-2', hard: true });
    vi.restoreAllMocks();
  });

  it('calls deleteMutation with soft delete for account with transactions', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<AccountList />);
    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]); // first delete button = acc-1
    expect(mockDeleteMutate).toHaveBeenCalledWith({ id: 'acc-1', hard: false });
    vi.restoreAllMocks();
  });

  it('does not delete when confirm is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<AccountList />);
    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);
    expect(mockDeleteMutate).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('opens form when Add Account button is clicked', () => {
    render(<AccountList />);
    fireEvent.click(screen.getByText('Add Account'));
    expect(screen.getByTestId('account-form')).toBeInTheDocument();
  });

  it('opens form in edit mode when edit button is clicked', () => {
    render(<AccountList />);
    const editButtons = screen.getAllByTitle('Edit');
    fireEvent.click(editButtons[0]);
    expect(screen.getByTestId('account-form')).toBeInTheDocument();
  });

  it('toggles show inactive checkbox', () => {
    render(<AccountList />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('applies opacity to inactive accounts', () => {
    mockAccountsReturn = {
      data: [
        { ...mockAccounts[0], isActive: false },
      ],
      isLoading: false,
    };
    render(<AccountList />);
    const row = screen.getByText('Main Checking').closest('tr');
    expect(row?.className).toContain('opacity-50');
  });
});
