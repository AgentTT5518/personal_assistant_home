import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useAppSettings, useCurrency, useUpdateAppSetting } from '../hooks.js';

// Mock the api module
vi.mock('../api.js', () => ({
  fetchAppSettings: vi.fn(),
  updateAppSetting: vi.fn(),
  deleteAllData: vi.fn(),
  reSeedCategories: vi.fn(),
  runAutoCategorise: vi.fn(),
}));

import { fetchAppSettings, updateAppSetting } from '../api.js';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useAppSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns fetched settings', async () => {
    vi.mocked(fetchAppSettings).mockResolvedValue({ currency: 'USD', locale: 'en-US' });

    const { result } = renderHook(() => useAppSettings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ currency: 'USD', locale: 'en-US' });
  });
});

describe('useCurrency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns AUD as default when no settings loaded', () => {
    vi.mocked(fetchAppSettings).mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useCurrency(), { wrapper: createWrapper() });
    expect(result.current).toBe('AUD');
  });

  it('returns fetched currency', async () => {
    vi.mocked(fetchAppSettings).mockResolvedValue({ currency: 'EUR' });

    const { result } = renderHook(() => useCurrency(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current).toBe('EUR'));
  });
});

describe('useUpdateAppSetting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls updateAppSetting with key and value', async () => {
    vi.mocked(updateAppSetting).mockResolvedValue({ key: 'currency', value: 'GBP' });
    vi.mocked(fetchAppSettings).mockResolvedValue({ currency: 'AUD' });

    const { result } = renderHook(() => useUpdateAppSetting(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ key: 'currency', value: 'GBP' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateAppSetting).toHaveBeenCalledWith('currency', 'GBP');
  });

  it('invalidates app-settings query on success', async () => {
    vi.mocked(updateAppSetting).mockResolvedValue({ key: 'currency', value: 'GBP' });
    // First call returns AUD, second (after invalidation) returns GBP
    vi.mocked(fetchAppSettings)
      .mockResolvedValueOnce({ currency: 'AUD' })
      .mockResolvedValueOnce({ currency: 'GBP' });

    const wrapper = createWrapper();
    const { result: settingsResult } = renderHook(() => useAppSettings(), { wrapper });
    await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
    expect(settingsResult.current.data?.currency).toBe('AUD');

    const { result: mutationResult } = renderHook(() => useUpdateAppSetting(), { wrapper });
    act(() => {
      mutationResult.current.mutate({ key: 'currency', value: 'GBP' });
    });

    await waitFor(() => expect(mutationResult.current.isSuccess).toBe(true));
    // After invalidation, fetchAppSettings should be called again
    await waitFor(() => expect(fetchAppSettings).toHaveBeenCalledTimes(2));
  });
});
