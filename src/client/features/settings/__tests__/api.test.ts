import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../logger.js', () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import {
  fetchAppSettings,
  updateAppSetting,
  deleteAllData,
  reSeedCategories,
  fetchDbStats,
  runAutoCategorise,
} from '../api.js';

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

describe('fetchAppSettings', () => {
  it('fetches app settings', async () => {
    const data = { currency: 'AUD', locale: 'en-AU' };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchAppSettings();
    expect(mockFetch).toHaveBeenCalledWith('/api/settings/app');
    expect(result).toEqual(data);
  });

  it('throws on error response with message', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, 'Server error'));
    await expect(fetchAppSettings()).rejects.toThrow('Server error');
  });

  it('throws on error response without json body', async () => {
    mockFetch.mockResolvedValue(errorResponseNoBody(500));
    await expect(fetchAppSettings()).rejects.toThrow('Internal Server Error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchAppSettings()).rejects.toThrow('Network failure');
  });
});

describe('updateAppSetting', () => {
  it('updates an app setting', async () => {
    const data = { key: 'currency', value: 'USD' };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await updateAppSetting('currency', 'USD');
    expect(mockFetch).toHaveBeenCalledWith('/api/settings/app/currency', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'USD' }),
    });
    expect(result).toEqual(data);
  });

  it('encodes the key', async () => {
    mockFetch.mockResolvedValue(okResponse({ key: 'a/b', value: 'v' }));
    await updateAppSetting('a/b', 'v');
    expect(mockFetch).toHaveBeenCalledWith('/api/settings/app/a%2Fb', expect.any(Object));
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Invalid key'));
    await expect(updateAppSetting('bad', 'val')).rejects.toThrow('Invalid key');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(updateAppSetting('currency', 'USD')).rejects.toThrow('Network failure');
  });
});

describe('deleteAllData', () => {
  it('sends DELETE with confirm body', async () => {
    const data = { deletedTransactions: 10, deletedAccountSummaries: 2, deletedDocuments: 3 };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await deleteAllData();
    expect(mockFetch).toHaveBeenCalledWith('/api/data/all', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, 'Delete failed'));
    await expect(deleteAllData()).rejects.toThrow('Delete failed');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(deleteAllData()).rejects.toThrow('Network failure');
  });
});

describe('reSeedCategories', () => {
  it('sends POST with confirm body', async () => {
    const data = { message: 'Seeded', categoriesSeeded: 15 };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await reSeedCategories();
    expect(mockFetch).toHaveBeenCalledWith('/api/categories/re-seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, 'Seed failed'));
    await expect(reSeedCategories()).rejects.toThrow('Seed failed');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(reSeedCategories()).rejects.toThrow('Network failure');
  });
});

describe('fetchDbStats', () => {
  it('fetches DB stats', async () => {
    const data = {
      documentCount: 5,
      transactionCount: 100,
      categoryCount: 15,
      dbSizeBytes: 1024000,
      appVersion: '1.0.0',
    };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchDbStats();
    expect(mockFetch).toHaveBeenCalledWith('/api/settings/stats');
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, 'Stats error'));
    await expect(fetchDbStats()).rejects.toThrow('Stats error');
  });

  it('throws on error response without json body', async () => {
    mockFetch.mockResolvedValue(errorResponseNoBody(500));
    await expect(fetchDbStats()).rejects.toThrow('Internal Server Error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchDbStats()).rejects.toThrow('Network failure');
  });
});

describe('runAutoCategorise', () => {
  it('sends POST to auto-categorise', async () => {
    const data = { categorised: 10, total: 50 };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await runAutoCategorise();
    expect(mockFetch).toHaveBeenCalledWith('/api/transactions/auto-categorise', { method: 'POST' });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, 'Categorise failed'));
    await expect(runAutoCategorise()).rejects.toThrow('Categorise failed');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(runAutoCategorise()).rejects.toThrow('Network failure');
  });
});
