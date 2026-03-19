import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DateRangePicker, getDefaultDateRange } from '../components/date-range-picker.js';

afterEach(cleanup);

describe('DateRangePicker', () => {
  it('renders all preset buttons', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={getDefaultDateRange()} onChange={onChange} />);
    expect(screen.getByText('This Month')).toBeInTheDocument();
    expect(screen.getByText('Last 3 Months')).toBeInTheDocument();
    expect(screen.getByText('Last 6 Months')).toBeInTheDocument();
    expect(screen.getByText('This Year')).toBeInTheDocument();
    expect(screen.getByText('All Time')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('calls onChange when preset clicked', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={getDefaultDateRange()} onChange={onChange} />);
    fireEvent.click(screen.getByText('This Month'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const range = onChange.mock.calls[0][0];
    expect(range.dateFrom).toBeDefined();
    expect(range.dateTo).toBeDefined();
  });

  it('calls onChange with undefined dates for All Time', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={getDefaultDateRange()} onChange={onChange} />);
    fireEvent.click(screen.getByText('All Time'));
    expect(onChange).toHaveBeenCalledWith({ dateFrom: undefined, dateTo: undefined });
  });

  it('shows custom date inputs when Custom clicked', () => {
    const onChange = vi.fn();
    const { container } = render(<DateRangePicker value={getDefaultDateRange()} onChange={onChange} />);
    fireEvent.click(screen.getByText('Custom'));
    const dateInputs = container.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBe(2);
  });
});

describe('getDefaultDateRange', () => {
  it('returns a dateFrom and dateTo', () => {
    const range = getDefaultDateRange();
    expect(range.dateFrom).toBeDefined();
    expect(range.dateTo).toBeDefined();
  });

  it('dateTo is today', () => {
    const range = getDefaultDateRange();
    const today = new Date().toISOString().split('T')[0];
    expect(range.dateTo).toBe(today);
  });
});
