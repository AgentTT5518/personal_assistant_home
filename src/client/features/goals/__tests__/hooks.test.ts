import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';

const mockApi = vi.hoisted(() => ({
  fetchGoals: vi.fn(),
  fetchGoal: vi.fn(),
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  deleteGoal: vi.fn(),
  contributeToGoal: vi.fn(),
  syncGoalBalance: vi.fn(),
}));

vi.mock('../api.js', () => mockApi);

import {
  useGoals,
  useGoal,
  useActiveGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useContributeToGoal,
  useSyncGoalBalance,
} from '../hooks.js';

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.clearAllMocks();
});

describe('useGoals', () => {
  it('fetches goals', async () => {
    const data = [{ id: '1', name: 'Emergency Fund' }];
    mockApi.fetchGoals.mockResolvedValue(data);
    const { result } = renderHook(() => useGoals(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
    expect(mockApi.fetchGoals).toHaveBeenCalledWith(undefined);
  });

  it('passes status param', async () => {
    mockApi.fetchGoals.mockResolvedValue([]);
    const { result } = renderHook(() => useGoals({ status: 'active' }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.fetchGoals).toHaveBeenCalledWith({ status: 'active' });
  });
});

describe('useGoal', () => {
  it('fetches a single goal', async () => {
    const data = { id: '1', name: 'Emergency Fund' };
    mockApi.fetchGoal.mockResolvedValue(data);
    const { result } = renderHook(() => useGoal('1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.fetchGoal).toHaveBeenCalledWith('1');
  });
});

describe('useActiveGoals', () => {
  it('fetches active goals', async () => {
    mockApi.fetchGoals.mockResolvedValue([]);
    const { result } = renderHook(() => useActiveGoals(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.fetchGoals).toHaveBeenCalledWith({ status: 'active' });
  });
});

describe('useCreateGoal', () => {
  it('calls createGoal on mutate', async () => {
    const created = { id: '2', name: 'Vacation' };
    mockApi.createGoal.mockResolvedValue(created);
    const { result } = renderHook(() => useCreateGoal(), { wrapper });
    result.current.mutate({ name: 'Vacation', targetAmount: 5000 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.createGoal.mock.calls[0][0]).toEqual({ name: 'Vacation', targetAmount: 5000 });
  });
});

describe('useUpdateGoal', () => {
  it('calls updateGoal on mutate', async () => {
    mockApi.updateGoal.mockResolvedValue({ id: '1', name: 'Updated' });
    const { result } = renderHook(() => useUpdateGoal(), { wrapper });
    result.current.mutate({ id: '1', name: 'Updated' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.updateGoal).toHaveBeenCalledWith('1', { name: 'Updated' });
  });
});

describe('useDeleteGoal', () => {
  it('calls deleteGoal on mutate', async () => {
    mockApi.deleteGoal.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteGoal(), { wrapper });
    result.current.mutate('1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.deleteGoal.mock.calls[0][0]).toBe('1');
  });
});

describe('useContributeToGoal', () => {
  it('calls contributeToGoal on mutate', async () => {
    mockApi.contributeToGoal.mockResolvedValue({ id: '1', currentAmount: 1500 });
    const { result } = renderHook(() => useContributeToGoal(), { wrapper });
    result.current.mutate({ id: '1', amount: 500 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.contributeToGoal).toHaveBeenCalledWith('1', { amount: 500 });
  });
});

describe('useSyncGoalBalance', () => {
  it('calls syncGoalBalance on mutate', async () => {
    mockApi.syncGoalBalance.mockResolvedValue({ id: '1', currentAmount: 2000 });
    const { result } = renderHook(() => useSyncGoalBalance(), { wrapper });
    result.current.mutate('1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.syncGoalBalance.mock.calls[0][0]).toBe('1');
  });
});
