import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';

const mockApi = vi.hoisted(() => ({
  fetchReports: vi.fn(),
  fetchReport: vi.fn(),
  generateReport: vi.fn(),
  deleteReport: vi.fn(),
  downloadReportPdf: vi.fn(),
}));

vi.mock('../api.js', () => mockApi);

import {
  useReports,
  useReport,
  useGenerateReport,
  useDeleteReport,
} from '../hooks.js';

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.clearAllMocks();
});

describe('useReports', () => {
  it('fetches reports', async () => {
    const data = [{ id: '1', title: 'Monthly' }];
    mockApi.fetchReports.mockResolvedValue(data);
    const { result } = renderHook(() => useReports(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });
});

describe('useReport', () => {
  it('fetches a single report', async () => {
    const data = { id: '1', title: 'Monthly' };
    mockApi.fetchReport.mockResolvedValue(data);
    const { result } = renderHook(() => useReport('1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.fetchReport).toHaveBeenCalledWith('1');
  });

  it('does not fetch when id is null', async () => {
    const { result } = renderHook(() => useReport(null), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockApi.fetchReport).not.toHaveBeenCalled();
  });
});

describe('useGenerateReport', () => {
  it('calls generateReport on mutate', async () => {
    const data = { id: '2', title: 'Generated' };
    mockApi.generateReport.mockResolvedValue(data);
    const { result } = renderHook(() => useGenerateReport(), { wrapper });
    result.current.mutate({ periodFrom: '2026-01-01', periodTo: '2026-01-31', reportType: 'spending_breakdown' as any });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.generateReport).toHaveBeenCalled();
  });
});

describe('useDeleteReport', () => {
  it('calls deleteReport on mutate', async () => {
    mockApi.deleteReport.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteReport(), { wrapper });
    result.current.mutate('1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.deleteReport.mock.calls[0][0]).toBe('1');
  });
});
