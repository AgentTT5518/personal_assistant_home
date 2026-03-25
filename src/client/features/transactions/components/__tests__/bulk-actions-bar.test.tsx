import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BulkActionsBar } from '../bulk-actions-bar.js';

const mockBulkMutate = vi.fn();

vi.mock('../../hooks.js', () => ({
  useBulkCategorise: vi.fn(() => ({
    mutate: mockBulkMutate,
    isPending: false,
  })),
}));

vi.mock('../category-selector.js', () => ({
  CategorySelector: ({ onChange, onClose }: any) => (
    <div data-testid="category-selector">
      <button onClick={() => onChange('cat1')}>Select Cat</button>
      <button onClick={onClose}>Close Selector</button>
    </div>
  ),
}));

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    X: (props: any) => <span data-testid="x-icon" {...props} />,
    Tag: (props: any) => <span data-testid="tag-icon" {...props} />,
  };
});

describe('BulkActionsBar', () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it('returns null when no items selected', () => {
    const { container } = render(
      <BulkActionsBar selectedIds={new Set()} onClearSelection={vi.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders when items are selected', () => {
    render(
      <BulkActionsBar selectedIds={new Set(['txn1', 'txn2'])} onClearSelection={vi.fn()} />,
    );
    expect(screen.getByText('2 selected')).toBeDefined();
  });

  it('shows categorise button', () => {
    render(
      <BulkActionsBar selectedIds={new Set(['txn1'])} onClearSelection={vi.fn()} />,
    );
    expect(screen.getByText(/categorise as/i)).toBeDefined();
  });

  it('calls onClearSelection when X button clicked', () => {
    const onClear = vi.fn();
    render(
      <BulkActionsBar selectedIds={new Set(['txn1'])} onClearSelection={onClear} />,
    );
    // The close button at the end
    const buttons = screen.getAllByRole('button');
    const closeBtn = buttons[buttons.length - 1];
    fireEvent.click(closeBtn);
    expect(onClear).toHaveBeenCalled();
  });

  it('opens category selector on categorise button click', () => {
    render(
      <BulkActionsBar selectedIds={new Set(['txn1'])} onClearSelection={vi.fn()} />,
    );
    fireEvent.click(screen.getByText(/categorise as/i));
    expect(screen.getByTestId('category-selector')).toBeDefined();
  });
});
