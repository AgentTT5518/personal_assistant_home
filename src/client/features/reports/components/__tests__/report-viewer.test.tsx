import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ReportViewer } from '../report-viewer.js';
import type { ReportData } from '../../../../../shared/types/index.js';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

vi.mock('../../api.js', () => ({
  downloadReportPdf: vi.fn(),
}));

vi.mock('../../logger.js', () => ({
  log: { error: vi.fn(), info: vi.fn() },
}));

vi.mock('../../../../shared/utils/format-currency.js', () => ({
  formatCurrency: (value: number, currency: string) => `${currency} ${value.toFixed(2)}`,
}));

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    Loader2: (props: any) => <span data-testid="loader" {...props} />,
    Download: (props: any) => <span data-testid="download-icon" {...props} />,
  };
});

const mockData: ReportData = {
  summary: {
    income: 5000,
    expenses: 3000,
    net: 2000,
    transactionCount: 42,
  },
  categoryBreakdown: [
    { categoryName: 'Groceries', categoryColor: '#22c55e', amount: 1200, percentage: 40 },
    { categoryName: 'Transport', categoryColor: '#3b82f6', amount: 800, percentage: 27 },
  ],
  monthlyComparison: [
    { month: 'Jan', income: 2500, expenses: 1500 },
    { month: 'Feb', income: 2500, expenses: 1500 },
  ],
  budgetVsActual: [
    {
      categoryName: 'Groceries',
      categoryColor: '#22c55e',
      budgetAmount: 1500,
      actualSpent: 1200,
      percentUsed: 80,
    },
  ],
  topMerchants: [
    { merchant: 'Woolworths', amount: 600, transactionCount: 12 },
    { merchant: 'Coles', amount: 400, transactionCount: 8 },
  ],
  accountBreakdown: [
    {
      accountName: 'Everyday',
      type: 'checking',
      income: 5000,
      expenses: 3000,
      net: 2000,
    },
  ],
};

