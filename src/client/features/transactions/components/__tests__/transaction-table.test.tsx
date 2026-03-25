import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TransactionTable } from '../transaction-table.js';

vi.mock('../../hooks.js', () => ({
  useUpdateTransaction: vi.fn(() => ({
    mutate: vi.fn(),
  })),
}));

vi.mock('../category-selector.js', () => ({
  CategorySelector: ({ onChange }: any) => (
    <div data-testid="category-selector">
      <button onClick={() => onChange('cat1')}>Select Category</button>
    </div>
  ),
}));

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    Loader2: (props: any) => <span data-testid="loader" {...props} />,
    ArrowUp: (props: any) => <span data-testid="arrow-up" {...props} />,
    ArrowDown: (props: any) => <span data-testid="arrow-down" {...props} />,
    FileText: (props: any) => <span data-testid="file-text" {...props} />,
  };
});

const mockData = {
  data: [
    {
      id: 'txn1',
      date: '2026-01-02',
      description: 'Coffee Shop Purchase',
      merchant: 'Cafe Latte',
      amount: 5.5,
      type: 'debit' as const,
      categoryId: 'cat1',
      categoryName: 'Food',
      categoryColor: '#22c55e',
      documentFilename: 'jan.pdf',
      isSplit: false,
      tags: [],
      isRecurring: false,
      recurringGroupId: null,
      documentId: null,
      accountId: 'acc1',
      accountName: 'Checking',
      importSessionId: null,
      createdAt: '2026-01-02T00:00:00Z',
    },
    {
      id: 'txn2',
      date: '2026-01-05',
      description: 'Salary Payment',
      merchant: null,
      amount: 3000,
      type: 'credit' as const,
      categoryId: null,
      categoryName: null,
      categoryColor: null,
      documentFilename: null,
      isSplit: false,
      tags: [],
      isRecurring: false,
      recurringGroupId: null,
      documentId: null,
      accountId: 'acc1',
      accountName: 'Checking',
      importSessionId: null,
      createdAt: '2026-01-05T00:00:00Z',
    },
  ],
  total: 2,
  page: 1,
  pageSize: 50,
  totalPages: 1,
};

const defaultFilters = {
  sortBy: 'date' as const,
  sortOrder: 'desc' as const,
  page: 1,
  pageSize: 50,
};

