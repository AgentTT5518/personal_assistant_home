import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';

const mockApi = vi.hoisted(() => ({
  generateAnalysis: vi.fn(),
  fetchSnapshots: vi.fn(),
  fetchSnapshot: vi.fn(),
  deleteSnapshot: vi.fn(),
}));

vi.mock('../api.js', () => mockApi);

import { useSnapshots, useSnapshot, useGenerateAnalysis, useDeleteSnapshot } from '../hooks.js';

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.clearAllMocks();
});

describe('useSnapshots', () => {
  it('fetches snapshots', async () => {
    const data = [{ id: 's1', snapshotType: 'analysis', generatedAt: '' }];
    mockApi.fetchSnapshots.mockResolvedValue(data);
    const { result } = renderHook(() => useSnapshots(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });
});

describe('useSnapshot', () => {
  it('fetches a single snapshot when id is provided', async () => {
    const data = { id: 's1', snapshotType: 'analysis', data: {} };
    mockApi.fetchSnapshot.mockResolvedValue(data);
    const { result } = renderHook(() => useSnapshot('s1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });

  it('does not fetch when id is null', () => {
    const { result } = renderHook(() => useSnapshot(null), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockApi.fetchSnapshot).not.toHaveBeenCalled();
  });
});

describe('useGenerateAnalysis', () => {
  it('calls generateAnalysis on mutate', async () => {
    const created = { id: 's2', snapshotType: 'analysis', data: {} };
    mockApi.generateAnalysis.mockResolvedValue(created);
    const { result } = renderHook(() => useGenerateAnalysis(), { wrapper });
    result.current.mutate({ dateFrom: '2026-01-01', dateTo: '2026-03-01' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.generateAnalysis.mock.calls[0][0]).toBe('2026-01-01');
    expect(mockApi.generateAnalysis.mock.calls[0][1]).toBe('2026-03-01');
  });
});

describe('useDeleteSnapshot', () => {
  it('calls deleteSnapshot on mutate', async () => {
    mockApi.deleteSnapshot.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteSnapshot(), { wrapper });
    result.current.mutate('s1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.deleteSnapshot.mock.calls[0][0]).toBe('s1');
  });
});
