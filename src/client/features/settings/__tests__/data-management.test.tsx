import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { DataManagement } from '../components/data-management.js';

// Mock the api module
vi.mock('../api.js', () => ({
  deleteAllData: vi.fn(),
  reSeedCategories: vi.fn(),
  runAutoCategorise: vi.fn(),
}));

import { deleteAllData, reSeedCategories, runAutoCategorise } from '../api.js';

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

afterEach(cleanup);

describe('DataManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all three action buttons', () => {
    render(<DataManagement />, { wrapper: createWrapper() });
    expect(screen.getByText('Delete All Data')).toBeInTheDocument();
    expect(screen.getByText('Re-seed Default Categories')).toBeInTheDocument();
    expect(screen.getByText('Re-run Categorisation')).toBeInTheDocument();
  });

  // --- Delete All Data ---

  it('shows confirmation for delete all', () => {
    render(<DataManagement />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Delete All Data'));
    expect(screen.getByText(/Are you sure/)).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('cancels delete all confirmation', () => {
    render(<DataManagement />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Delete All Data'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.getByText('Delete All Data')).toBeInTheDocument();
  });

  it('calls deleteAllData and shows success message', async () => {
    vi.mocked(deleteAllData).mockResolvedValue({
      deletedTransactions: 10,
      deletedAccountSummaries: 2,
      deletedDocuments: 3,
    });

    render(<DataManagement />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Delete All Data'));
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(deleteAllData).toHaveBeenCalled();
      expect(screen.getByText(/Deleted 10 transactions/)).toBeInTheDocument();
    });
  });

  it('shows error message on delete all failure', async () => {
    vi.mocked(deleteAllData).mockRejectedValue(new Error('Server error'));

    render(<DataManagement />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Delete All Data'));
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  // --- Re-seed Default Categories ---

  it('shows confirmation for re-seed', () => {
    render(<DataManagement />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Re-seed Default Categories'));
    expect(screen.getByText(/Are you sure/)).toBeInTheDocument();
  });

  it('cancels re-seed confirmation', () => {
    render(<DataManagement />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Re-seed Default Categories'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.getByText('Re-seed Default Categories')).toBeInTheDocument();
  });

  it('calls reSeedCategories and shows success message', async () => {
    vi.mocked(reSeedCategories).mockResolvedValue({
      message: 'Default categories re-seeded',
      categoriesSeeded: 18,
    });

    render(<DataManagement />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Re-seed Default Categories'));
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(reSeedCategories).toHaveBeenCalled();
      expect(screen.getByText(/Default categories re-seeded/)).toBeInTheDocument();
    });
  });

  it('shows error message on re-seed failure', async () => {
    vi.mocked(reSeedCategories).mockRejectedValue(new Error('Re-seed failed'));

    render(<DataManagement />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Re-seed Default Categories'));
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(screen.getByText('Re-seed failed')).toBeInTheDocument();
    });
  });

  // --- Re-run Categorisation ---

  it('calls runAutoCategorise directly (no confirmation) and shows success', async () => {
    vi.mocked(runAutoCategorise).mockResolvedValue({ categorised: 5, total: 20 });

    render(<DataManagement />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Re-run Categorisation'));

    await waitFor(() => {
      expect(runAutoCategorise).toHaveBeenCalled();
      expect(screen.getByText(/Categorised 5 of 20/)).toBeInTheDocument();
    });
  });

  it('shows error message on auto-categorise failure', async () => {
    vi.mocked(runAutoCategorise).mockRejectedValue(new Error('Categorise failed'));

    render(<DataManagement />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Re-run Categorisation'));

    await waitFor(() => {
      expect(screen.getByText('Categorise failed')).toBeInTheDocument();
    });
  });

  // --- Loading / disabled state ---

  it('disables all buttons while an operation is pending', async () => {
    // deleteAllData never resolves — keeps loading state visible
    vi.mocked(deleteAllData).mockReturnValue(new Promise(() => {}));

    render(<DataManagement />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Delete All Data'));
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      // Re-seed and auto-categorise buttons should be disabled
      expect(screen.getByText('Re-seed Default Categories').closest('button')).toBeDisabled();
      expect(screen.getByText('Re-run Categorisation').closest('button')).toBeDisabled();
    });
  });
});
