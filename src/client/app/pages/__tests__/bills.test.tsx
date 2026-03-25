import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

vi.mock('../../../features/bills/index.js', () => ({
  BillsList: () => <div data-testid="bills-list">BillsList</div>,
  BillsCalendar: () => <div data-testid="bills-calendar">BillsCalendar</div>,
}));

import { BillsPage } from '../bills.js';

afterEach(cleanup);

describe('BillsPage', () => {
  it('renders Bills heading', () => {
    render(<BillsPage />);
    expect(screen.getByText('Bills')).toBeInTheDocument();
  });

  it('renders list view by default', () => {
    render(<BillsPage />);
    expect(screen.getByTestId('bills-list')).toBeInTheDocument();
  });

  it('renders view toggle buttons', () => {
    render(<BillsPage />);
    expect(screen.getByText('List')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });

  it('switches to calendar view when Calendar button clicked', () => {
    render(<BillsPage />);
    fireEvent.click(screen.getByText('Calendar'));
    expect(screen.getByTestId('bills-calendar')).toBeInTheDocument();
  });

  it('switches back to list view when List button clicked', () => {
    render(<BillsPage />);
    fireEvent.click(screen.getByText('Calendar'));
    fireEvent.click(screen.getByText('List'));
    expect(screen.getByTestId('bills-list')).toBeInTheDocument();
  });
});
