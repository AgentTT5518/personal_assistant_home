import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';

const mockApi = vi.hoisted(() => ({
  fetchTags: vi.fn(),
  createTag: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
  addTagsToTransaction: vi.fn(),
  removeTagFromTransaction: vi.fn(),
  bulkTag: vi.fn(),
  fetchSplits: vi.fn(),
  createSplits: vi.fn(),
  deleteSplits: vi.fn(),
}));

vi.mock('../api.js', () => mockApi);

import {
  useTags,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
  useAddTagsToTransaction,
  useRemoveTagFromTransaction,
  useBulkTag,
  useSplits,
  useCreateSplits,
  useDeleteSplits,
} from '../hooks.js';

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.clearAllMocks();
});

// --- Tags ---

describe('useTags', () => {
  it('fetches tags', async () => {
    const data = [{ id: '1', name: 'Food' }];
    mockApi.fetchTags.mockResolvedValue(data);
    const { result } = renderHook(() => useTags(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });
});

describe('useCreateTag', () => {
  it('calls createTag on mutate', async () => {
    mockApi.createTag.mockResolvedValue({ id: '2', name: 'Travel' });
    const { result } = renderHook(() => useCreateTag(), { wrapper });
    result.current.mutate({ name: 'Travel', color: '#ff0000' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.createTag.mock.calls[0][0]).toEqual({ name: 'Travel', color: '#ff0000' });
  });
});

describe('useUpdateTag', () => {
  it('calls updateTag on mutate', async () => {
    mockApi.updateTag.mockResolvedValue({ id: '1', name: 'Updated' });
    const { result } = renderHook(() => useUpdateTag(), { wrapper });
    result.current.mutate({ id: '1', data: { name: 'Updated' } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.updateTag).toHaveBeenCalledWith('1', { name: 'Updated' });
  });
});

describe('useDeleteTag', () => {
  it('calls deleteTag on mutate', async () => {
    mockApi.deleteTag.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteTag(), { wrapper });
    result.current.mutate('1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.deleteTag.mock.calls[0][0]).toBe('1');
  });
});

// --- Transaction Tags ---

describe('useAddTagsToTransaction', () => {
  it('calls addTagsToTransaction on mutate', async () => {
    mockApi.addTagsToTransaction.mockResolvedValue({ added: 2 });
    const { result } = renderHook(() => useAddTagsToTransaction(), { wrapper });
    result.current.mutate({ transactionId: 't1', tagIds: ['tag1', 'tag2'] });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.addTagsToTransaction).toHaveBeenCalledWith('t1', ['tag1', 'tag2']);
  });
});

describe('useRemoveTagFromTransaction', () => {
  it('calls removeTagFromTransaction on mutate', async () => {
    mockApi.removeTagFromTransaction.mockResolvedValue(undefined);
    const { result } = renderHook(() => useRemoveTagFromTransaction(), { wrapper });
    result.current.mutate({ transactionId: 't1', tagId: 'tag1' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.removeTagFromTransaction).toHaveBeenCalledWith('t1', 'tag1');
  });
});

describe('useBulkTag', () => {
  it('calls bulkTag on mutate', async () => {
    mockApi.bulkTag.mockResolvedValue({ added: 3, tagId: 'tag1' });
    const { result } = renderHook(() => useBulkTag(), { wrapper });
    result.current.mutate({ transactionIds: ['t1', 't2'], tagId: 'tag1' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.bulkTag).toHaveBeenCalledWith(['t1', 't2'], 'tag1');
  });
});

// --- Splits ---

describe('useSplits', () => {
  it('fetches splits', async () => {
    const data = [{ id: 's1', amount: 50 }];
    mockApi.fetchSplits.mockResolvedValue(data);
    const { result } = renderHook(() => useSplits('t1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.fetchSplits).toHaveBeenCalledWith('t1');
  });

  it('respects enabled parameter', async () => {
    const { result } = renderHook(() => useSplits('t1', false), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockApi.fetchSplits).not.toHaveBeenCalled();
  });
});

describe('useCreateSplits', () => {
  it('calls createSplits on mutate', async () => {
    const splits = [{ categoryId: 'c1', amount: 50, description: 'Half' }];
    mockApi.createSplits.mockResolvedValue(splits);
    const { result } = renderHook(() => useCreateSplits(), { wrapper });
    result.current.mutate({ transactionId: 't1', splits });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.createSplits).toHaveBeenCalledWith('t1', splits);
  });
});

describe('useDeleteSplits', () => {
  it('calls deleteSplits on mutate', async () => {
    mockApi.deleteSplits.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteSplits(), { wrapper });
    result.current.mutate('t1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.deleteSplits.mock.calls[0][0]).toBe('t1');
  });
});
