import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { CsvExport } from '../components/csv-export.js';

afterEach(cleanup);

describe('CsvExport', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders export button and date range picker', () => {
    render(<CsvExport />);
    expect(screen.getByText('Export CSV')).toBeInTheDocument();
    expect(screen.getByText('Last 3 Months')).toBeInTheDocument();
    expect(screen.getByText('All Time')).toBeInTheDocument();
  });

  it('shows loading state while exporting', async () => {
    // fetch that never resolves to keep loading state visible
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {}));

    render(<CsvExport />);
    fireEvent.click(screen.getByText('Export CSV'));

    await waitFor(() => {
      expect(screen.getByText('Exporting...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /exporting/i })).toBeDisabled();
    });
  });

  it('shows "No transactions to export" for empty result', async () => {
    const csvHeader = 'date,description,amount,type,merchant,category,is_recurring';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(csvHeader),
    } as Response);

    render(<CsvExport />);
    fireEvent.click(screen.getByText('Export CSV'));

    await waitFor(() => {
      expect(screen.getByText('No transactions to export')).toBeInTheDocument();
    });
  });

  it('triggers blob download on successful export with data', async () => {
    const csvContent = 'date,description,amount,type,merchant,category,is_recurring\n2026-01-15,Purchase,50,debit,Shop,,false';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(csvContent),
    } as Response);

    const createObjectURL = vi.fn(() => 'blob:mock-url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });

    render(<CsvExport />);
    fireEvent.click(screen.getByText('Export CSV'));

    await waitFor(() => {
      // Verify blob was created and cleaned up (download path was taken)
      expect(createObjectURL).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
      // No error or info messages should be shown
      expect(screen.queryByText('No transactions to export')).not.toBeInTheDocument();
    });

    // Button should be re-enabled after completion
    expect(screen.getByText('Export CSV')).not.toBeDisabled();
  });

  it('passes date range params to fetch URL', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('header\ndata'),
    } as Response);

    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => ''), revokeObjectURL: vi.fn() });

    render(<CsvExport />);
    fireEvent.click(screen.getByText('Export CSV'));

    await waitFor(() => {
      // Default date range is "last 3 months", so from/to should be in the URL
      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('/api/transactions/export/csv');
      expect(url).toContain('from=');
      expect(url).toContain('to=');
    });
  });

  it('shows error message on non-200 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({ error: { message: 'Export failed' } }),
    } as Response);

    render(<CsvExport />);
    fireEvent.click(screen.getByText('Export CSV'));

    await waitFor(() => {
      expect(screen.getByText('Export failed')).toBeInTheDocument();
    });
  });

  it('shows error message on network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    render(<CsvExport />);
    fireEvent.click(screen.getByText('Export CSV'));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('re-enables button after export completes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('header-only'),
    } as Response);

    render(<CsvExport />);
    fireEvent.click(screen.getByText('Export CSV'));

    await waitFor(() => {
      expect(screen.getByText('No transactions to export')).toBeInTheDocument();
    });

    expect(screen.getByText('Export CSV')).not.toBeDisabled();
  });
});
