import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';

const mockApi = vi.hoisted(() => ({
  uploadImportFile: vi.fn(),
  saveColumnMapping: vi.fn(),
  confirmImport: vi.fn(),
  undoImport: vi.fn(),
  fetchImportSessions: vi.fn(),
  deleteImportSession: vi.fn(),
}));

vi.mock('../api.js', () => mockApi);

import {
  useImportSessions,
  useUploadImport,
  useSaveColumnMapping,
  useConfirmImport,
  useUndoImport,
  useDeleteImportSession,
} from '../hooks.js';

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.clearAllMocks();
});

describe('useImportSessions', () => {
  it('fetches import sessions', async () => {
    const data = [{ id: 's1', status: 'completed' }];
    mockApi.fetchImportSessions.mockResolvedValue(data);
    const { result } = renderHook(() => useImportSessions(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });
});

describe('useUploadImport', () => {
  it('calls uploadImportFile on mutate', async () => {
    mockApi.uploadImportFile.mockResolvedValue({ sessionId: 's1' });
    const { result } = renderHook(() => useUploadImport(), { wrapper });
    const file = new File(['test'], 'test.csv');
    result.current.mutate({ file, accountId: 'acc-1' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.uploadImportFile).toHaveBeenCalledWith(file, 'acc-1');
  });
});

describe('useSaveColumnMapping', () => {
  it('calls saveColumnMapping on mutate', async () => {
    mockApi.saveColumnMapping.mockResolvedValue({ sessionId: 's1' });
    const { result } = renderHook(() => useSaveColumnMapping(), { wrapper });
    const mapping = { date: 0, amount: 1 } as any;
    result.current.mutate({ sessionId: 's1', mapping });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.saveColumnMapping).toHaveBeenCalledWith('s1', mapping);
  });
});

describe('useConfirmImport', () => {
  it('calls confirmImport on mutate', async () => {
    mockApi.confirmImport.mockResolvedValue({ session: { id: 's1' }, importedCount: 5 });
    const { result } = renderHook(() => useConfirmImport(), { wrapper });
    result.current.mutate({ sessionId: 's1', selectedRows: [0, 1, 2] });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.confirmImport).toHaveBeenCalledWith('s1', [0, 1, 2]);
  });
});

describe('useUndoImport', () => {
  it('calls undoImport on mutate', async () => {
    mockApi.undoImport.mockResolvedValue({ undoneCount: 3 });
    const { result } = renderHook(() => useUndoImport(), { wrapper });
    result.current.mutate('s1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.undoImport.mock.calls[0][0]).toBe('s1');
  });
});

describe('useDeleteImportSession', () => {
  it('calls deleteImportSession on mutate', async () => {
    mockApi.deleteImportSession.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteImportSession(), { wrapper });
    result.current.mutate('s1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.deleteImportSession.mock.calls[0][0]).toBe('s1');
  });
});
