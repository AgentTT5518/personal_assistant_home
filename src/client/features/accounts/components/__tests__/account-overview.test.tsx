import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { AccountOverview } from '../account-overview.js';

vi.mock('lucide-react', () => ({
  Wallet: () => <span>Wallet</span>,
}));

vi.mock('../../../../shared/utils/format-currency.js', () => ({
  formatCurrency: (val: number) => `$${val.toFixed(2)}`,
}));

const mockNetWorthData = {
  netWorth: 5000,
  accounts: [
    { id: 'acc-1', name: 'My Checking', type: 'checking', effectiveBalance: 3000 },
    { id: 'acc-2', name: 'My Savings', type: 'savings', effectiveBalance: 4000 },
    { id: 'acc-3', name: 'Visa Card', type: 'credit_card', effectiveBalance: -2000 },
  ],
};

let mockNetWorthReturn: { data: typeof mockNetWorthData | undefined; isLoading: boolean } = {
  data: mockNetWorthData,
  isLoading: false,
};

vi.mock('../../hooks.js', () => ({
  useNetWorth: () => mockNetWorthReturn,
}));

describe('AccountOverview', () => {
  afterEach(() => {
    cleanup();
    mockNetWorthReturn = { data: mockNetWorthData, isLoading: false };
  });

  it('renders net worth', () => {
    render(<AccountOverview currency="AUD" />);
    expect(screen.getByText('Net Worth')).toBeInTheDocument();
    expect(screen.getByText('$5000.00')).toBeInTheDocument();
  });

  it('renders accounts header', () => {
    render(<AccountOverview currency="AUD" />);
    expect(screen.getByText('Accounts')).toBeInTheDocument();
  });

  it('renders account names', () => {
    render(<AccountOverview currency="AUD" />);
    expect(screen.getByText('My Checking')).toBeInTheDocument();
    expect(screen.getByText('My Savings')).toBeInTheDocument();
    expect(screen.getByText('Visa Card')).toBeInTheDocument();
  });

  it('renders type labels beside names', () => {
    render(<AccountOverview currency="AUD" />);
    expect(screen.getByText('Checking')).toBeInTheDocument();
    expect(screen.getByText('Savings')).toBeInTheDocument();
    expect(screen.getByText('Credit Card')).toBeInTheDocument();
  });

  it('renders each account balance', () => {
    render(<AccountOverview currency="AUD" />);
    expect(screen.getByText('$3000.00')).toBeInTheDocument();
    expect(screen.getByText('$4000.00')).toBeInTheDocument();
    expect(screen.getByText('$-2000.00')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    mockNetWorthReturn = { data: undefined, isLoading: true };
    const { container } = render(<AccountOverview currency="AUD" />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders nothing when no data', () => {
    mockNetWorthReturn = { data: undefined, isLoading: false };
    const { container } = render(<AccountOverview currency="AUD" />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when accounts array is empty', () => {
    mockNetWorthReturn = { data: { netWorth: 0, accounts: [] }, isLoading: false };
    const { container } = render(<AccountOverview currency="AUD" />);
    expect(container.innerHTML).toBe('');
  });
});
