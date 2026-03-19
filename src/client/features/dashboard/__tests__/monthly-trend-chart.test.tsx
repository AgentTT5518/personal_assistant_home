import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MonthlyTrendChart } from '../components/monthly-trend-chart.js';

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('MonthlyTrendChart', () => {
  it('renders empty state when no data', () => {
    render(<MonthlyTrendChart byMonth={[]} currency="AUD" />);
    expect(screen.getByText('No monthly data available')).toBeInTheDocument();
  });

  it('renders the chart heading with data', () => {
    const data = [
      { month: '2026-01', income: 3000, expenses: 2000 },
      { month: '2026-02', income: 3500, expenses: 2500 },
    ];
    render(<MonthlyTrendChart byMonth={data} currency="AUD" />);
    expect(screen.getAllByText('Monthly Trend').length).toBeGreaterThanOrEqual(1);
  });
});
