import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BillsCalendar } from '../bills-calendar.js';

vi.mock('lucide-react', () => ({
  ChevronLeft: () => <span>ChevronLeft</span>,
  ChevronRight: () => <span>ChevronRight</span>,
  Loader2: () => <span data-testid="loader">Loader2</span>,
}));

vi.mock('../../../../shared/utils/format-currency.js', () => ({
  formatCurrency: (val: number) => `$${val.toFixed(2)}`,
}));

vi.mock('../../../settings/index.js', () => ({
  useCurrency: () => 'AUD',
}));

const mockMarkPaidMutate = vi.fn();

let mockCalendarReturn: { data: unknown[] | undefined; isLoading: boolean } = {
  data: [
    {
      date: '2026-03-15',
      bills: [
        { id: 'bill-1', name: 'Netflix', expectedAmount: 15.99 },
      ],
    },
  ],
  isLoading: false,
};

vi.mock('../../hooks.js', () => ({
  useBillsCalendar: () => mockCalendarReturn,
  useMarkBillPaid: () => ({ mutate: mockMarkPaidMutate, isPending: false }),
}));

describe('BillsCalendar', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockCalendarReturn = {
      data: [
        {
          date: '2026-03-15',
          bills: [
            { id: 'bill-1', name: 'Netflix', expectedAmount: 15.99 },
          ],
        },
      ],
      isLoading: false,
    };
  });

  it('renders day labels', () => {
    render(<BillsCalendar />);
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });

  it('renders month/year header', () => {
    render(<BillsCalendar />);
    // The component renders current month by default
    const now = new Date();
    const expected = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('renders loading state', () => {
    mockCalendarReturn = { data: undefined, isLoading: true };
    render(<BillsCalendar />);
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('renders bill names in calendar cells', () => {
    render(<BillsCalendar />);
    expect(screen.getByText('Netflix')).toBeInTheDocument();
  });

  it('calls markPaid when bill is clicked', () => {
    render(<BillsCalendar />);
    fireEvent.click(screen.getByText('Netflix'));
    expect(mockMarkPaidMutate).toHaveBeenCalledWith('bill-1');
  });

  it('navigates months with chevron buttons', () => {
    render(<BillsCalendar />);
    const buttons = screen.getAllByRole('button');
    // First button is prev month, last relevant is next month
    const prevButton = buttons[0];
    fireEvent.click(prevButton);
    // After clicking prev, the month header should change
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const expected = prevMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});
