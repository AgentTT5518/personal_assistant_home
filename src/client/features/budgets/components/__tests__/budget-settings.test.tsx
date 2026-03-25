import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock('../../../transactions/hooks.js', () => ({
  useCategories: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('../../hooks.js', () => ({
  useBudgets: vi.fn(() => ({ data: [], isLoading: false })),
  useCreateBudget: vi.fn(() => ({ mutate: mockCreateMutate, isPending: false })),
  useUpdateBudget: vi.fn(() => ({ mutate: mockUpdateMutate, isPending: false })),
  useDeleteBudget: vi.fn(() => ({ mutate: mockDeleteMutate, isPending: false })),
}));

vi.mock('../../../settings/index.js', () => ({
  useCurrency: () => 'AUD',
}));

vi.mock('../../../../shared/utils/format-currency.js', () => ({
  formatCurrency: (value: number, _currency: string) => `$${value.toFixed(2)}`,
}));

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    Loader2: (props: any) => <span data-testid="loader" {...props} />,
    Plus: (props: any) => <span data-testid="plus-icon" {...props} />,
    Trash2: (props: any) => <span data-testid="trash-icon" {...props} />,
    Save: (props: any) => <span data-testid="save-icon" {...props} />,
  };
});

import { BudgetSettings } from '../budget-settings.js';

const mockCategories = [
  { id: 'cat1', name: 'Groceries', color: '#22c55e', parentId: null },
  { id: 'cat2', name: 'Transport', color: '#3b82f6', parentId: null },
  { id: 'cat3', name: 'Entertainment', color: '#f97316', parentId: null },
];

const mockBudgets = [
  { id: 'b1', categoryId: 'cat1', categoryName: 'Groceries', categoryColor: '#22c55e', amount: 500, period: 'monthly' as const },
  { id: 'b2', categoryId: 'cat2', categoryName: 'Transport', categoryColor: '#3b82f6', amount: 200, period: 'weekly' as const },
];

