import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TagSelector } from '../tag-selector.js';

const mockAddMutate = vi.fn();
const mockRemoveMutate = vi.fn();

vi.mock('../../hooks.js', () => ({
  useTags: vi.fn(() => ({
    data: [
      { id: 't1', name: 'Urgent', color: '#ef4444', usageCount: 3 },
      { id: 't2', name: 'Personal', color: '#3b82f6', usageCount: 5 },
      { id: 't3', name: 'Work', color: '#22c55e', usageCount: 2 },
    ],
  })),
  useAddTagsToTransaction: vi.fn(() => ({ mutate: mockAddMutate })),
  useRemoveTagFromTransaction: vi.fn(() => ({ mutate: mockRemoveMutate })),
}));

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    Plus: (props: any) => <span data-testid="plus-icon" {...props} />,
    X: (props: any) => <span data-testid="x-icon" {...props} />,
  };
});

describe('TagSelector', () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  const currentTags = [
    { id: 't1', name: 'Urgent', color: '#ef4444' },
  ];

  it('renders current tags', () => {
    render(<TagSelector transactionId="txn1" currentTags={currentTags} />);
    expect(screen.getByText('Urgent')).toBeDefined();
  });

  it('shows add button', () => {
    render(<TagSelector transactionId="txn1" currentTags={currentTags} />);
    expect(screen.getByLabelText('Add tag')).toBeDefined();
  });

  it('opens dropdown with available tags (excludes current)', () => {
    render(<TagSelector transactionId="txn1" currentTags={currentTags} />);
    fireEvent.click(screen.getByLabelText('Add tag'));

    // Should not show "Urgent" (already assigned), should show "Personal" and "Work"
    expect(screen.getByText('Personal')).toBeDefined();
    expect(screen.getByText('Work')).toBeDefined();
  });

  it('adds tag on click', () => {
    render(<TagSelector transactionId="txn1" currentTags={currentTags} />);
    fireEvent.click(screen.getByLabelText('Add tag'));
    fireEvent.click(screen.getByText('Personal'));

    expect(mockAddMutate).toHaveBeenCalledWith({
      transactionId: 'txn1',
      tagIds: ['t2'],
    });
  });

  it('calls remove when tag remove button clicked', () => {
    render(<TagSelector transactionId="txn1" currentTags={currentTags} />);
    fireEvent.click(screen.getByLabelText('Remove tag Urgent'));

    expect(mockRemoveMutate).toHaveBeenCalledWith({
      transactionId: 'txn1',
      tagId: 't1',
    });
  });

  it('closes dropdown after adding a tag', () => {
    render(<TagSelector transactionId="txn1" currentTags={currentTags} />);
    fireEvent.click(screen.getByLabelText('Add tag'));
    fireEvent.click(screen.getByText('Work'));

    // Dropdown should close — Personal/Work should disappear
    expect(screen.queryByText('Personal')).toBeNull();
  });
});
