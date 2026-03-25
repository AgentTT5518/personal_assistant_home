import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { UpcomingBillsWidget } from '../upcoming-bills-widget.js';
import { MemoryRouter } from 'react-router-dom';

vi.mock('lucide-react', () => ({
  CalendarDays: () => <span>CalendarDays</span>,
  Check: () => <span>Check</span>,
}));

vi.mock('../../../../shared/utils/format-currency.js', () => ({
  formatCurrency: (val: number) => `$${val.toFixed(2)}`,
}));

const mockMarkPaidMutate = vi.fn();

const mockBills = [
  { id: 'bill-1', name: 'Netflix', expectedAmount: 15.99, nextDueDate: '2026-12-25' },
  { id: 'bill-2', name: 'Electricity', expectedAmount: 80, nextDueDate: '2026-12-27' },
];

let mockBillsReturn: { data: typeof mockBills | undefined } = { data: mockBills };

vi.mock('../../hooks.js', () => ({
  useUpcomingBills: () => mockBillsReturn,
  useMarkBillPaid: () => ({ mutate: mockMarkPaidMutate, isPending: false }),
}));

function renderWidget(currency = 'AUD') {
  return render(
    <MemoryRouter>
      <UpcomingBillsWidget currency={currency} />
    </MemoryRouter>,
  );
}

describe('UpcomingBillsWidget', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockBillsReturn = { data: mockBills };
  });

  it('renders upcoming bills header', () => {
    renderWidget();
    expect(screen.getByText('Upcoming Bills (7 days)')).toBeInTheDocument();
  });

  it('renders bill names', () => {
    renderWidget();
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText('Electricity')).toBeInTheDocument();
  });

  it('renders formatted amounts', () => {
    renderWidget();
    expect(screen.getByText('$15.99')).toBeInTheDocument();
    expect(screen.getByText('$80.00')).toBeInTheDocument();
  });

  it('renders total due', () => {
    renderWidget();
    expect(screen.getByText('Total due')).toBeInTheDocument();
    expect(screen.getByText('$95.99')).toBeInTheDocument();
  });

  it('renders View All link', () => {
    renderWidget();
    expect(screen.getByText('View All')).toBeInTheDocument();
  });

  it('renders nothing when no bills', () => {
    mockBillsReturn = { data: [] };
    const { container } = renderWidget();
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when data is undefined', () => {
    mockBillsReturn = { data: undefined };
    const { container } = renderWidget();
    expect(container.innerHTML).toBe('');
  });

  it('calls markPaid on button click', () => {
    renderWidget();
    const buttons = screen.getAllByTitle('Mark paid');
    fireEvent.click(buttons[0]);
    expect(mockMarkPaidMutate).toHaveBeenCalledWith('bill-1');
  });
});
