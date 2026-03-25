import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ReportHistory } from '../report-history.js';

const mockDeleteMutate = vi.fn();

vi.mock('../../hooks.js', () => ({
  useReports: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  useDeleteReport: vi.fn(() => ({
    mutate: mockDeleteMutate,
    isPending: false,
  })),
}));

vi.mock('../../api.js', () => ({
  downloadReportPdf: vi.fn(),
}));

vi.mock('../../logger.js', () => ({
  log: { error: vi.fn(), info: vi.fn() },
}));

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    Loader2: (props: any) => <span data-testid="loader" {...props} />,
    Download: (props: any) => <span data-testid="download-icon" {...props} />,
    Trash2: (props: any) => <span data-testid="trash-icon" {...props} />,
    FileText: (props: any) => <span data-testid="file-text-icon" {...props} />,
  };
});

const mockReports = [
  {
    id: 'r1',
    title: 'Monthly Report - Jan 2026',
    periodFrom: '2026-01-01',
    periodTo: '2026-01-31',
    generatedAt: '2026-01-31T12:00:00Z',
    reportType: 'monthly',
  },
  {
    id: 'r2',
    title: 'Quarterly Report - Q1 2026',
    periodFrom: '2026-01-01',
    periodTo: '2026-03-31',
    generatedAt: '2026-03-31T12:00:00Z',
    reportType: 'quarterly',
  },
];

describe('ReportHistory', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', async () => {
    const { useReports } = await import('../../hooks.js');
    (useReports as any).mockReturnValue({ data: null, isLoading: true });

    render(<ReportHistory onSelect={vi.fn()} selectedId={null} />);
    expect(screen.getByTestId('loader')).toBeDefined();
  });

  it('renders empty state', async () => {
    const { useReports } = await import('../../hooks.js');
    (useReports as any).mockReturnValue({ data: [], isLoading: false });

    render(<ReportHistory onSelect={vi.fn()} selectedId={null} />);
    expect(screen.getByText(/no reports generated yet/i)).toBeDefined();
  });

  it('renders report list', async () => {
    const { useReports } = await import('../../hooks.js');
    (useReports as any).mockReturnValue({ data: mockReports, isLoading: false });

    render(<ReportHistory onSelect={vi.fn()} selectedId={null} />);
    expect(screen.getByText('Monthly Report - Jan 2026')).toBeDefined();
    expect(screen.getByText('Quarterly Report - Q1 2026')).toBeDefined();
  });

  it('calls onSelect when clicking a report', async () => {
    const { useReports } = await import('../../hooks.js');
    (useReports as any).mockReturnValue({ data: mockReports, isLoading: false });

    const onSelect = vi.fn();
    render(<ReportHistory onSelect={onSelect} selectedId={null} />);

    fireEvent.click(screen.getByText('Monthly Report - Jan 2026'));
    expect(onSelect).toHaveBeenCalledWith('r1');
  });

  it('renders download and delete buttons', async () => {
    const { useReports } = await import('../../hooks.js');
    (useReports as any).mockReturnValue({ data: mockReports, isLoading: false });

    render(<ReportHistory onSelect={vi.fn()} selectedId={null} />);
    const downloadButtons = screen.getAllByTitle('Download PDF');
    const deleteButtons = screen.getAllByTitle('Delete report');
    expect(downloadButtons.length).toBe(2);
    expect(deleteButtons.length).toBe(2);
  });

  it('highlights selected report', async () => {
    const { useReports } = await import('../../hooks.js');
    (useReports as any).mockReturnValue({ data: mockReports, isLoading: false });

    render(<ReportHistory onSelect={vi.fn()} selectedId="r1" />);
    const listItem = screen.getByText('Monthly Report - Jan 2026').closest('li');
    expect(listItem?.className).toContain('bg-blue-50');
  });
});
