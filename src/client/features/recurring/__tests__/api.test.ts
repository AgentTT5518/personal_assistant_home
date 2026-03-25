import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../logger.js', () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { fetchRecurringSummary, detectRecurring } from '../api.js';

function okResponse(data: unknown) {
  return { ok: true, json: () => Promise.resolve(data) } as Response;
}

function errorResponse(status: number, message: string) {
  return {
    ok: false,
    status,
    statusText: 'Error',
    json: () => Promise.resolve({ error: { message } }),
  } as unknown as Response;
}

function errorResponseNoBody(status: number) {
  return {
    ok: false,
    status,
    statusText: 'Internal Server Error',
    json: () => Promise.reject(new Error('no json')),
  } as unknown as Response;
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('fetchRecurringSummary', () => {
  it('fetches recurring summary', async () => {
    const data = [{ name: 'Netflix', amount: 15 }];
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchRecurringSummary();
    expect(mockFetch).toHaveBeenCalledWith('/api/transactions/recurring-summary');
    expect(result).toEqual(data);
  });

  it('throws on error response with message', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, 'Server error'));
    await expect(fetchRecurringSummary()).rejects.toThrow('Server error');
  });

  it('throws on error response without json body', async () => {
    mockFetch.mockResolvedValue(errorResponseNoBody(500));
    await expect(fetchRecurringSummary()).rejects.toThrow('Internal Server Error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchRecurringSummary()).rejects.toThrow('Network failure');
  });
});

describe('detectRecurring', () => {
  it('sends POST to detect recurring transactions', async () => {
    const data = { groups: [{ name: 'Netflix' }], groupCount: 1 };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await detectRecurring();
    expect(mockFetch).toHaveBeenCalledWith('/api/transactions/detect-recurring', { method: 'POST' });
    expect(result).toEqual(data);
  });

  it('throws on error response with message', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Detection failed'));
    await expect(detectRecurring()).rejects.toThrow('Detection failed');
  });

  it('throws on error response without json body', async () => {
    mockFetch.mockResolvedValue(errorResponseNoBody(500));
    await expect(detectRecurring()).rejects.toThrow('Internal Server Error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(detectRecurring()).rejects.toThrow('Network failure');
  });
});
