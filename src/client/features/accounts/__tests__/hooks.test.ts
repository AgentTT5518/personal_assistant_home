import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';

const mockApi = vi.hoisted(() => ({
  fetchAccounts: vi.fn(),
  fetchAccount: vi.fn(),
  fetchNetWorth: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
  recalculateBalance: vi.fn(),
}));

vi.mock('../api.js', () => mockApi);

import {
  useAccounts,
  useAccount,
  useNetWorth,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
  useRecalculateBalance,
} from '../hooks.js';

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.clearAllMocks();
});

describe('useAccounts', () => {
  it('fetches accounts', async () => {
    const data = [{ id: '1', name: 'Checking' }];
    mockApi.fetchAccounts.mockResolvedValue(data);
    const { result } = renderHook(() => useAccounts(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
    expect(mockApi.fetchAccounts).toHaveBeenCalledWith(undefined);
  });

  it('passes isActive parameter', async () => {
    mockApi.fetchAccounts.mockResolvedValue([]);
    const { result } = renderHook(() => useAccounts(true), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.fetchAccounts).toHaveBeenCalledWith(true);
  });
});

describe('useAccount', () => {
  it('fetches a single account', async () => {
    const data = { id: '1', name: 'Savings' };
    mockApi.fetchAccount.mockResolvedValue(data);
    const { result } = renderHook(() => useAccount('1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
    expect(mockApi.fetchAccount).toHaveBeenCalledWith('1');
  });
});

describe('useNetWorth', () => {
  it('fetches net worth', async () => {
    const data = { total: 5000 };
    mockApi.fetchNetWorth.mockResolvedValue(data);
    const { result } = renderHook(() => useNetWorth(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });
});

describe('useCreateAccount', () => {
  it('calls createAccount on mutate', async () => {
    const created = { id: '2', name: 'New' };
    mockApi.createAccount.mockResolvedValue(created);
    const { result } = renderHook(() => useCreateAccount(), { wrapper });
    result.current.mutate({ name: 'New', type: 'checking' as const });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.createAccount.mock.calls[0][0]).toEqual({ name: 'New', type: 'checking' });
  });
});

describe('useUpdateAccount', () => {
  it('calls updateAccount on mutate', async () => {
    const updated = { id: '1', name: 'Updated' };
    mockApi.updateAccount.mockResolvedValue(updated);
    const { result } = renderHook(() => useUpdateAccount(), { wrapper });
    result.current.mutate({ id: '1', name: 'Updated' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.updateAccount).toHaveBeenCalledWith('1', { name: 'Updated' });
  });
});

describe('useDeleteAccount', () => {
  it('calls deleteAccount on mutate', async () => {
    mockApi.deleteAccount.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteAccount(), { wrapper });
    result.current.mutate({ id: '1', hard: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.deleteAccount).toHaveBeenCalledWith('1', true);
  });
});

describe('useRecalculateBalance', () => {
  it('calls recalculateBalance on mutate', async () => {
    const data = { id: '1', currentBalance: 1000 };
    mockApi.recalculateBalance.mockResolvedValue(data);
    const { result } = renderHook(() => useRecalculateBalance(), { wrapper });
    result.current.mutate('1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.recalculateBalance.mock.calls[0][0]).toBe('1');
  });
});
