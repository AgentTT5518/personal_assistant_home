import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ImportHistory } from '../import-history.js';

vi.mock('lucide-react', () => ({
  FileSpreadsheet: () => <span>FileSpreadsheet</span>,
  Trash2: () => <span>Trash2</span>,
  Undo2: () => <span>Undo2</span>,
}));

const mockSessions = [
  {
    id: 'sess-1',
    filename: 'transactions.csv',
    fileType: 'csv',
    importedRows: 50,
    duplicateRows: 3,
    status: 'completed',
    accountName: 'Checking',
    createdAt: '2026-03-15T10:00:00Z',
  },
  {
    id: 'sess-2',
    filename: 'bank.ofx',
    fileType: 'ofx',
    importedRows: 20,
    duplicateRows: 0,
    status: 'failed',
    accountName: null,
    createdAt: '2026-03-10T08:00:00Z',
  },
];

const mockUndoMutate = vi.fn();
const mockDeleteMutate = vi.fn();

let mockSessionsReturn: { data: typeof mockSessions | undefined; isLoading: boolean } = {
  data: mockSessions,
  isLoading: false,
};

vi.mock('../../hooks.js', () => ({
  useImportSessions: () => mockSessionsReturn,
  useUndoImport: () => ({ mutate: mockUndoMutate, isPending: false }),
  useDeleteImportSession: () => ({ mutate: mockDeleteMutate, isPending: false }),
}));

describe('ImportHistory', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockSessionsReturn = { data: mockSessions, isLoading: false };
  });

  it('renders Import History heading', () => {
    render(<ImportHistory />);
    expect(screen.getByText('Import History')).toBeInTheDocument();
  });

  it('renders session filenames', () => {
    render(<ImportHistory />);
    expect(screen.getByText('transactions.csv')).toBeInTheDocument();
    expect(screen.getByText('bank.ofx')).toBeInTheDocument();
  });

  it('renders session details', () => {
    render(<ImportHistory />);
    const { container } = render(<ImportHistory />);
    const text = container.textContent ?? '';
    expect(text).toContain('50 imported');
    expect(text).toContain('3 duplicates');
    expect(text).toContain('CSV');
  });

  it('renders status badges', () => {
    render(<ImportHistory />);
    expect(screen.getAllByText('completed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('failed').length).toBeGreaterThan(0);
  });

  it('shows undo button only for completed sessions', () => {
    render(<ImportHistory />);
    // There should be undo buttons for completed sessions only
    const undoButtons = screen.getAllByTitle('Undo import');
    expect(undoButtons).toHaveLength(1);
  });

  it('calls undoMutation when undo button is clicked', () => {
    render(<ImportHistory />);
    fireEvent.click(screen.getByTitle('Undo import'));
    expect(mockUndoMutate).toHaveBeenCalledWith('sess-1');
  });

  it('calls deleteMutation when delete button is clicked', () => {
    render(<ImportHistory />);
    const deleteButtons = screen.getAllByTitle('Delete session');
    fireEvent.click(deleteButtons[0]);
    expect(mockDeleteMutate).toHaveBeenCalledWith('sess-1');
  });

  it('renders loading state', () => {
    mockSessionsReturn = { data: undefined, isLoading: true };
    render(<ImportHistory />);
    expect(screen.getByText('Loading import history...')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    mockSessionsReturn = { data: [], isLoading: false };
    render(<ImportHistory />);
    expect(screen.getByText(/no previous imports/i)).toBeInTheDocument();
  });

  it('renders empty state when data is undefined and not loading', () => {
    mockSessionsReturn = { data: undefined, isLoading: false };
    render(<ImportHistory />);
    expect(screen.getByText(/no previous imports/i)).toBeInTheDocument();
  });

  it('renders account name when present', () => {
    render(<ImportHistory />);
    const { container } = render(<ImportHistory />);
    expect(container.textContent).toContain('Checking');
  });
});
