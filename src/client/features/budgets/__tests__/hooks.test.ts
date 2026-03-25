import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';

const mockApi = vi.hoisted(() => ({
  fetchBudgets: vi.fn(),
  fetchBudgetSummary: vi.fn(),
  createBudget: vi.fn(),
  updateBudget: vi.fn(),
  deleteBudget: vi.fn(),
}));

vi.mock('../api.js', () => mockApi);

import {
  useBudgets,
  useBudgetSummary,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
} from '../hooks.js';

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.clearAllMocks();
});

describe('useBudgets', () => {
  it('fetches budgets', async () => {
    const data = [{ id: 'b1', categoryId: 'c1', amount: 500 }];
    mockApi.fetchBudgets.mockResolvedValue(data);
    const { result } = renderHook(() => useBudgets(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });
});

describe('useBudgetSummary', () => {
  it('fetches budget summary', async () => {
    const data = [{ categoryId: 'c1', spent: 200, budget: 500 }];
    mockApi.fetchBudgetSummary.mockResolvedValue(data);
    const { result } = renderHook(() => useBudgetSummary(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });
});

describe('useCreateBudget', () => {
  it('calls createBudget on mutate', async () => {
    const created = { id: 'b2', categoryId: 'c1', amount: 500 };
    mockApi.createBudget.mockResolvedValue(created);
    const { result } = renderHook(() => useCreateBudget(), { wrapper });
    result.current.mutate({ categoryId: 'c1', amount: 500 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.createBudget.mock.calls[0][0]).toEqual({ categoryId: 'c1', amount: 500 });
  });
});

describe('useUpdateBudget', () => {
  it('calls updateBudget on mutate', async () => {
    const updated = { id: 'b1', categoryId: 'c1', amount: 600 };
    mockApi.updateBudget.mockResolvedValue(updated);
    const { result } = renderHook(() => useUpdateBudget(), { wrapper });
    result.current.mutate({ id: 'b1', amount: 600 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.updateBudget).toHaveBeenCalledWith('b1', { amount: 600 });
  });
});

describe('useDeleteBudget', () => {
  it('calls deleteBudget on mutate', async () => {
    mockApi.deleteBudget.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteBudget(), { wrapper });
    result.current.mutate('b1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.deleteBudget.mock.calls[0][0]).toBe('b1');
  });
});
