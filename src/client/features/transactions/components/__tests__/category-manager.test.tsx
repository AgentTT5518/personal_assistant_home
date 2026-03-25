import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CategoryManager } from '../category-manager.js';

const mockCreateMutate = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock('../../hooks.js', () => ({
  useCategories: vi.fn(() => ({
    data: [
      { id: 'cat1', name: 'Groceries', color: '#22c55e', parentId: null, transactionCount: 15, isDefault: false },
      { id: 'cat2', name: 'Transport', color: '#3b82f6', parentId: null, transactionCount: 8, isDefault: true },
      { id: 'cat3', name: 'Fuel', color: '#f97316', parentId: 'cat2', transactionCount: 3, isDefault: false },
    ],
    isLoading: false,
  })),
  useCreateCategory: vi.fn(() => ({
    mutate: mockCreateMutate,
    isPending: false,
    isError: false,
    error: null,
  })),
  useDeleteCategory: vi.fn(() => ({
    mutate: mockDeleteMutate,
  })),
  useCategoryRules: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useCreateCategoryRule: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  })),
  useDeleteCategoryRule: vi.fn(() => ({
    mutate: vi.fn(),
  })),
}));

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    X: (props: any) => <span data-testid="x-icon" {...props} />,
    Plus: (props: any) => <span data-testid="plus-icon" {...props} />,
    Trash2: (props: any) => <span data-testid="trash-icon" {...props} />,
    ChevronDown: (props: any) => <span data-testid="chevron-down" {...props} />,
    ChevronRight: (props: any) => <span data-testid="chevron-right" {...props} />,
    Loader2: (props: any) => <span data-testid="loader" {...props} />,
    AlertCircle: (props: any) => <span data-testid="alert-icon" {...props} />,
  };
});

