import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';

const mockApi = vi.hoisted(() => ({
  fetchTransactions: vi.fn(),
  fetchTransactionStats: vi.fn(),
  updateTransaction: vi.fn(),
  bulkCategorise: vi.fn(),
  triggerAutoCategorise: vi.fn(),
  triggerAiCategorise: vi.fn(),
  fetchCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  fetchCategoryRules: vi.fn(),
  createCategoryRule: vi.fn(),
  deleteCategoryRule: vi.fn(),
}));

vi.mock('../api.js', () => mockApi);

import {
  useTransactions,
  useTransactionStats,
  useUpdateTransaction,
  useBulkCategorise,
  useAutoCategorise,
  useAiCategorise,
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCategoryRules,
  useCreateCategoryRule,
  useDeleteCategoryRule,
} from '../hooks.js';

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.clearAllMocks();
});

// --- Transaction hooks ---

describe('useTransactions', () => {
  it('fetches transactions', async () => {
    const data = { data: [], total: 0, page: 1, pageSize: 50 };
    mockApi.fetchTransactions.mockResolvedValue(data);
    const filters = { page: 1, pageSize: 50 };
    const { result } = renderHook(() => useTransactions(filters as any), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
    expect(mockApi.fetchTransactions).toHaveBeenCalledWith(filters);
  });
});

describe('useTransactionStats', () => {
  it('fetches transaction stats', async () => {
    const data = { totalIncome: 5000, totalExpenses: 3000 };
    mockApi.fetchTransactionStats.mockResolvedValue(data);
    const { result } = renderHook(() => useTransactionStats('2026-01-01', '2026-01-31'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.fetchTransactionStats).toHaveBeenCalledWith('2026-01-01', '2026-01-31');
  });
});

describe('useUpdateTransaction', () => {
  it('calls updateTransaction on mutate', async () => {
    mockApi.updateTransaction.mockResolvedValue({ id: 't1', categoryId: 'c1' });
    const { result } = renderHook(() => useUpdateTransaction(), { wrapper });
    result.current.mutate({ id: 't1', categoryId: 'c1' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.updateTransaction).toHaveBeenCalledWith('t1', { categoryId: 'c1' });
  });
});

describe('useBulkCategorise', () => {
  it('calls bulkCategorise on mutate', async () => {
    mockApi.bulkCategorise.mockResolvedValue({ updated: 3, categoryId: 'c1' });
    const { result } = renderHook(() => useBulkCategorise(), { wrapper });
    result.current.mutate({ transactionIds: ['t1', 't2'], categoryId: 'c1' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.bulkCategorise).toHaveBeenCalledWith(['t1', 't2'], 'c1');
  });
});

describe('useAutoCategorise', () => {
  it('calls triggerAutoCategorise on mutate', async () => {
    mockApi.triggerAutoCategorise.mockResolvedValue({ categorised: 10, total: 20 });
    const { result } = renderHook(() => useAutoCategorise(), { wrapper });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.triggerAutoCategorise).toHaveBeenCalled();
  });
});

describe('useAiCategorise', () => {
  it('calls triggerAiCategorise on mutate', async () => {
    mockApi.triggerAiCategorise.mockResolvedValue({ status: 'ok', count: 5 });
    const { result } = renderHook(() => useAiCategorise(), { wrapper });
    result.current.mutate(['t1', 't2']);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.triggerAiCategorise).toHaveBeenCalledWith(['t1', 't2']);
  });
});

// --- Category hooks ---

describe('useCategories', () => {
  it('fetches categories', async () => {
    const data = [{ id: 'c1', name: 'Food' }];
    mockApi.fetchCategories.mockResolvedValue(data);
    const { result } = renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });
});

describe('useCreateCategory', () => {
  it('calls createCategory on mutate', async () => {
    mockApi.createCategory.mockResolvedValue({ id: 'c2', name: 'Travel' });
    const { result } = renderHook(() => useCreateCategory(), { wrapper });
    result.current.mutate({ name: 'Travel', color: '#00ff00', icon: 'plane' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.createCategory).toHaveBeenCalledWith({ name: 'Travel', color: '#00ff00', icon: 'plane' });
  });
});

describe('useUpdateCategory', () => {
  it('calls updateCategory on mutate', async () => {
    mockApi.updateCategory.mockResolvedValue({ id: 'c1', name: 'Updated' });
    const { result } = renderHook(() => useUpdateCategory(), { wrapper });
    result.current.mutate({ id: 'c1', data: { name: 'Updated' } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.updateCategory).toHaveBeenCalledWith('c1', { name: 'Updated' });
  });
});

describe('useDeleteCategory', () => {
  it('calls deleteCategory on mutate', async () => {
    mockApi.deleteCategory.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteCategory(), { wrapper });
    result.current.mutate('c1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.deleteCategory).toHaveBeenCalledWith('c1');
  });
});

describe('useCategoryRules', () => {
  it('fetches category rules', async () => {
    const data = [{ id: 'r1', pattern: 'grocery' }];
    mockApi.fetchCategoryRules.mockResolvedValue(data);
    const { result } = renderHook(() => useCategoryRules('c1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.fetchCategoryRules).toHaveBeenCalledWith('c1');
  });

  it('does not fetch when categoryId is null', async () => {
    const { result } = renderHook(() => useCategoryRules(null), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockApi.fetchCategoryRules).not.toHaveBeenCalled();
  });
});

describe('useCreateCategoryRule', () => {
  it('calls createCategoryRule on mutate', async () => {
    mockApi.createCategoryRule.mockResolvedValue({ id: 'r2', pattern: 'grocery' });
    const { result } = renderHook(() => useCreateCategoryRule(), { wrapper });
    result.current.mutate({ categoryId: 'c1', pattern: 'grocery' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.createCategoryRule).toHaveBeenCalledWith({ categoryId: 'c1', pattern: 'grocery' });
  });
});

describe('useDeleteCategoryRule', () => {
  it('calls deleteCategoryRule on mutate', async () => {
    mockApi.deleteCategoryRule.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteCategoryRule(), { wrapper });
    result.current.mutate('r1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.deleteCategoryRule).toHaveBeenCalledWith('r1');
  });
});
