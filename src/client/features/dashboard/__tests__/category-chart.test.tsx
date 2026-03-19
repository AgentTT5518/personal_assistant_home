import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CategoryChart } from '../components/category-chart.js';

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('CategoryChart', () => {
  it('renders empty state when no categories', () => {
    render(<CategoryChart byCategory={[]} currency="AUD" />);
    expect(screen.getByText('No categorised expenses yet')).toBeInTheDocument();
  });

  it('renders the chart heading', () => {
    const data = [
      { categoryId: '1', categoryName: 'Food', categoryColor: '#ef4444', total: 500, count: 10 },
      { categoryId: '2', categoryName: 'Transport', categoryColor: '#f59e0b', total: 200, count: 5 },
    ];
    render(<CategoryChart byCategory={data} currency="AUD" />);
    expect(screen.getAllByText('Spending by Category').length).toBeGreaterThanOrEqual(1);
  });
});