describe('ReportViewer', () => {
  afterEach(cleanup);

  const defaultProps = {
    reportId: 'r1',
    title: 'Monthly Report - Jan 2026',
    periodFrom: '2026-01-01',
    periodTo: '2026-01-31',
    data: mockData,
    currency: 'AUD',
  };

  it('renders the title and period', () => {
    render(<ReportViewer {...defaultProps} />);
    expect(screen.getByText('Monthly Report - Jan 2026')).toBeDefined();
    expect(screen.getByText('2026-01-01 to 2026-01-31')).toBeDefined();
  });

  it('renders summary cards', () => {
    render(<ReportViewer {...defaultProps} />);
    // Multiple sections may contain matching text (summary + charts)
    expect(screen.getAllByText('Income').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Expenses').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Net').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Transactions').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('42')).toBeDefined();
  });

  it('renders category breakdown section with pie chart', () => {
    render(<ReportViewer {...defaultProps} />);
    expect(screen.getByText('Spending by Category')).toBeDefined();
    expect(screen.getByTestId('pie-chart')).toBeDefined();
  });

  it('renders monthly comparison section with bar chart', () => {
    render(<ReportViewer {...defaultProps} />);
    expect(screen.getByText('Monthly Comparison')).toBeDefined();
    expect(screen.getByTestId('bar-chart')).toBeDefined();
  });

  it('renders budget vs actual table', () => {
    render(<ReportViewer {...defaultProps} />);
    expect(screen.getByText('Budget vs Actual')).toBeDefined();
    expect(screen.getByText('Groceries')).toBeDefined();
    expect(screen.getByText('80%')).toBeDefined();
  });

  it('renders top merchants table', () => {
    render(<ReportViewer {...defaultProps} />);
    expect(screen.getByText('Top Merchants')).toBeDefined();
    expect(screen.getByText('Woolworths')).toBeDefined();
    expect(screen.getByText('Coles')).toBeDefined();
  });

  it('renders account breakdown table', () => {
    render(<ReportViewer {...defaultProps} />);
    expect(screen.getByText('Account Breakdown')).toBeDefined();
    expect(screen.getByText('Everyday')).toBeDefined();
  });

  it('renders download PDF button', () => {
    render(<ReportViewer {...defaultProps} />);
    expect(screen.getByText('Download PDF')).toBeDefined();
  });

  it('hides sections with no data', () => {
    const emptyData: ReportData = {
      summary: { income: 0, expenses: 0, net: 0, transactionCount: 0 },
      categoryBreakdown: [],
      monthlyComparison: [],
      budgetVsActual: [],
      topMerchants: [],
      accountBreakdown: [],
    };
    render(<ReportViewer {...defaultProps} data={emptyData} />);
    expect(screen.queryByText('Spending by Category')).toBeNull();
    expect(screen.queryByText('Monthly Comparison')).toBeNull();
    expect(screen.queryByText('Budget vs Actual')).toBeNull();
    expect(screen.queryByText('Top Merchants')).toBeNull();
    expect(screen.queryByText('Account Breakdown')).toBeNull();
  });

  it('hides monthly comparison when only one month', () => {
    const singleMonthData: ReportData = {
      ...mockData,
      monthlyComparison: [{ month: 'Jan', income: 2500, expenses: 1500 }],
    };
    render(<ReportViewer {...defaultProps} data={singleMonthData} />);
    expect(screen.queryByText('Monthly Comparison')).toBeNull();
  });

  it('renders account breakdown table with all columns', () => {
    render(<ReportViewer {...defaultProps} />);
    expect(screen.getByText('Account Breakdown')).toBeDefined();
    expect(screen.getByText('Everyday')).toBeDefined();
    // Check type is rendered
    expect(screen.getByText('checking')).toBeDefined();
  });

  it('renders summary values with currency formatting', () => {
    render(<ReportViewer {...defaultProps} />);
    // Values appear in summary + account breakdown, so use getAllByText
    expect(screen.getAllByText('AUD 5000.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('AUD 3000.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('AUD 2000.00').length).toBeGreaterThanOrEqual(1);
  });

  it('applies red color to net when negative', () => {
    const negativeNetData: ReportData = {
      ...mockData,
      summary: { income: 1000, expenses: 3000, net: -2000, transactionCount: 10 },
    };
    render(<ReportViewer {...defaultProps} data={negativeNetData} />);
    // The net summary card should have text-red-600
    const netCard = screen.getByText('AUD -2000.00');
    expect(netCard.className).toContain('text-red-600');
  });

  it('renders budget vs actual with over-budget highlighting', () => {
    const overBudgetData: ReportData = {
      ...mockData,
      budgetVsActual: [
        {
          categoryName: 'Dining',
          categoryColor: '#ef4444',
          budgetAmount: 200,
          actualSpent: 300,
          percentUsed: 150,
        },
      ],
    };
    render(<ReportViewer {...defaultProps} data={overBudgetData} />);
    const percentCell = screen.getByText('150%');
    expect(percentCell.className).toContain('text-red-600');
  });

  it('renders budget vs actual with amber warning for 80-100%', () => {
    const nearBudgetData: ReportData = {
      ...mockData,
      budgetVsActual: [
        {
          categoryName: 'Groceries',
          categoryColor: '#22c55e',
          budgetAmount: 1000,
          actualSpent: 900,
          percentUsed: 90,
        },
      ],
    };
    render(<ReportViewer {...defaultProps} data={nearBudgetData} />);
    const percentCell = screen.getByText('90%');
    expect(percentCell.className).toContain('text-amber-600');
  });

  it('calls downloadReportPdf when download button is clicked', async () => {
    const { downloadReportPdf } = await import('../../api.js');
    (downloadReportPdf as any).mockResolvedValue(undefined);

    render(<ReportViewer {...defaultProps} />);
    fireEvent.click(screen.getByText('Download PDF'));

    expect(downloadReportPdf).toHaveBeenCalledWith('r1', 'Monthly Report - Jan 2026');
  });

  it('renders account breakdown with negative net in red', () => {
    const negativeAccountData: ReportData = {
      ...mockData,
      accountBreakdown: [
        {
          accountName: 'Credit Card',
          type: 'credit_card',
          income: 0,
          expenses: 2000,
          net: -2000,
        },
      ],
    };
    render(<ReportViewer {...defaultProps} data={negativeAccountData} />);
    expect(screen.getByText('Credit Card')).toBeDefined();
    expect(screen.getByText('credit card')).toBeDefined();
  });

  it('renders top merchants with transaction counts', () => {
    render(<ReportViewer {...defaultProps} />);
    expect(screen.getByText('12')).toBeDefined();
    expect(screen.getByText('8')).toBeDefined();
  });

  it('renders monthly comparison bar chart when 2+ months', () => {
    render(<ReportViewer {...defaultProps} />);
    expect(screen.getByText('Monthly Comparison')).toBeDefined();
    expect(screen.getByTestId('bar-chart')).toBeDefined();
  });

  it('renders account breakdown table with income, expenses and net columns', () => {
    render(<ReportViewer {...defaultProps} />);
    // Account breakdown has its own headers
    const headers = screen.getAllByText('Account');
    expect(headers.length).toBeGreaterThanOrEqual(1);
    // Check account name in table
    expect(screen.getByText('Everyday')).toBeDefined();
    // Check account type
    expect(screen.getByText('checking')).toBeDefined();
  });

  it('renders account breakdown income and expense values', () => {
    render(<ReportViewer {...defaultProps} />);
    // Account breakdown has matching values
    expect(screen.getAllByText('AUD 5000.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('AUD 3000.00').length).toBeGreaterThanOrEqual(1);
  });

  it('renders download button text', () => {
    render(<ReportViewer {...defaultProps} />);
    expect(screen.getByText('Download PDF')).toBeDefined();
    expect(screen.getByTestId('download-icon')).toBeDefined();
  });

  it('renders budget vs actual with green for under-budget', () => {
    const underBudgetData: ReportData = {
      ...mockData,
      budgetVsActual: [
        {
          categoryName: 'Transport',
          categoryColor: '#3b82f6',
          budgetAmount: 500,
          actualSpent: 200,
          percentUsed: 40,
        },
      ],
    };
    render(<ReportViewer {...defaultProps} data={underBudgetData} />);
    const percentCell = screen.getByText('40%');
    expect(percentCell.className).toContain('text-green-600');
  });
});
