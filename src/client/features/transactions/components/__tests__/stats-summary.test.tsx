import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { StatsSummary } from '../stats-summary.js';

vi.mock('../../hooks.js', () => ({
  useTransactionStats: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  useAutoCategorise: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('../../../../shared/utils/format-currency.js', () => ({
  formatCurrency: (value: number, _currency: string) => `$${value.toFixed(2)}`,
}));

vi.mock('../../../settings/hooks.js', () => ({
  useCurrency: vi.fn(() => 'AUD'),
}));

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    Loader2: (props: any) => <span data-testid="loader" {...props} />,
    TrendingUp: (props: any) => <span data-testid="trending-up" {...props} />,
    TrendingDown: (props: any) => <span data-testid="trending-down" {...props} />,
    DollarSign: (props: any) => <span data-testid="dollar-sign" {...props} />,
    HelpCircle: (props: any) => <span data-testid="help-circle" {...props} />,
    Zap: (props: any) => <span data-testid="zap" {...props} />,
  };
});

const mockStats = {
  totalIncome: 5000,
  totalExpenses: 3200,
  netAmount: 1800,
  uncategorisedCount: 12,
};

describe('StatsSummary', () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it('renders loading state', async () => {
    const { useTransactionStats } = await import('../../hooks.js');
    (useTransactionStats as any).mockReturnValue({ data: null, isLoading: true });

    render(<StatsSummary />);
    expect(screen.getByTestId('loader')).toBeDefined();
  });

  it('returns null when no stats', async () => {
    const { useTransactionStats } = await import('../../hooks.js');
    (useTransactionStats as any).mockReturnValue({ data: null, isLoading: false });

    const { container } = render(<StatsSummary />);
    expect(container.innerHTML).toBe('');
  });

  it('renders all stat cards', async () => {
    const { useTransactionStats } = await import('../../hooks.js');
    (useTransactionStats as any).mockReturnValue({ data: mockStats, isLoading: false });

    render(<StatsSummary />);
    expect(screen.getByText('Income')).toBeDefined();
    expect(screen.getByText('Expenses')).toBeDefined();
    expect(screen.getByText('Net')).toBeDefined();
    expect(screen.getByText('Uncategorised')).toBeDefined();
  });

  it('renders formatted currency values', async () => {
    const { useTransactionStats } = await import('../../hooks.js');
    (useTransactionStats as any).mockReturnValue({ data: mockStats, isLoading: false });

    render(<StatsSummary />);
    expect(screen.getByText('$5000.00')).toBeDefined();
    expect(screen.getByText('$3200.00')).toBeDefined();
    expect(screen.getByText('$1800.00')).toBeDefined();
  });

  it('renders uncategorised count', async () => {
    const { useTransactionStats } = await import('../../hooks.js');
    (useTransactionStats as any).mockReturnValue({ data: mockStats, isLoading: false });

    render(<StatsSummary />);
    expect(screen.getByText('12')).toBeDefined();
  });

  it('shows auto-categorise button when uncategorised count > 0', async () => {
    const { useTransactionStats } = await import('../../hooks.js');
    (useTransactionStats as any).mockReturnValue({ data: mockStats, isLoading: false });

    render(<StatsSummary />);
    expect(screen.getByText('Auto')).toBeDefined();
  });

  it('hides auto-categorise button when uncategorised count is 0', async () => {
    const { useTransactionStats } = await import('../../hooks.js');
    (useTransactionStats as any).mockReturnValue({
      data: { ...mockStats, uncategorisedCount: 0 },
      isLoading: false,
    });

    render(<StatsSummary />);
    expect(screen.queryByText('Auto')).toBeNull();
  });

  it('renders income card with trending up icon', async () => {
    const { useTransactionStats } = await import('../../hooks.js');
    (useTransactionStats as any).mockReturnValue({ data: mockStats, isLoading: false });

    render(<StatsSummary />);
    expect(screen.getByTestId('trending-up')).toBeDefined();
    expect(screen.getByText('Income')).toBeDefined();
    expect(screen.getByText('$5000.00')).toBeDefined();
  });

  it('renders expenses card with trending down icon', async () => {
    const { useTransactionStats } = await import('../../hooks.js');
    (useTransactionStats as any).mockReturnValue({ data: mockStats, isLoading: false });

    render(<StatsSummary />);
    expect(screen.getByTestId('trending-down')).toBeDefined();
    expect(screen.getByText('Expenses')).toBeDefined();
    expect(screen.getByText('$3200.00')).toBeDefined();
  });

  it('renders net card with dollar sign icon', async () => {
    const { useTransactionStats } = await import('../../hooks.js');
    (useTransactionStats as any).mockReturnValue({ data: mockStats, isLoading: false });

    render(<StatsSummary />);
    expect(screen.getByTestId('dollar-sign')).toBeDefined();
    expect(screen.getByText('Net')).toBeDefined();
    expect(screen.getByText('$1800.00')).toBeDefined();
  });

  it('renders uncategorised card with help circle icon', async () => {
    const { useTransactionStats } = await import('../../hooks.js');
    (useTransactionStats as any).mockReturnValue({ data: mockStats, isLoading: false });

    render(<StatsSummary />);
    expect(screen.getByTestId('help-circle')).toBeDefined();
    expect(screen.getByText('Uncategorised')).toBeDefined();
    expect(screen.getByText('12')).toBeDefined();
  });

  it('applies green colour to positive net amount', async () => {
    const { useTransactionStats } = await import('../../hooks.js');
    (useTransactionStats as any).mockReturnValue({ data: mockStats, isLoading: false });

    render(<StatsSummary />);
    const netValue = screen.getByText('$1800.00');
    expect(netValue.className).toContain('text-green-600');
  });

  it('applies red colour to negative net amount', async () => {
    const { useTransactionStats } = await import('../../hooks.js');
    (useTransactionStats as any).mockReturnValue({
      data: { ...mockStats, netAmount: -500 },
      isLoading: false,
    });

    render(<StatsSummary />);
    const netValue = screen.getByText('$-500.00');
    expect(netValue.className).toContain('text-red-600');
  });

  it('renders all 4 stat cards in a grid', async () => {
    const { useTransactionStats } = await import('../../hooks.js');
    (useTransactionStats as any).mockReturnValue({ data: mockStats, isLoading: false });

    const { container } = render(<StatsSummary />);
    const cards = container.querySelectorAll('.bg-white.rounded-lg');
    expect(cards.length).toBe(4);
  });
});
