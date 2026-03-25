import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DocumentDetail } from '../document-detail.js';

const mockVisionMutate = vi.fn();

vi.mock('../../hooks.js', () => ({
  useDocument: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
  useDocumentTransactions: vi.fn(() => ({
    data: [],
  })),
  useReprocessVision: vi.fn(() => ({
    mutate: mockVisionMutate,
    isPending: false,
  })),
}));

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    Loader2: (props: any) => <span data-testid="loader" {...props} />,
    ArrowLeft: (props: any) => <span data-testid="arrow-left" {...props} />,
    RefreshCw: (props: any) => <span data-testid="refresh-icon" {...props} />,
    AlertCircle: (props: any) => <span data-testid="alert-icon" {...props} />,
  };
});

const mockDoc = {
  id: 'd1',
  filename: 'jan-statement.pdf',
  docType: 'bank_statement',
  processingStatus: 'completed',
  institution: 'CBA',
  period: 'Jan 2026',
  createdAt: '2026-01-15T10:00:00Z',
  processedAt: '2026-01-15T10:05:00Z',
  transactionCount: 5,
  hasFile: true,
  isScanned: false,
};

const mockTransactions = [
  { id: 'txn1', date: '2026-01-02', description: 'Coffee Shop', merchant: 'Cafe', amount: 5.5, type: 'debit' },
  { id: 'txn2', date: '2026-01-05', description: 'Salary', merchant: null, amount: 3000, type: 'credit' },
];