describe('CategoryManager', () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it('renders the modal heading', () => {
    render(<CategoryManager onClose={vi.fn()} />);
    expect(screen.getByText('Manage Categories')).toBeDefined();
  });

  it('renders parent categories', () => {
    render(<CategoryManager onClose={vi.fn()} />);
    expect(screen.getByText('Groceries')).toBeDefined();
    expect(screen.getByText('Transport')).toBeDefined();
  });

  it('shows transaction counts', () => {
    render(<CategoryManager onClose={vi.fn()} />);
    expect(screen.getByText('15 txns')).toBeDefined();
    expect(screen.getByText('8 txns')).toBeDefined();
  });

  it('shows Default badge for default categories', () => {
    render(<CategoryManager onClose={vi.fn()} />);
    expect(screen.getByText('Default')).toBeDefined();
  });

  it('shows New Category button', () => {
    render(<CategoryManager onClose={vi.fn()} />);
    expect(screen.getByText('New Category')).toBeDefined();
  });

  it('opens create form when New Category clicked', () => {
    render(<CategoryManager onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('New Category'));
    expect(screen.getByPlaceholderText('Category name')).toBeDefined();
  });

  it('creates a category', () => {
    render(<CategoryManager onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('New Category'));

    const input = screen.getByPlaceholderText('Category name');
    fireEvent.change(input, { target: { value: 'Entertainment' } });
    fireEvent.click(screen.getByText('Create'));

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Entertainment' }),
      expect.any(Object),
    );
  });

  it('expands children when parent is clicked', () => {
    render(<CategoryManager onClose={vi.fn()} />);
    // Transport has children, click its expand button
    const transportRow = screen.getByText('Transport').closest('.flex')!;
    const expandButton = transportRow.querySelector('button')!;
    fireEvent.click(expandButton);

    expect(screen.getByText('Fuel')).toBeDefined();
    expect(screen.getByText('3 txns')).toBeDefined();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<CategoryManager onClose={onClose} />);
    const closeButton = screen.getByText('Manage Categories').parentElement!.querySelector('button')!;
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows loading state', async () => {
    const { useCategories } = await import('../../hooks.js');
    (useCategories as any).mockReturnValue({ data: null, isLoading: true });

    render(<CategoryManager onClose={vi.fn()} />);
    expect(screen.getByTestId('loader')).toBeDefined();
  });

  it('shows delete confirmation for non-default category', async () => {
    const { useCategories } = await import('../../hooks.js');
    (useCategories as any).mockReturnValue({
      data: [
        { id: 'cat1', name: 'Groceries', color: '#22c55e', parentId: null, transactionCount: 15, isDefault: false },
        { id: 'cat2', name: 'Transport', color: '#3b82f6', parentId: null, transactionCount: 8, isDefault: true },
        { id: 'cat3', name: 'Fuel', color: '#f97316', parentId: 'cat2', transactionCount: 3, isDefault: false },
      ],
      isLoading: false,
    });

    render(<CategoryManager onClose={vi.fn()} />);
    // Groceries (cat1) is not default, find its delete button
    const groceriesRow = screen.getByText('Groceries').closest('.border')!;
    const deleteButton = groceriesRow.querySelectorAll('button')[groceriesRow.querySelectorAll('button').length - 1];
    fireEvent.click(deleteButton!);

    // Should show confirmation text
    expect(screen.getByText(/txns will be uncategorised/)).toBeDefined();
    expect(screen.getByText('Confirm')).toBeDefined();
  });

  it('confirms deletion of category', async () => {
    const { useCategories } = await import('../../hooks.js');
    (useCategories as any).mockReturnValue({
      data: [
        { id: 'cat1', name: 'Groceries', color: '#22c55e', parentId: null, transactionCount: 15, isDefault: false },
        { id: 'cat2', name: 'Transport', color: '#3b82f6', parentId: null, transactionCount: 8, isDefault: true },
      ],
      isLoading: false,
    });

    render(<CategoryManager onClose={vi.fn()} />);
    const groceriesRow = screen.getByText('Groceries').closest('.border')!;
    const deleteButton = groceriesRow.querySelectorAll('button')[groceriesRow.querySelectorAll('button').length - 1];
    fireEvent.click(deleteButton!);

    fireEvent.click(screen.getByText('Confirm'));
    expect(mockDeleteMutate).toHaveBeenCalledWith('cat1', expect.any(Object));
  });

  it('cancels delete confirmation', async () => {
    const { useCategories } = await import('../../hooks.js');
    (useCategories as any).mockReturnValue({
      data: [
        { id: 'cat1', name: 'Groceries', color: '#22c55e', parentId: null, transactionCount: 15, isDefault: false },
      ],
      isLoading: false,
    });

    render(<CategoryManager onClose={vi.fn()} />);
    const groceriesRow = screen.getByText('Groceries').closest('.border')!;
    const deleteButton = groceriesRow.querySelectorAll('button')[groceriesRow.querySelectorAll('button').length - 1];
    fireEvent.click(deleteButton!);

    expect(screen.getByText('Confirm')).toBeDefined();
    // The Cancel button in the delete confirm row
    const cancelButtons = screen.getAllByText('Cancel');
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);
    expect(screen.queryByText('Confirm')).toBeNull();
  });

  it('does not show delete button for default category', async () => {
    const { useCategories } = await import('../../hooks.js');
    (useCategories as any).mockReturnValue({
      data: [
        { id: 'cat2', name: 'Transport', color: '#3b82f6', parentId: null, transactionCount: 8, isDefault: true },
      ],
      isLoading: false,
    });

    render(<CategoryManager onClose={vi.fn()} />);
    const transportRow = screen.getByText('Transport').closest('.border')!;
    const actionsDiv = transportRow.querySelector('.flex.items-center.gap-2');
    const trashButtons = actionsDiv?.querySelectorAll('button') ?? [];
    expect(trashButtons.length).toBe(0);
  });

  it('cancels create form', () => {
    render(<CategoryManager onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('New Category'));
    expect(screen.getByPlaceholderText('Category name')).toBeDefined();

    // The cancel button is next to the Create button
    const cancelButton = screen.getAllByText('Cancel');
    fireEvent.click(cancelButton[cancelButton.length - 1]);
    expect(screen.queryByPlaceholderText('Category name')).toBeNull();
  });

  it('selects a color when creating a category', () => {
    render(<CategoryManager onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('New Category'));

    // Click a color button
    const colorButtons = screen.getByPlaceholderText('Category name')
      .closest('.space-y-3')!.querySelectorAll('.rounded-full[style]');
    fireEvent.click(colorButtons[0]); // First color: #ef4444

    // Fill name and create
    fireEvent.change(screen.getByPlaceholderText('Category name'), { target: { value: 'Red Cat' } });
    fireEvent.click(screen.getByText('Create'));

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Red Cat', color: '#ef4444' }),
      expect.any(Object),
    );
  });

  it('selects a parent category when creating', async () => {
    const { useCategories } = await import('../../hooks.js');
    (useCategories as any).mockReturnValue({
      data: [
        { id: 'cat1', name: 'Groceries', color: '#22c55e', parentId: null, transactionCount: 15, isDefault: false },
      ],
      isLoading: false,
    });

    render(<CategoryManager onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('New Category'));

    const parentSelect = screen.getByText('No parent (top-level)').closest('select')!;
    fireEvent.change(parentSelect, { target: { value: 'cat1' } });

    fireEvent.change(screen.getByPlaceholderText('Category name'), { target: { value: 'Sub Cat' } });
    fireEvent.click(screen.getByText('Create'));

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Sub Cat', parentId: 'cat1' }),
      expect.any(Object),
    );
  });

  it('does not create category when name is empty', () => {
    render(<CategoryManager onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('New Category'));
    fireEvent.click(screen.getByText('Create'));
    expect(mockCreateMutate).not.toHaveBeenCalled();
  });
});
