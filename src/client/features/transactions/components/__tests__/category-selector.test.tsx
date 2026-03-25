import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CategorySelector } from '../category-selector.js';

vi.mock('../../hooks.js', () => ({
  useCategories: vi.fn(() => ({
    data: [
      { id: 'cat1', name: 'Groceries', color: '#22c55e', parentId: null },
      { id: 'cat2', name: 'Transport', color: '#3b82f6', parentId: null },
      { id: 'cat3', name: 'Fuel', color: '#f97316', parentId: 'cat2' },
    ],
  })),
}));

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    X: (props: any) => <span data-testid="x-icon" {...props} />,
    Search: (props: any) => <span data-testid="search-icon" {...props} />,
  };
});

describe('CategorySelector', () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it('renders the dropdown with search input', () => {
    render(<CategorySelector value={null} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Search categories...')).toBeDefined();
  });

  it('renders remove category option', () => {
    render(<CategorySelector value={null} onChange={vi.fn()} />);
    expect(screen.getByText('Remove category')).toBeDefined();
  });

  it('renders all categories', () => {
    render(<CategorySelector value={null} onChange={vi.fn()} />);
    expect(screen.getByText('Groceries')).toBeDefined();
    expect(screen.getByText('Transport')).toBeDefined();
    expect(screen.getByText('Fuel')).toBeDefined();
  });

  it('calls onChange when a category is clicked', () => {
    const onChange = vi.fn();
    render(<CategorySelector value={null} onChange={onChange} />);
    fireEvent.click(screen.getByText('Groceries'));
    expect(onChange).toHaveBeenCalledWith('cat1');
  });

  it('calls onChange with null when Remove category clicked', () => {
    const onChange = vi.fn();
    render(<CategorySelector value="cat1" onChange={onChange} />);
    fireEvent.click(screen.getByText('Remove category'));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('filters categories based on search input', () => {
    render(<CategorySelector value={null} onChange={vi.fn()} />);
    const searchInput = screen.getByPlaceholderText('Search categories...');
    fireEvent.change(searchInput, { target: { value: 'gro' } });

    expect(screen.getByText('Groceries')).toBeDefined();
    expect(screen.queryByText('Transport')).toBeNull();
    expect(screen.queryByText('Fuel')).toBeNull();
  });

  it('highlights the currently selected category', () => {
    render(<CategorySelector value="cat1" onChange={vi.fn()} />);
    const groceriesBtn = screen.getByText('Groceries').closest('button');
    expect(groceriesBtn?.className).toContain('bg-blue-50');
  });

  it('returns null when categories not loaded', async () => {
    const { useCategories } = await import('../../hooks.js');
    (useCategories as any).mockReturnValue({ data: undefined });

    const { container } = render(<CategorySelector value={null} onChange={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('accepts onClose callback prop', async () => {
    // Reset the mock to return categories data (prior test may have cleared it)
    const { useCategories } = await import('../../hooks.js');
    (useCategories as any).mockReturnValue({
      data: [
        { id: 'cat1', name: 'Groceries', color: '#22c55e', parentId: null },
        { id: 'cat2', name: 'Transport', color: '#3b82f6', parentId: null },
        { id: 'cat3', name: 'Fuel', color: '#f97316', parentId: 'cat2' },
      ],
    });

    const onClose = vi.fn();
    const onChange = vi.fn();
    render(<CategorySelector value={null} onChange={onChange} onClose={onClose} />);
    // Clicking a category should also call onClose
    fireEvent.click(screen.getByText('Groceries'));
    expect(onChange).toHaveBeenCalledWith('cat1');
    expect(onClose).toHaveBeenCalled();
  });

  it('filters to show only matching categories when searching', async () => {
    const { useCategories } = await import('../../hooks.js');
    (useCategories as any).mockReturnValue({
      data: [
        { id: 'cat1', name: 'Groceries', color: '#22c55e', parentId: null },
        { id: 'cat2', name: 'Transport', color: '#3b82f6', parentId: null },
        { id: 'cat3', name: 'Fuel', color: '#f97316', parentId: 'cat2' },
      ],
    });

    render(<CategorySelector value={null} onChange={vi.fn()} />);
    const searchInput = screen.getByPlaceholderText('Search categories...');

    // Search for "fuel" - case insensitive
    fireEvent.change(searchInput, { target: { value: 'fuel' } });
    expect(screen.getByText('Fuel')).toBeDefined();
    expect(screen.queryByText('Groceries')).toBeNull();
    expect(screen.queryByText('Transport')).toBeNull();
  });

  it('selects a child category and calls onChange with its id', async () => {
    const { useCategories } = await import('../../hooks.js');
    (useCategories as any).mockReturnValue({
      data: [
        { id: 'cat1', name: 'Groceries', color: '#22c55e', parentId: null },
        { id: 'cat2', name: 'Transport', color: '#3b82f6', parentId: null },
        { id: 'cat3', name: 'Fuel', color: '#f97316', parentId: 'cat2' },
      ],
    });

    const onChange = vi.fn();
    render(<CategorySelector value={null} onChange={onChange} />);
    fireEvent.click(screen.getByText('Fuel'));
    expect(onChange).toHaveBeenCalledWith('cat3');
  });

  it('renders child categories indented under parents', async () => {
    const { useCategories } = await import('../../hooks.js');
    (useCategories as any).mockReturnValue({
      data: [
        { id: 'cat1', name: 'Groceries', color: '#22c55e', parentId: null },
        { id: 'cat2', name: 'Transport', color: '#3b82f6', parentId: null },
        { id: 'cat3', name: 'Fuel', color: '#f97316', parentId: 'cat2' },
      ],
    });

    render(<CategorySelector value={null} onChange={vi.fn()} />);
    const fuelBtn = screen.getByText('Fuel').closest('button');
    // Child categories should have pl-7 class for indentation
    expect(fuelBtn?.className).toContain('pl-7');
  });

  it('renders colour dots for categories', async () => {
    const { useCategories } = await import('../../hooks.js');
    (useCategories as any).mockReturnValue({
      data: [
        { id: 'cat1', name: 'Groceries', color: '#22c55e', parentId: null },
      ],
    });

    render(<CategorySelector value={null} onChange={vi.fn()} />);
    const groceriesBtn = screen.getByText('Groceries').closest('button')!;
    const dot = groceriesBtn.querySelector('.rounded-full');
    expect(dot).toBeDefined();
    expect((dot as HTMLElement).style.backgroundColor).toBe('rgb(34, 197, 94)');
  });
});