describe('BudgetSettings', () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it('renders title', () => {
    render(<BudgetSettings />);
    expect(screen.getByText('Budget Settings')).toBeInTheDocument();
  });

  it('renders spending limits heading', () => {
    render(<BudgetSettings />);
    expect(screen.getByText('Spending Limits by Category')).toBeInTheDocument();
  });

  it('renders empty state message when no budgets', () => {
    render(<BudgetSettings />);
    expect(screen.getByText('No budgets set. Add one below.')).toBeInTheDocument();
  });

  it('renders loading state when categories are loading', async () => {
    const { useCategories } = await import('../../../transactions/hooks.js');
    (useCategories as any).mockReturnValue({ data: null, isLoading: true });

    render(<BudgetSettings />);
    expect(screen.getByTestId('loader')).toBeDefined();
  });

  it('renders loading state when budgets are loading', async () => {
    const { useBudgets } = await import('../../hooks.js');
    (useBudgets as any).mockReturnValue({ data: null, isLoading: true });

    render(<BudgetSettings />);
    expect(screen.getByTestId('loader')).toBeDefined();
  });

  it('renders budget rows with category names and amounts', async () => {
    const { useCategories } = await import('../../../transactions/hooks.js');
    (useCategories as any).mockReturnValue({ data: mockCategories, isLoading: false });
    const { useBudgets } = await import('../../hooks.js');
    (useBudgets as any).mockReturnValue({ data: mockBudgets, isLoading: false });

    render(<BudgetSettings />);
    expect(screen.getByText('Groceries')).toBeDefined();
    expect(screen.getByText('Transport')).toBeDefined();
    expect(screen.getByText('$500.00')).toBeDefined();
    expect(screen.getByText('$200.00')).toBeDefined();
  });

  it('renders period label for each budget', async () => {
    const { useCategories } = await import('../../../transactions/hooks.js');
    (useCategories as any).mockReturnValue({ data: mockCategories, isLoading: false });
    const { useBudgets } = await import('../../hooks.js');
    (useBudgets as any).mockReturnValue({ data: mockBudgets, isLoading: false });

    render(<BudgetSettings />);
    expect(screen.getByText('monthly')).toBeDefined();
    expect(screen.getByText('weekly')).toBeDefined();
  });

  it('renders period selector in the add budget form with Monthly, Weekly, Yearly', async () => {
    const { useCategories } = await import('../../../transactions/hooks.js');
    (useCategories as any).mockReturnValue({ data: mockCategories, isLoading: false });
    const { useBudgets } = await import('../../hooks.js');
    (useBudgets as any).mockReturnValue({ data: [], isLoading: false });

    render(<BudgetSettings />);
    expect(screen.getByText('Monthly')).toBeDefined();
    expect(screen.getByText('Weekly')).toBeDefined();
    expect(screen.getByText('Yearly')).toBeDefined();
  });

  it('renders only un-budgeted categories in the new budget category dropdown', async () => {
    const { useCategories } = await import('../../../transactions/hooks.js');
    (useCategories as any).mockReturnValue({ data: mockCategories, isLoading: false });
    const { useBudgets } = await import('../../hooks.js');
    (useBudgets as any).mockReturnValue({ data: mockBudgets, isLoading: false });

    render(<BudgetSettings />);
    // cat1 (Groceries) and cat2 (Transport) are already budgeted
    // Only cat3 (Entertainment) should appear in the new budget dropdown
    const selectCategory = screen.getByText('Select category...');
    expect(selectCategory).toBeDefined();
    expect(screen.getByText('Entertainment')).toBeDefined();
  });

  it('renders Edit and Delete buttons for each budget', async () => {
    const { useCategories } = await import('../../../transactions/hooks.js');
    (useCategories as any).mockReturnValue({ data: mockCategories, isLoading: false });
    const { useBudgets } = await import('../../hooks.js');
    (useBudgets as any).mockReturnValue({ data: mockBudgets, isLoading: false });

    render(<BudgetSettings />);
    const editButtons = screen.getAllByText('Edit');
    expect(editButtons.length).toBe(2);
  });

  it('enters edit mode when Edit button is clicked', async () => {
    const { useCategories } = await import('../../../transactions/hooks.js');
    (useCategories as any).mockReturnValue({ data: mockCategories, isLoading: false });
    const { useBudgets } = await import('../../hooks.js');
    (useBudgets as any).mockReturnValue({ data: mockBudgets, isLoading: false });

    render(<BudgetSettings />);
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    // Should show Cancel button in edit mode
    expect(screen.getByText('Cancel')).toBeDefined();
    // Should show a number input with the current amount
    const numberInputs = document.querySelectorAll('input[type="number"]');
    const editInput = Array.from(numberInputs).find((input) => (input as HTMLInputElement).value === '500');
    expect(editInput).toBeDefined();
  });

  it('renders Add button in new budget form', async () => {
    const { useCategories } = await import('../../../transactions/hooks.js');
    (useCategories as any).mockReturnValue({ data: mockCategories, isLoading: false });
    const { useBudgets } = await import('../../hooks.js');
    (useBudgets as any).mockReturnValue({ data: [], isLoading: false });

    render(<BudgetSettings />);
    expect(screen.getByText('Add')).toBeDefined();
  });

  it('renders amount placeholder in new budget form', async () => {
    const { useCategories } = await import('../../../transactions/hooks.js');
    (useCategories as any).mockReturnValue({ data: mockCategories, isLoading: false });
    const { useBudgets } = await import('../../hooks.js');
    (useBudgets as any).mockReturnValue({ data: [], isLoading: false });

    render(<BudgetSettings />);
    expect(screen.getByPlaceholderText('Amount')).toBeDefined();
  });

  it('hides add form when all categories are budgeted', async () => {
    const { useCategories } = await import('../../../transactions/hooks.js');
    // Only two categories, both budgeted
    (useCategories as any).mockReturnValue({
      data: [
        { id: 'cat1', name: 'Groceries', color: '#22c55e', parentId: null },
        { id: 'cat2', name: 'Transport', color: '#3b82f6', parentId: null },
      ],
      isLoading: false,
    });
    const { useBudgets } = await import('../../hooks.js');
    (useBudgets as any).mockReturnValue({ data: mockBudgets, isLoading: false });

    render(<BudgetSettings />);
    expect(screen.queryByText('Add')).toBeNull();
    expect(screen.queryByText('Select category...')).toBeNull();
  });
});
