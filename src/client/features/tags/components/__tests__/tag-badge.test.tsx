import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TagBadge } from '../tag-badge.js';

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    X: (props: any) => <span data-testid="x-icon" {...props} />,
  };
});

describe('TagBadge', () => {
  afterEach(cleanup);

  it('renders the tag name', () => {
    render(<TagBadge name="Groceries" color="#22c55e" />);
    expect(screen.getByText('Groceries')).toBeDefined();
  });

  it('renders the color dot with correct background', () => {
    const { container } = render(<TagBadge name="Groceries" color="#22c55e" />);
    const dot = container.querySelector('span.inline-block.h-2.w-2.rounded-full');
    expect(dot).not.toBeNull();
    expect((dot as HTMLElement).style.backgroundColor).toBe('rgb(34, 197, 94)');
  });

  it('shows remove button when onRemove is provided', () => {
    render(<TagBadge name="Groceries" color="#22c55e" onRemove={vi.fn()} />);
    expect(screen.getByLabelText('Remove tag Groceries')).toBeDefined();
  });

  it('calls onRemove when remove button is clicked', () => {
    const onRemove = vi.fn();
    render(<TagBadge name="Groceries" color="#22c55e" onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText('Remove tag Groceries'));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('does not show remove button when no onRemove', () => {
    render(<TagBadge name="Groceries" color="#22c55e" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('stops event propagation on remove click', () => {
    const onRemove = vi.fn();
    const outerClick = vi.fn();
    render(
      <div onClick={outerClick}>
        <TagBadge name="Test" color="#000" onRemove={onRemove} />
      </div>,
    );
    fireEvent.click(screen.getByLabelText('Remove tag Test'));
    expect(onRemove).toHaveBeenCalled();
    expect(outerClick).not.toHaveBeenCalled();
  });
});
