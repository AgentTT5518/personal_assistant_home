import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';

const mockApi = vi.hoisted(() => ({
  fetchDocuments: vi.fn(),
  fetchDocument: vi.fn(),
  fetchDocumentTransactions: vi.fn(),
  uploadDocument: vi.fn(),
  deleteDocument: vi.fn(),
  reprocessWithVision: vi.fn(),
  fetchAiSettings: vi.fn(),
  updateAiSetting: vi.fn(),
}));

vi.mock('../api.js', () => mockApi);

import {
  useDocuments,
  useDocument,
  useDocumentTransactions,
  useUploadDocument,
  useDeleteDocument,
  useReprocessVision,
  useAiSettings,
  useUpdateAiSetting,
} from '../hooks.js';

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.clearAllMocks();
});

describe('useDocuments', () => {
  it('fetches documents', async () => {
    const data = [{ id: 'd1', processingStatus: 'completed' }];
    mockApi.fetchDocuments.mockResolvedValue(data);
    const { result } = renderHook(() => useDocuments(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
    expect(mockApi.fetchDocuments).toHaveBeenCalledWith(undefined);
  });

  it('passes filters', async () => {
    mockApi.fetchDocuments.mockResolvedValue([]);
    const { result } = renderHook(() => useDocuments({ status: 'completed' as any }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.fetchDocuments).toHaveBeenCalledWith({ status: 'completed' });
  });
});

describe('useDocument', () => {
  it('fetches a single document', async () => {
    const data = { id: 'd1', processingStatus: 'completed' };
    mockApi.fetchDocument.mockResolvedValue(data);
    const { result } = renderHook(() => useDocument('d1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.fetchDocument).toHaveBeenCalledWith('d1');
  });
});

describe('useDocumentTransactions', () => {
  it('fetches document transactions when enabled', async () => {
    const data = [{ id: 't1', amount: 100 }];
    mockApi.fetchDocumentTransactions.mockResolvedValue(data);
    const { result } = renderHook(() => useDocumentTransactions('d1', true), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.fetchDocumentTransactions).toHaveBeenCalledWith('d1');
  });

  it('does not fetch when disabled', async () => {
    const { result } = renderHook(() => useDocumentTransactions('d1', false), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockApi.fetchDocumentTransactions).not.toHaveBeenCalled();
  });
});

describe('useUploadDocument', () => {
  it('calls uploadDocument on mutate', async () => {
    mockApi.uploadDocument.mockResolvedValue({ id: 'd1', processingStatus: 'pending' });
    const { result } = renderHook(() => useUploadDocument(), { wrapper });
    const file = new File(['pdf'], 'test.pdf');
    result.current.mutate({ file, docType: 'bank_statement' as any, institution: 'Chase' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.uploadDocument).toHaveBeenCalledWith(file, 'bank_statement', 'Chase', undefined);
  });
});

describe('useDeleteDocument', () => {
  it('calls deleteDocument on mutate', async () => {
    mockApi.deleteDocument.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteDocument(), { wrapper });
    result.current.mutate('d1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.deleteDocument).toHaveBeenCalledWith('d1');
  });
});

describe('useReprocessVision', () => {
  it('calls reprocessWithVision on mutate', async () => {
    mockApi.reprocessWithVision.mockResolvedValue({ id: 'd1', processingStatus: 'processing' });
    const { result } = renderHook(() => useReprocessVision(), { wrapper });
    result.current.mutate('d1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.reprocessWithVision).toHaveBeenCalledWith('d1');
  });
});

describe('useAiSettings', () => {
  it('fetches AI settings', async () => {
    const data = [{ taskType: 'extract', provider: 'claude' }];
    mockApi.fetchAiSettings.mockResolvedValue(data);
    const { result } = renderHook(() => useAiSettings(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });
});

describe('useUpdateAiSetting', () => {
  it('calls updateAiSetting on mutate', async () => {
    mockApi.updateAiSetting.mockResolvedValue({ taskType: 'extract', provider: 'claude', model: 'opus' });
    const { result } = renderHook(() => useUpdateAiSetting(), { wrapper });
    result.current.mutate({ taskType: 'extract', data: { provider: 'claude', model: 'opus' } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.updateAiSetting).toHaveBeenCalledWith('extract', { provider: 'claude', model: 'opus' });
  });
});
