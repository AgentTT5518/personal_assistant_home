import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ImportPreview } from '../import-preview.js';
import type { ImportPreviewRow } from '../../../../../shared/types/index.js';

vi.mock('lucide-react', () => ({
  CheckSquare: () => <span data-testid="check-square">CheckSquare</span>,
  Square: () => <span data-testid="square">Square</span>,
  AlertTriangle: () => <span>AlertTriangle</span>,
}));

const mockRows: ImportPreviewRow[] = [
  {
    rowIndex: 0,
    date: '2026-03-01',
    description: 'Grocery Store',
    amount: 52.5,
    type: 'debit',
    isDuplicate: false,
    selected: true,
  },
  {
    rowIndex: 1,
    date: '2026-03-02',
    description: 'Salary',
    amount: 3000,
    type: 'credit',
    isDuplicate: false,
    selected: true,
  },
  {
    rowIndex: 2,
    date: '2026-03-03',
    description: 'Netflix',
    amount: 15.99,
    type: 'debit',
    isDuplicate: true,
    selected: false,
  },
];

describe('ImportPreview', () => {
  afterEach(cleanup);

  it('renders Preview heading', () => {
    render(<ImportPreview rows={mockRows} onConfirm={vi.fn()} isLoading={false} />);
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('renders total row count', () => {
    render(<ImportPreview rows={mockRows} onConfirm={vi.fn()} isLoading={false} />);
    expect(screen.getByText('3 total rows')).toBeInTheDocument();
  });

  it('renders new count', () => {
    render(<ImportPreview rows={mockRows} onConfirm={vi.fn()} isLoading={false} />);
    expect(screen.getByText('2 new')).toBeInTheDocument();
  });

  it('renders duplicate count', () => {
    render(<ImportPreview rows={mockRows} onConfirm={vi.fn()} isLoading={false} />);
    expect(screen.getByText('1 duplicates')).toBeInTheDocument();
  });

  it('renders row descriptions', () => {
    render(<ImportPreview rows={mockRows} onConfirm={vi.fn()} isLoading={false} />);
    expect(screen.getByText('Grocery Store')).toBeInTheDocument();
    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.getByText('Netflix')).toBeInTheDocument();
  });

  it('renders amounts', () => {
    render(<ImportPreview rows={mockRows} onConfirm={vi.fn()} isLoading={false} />);
    expect(screen.getByText('52.50')).toBeInTheDocument();
    expect(screen.getByText('3000.00')).toBeInTheDocument();
    expect(screen.getByText('15.99')).toBeInTheDocument();
  });

  it('initializes selection from row.selected', () => {
    render(<ImportPreview rows={mockRows} onConfirm={vi.fn()} isLoading={false} />);
    // 2 rows are initially selected (rowIndex 0, 1)
    expect(screen.getByText('2 rows selected for import')).toBeInTheDocument();
  });

  it('calls onConfirm with selected row indices', () => {
    const onConfirm = vi.fn();
    render(<ImportPreview rows={mockRows} onConfirm={onConfirm} isLoading={false} />);
    fireEvent.click(screen.getByText(/import 2 transaction/i));
    expect(onConfirm).toHaveBeenCalledWith(expect.arrayContaining([0, 1]));
  });

  it('toggles row selection', () => {
    render(<ImportPreview rows={mockRows} onConfirm={vi.fn()} isLoading={false} />);
    // Click on the first row toggle button to deselect it
    const toggleButtons = screen.getAllByLabelText('Toggle row');
    fireEvent.click(toggleButtons[0]); // deselect row 0
    expect(screen.getByText('1 row selected for import')).toBeInTheDocument();
  });

  it('toggle all selects/deselects all rows', () => {
    render(<ImportPreview rows={mockRows} onConfirm={vi.fn()} isLoading={false} />);
    const toggleAll = screen.getByLabelText('Toggle all rows');
    fireEvent.click(toggleAll); // select all
    expect(screen.getByText('3 rows selected for import')).toBeInTheDocument();
    fireEvent.click(toggleAll); // deselect all
    expect(screen.getByText('0 rows selected for import')).toBeInTheDocument();
  });

  it('disables import button when no rows selected', () => {
    const rowsAllDeselected: ImportPreviewRow[] = mockRows.map((r) => ({ ...r, selected: false }));
    render(<ImportPreview rows={rowsAllDeselected} onConfirm={vi.fn()} isLoading={false} />);
    const button = screen.getByText(/import 0 transaction/i);
    expect(button).toBeDisabled();
  });

  it('shows Importing... when isLoading', () => {
    render(<ImportPreview rows={mockRows} onConfirm={vi.fn()} isLoading={true} />);
    expect(screen.getByText('Importing...')).toBeInTheDocument();
  });

  it('marks duplicate rows', () => {
    render(<ImportPreview rows={mockRows} onConfirm={vi.fn()} isLoading={false} />);
    const duplicateLabels = screen.getAllByText('Duplicate');
    expect(duplicateLabels).toHaveLength(1);
  });
});