function renderWithRoute() {
  return render(
    <MemoryRouter initialEntries={['/documents/d1']}>
      <Routes>
        <Route path="/documents/:id" element={<DocumentDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DocumentDetail', () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it('renders loading state', async () => {
    const { useDocument } = await import('../../hooks.js');
    (useDocument as any).mockReturnValue({ data: null, isLoading: true, error: null });

    renderWithRoute();
    expect(screen.getByTestId('loader')).toBeDefined();
  });

  it('renders error state', async () => {
    const { useDocument } = await import('../../hooks.js');
    (useDocument as any).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Not found'),
    });

    renderWithRoute();
    expect(screen.getByText('Not found')).toBeDefined();
    expect(screen.getByText('Back to documents')).toBeDefined();
  });

  it('renders document metadata', async () => {
    const { useDocument, useDocumentTransactions } = await import('../../hooks.js');
    (useDocument as any).mockReturnValue({ data: mockDoc, isLoading: false, error: null });
    (useDocumentTransactions as any).mockReturnValue({ data: mockTransactions });

    renderWithRoute();
    expect(screen.getByText('jan-statement.pdf')).toBeDefined();
    expect(screen.getByText('Bank Statement')).toBeDefined();
    expect(screen.getByText('CBA')).toBeDefined();
    expect(screen.getByText('Jan 2026')).toBeDefined();
  });

  it('renders transactions table for completed docs', async () => {
    const { useDocument, useDocumentTransactions } = await import('../../hooks.js');
    (useDocument as any).mockReturnValue({ data: mockDoc, isLoading: false, error: null });
    (useDocumentTransactions as any).mockReturnValue({ data: mockTransactions });

    renderWithRoute();
    expect(screen.getByText('Coffee Shop')).toBeDefined();
    expect(screen.getByText('Salary')).toBeDefined();
    expect(screen.getByText('Transactions (2)')).toBeDefined();
  });

  it('shows processing banner for pending docs', async () => {
    const { useDocument, useDocumentTransactions } = await import('../../hooks.js');
    const pendingDoc = { ...mockDoc, processingStatus: 'pending' };
    (useDocument as any).mockReturnValue({ data: pendingDoc, isLoading: false, error: null });
    (useDocumentTransactions as any).mockReturnValue({ data: [] });

    renderWithRoute();
    expect(screen.getByText('Waiting to start processing...')).toBeDefined();
  });

  it('shows failure state with reprocess button', async () => {
    const { useDocument, useDocumentTransactions } = await import('../../hooks.js');
    const failedDoc = { ...mockDoc, processingStatus: 'failed' };
    (useDocument as any).mockReturnValue({ data: failedDoc, isLoading: false, error: null });
    (useDocumentTransactions as any).mockReturnValue({ data: [] });

    renderWithRoute();
    expect(screen.getByText('Processing failed')).toBeDefined();
    expect(screen.getByText('Re-process with Vision')).toBeDefined();
  });

  it('renders document not found when no doc and no error', async () => {
    const { useDocument } = await import('../../hooks.js');
    (useDocument as any).mockReturnValue({ data: null, isLoading: false, error: null });

    renderWithRoute();
    expect(screen.getByText('Document not found')).toBeDefined();
  });

  it('renders processing banner for documents in processing state', async () => {
    const { useDocument, useDocumentTransactions } = await import('../../hooks.js');
    const processingDoc = { ...mockDoc, processingStatus: 'processing' };
    (useDocument as any).mockReturnValue({ data: processingDoc, isLoading: false, error: null });
    (useDocumentTransactions as any).mockReturnValue({ data: [] });

    renderWithRoute();
    expect(screen.getByText('Extracting data from your document...')).toBeDefined();
  });

  it('renders all metadata fields for completed doc', async () => {
    const { useDocument, useDocumentTransactions } = await import('../../hooks.js');
    (useDocument as any).mockReturnValue({ data: mockDoc, isLoading: false, error: null });
    (useDocumentTransactions as any).mockReturnValue({ data: mockTransactions });

    renderWithRoute();
    // Check key metadata labels
    expect(screen.getByText('Status')).toBeDefined();
    expect(screen.getByText('Institution')).toBeDefined();
    expect(screen.getByText('Period')).toBeDefined();
    expect(screen.getByText('Uploaded')).toBeDefined();
    expect(screen.getByText('Processed')).toBeDefined();
    // Check status value
    expect(screen.getByText('completed')).toBeDefined();
  });

  it('shows transaction count in metadata', async () => {
    const { useDocument, useDocumentTransactions } = await import('../../hooks.js');
    (useDocument as any).mockReturnValue({ data: mockDoc, isLoading: false, error: null });
    (useDocumentTransactions as any).mockReturnValue({ data: mockTransactions });

    renderWithRoute();
    expect(screen.getByText('Transactions')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
  });

  it('shows scanned PDF field when isScanned is defined', async () => {
    const { useDocument, useDocumentTransactions } = await import('../../hooks.js');
    const scannedDoc = { ...mockDoc, isScanned: true };
    (useDocument as any).mockReturnValue({ data: scannedDoc, isLoading: false, error: null });
    (useDocumentTransactions as any).mockReturnValue({ data: mockTransactions });

    renderWithRoute();
    expect(screen.getByText('Scanned PDF')).toBeDefined();
    expect(screen.getByText('Yes')).toBeDefined();
  });

  it('shows no transactions message when completed doc has zero transactions', async () => {
    const { useDocument, useDocumentTransactions } = await import('../../hooks.js');
    (useDocument as any).mockReturnValue({ data: mockDoc, isLoading: false, error: null });
    (useDocumentTransactions as any).mockReturnValue({ data: [] });

    renderWithRoute();
    expect(screen.getByText('No transactions extracted from this document.')).toBeDefined();
  });

  it('shows vision reprocess banner for completed scanned docs', async () => {
    const { useDocument, useDocumentTransactions } = await import('../../hooks.js');
    const scannedCompletedDoc = { ...mockDoc, isScanned: true };
    (useDocument as any).mockReturnValue({ data: scannedCompletedDoc, isLoading: false, error: null });
    (useDocumentTransactions as any).mockReturnValue({ data: mockTransactions });

    renderWithRoute();
    expect(screen.getByText(/scanned document.*vision processing/i)).toBeDefined();
  });

  it('renders dash for missing processedAt', async () => {
    const { useDocument, useDocumentTransactions } = await import('../../hooks.js');
    const noProcessedDoc = { ...mockDoc, processedAt: null };
    (useDocument as any).mockReturnValue({ data: noProcessedDoc, isLoading: false, error: null });
    (useDocumentTransactions as any).mockReturnValue({ data: mockTransactions });

    renderWithRoute();
    // At least one dash should be present for the null processedAt
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });
});
