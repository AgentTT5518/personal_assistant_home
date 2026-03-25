import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TagManager } from '../tag-manager.js';

const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock('../../hooks.js', () => ({
  useTags: vi.fn(() => ({
    data: [
      { id: 't1', name: 'Urgent', color: '#ef4444', usageCount: 3 },
      { id: 't2', name: 'Personal', color: '#3b82f6', usageCount: 5 },
    ],
  })),
  useCreateTag: vi.fn(() => ({ mutate: mockCreateMutate, isPending: false })),
  useUpdateTag: vi.fn(() => ({ mutate: mockUpdateMutate })),
  useDeleteTag: vi.fn(() => ({ mutate: mockDeleteMutate })),
}));

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    X: (props: any) => <span data-testid="x-icon" {...props} />,
    Plus: (props: any) => <span data-testid="plus-icon" {...props} />,
    Pencil: (props: any) => <span data-testid="pencil-icon" {...props} />,
    Trash2: (props: any) => <span data-testid="trash-icon" {...props} />,
  };
});

describe('TagManager', () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it('returns null when not open', () => {
    const { container } = render(<TagManager isOpen={false} onClose={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders tag list when open', () => {
    render(<TagManager isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Manage Tags')).toBeDefined();
    expect(screen.getByText('Urgent')).toBeDefined();
    expect(screen.getByText('Personal')).toBeDefined();
  });

  it('shows usage count', () => {
    render(<TagManager isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('3 uses')).toBeDefined();
    expect(screen.getByText('5 uses')).toBeDefined();
  });

  it('creates a new tag', () => {
    render(<TagManager isOpen={true} onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText('New tag name');
    fireEvent.change(input, { target: { value: 'Finance' } });

    // The create button is the last button in the create row container
    // It has the bg-blue-600 class and contains the Plus icon
    const createRow = input.closest('.mb-4')!;
    const buttons = createRow.querySelectorAll('button[type="button"]');
    // The last real button after the color buttons is the create button
    const createButton = buttons[buttons.length - 1];
    fireEvent.click(createButton);

    expect(mockCreateMutate).toHaveBeenCalledWith(
      { name: 'Finance', color: '#3b82f6' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('enters edit mode when edit button is clicked', () => {
    render(<TagManager isOpen={true} onClose={vi.fn()} />);

    const editButton = screen.getByLabelText('Edit tag Urgent');
    fireEvent.click(editButton);

    // Should show Save and Cancel buttons
    expect(screen.getByText('Save')).toBeDefined();
    expect(screen.getByText('Cancel')).toBeDefined();
  });

  it('saves edited tag', () => {
    render(<TagManager isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Edit tag Urgent'));

    const editInput = screen.getByDisplayValue('Urgent');
    fireEvent.change(editInput, { target: { value: 'Very Urgent' } });
    fireEvent.click(screen.getByText('Save'));

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      { id: 't1', data: { name: 'Very Urgent', color: '#ef4444' } },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('deletes a tag', () => {
    render(<TagManager isOpen={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Delete tag Urgent'));
    expect(mockDeleteMutate).toHaveBeenCalledWith('t1');
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<TagManager isOpen={true} onClose={onClose} />);

    // The X button in the header
    const closeButton = screen.getByText('Manage Tags').parentElement!.querySelector('button')!;
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows empty state when no tags', async () => {
    const { useTags } = await import('../../hooks.js');
    (useTags as any).mockReturnValue({ data: [] });

    render(<TagManager isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('No tags yet. Create one above.')).toBeDefined();
  });

  it('selects a color for new tag creation', () => {
    render(<TagManager isOpen={true} onClose={vi.fn()} />);
    // Click the red color preset
    const redColorButton = screen.getByLabelText('Color #ef4444');
    fireEvent.click(redColorButton);
    // The button should now have border-gray-800 indicating selection
    expect(redColorButton.className).toContain('border-gray-800');
  });

  it('cancels edit mode', async () => {
    const { useTags } = await import('../../hooks.js');
    (useTags as any).mockReturnValue({
      data: [
        { id: 't1', name: 'Urgent', color: '#ef4444', usageCount: 3 },
        { id: 't2', name: 'Personal', color: '#3b82f6', usageCount: 5 },
      ],
    });

    render(<TagManager isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Edit tag Urgent'));
    expect(screen.getByText('Save')).toBeDefined();
    expect(screen.getByText('Cancel')).toBeDefined();

    fireEvent.click(screen.getByText('Cancel'));
    // Should return to non-edit mode: Save/Cancel should disappear
    expect(screen.queryByText('Save')).toBeNull();
  });

  it('changes color during edit mode', async () => {
    const { useTags } = await import('../../hooks.js');
    (useTags as any).mockReturnValue({
      data: [
        { id: 't1', name: 'Urgent', color: '#ef4444', usageCount: 3 },
        { id: 't2', name: 'Personal', color: '#3b82f6', usageCount: 5 },
      ],
    });

    render(<TagManager isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Edit tag Urgent'));

    // The edit color buttons are smaller (h-4 w-4); click one
    const colorButtons = screen.getAllByLabelText('Color #22c55e');
    // There are two sets of color buttons (new and edit). The edit ones appear after clicking edit
    const editColorButton = colorButtons[colorButtons.length - 1];
    fireEvent.click(editColorButton);

    // Save with new color
    fireEvent.click(screen.getByText('Save'));
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      { id: 't1', data: { name: 'Urgent', color: '#22c55e' } },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('creates tag when Enter key is pressed in input', () => {
    render(<TagManager isOpen={true} onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText('New tag name');
    fireEvent.change(input, { target: { value: 'Work' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateMutate).toHaveBeenCalledWith(
      { name: 'Work', color: '#3b82f6' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('does not create tag when name is empty', () => {
    render(<TagManager isOpen={true} onClose={vi.fn()} />);

    // Click the create button with empty name
    const input = screen.getByPlaceholderText('New tag name');
    const createRow = input.closest('.mb-4')!;
    const buttons = createRow.querySelectorAll('button[type="button"]');
    const createButton = buttons[buttons.length - 1];
    fireEvent.click(createButton);

    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  it('closes modal when clicking backdrop', () => {
    const onClose = vi.fn();
    render(<TagManager isOpen={true} onClose={onClose} />);

    // Click the overlay background (the fixed inset-0 div)
    const overlay = screen.getByText('Manage Tags').closest('.fixed')!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it('saves edited tag on Enter key in edit input', async () => {
    const { useTags } = await import('../../hooks.js');
    (useTags as any).mockReturnValue({
      data: [
        { id: 't1', name: 'Urgent', color: '#ef4444', usageCount: 3 },
        { id: 't2', name: 'Personal', color: '#3b82f6', usageCount: 5 },
      ],
    });

    render(<TagManager isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Edit tag Urgent'));
    const editInput = screen.getByDisplayValue('Urgent');
    fireEvent.change(editInput, { target: { value: 'High Priority' } });
    fireEvent.keyDown(editInput, { key: 'Enter' });

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      { id: 't1', data: { name: 'High Priority', color: '#ef4444' } },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
