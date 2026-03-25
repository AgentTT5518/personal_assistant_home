import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DocumentList } from '../document-list.js';

const mockDeleteMutate = vi.fn();
const mockVisionMutate = vi.fn();

vi.mock('../../hooks.js', () => ({
  useDocuments: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
  useDeleteDocument: vi.fn(() => ({ mutate: mockDeleteMutate, isPending: false })),
  useReprocessVision: vi.fn(() => ({ mutate: mockVisionMutate, isPending: false })),
}));

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    Loader2: (props: any) => <span data-testid="loader" {...props} />,
    Trash2: (props: any) => <span data-testid="trash-icon" {...props} />,
    Eye: (props: any) => <span data-testid="eye-icon" {...props} />,
    RefreshCw: (props: any) => <span data-testid="refresh-icon" {...props} />,
  };
});

const mockDocuments = [
  {
    id: 'd1',
    filename: 'jan-statement.pdf',
    docType: 'bank_statement' as const,
    institution: 'CBA',
    processingStatus: 'completed' as const,
    transactionCount: 42,
    createdAt: '2026-01-15T10:00:00Z',
    hasFile: true,
  },
  {
    id: 'd2',
    filename: 'feb-payslip.pdf',
    docType: 'payslip' as const,
    institution: null,
    processingStatus: 'processing' as const,
    transactionCount: 0,
    createdAt: '2026-02-15T10:00:00Z',
    hasFile: true,
  },
];

function renderWithRouter(component: React.ReactElement) {
  return render(<MemoryRouter>{component}</MemoryRouter>);
}

describe('DocumentList', () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it('renders loading state', async () => {
    const { useDocuments } = await import('../../hooks.js');
    (useDocuments as any).mockReturnValue({ data: null, isLoading: true, error: null });

    renderWithRouter(<DocumentList />);
    expect(screen.getByTestId('loader')).toBeDefined();
    expect(screen.getByText('Loading documents...')).toBeDefined();
  });

  it('renders error state', async () => {
    const { useDocuments } = await import('../../hooks.js');
    (useDocuments as any).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Network error'),
    });

    renderWithRouter(<DocumentList />);
    expect(screen.getByText(/failed to load documents/i)).toBeDefined();
  });

  it('renders empty state', async () => {
    const { useDocuments } = await import('../../hooks.js');
    (useDocuments as any).mockReturnValue({ data: [], isLoading: false, error: null });

    renderWithRouter(<DocumentList />);
    expect(screen.getByText(/no documents yet/i)).toBeDefined();
  });

  it('renders document table with data', async () => {
    const { useDocuments } = await import('../../hooks.js');
    (useDocuments as any).mockReturnValue({ data: mockDocuments, isLoading: false, error: null });

    renderWithRouter(<DocumentList />);
    expect(screen.getByText('jan-statement.pdf')).toBeDefined();
    expect(screen.getByText('feb-payslip.pdf')).toBeDefined();
    // "Bank Statement" appears in both filter dropdown and table row
    expect(screen.getAllByText('Bank Statement').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Payslip').length).toBeGreaterThanOrEqual(1);
  });

  it('renders table headers', async () => {
    const { useDocuments } = await import('../../hooks.js');
    (useDocuments as any).mockReturnValue({ data: mockDocuments, isLoading: false, error: null });

    renderWithRouter(<DocumentList />);
    expect(screen.getByText('Filename')).toBeDefined();
    expect(screen.getByText('Type')).toBeDefined();
    expect(screen.getByText('Status')).toBeDefined();
    expect(screen.getByText('Actions')).toBeDefined();
  });

  it('renders filter dropdowns', async () => {
    const { useDocuments } = await import('../../hooks.js');
    (useDocuments as any).mockReturnValue({ data: mockDocuments, isLoading: false, error: null });

    renderWithRouter(<DocumentList />);
    expect(screen.getByText('All statuses')).toBeDefined();
    expect(screen.getByText('All types')).toBeDefined();
  });

  it('changes status filter', async () => {
    const { useDocuments } = await import('../../hooks.js');
    (useDocuments as any).mockReturnValue({ data: mockDocuments, isLoading: false, error: null });

    renderWithRouter(<DocumentList />);
    const statusSelect = screen.getByText('All statuses').closest('select')!;
    fireEvent.change(statusSelect, { target: { value: 'completed' } });
    expect((statusSelect as HTMLSelectElement).value).toBe('completed');
  });

  it('changes doc type filter', async () => {
    const { useDocuments } = await import('../../hooks.js');
    (useDocuments as any).mockReturnValue({ data: mockDocuments, isLoading: false, error: null });

    renderWithRouter(<DocumentList />);
    const typeSelect = screen.getByText('All types').closest('select')!;
    fireEvent.change(typeSelect, { target: { value: 'payslip' } });
    expect((typeSelect as HTMLSelectElement).value).toBe('payslip');
  });

  it('calls delete mutation on double-click delete flow', async () => {
    const { useDocuments } = await import('../../hooks.js');
    (useDocuments as any).mockReturnValue({ data: mockDocuments, isLoading: false, error: null });

    renderWithRouter(<DocumentList />);
    const deleteButtons = screen.getAllByTestId('trash-icon');
    // First click sets confirmDelete
    fireEvent.click(deleteButtons[0].closest('button')!);
    // Second click confirms the delete
    fireEvent.click(deleteButtons[0].closest('button')!);
    expect(mockDeleteMutate).toHaveBeenCalledWith('d1');
  });

  it('shows reprocess button for completed documents with files', async () => {
    const { useDocuments } = await import('../../hooks.js');
    (useDocuments as any).mockReturnValue({ data: mockDocuments, isLoading: false, error: null });

    renderWithRouter(<DocumentList />);
    // d1 is completed with hasFile=true, should have reprocess button
    const refreshIcons = screen.getAllByTestId('refresh-icon');
    expect(refreshIcons.length).toBeGreaterThanOrEqual(1);
  });

  it('calls vision reprocess mutation', async () => {
    const { useDocuments } = await import('../../hooks.js');
    (useDocuments as any).mockReturnValue({ data: mockDocuments, isLoading: false, error: null });

    renderWithRouter(<DocumentList />);
    const refreshButtons = screen.getAllByTestId('refresh-icon');
    fireEvent.click(refreshButtons[0].closest('button')!);
    expect(mockVisionMutate).toHaveBeenCalledWith('d1');
  });

  it('renders processing status with correct style', async () => {
    const { useDocuments } = await import('../../hooks.js');
    (useDocuments as any).mockReturnValue({ data: mockDocuments, isLoading: false, error: null });

    renderWithRouter(<DocumentList />);
    const processingBadge = screen.getByText('processing');
    expect(processingBadge.className).toContain('bg-yellow-100');
  });

  it('renders completed status with correct style', async () => {
    const { useDocuments } = await import('../../hooks.js');
    (useDocuments as any).mockReturnValue({ data: mockDocuments, isLoading: false, error: null });

    renderWithRouter(<DocumentList />);
    const completedBadge = screen.getByText('completed');
    expect(completedBadge.className).toContain('bg-green-100');
  });

  it('renders institution or dash', async () => {
    const { useDocuments } = await import('../../hooks.js');
    (useDocuments as any).mockReturnValue({ data: mockDocuments, isLoading: false, error: null });

    renderWithRouter(<DocumentList />);
    expect(screen.getByText('CBA')).toBeDefined();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });
});
