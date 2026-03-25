import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { GenerateReportPanel } from '../generate-report-panel.js';

const mockMutate = vi.fn();

vi.mock('../../hooks.js', () => ({
  useGenerateReport: vi.fn(() => ({
    mutate: mockMutate,
    isPending: false,
    isError: false,
    error: null,
  })),
}));

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    Loader2: (props: any) => <span data-testid="loader" {...props} />,
    FileBarChart: (props: any) => <span data-testid="file-bar-chart" {...props} />,
  };
});

describe('GenerateReportPanel', () => {
  afterEach(cleanup);

  it('renders the panel heading', () => {
    render(<GenerateReportPanel />);
    expect(screen.getByRole('heading', { level: 2 })).toBeDefined();
    expect(screen.getAllByText('Generate Report').length).toBeGreaterThanOrEqual(1);
  });

  it('renders all report type buttons', () => {
    render(<GenerateReportPanel />);
    expect(screen.getByText('Monthly')).toBeDefined();
    expect(screen.getByText('Quarterly')).toBeDefined();
    expect(screen.getByText('Yearly')).toBeDefined();
    expect(screen.getByText('Custom')).toBeDefined();
  });

  it('renders date inputs', () => {
    render(<GenerateReportPanel />);
    expect(screen.getByLabelText('From')).toBeDefined();
    expect(screen.getByLabelText('To')).toBeDefined();
  });

  it('clicking Yearly sets dates to full year', () => {
    render(<GenerateReportPanel />);
    fireEvent.click(screen.getByText('Yearly'));

    const fromInput = screen.getByLabelText('From') as HTMLInputElement;
    const toInput = screen.getByLabelText('To') as HTMLInputElement;
    const year = new Date().getFullYear();

    expect(fromInput.value).toBe(`${year}-01-01`);
    expect(toInput.value).toBe(`${year}-12-31`);
  });

  it('clicking Quarterly sets dates to current quarter', () => {
    render(<GenerateReportPanel />);
    fireEvent.click(screen.getByText('Quarterly'));

    const fromInput = screen.getByLabelText('From') as HTMLInputElement;
    expect(fromInput.value).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it('generate button calls mutate', () => {
    const onGenerated = vi.fn();
    render(<GenerateReportPanel onGenerated={onGenerated} />);

    const button = screen.getByRole('button', { name: /generate report/i });
    fireEvent.click(button);

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        reportType: 'monthly',
        periodFrom: expect.any(String),
        periodTo: expect.any(String),
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('shows error message when generation fails', async () => {
    const { useGenerateReport } = await import('../../hooks.js');
    (useGenerateReport as any).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: true,
      error: new Error('Server error'),
    });

    render(<GenerateReportPanel />);
    expect(screen.getByText('Server error')).toBeDefined();
  });
});