describe('TransactionTable', () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it('renders loading state', () => {
    render(
      <TransactionTable
        data={undefined}
        isLoading={true}
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        selectedIds={new Set()}
        onSelectionChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId('loader')).toBeDefined();
  });

  it('renders empty state', () => {
    render(
      <TransactionTable
        data={{ data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 }}
        isLoading={false}
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        selectedIds={new Set()}
        onSelectionChange={vi.fn()}
      />,
    );
    expect(screen.getByText('No transactions found')).toBeDefined();
  });

  it('renders table headers', () => {
    render(
      <TransactionTable
        data={mockData}
        isLoading={false}
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        selectedIds={new Set()}
        onSelectionChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Date')).toBeDefined();
    expect(screen.getByText('Description')).toBeDefined();
    expect(screen.getByText('Amount')).toBeDefined();
    expect(screen.getByText('Category')).toBeDefined();
  });

  it('renders transaction rows', () => {
    render(
      <TransactionTable
        data={mockData}
        isLoading={false}
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        selectedIds={new Set()}
        onSelectionChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Coffee Shop Purchase')).toBeDefined();
    expect(screen.getByText('Salary Payment')).toBeDefined();
  });

  it('calls onFiltersChange when sorting by column', () => {
    const onFiltersChange = vi.fn();
    render(
      <TransactionTable
        data={mockData}
        isLoading={false}
        filters={defaultFilters}
        onFiltersChange={onFiltersChange}
        selectedIds={new Set()}
        onSelectionChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Amount'));
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'amount' }),
    );
  });

  it('renders select-all checkbox', () => {
    render(
      <TransactionTable
        data={mockData}
        isLoading={false}
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        selectedIds={new Set()}
        onSelectionChange={vi.fn()}
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    // 1 select-all + 2 row checkboxes
    expect(checkboxes.length).toBe(3);
  });

  it('calls onSelectionChange when checkbox clicked', () => {
    const onSelectionChange = vi.fn();
    render(
      <TransactionTable
        data={mockData}
        isLoading={false}
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        selectedIds={new Set()}
        onSelectionChange={onSelectionChange}
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // First row checkbox
    expect(onSelectionChange).toHaveBeenCalled();
  });

  it('renders pagination when multiple pages', () => {
    const multiPageData = { ...mockData, total: 100, totalPages: 2 };
    render(
      <TransactionTable
        data={multiPageData}
        isLoading={false}
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        selectedIds={new Set()}
        onSelectionChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Previous')).toBeDefined();
    expect(screen.getByText('Next')).toBeDefined();
    expect(screen.getByText('Page 1 of 2')).toBeDefined();
  });

  it('does not render pagination for single page', () => {
    render(
      <TransactionTable
        data={mockData}
        isLoading={false}
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        selectedIds={new Set()}
        onSelectionChange={vi.fn()}
      />,
    );
    expect(screen.queryByText('Previous')).toBeNull();
    expect(screen.queryByText('Next')).toBeNull();
  });

  it('toggles sort order when clicking the same column', () => {
    const onFiltersChange = vi.fn();
    // Sorting by 'date' asc, clicking 'date' again should toggle to desc
    render(
      <TransactionTable
        data={mockData}
        isLoading={false}
        filters={{ ...defaultFilters, sortBy: 'date', sortOrder: 'asc' }}
        onFiltersChange={onFiltersChange}
        selectedIds={new Set()}
        onSelectionChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Date'));
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'date', sortOrder: 'desc' }),
    );
  });

  it('selects all rows when select-all checkbox is clicked', () => {
    const onSelectionChange = vi.fn();
    render(
      <TransactionTable
        data={mockData}
        isLoading={false}
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        selectedIds={new Set()}
        onSelectionChange={onSelectionChange}
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // select-all
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['txn1', 'txn2']));
  });

  it('deselects all when all are already selected', () => {
    const onSelectionChange = vi.fn();
    render(
      <TransactionTable
        data={mockData}
        isLoading={false}
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        selectedIds={new Set(['txn1', 'txn2'])}
        onSelectionChange={onSelectionChange}
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // deselect-all
    expect(onSelectionChange).toHaveBeenCalledWith(new Set());
  });

  it('deselects a single row when its checkbox is clicked while selected', () => {
    const onSelectionChange = vi.fn();
    render(
      <TransactionTable
        data={mockData}
        isLoading={false}
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        selectedIds={new Set(['txn1'])}
        onSelectionChange={onSelectionChange}
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // First row checkbox (txn1)
    const result = onSelectionChange.mock.calls[0][0] as Set<string>;
    expect(result.has('txn1')).toBe(false);
  });

  it('formats credit amounts with plus prefix and debit with minus', () => {
    render(
      <TransactionTable
        data={mockData}
        isLoading={false}
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        selectedIds={new Set()}
        onSelectionChange={vi.fn()}
      />,
    );
    // Credit amount should have +
    expect(screen.getByText(/\+/)).toBeDefined();
    // Debit amount should have -
    expect(screen.getByText(/-\$/)).toBeDefined();
  });

  it('shows uncategorised text when no category assigned', () => {
    render(
      <TransactionTable
        data={mockData}
        isLoading={false}
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        selectedIds={new Set()}
        onSelectionChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Uncategorised')).toBeDefined();
  });

  it('navigates to next page when Next button is clicked', () => {
    const onFiltersChange = vi.fn();
    const multiPageData = { ...mockData, total: 100, totalPages: 2 };
    render(
      <TransactionTable
        data={multiPageData}
        isLoading={false}
        filters={defaultFilters}
        onFiltersChange={onFiltersChange}
        selectedIds={new Set()}
        onSelectionChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Next'));
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 }),
    );
  });

  it('disables Previous button on first page', () => {
    const multiPageData = { ...mockData, total: 100, totalPages: 2 };
    render(
      <TransactionTable
        data={multiPageData}
        isLoading={false}
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        selectedIds={new Set()}
        onSelectionChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Previous')).toBeDisabled();
  });

  it('renders merchant or dash for missing merchant', () => {
    render(
      <TransactionTable
        data={mockData}
        isLoading={false}
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        selectedIds={new Set()}
        onSelectionChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Cafe Latte')).toBeDefined();
    // txn2 has no merchant
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });

  it('highlights selected rows with bg-blue-50', () => {
    render(
      <TransactionTable
        data={mockData}
        isLoading={false}
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        selectedIds={new Set(['txn1'])}
        onSelectionChange={vi.fn()}
      />,
    );
    const selectedRow = screen.getByText('Coffee Shop Purchase').closest('tr');
    expect(selectedRow?.className).toContain('bg-blue-50');
  });

  it('renders empty state message text when no data', () => {
    render(
      <TransactionTable
        data={{ data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 }}
        isLoading={false}
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        selectedIds={new Set()}
        onSelectionChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/upload documents to extract transactions/i)).toBeDefined();
  });

  it('renders empty state when data is undefined', () => {
    render(
      <TransactionTable
        data={undefined}
        isLoading={false}
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        selectedIds={new Set()}
        onSelectionChange={vi.fn()}
      />,
    );
    expect(screen.getByText('No transactions found')).toBeDefined();
  });

  it('renders all column headers including Merchant and Source', () => {
    render(
      <TransactionTable
        data={mockData}
        isLoading={false}
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        selectedIds={new Set()}
        onSelectionChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Date')).toBeDefined();
    expect(screen.getByText('Description')).toBeDefined();
    expect(screen.getByText('Merchant')).toBeDefined();
    expect(screen.getByText('Amount')).toBeDefined();
    expect(screen.getByText('Category')).toBeDefined();
    expect(screen.getByText('Source')).toBeDefined();
  });

  it('shows pagination info text showing range and total', () => {
    const multiPageData = { ...mockData, total: 100, totalPages: 2 };
    render(
      <TransactionTable
        data={multiPageData}
        isLoading={false}
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        selectedIds={new Set()}
        onSelectionChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/Showing 1–50 of 100/)).toBeDefined();
  });

  it('renders document filename in Source column', () => {
    render(
      <TransactionTable
        data={mockData}
        isLoading={false}
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        selectedIds={new Set()}
        onSelectionChange={vi.fn()}
      />,
    );
    expect(screen.getByText('jan.pdf')).toBeDefined();
  });

  it('shows category name with colour when category is assigned', () => {
    render(
      <TransactionTable
        data={mockData}
        isLoading={false}
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        selectedIds={new Set()}
        onSelectionChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Food')).toBeDefined();
  });

  it('disables Next button on last page', () => {
    const lastPageData = { ...mockData, total: 100, totalPages: 2 };
    render(
      <TransactionTable
        data={lastPageData}
        isLoading={false}
        filters={{ ...defaultFilters, page: 2 }}
        onFiltersChange={vi.fn()}
        selectedIds={new Set()}
        onSelectionChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Next')).toBeDisabled();
  });
});
