import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TransactionFiltersBar } from '../transaction-filters.js';

vi.mock('../../hooks.js', () => ({
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
    Search: (props: any) => <span data-testid="search-icon" {...props} />,
    X: (props: any) => <span data-testid="x-icon" {...props} />,
    Filter: (props: any) => <span data-testid="filter-icon" {...props} />,
  };
});

const defaultFilters = {
  sortBy: 'date' as const,
  sortOrder: 'desc' as const,
  page: 1,
  pageSize: 50,
};

describe('TransactionFiltersBar', () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders search input', () => {
    render(<TransactionFiltersBar filters={defaultFilters} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Search description or merchant...')).toBeDefined();
  });

  it('renders category filter dropdown', () => {
    render(<TransactionFiltersBar filters={defaultFilters} onChange={vi.fn()} />);
    expect(screen.getByText('All Categories')).toBeDefined();
  });

  it('renders type filter dropdown', () => {
    render(<TransactionFiltersBar filters={defaultFilters} onChange={vi.fn()} />);
    expect(screen.getByText('All Types')).toBeDefined();
  });

  it('renders date range inputs', () => {
    const { container } = render(<TransactionFiltersBar filters={defaultFilters} onChange={vi.fn()} />);
    const dateInputs = container.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBe(2);
  });

  it('renders amount range inputs', () => {
    render(<TransactionFiltersBar filters={defaultFilters} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Min')).toBeDefined();
    expect(screen.getByPlaceholderText('Max')).toBeDefined();
  });

  it('renders recurring only checkbox', () => {
    render(<TransactionFiltersBar filters={defaultFilters} onChange={vi.fn()} />);
    expect(screen.getByText('Recurring only')).toBeDefined();
  });

  it('calls onChange when category filter changes', () => {
    const onChange = vi.fn();
    render(<TransactionFiltersBar filters={defaultFilters} onChange={onChange} />);

    const categorySelect = screen.getByText('All Categories').closest('select')!;
    fireEvent.change(categorySelect, { target: { value: 'cat1' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: 'cat1', page: 1 }),
    );
  });

  it('calls onChange when type filter changes', () => {
    const onChange = vi.fn();
    render(<TransactionFiltersBar filters={defaultFilters} onChange={onChange} />);

    const typeSelect = screen.getByText('All Types').closest('select')!;
    fireEvent.change(typeSelect, { target: { value: 'debit' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'debit', page: 1 }),
    );
  });

  it('shows clear button when filters are active', () => {
    const filtersWithSearch = { ...defaultFilters, search: 'coffee' };
    render(<TransactionFiltersBar filters={filtersWithSearch} onChange={vi.fn()} />);
    expect(screen.getByText(/Clear/)).toBeDefined();
  });

  it('does not show clear button when no active filters', () => {
    render(<TransactionFiltersBar filters={defaultFilters} onChange={vi.fn()} />);
    expect(screen.queryByText(/Clear/)).toBeNull();
  });

  it('debounces search input and calls onChange', () => {
    const onChange = vi.fn();
    render(<TransactionFiltersBar filters={defaultFilters} onChange={onChange} />);

    const searchInput = screen.getByPlaceholderText('Search description or merchant...');
    fireEvent.change(searchInput, { target: { value: 'coffee' } });

    // Should not fire immediately
    expect(onChange).not.toHaveBeenCalled();

    // Advance past debounce timer
    vi.advanceTimersByTime(300);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'coffee', page: 1 }),
    );
  });

  it('calls onChange when date from filter changes', () => {
    const onChange = vi.fn();
    const { container } = render(<TransactionFiltersBar filters={defaultFilters} onChange={onChange} />);

    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-01-01' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ dateFrom: '2026-01-01', page: 1 }),
    );
  });

  it('calls onChange when date to filter changes', () => {
    const onChange = vi.fn();
    const { container } = render(<TransactionFiltersBar filters={defaultFilters} onChange={onChange} />);

    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[1], { target: { value: '2026-01-31' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ dateTo: '2026-01-31', page: 1 }),
    );
  });

  it('calls onChange when recurring checkbox is toggled', () => {
    const onChange = vi.fn();
    render(<TransactionFiltersBar filters={defaultFilters} onChange={onChange} />);

    const recurringCheckbox = screen.getByText('Recurring only').closest('label')!.querySelector('input')!;
    fireEvent.click(recurringCheckbox);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ isRecurring: true, page: 1 }),
    );
  });

  it('clears all filters when Clear button is clicked', () => {
    const onChange = vi.fn();
    const activeFilters = { ...defaultFilters, search: 'test', categoryId: 'cat1' };
    render(<TransactionFiltersBar filters={activeFilters} onChange={onChange} />);

    fireEvent.click(screen.getByText(/Clear/));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'date', sortOrder: 'desc', page: 1 }),
    );
  });

  it('shows correct active filter count', () => {
    const activeFilters = {
      ...defaultFilters,
      search: 'test',
      categoryId: 'cat1',
      type: 'debit' as const,
    };
    render(<TransactionFiltersBar filters={activeFilters} onChange={vi.fn()} />);
    expect(screen.getByText('Clear (3)')).toBeDefined();
  });

  it('calls onChange when amount min filter changes', () => {
    const onChange = vi.fn();
    render(<TransactionFiltersBar filters={defaultFilters} onChange={onChange} />);

    const minInput = screen.getByPlaceholderText('Min');
    fireEvent.change(minInput, { target: { value: '50' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ amountMin: 50, page: 1 }),
    );
  });

  it('calls onChange when amount max filter changes', () => {
    const onChange = vi.fn();
    render(<TransactionFiltersBar filters={defaultFilters} onChange={onChange} />);

    const maxInput = screen.getByPlaceholderText('Max');
    fireEvent.change(maxInput, { target: { value: '500' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ amountMax: 500, page: 1 }),
    );
  });

  it('renders category options from hook data', () => {
    render(<TransactionFiltersBar filters={defaultFilters} onChange={vi.fn()} />);
    expect(screen.getByText('Groceries')).toBeDefined();
    expect(screen.getByText('Transport')).toBeDefined();
    expect(screen.getByText('Uncategorised')).toBeDefined();
  });

  it('renders search input with existing search value', () => {
    const filtersWithSearch = { ...defaultFilters, search: 'coffee' };
    render(<TransactionFiltersBar filters={filtersWithSearch} onChange={vi.fn()} />);
    const searchInput = screen.getByPlaceholderText('Search description or merchant...') as HTMLInputElement;
    expect(searchInput.value).toBe('coffee');
  });

  it('renders date from input with existing value', () => {
    const filtersWithDate = { ...defaultFilters, dateFrom: '2026-01-01' };
    const { container } = render(<TransactionFiltersBar filters={filtersWithDate} onChange={vi.fn()} />);
    const dateInputs = container.querySelectorAll('input[type="date"]');
    expect((dateInputs[0] as HTMLInputElement).value).toBe('2026-01-01');
  });

  it('renders category dropdown with selected value', () => {
    const filtersWithCategory = { ...defaultFilters, categoryId: 'cat1' };
    render(<TransactionFiltersBar filters={filtersWithCategory} onChange={vi.fn()} />);
    const categorySelect = screen.getByText('All Categories').closest('select') as HTMLSelectElement;
    expect(categorySelect.value).toBe('cat1');
  });

  it('renders type dropdown options', () => {
    render(<TransactionFiltersBar filters={defaultFilters} onChange={vi.fn()} />);
    expect(screen.getByText('All Types')).toBeDefined();
    expect(screen.getByText('Debit')).toBeDefined();
    expect(screen.getByText('Credit')).toBeDefined();
  });

  it('renders date label and amount label', () => {
    render(<TransactionFiltersBar filters={defaultFilters} onChange={vi.fn()} />);
    expect(screen.getByText('Date:')).toBeDefined();
    expect(screen.getByText('Amount:')).toBeDefined();
  });
});
