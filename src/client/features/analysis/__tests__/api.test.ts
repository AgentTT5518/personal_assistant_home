import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../logger.js', () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { generateAnalysis, fetchSnapshots, fetchSnapshot, deleteSnapshot } from '../api.js';

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

describe('generateAnalysis', () => {
  it('sends POST with date range', async () => {
    const data = { id: 's1', snapshotType: 'analysis', data: {}, generatedAt: '', createdAt: '', updatedAt: '' };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await generateAnalysis('2026-01-01', '2026-03-01');
    expect(mockFetch).toHaveBeenCalledWith('/api/analysis/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateFrom: '2026-01-01', dateTo: '2026-03-01' }),
    });
    expect(result).toEqual(data);
  });

  it('sends POST without date range', async () => {
    mockFetch.mockResolvedValue(okResponse({ id: 's1' }));
    await generateAnalysis();
    expect(mockFetch).toHaveBeenCalledWith('/api/analysis/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateFrom: undefined, dateTo: undefined }),
    });
  });

  it('throws on error response with message', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Insufficient data'));
    await expect(generateAnalysis()).rejects.toThrow('Insufficient data');
  });

  it('throws on error response without json body', async () => {
    mockFetch.mockResolvedValue(errorResponseNoBody(500));
    await expect(generateAnalysis()).rejects.toThrow('Internal Server Error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(generateAnalysis()).rejects.toThrow('Network failure');
  });
});

describe('fetchSnapshots', () => {
  it('fetches all snapshots', async () => {
    const data = [{ id: 's1', snapshotType: 'analysis', generatedAt: '' }];
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchSnapshots();
    expect(mockFetch).toHaveBeenCalledWith('/api/analysis/snapshots');
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, 'Server error'));
    await expect(fetchSnapshots()).rejects.toThrow('Server error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchSnapshots()).rejects.toThrow('Network failure');
  });
});

describe('fetchSnapshot', () => {
  it('fetches a single snapshot by id', async () => {
    const data = { id: 's1', snapshotType: 'analysis', data: {}, generatedAt: '' };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchSnapshot('s1');
    expect(mockFetch).toHaveBeenCalledWith('/api/analysis/snapshots/s1');
    expect(result).toEqual(data);
  });

  it('encodes the id', async () => {
    mockFetch.mockResolvedValue(okResponse({ id: 'a/b' }));
    await fetchSnapshot('a/b');
    expect(mockFetch).toHaveBeenCalledWith('/api/analysis/snapshots/a%2Fb');
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(404, 'Not found'));
    await expect(fetchSnapshot('999')).rejects.toThrow('Not found');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchSnapshot('s1')).rejects.toThrow('Network failure');
  });
});

describe('deleteSnapshot', () => {
  it('sends DELETE request', async () => {
    mockFetch.mockResolvedValue(okResponse({}));
    await deleteSnapshot('s1');
    expect(mockFetch).toHaveBeenCalledWith('/api/analysis/snapshots/s1', { method: 'DELETE' });
  });

  it('encodes the id', async () => {
    mockFetch.mockResolvedValue(okResponse({}));
    await deleteSnapshot('a/b');
    expect(mockFetch).toHaveBeenCalledWith('/api/analysis/snapshots/a%2Fb', { method: 'DELETE' });
  });

  it('throws on error response with message', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Cannot delete'));
    await expect(deleteSnapshot('s1')).rejects.toThrow('Cannot delete');
  });

  it('throws on error response without json body', async () => {
    mockFetch.mockResolvedValue(errorResponseNoBody(500));
    await expect(deleteSnapshot('s1')).rejects.toThrow('Internal Server Error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(deleteSnapshot('s1')).rejects.toThrow('Network failure');
  });
});
