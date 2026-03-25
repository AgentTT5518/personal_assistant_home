import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';

const mockApi = vi.hoisted(() => ({
  fetchRecurringSummary: vi.fn(),
  detectRecurring: vi.fn(),
}));

vi.mock('../api.js', () => mockApi);

import { useRecurringSummary, useDetectRecurring } from '../hooks.js';

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.clearAllMocks();
});

describe('useRecurringSummary', () => {
  it('fetches recurring summary', async () => {
    const data = [{ name: 'Netflix', amount: 15 }];
    mockApi.fetchRecurringSummary.mockResolvedValue(data);
    const { result } = renderHook(() => useRecurringSummary(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });
});

describe('useDetectRecurring', () => {
  it('calls detectRecurring on mutate', async () => {
    const data = { groups: [{ name: 'Netflix' }], groupCount: 1 };
    mockApi.detectRecurring.mockResolvedValue(data);
    const { result } = renderHook(() => useDetectRecurring(), { wrapper });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.detectRecurring).toHaveBeenCalledTimes(1);
  });
});
