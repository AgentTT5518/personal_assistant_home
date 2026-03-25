import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ColumnMapper } from '../column-mapper.js';

const headers = ['Date', 'Description', 'Amount', 'Type', 'Payee'];

describe('ColumnMapper', () => {
  afterEach(cleanup);

  it('renders Map Columns heading', () => {
    render(<ColumnMapper headers={headers} onSubmit={vi.fn()} isLoading={false} />);
    expect(screen.getByText('Map Columns')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<ColumnMapper headers={headers} onSubmit={vi.fn()} isLoading={false} />);
    expect(screen.getByText(/map your csv columns/i)).toBeInTheDocument();
  });

  it('renders required field selectors for date and description', () => {
    render(<ColumnMapper headers={headers} onSubmit={vi.fn()} isLoading={false} />);
    // "Date" and "Description" appear both as labels and as select options,
    // so check that multiple elements exist (label + option instances)
    expect(screen.getAllByText('Date').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Description').length).toBeGreaterThanOrEqual(1);
  });

  it('renders amount mode radio buttons', () => {
    render(<ColumnMapper headers={headers} onSubmit={vi.fn()} isLoading={false} />);
    expect(screen.getByText('Single column')).toBeInTheDocument();
    expect(screen.getByText('Separate debit/credit columns')).toBeInTheDocument();
  });

  it('renders optional fields', () => {
    render(<ColumnMapper headers={headers} onSubmit={vi.fn()} isLoading={false} />);
    expect(screen.getByText('Type (debit/credit)')).toBeInTheDocument();
    expect(screen.getByText('Merchant / Payee')).toBeInTheDocument();
  });

  it('disables Apply Mapping button when required fields are not mapped', () => {
    render(<ColumnMapper headers={headers} onSubmit={vi.fn()} isLoading={false} />);
    const button = screen.getByText('Apply Mapping');
    expect(button).toBeDisabled();
  });

  it('enables Apply Mapping when all required fields are mapped', () => {
    render(<ColumnMapper headers={headers} onSubmit={vi.fn()} isLoading={false} />);
    // There are multiple selects. We need to select: date, description, amount
    const selects = screen.getAllByRole('combobox');
    // selects order: date, description, amount (single mode), type, merchant
    fireEvent.change(selects[0], { target: { value: 'Date' } });
    fireEvent.change(selects[1], { target: { value: 'Description' } });
    fireEvent.change(selects[2], { target: { value: 'Amount' } });
    const button = screen.getByText('Apply Mapping');
    expect(button).not.toBeDisabled();
  });

  it('calls onSubmit with mapping when Apply Mapping is clicked', () => {
    const onSubmit = vi.fn();
    render(<ColumnMapper headers={headers} onSubmit={onSubmit} isLoading={false} />);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'Date' } });
    fireEvent.change(selects[1], { target: { value: 'Description' } });
    fireEvent.change(selects[2], { target: { value: 'Amount' } });
    fireEvent.click(screen.getByText('Apply Mapping'));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        date: 'Date',
        description: 'Description',
        amount: 'Amount',
      }),
    );
  });

  it('shows split amount selects when split mode is selected', () => {
    render(<ColumnMapper headers={headers} onSubmit={vi.fn()} isLoading={false} />);
    fireEvent.click(screen.getByText('Separate debit/credit columns'));
    expect(screen.getByText('Debit Amount')).toBeInTheDocument();
    expect(screen.getByText('Credit Amount')).toBeInTheDocument();
  });

  it('shows Mapping... when isLoading', () => {
    render(<ColumnMapper headers={headers} onSubmit={vi.fn()} isLoading={true} />);
    expect(screen.getByText('Mapping...')).toBeInTheDocument();
  });

  it('renders column options from headers', () => {
    render(<ColumnMapper headers={headers} onSubmit={vi.fn()} isLoading={false} />);
    const options = screen.getAllByText('Payee');
    expect(options.length).toBeGreaterThan(0);
  });
});
