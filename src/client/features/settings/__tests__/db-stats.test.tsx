import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { DbStats } from '../components/db-stats.js';

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

afterEach(cleanup);

describe('DbStats', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders stats after loading', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        documentCount: 5,
        transactionCount: 42,
        categoryCount: 13,
        dbSizeBytes: 1048576,
        appVersion: '1.0.0',
      }),
    } as Response);

    render(<DbStats />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('13')).toBeInTheDocument();
      expect(screen.getByText('1.0 MB')).toBeInTheDocument();
      expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    });
  });

  it('renders labels', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        documentCount: 0,
        transactionCount: 0,
        categoryCount: 0,
        dbSizeBytes: 0,
        appVersion: '1.0.0',
      }),
    } as Response);

    render(<DbStats />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
      expect(screen.getByText('Transactions')).toBeInTheDocument();
      expect(screen.getByText('Categories')).toBeInTheDocument();
      expect(screen.getByText('Database Size')).toBeInTheDocument();
      expect(screen.getByText('App Version')).toBeInTheDocument();
    });
  });

  it('shows error state on fetch failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    render(<DbStats />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Failed to load database stats')).toBeInTheDocument();
    });
  });
});
