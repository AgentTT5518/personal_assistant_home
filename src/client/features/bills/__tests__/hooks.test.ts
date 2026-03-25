import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';

const mockApi = vi.hoisted(() => ({
  fetchBills: vi.fn(),
  fetchBill: vi.fn(),
  fetchBillsCalendar: vi.fn(),
  createBill: vi.fn(),
  updateBill: vi.fn(),
  deleteBill: vi.fn(),
  markBillPaid: vi.fn(),
  populateFromRecurring: vi.fn(),
}));

vi.mock('../api.js', () => mockApi);

import {
  useBills,
  useBill,
  useBillsCalendar,
  useUpcomingBills,
  useCreateBill,
  useUpdateBill,
  useDeleteBill,
  useMarkBillPaid,
  usePopulateFromRecurring,
} from '../hooks.js';

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.clearAllMocks();
});

describe('useBills', () => {
  it('fetches bills', async () => {
    const data = [{ id: '1', name: 'Rent' }];
    mockApi.fetchBills.mockResolvedValue(data);
    const { result } = renderHook(() => useBills(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
    expect(mockApi.fetchBills).toHaveBeenCalledWith(undefined);
  });

  it('passes params', async () => {
    mockApi.fetchBills.mockResolvedValue([]);
    const { result } = renderHook(() => useBills({ isActive: true }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.fetchBills).toHaveBeenCalledWith({ isActive: true });
  });
});

describe('useBill', () => {
  it('fetches a single bill', async () => {
    const data = { id: '1', name: 'Rent' };
    mockApi.fetchBill.mockResolvedValue(data);
    const { result } = renderHook(() => useBill('1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.fetchBill).toHaveBeenCalledWith('1');
  });
});

describe('useBillsCalendar', () => {
  it('fetches bills calendar', async () => {
    const data = [{ date: '2026-03-01', bills: [] }];
    mockApi.fetchBillsCalendar.mockResolvedValue(data);
    const { result } = renderHook(() => useBillsCalendar('2026-03-01', '2026-03-31'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.fetchBillsCalendar).toHaveBeenCalledWith('2026-03-01', '2026-03-31');
  });
});

describe('useUpcomingBills', () => {
  it('fetches upcoming active bills', async () => {
    mockApi.fetchBills.mockResolvedValue([]);
    const { result } = renderHook(() => useUpcomingBills(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.fetchBills).toHaveBeenCalledWith({ isActive: true, upcoming: 7 });
  });
});

describe('useCreateBill', () => {
  it('calls createBill on mutate', async () => {
    const created = { id: '2', name: 'Electric' };
    mockApi.createBill.mockResolvedValue(created);
    const { result } = renderHook(() => useCreateBill(), { wrapper });
    result.current.mutate({ name: 'Electric', expectedAmount: 100, frequency: 'monthly', nextDueDate: '2026-04-01' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.createBill).toHaveBeenCalled();
  });
});

describe('useUpdateBill', () => {
  it('calls updateBill on mutate', async () => {
    mockApi.updateBill.mockResolvedValue({ id: '1', name: 'Updated' });
    const { result } = renderHook(() => useUpdateBill(), { wrapper });
    result.current.mutate({ id: '1', name: 'Updated' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.updateBill).toHaveBeenCalledWith('1', { name: 'Updated' });
  });
});

describe('useDeleteBill', () => {
  it('calls deleteBill on mutate', async () => {
    mockApi.deleteBill.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteBill(), { wrapper });
    result.current.mutate('1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.deleteBill.mock.calls[0][0]).toBe('1');
  });
});

describe('useMarkBillPaid', () => {
  it('calls markBillPaid on mutate', async () => {
    mockApi.markBillPaid.mockResolvedValue({ id: '1', isPaid: true });
    const { result } = renderHook(() => useMarkBillPaid(), { wrapper });
    result.current.mutate('1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.markBillPaid.mock.calls[0][0]).toBe('1');
  });
});

describe('usePopulateFromRecurring', () => {
  it('calls populateFromRecurring on mutate', async () => {
    mockApi.populateFromRecurring.mockResolvedValue({ created: 2, skipped: 0, bills: [] });
    const { result } = renderHook(() => usePopulateFromRecurring(), { wrapper });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.populateFromRecurring).toHaveBeenCalled();
  });
});
