import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../logger.js', () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import {
  uploadImportFile,
  saveColumnMapping,
  confirmImport,
  undoImport,
  fetchImportSessions,
  deleteImportSession,
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

describe('uploadImportFile', () => {
  it('uploads a file without accountId', async () => {
    const data = { sessionId: 's1', preview: [] };
    mockFetch.mockResolvedValue(okResponse(data));
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    const result = await uploadImportFile(file);
    expect(mockFetch).toHaveBeenCalledWith('/api/import/upload', {
      method: 'POST',
      body: expect.any(FormData),
    });
    const formData = mockFetch.mock.calls[0][1].body as FormData;
    expect(formData.get('file')).toBe(file);
    expect(formData.get('accountId')).toBeNull();
    expect(result).toEqual(data);
  });

  it('uploads a file with accountId', async () => {
    mockFetch.mockResolvedValue(okResponse({ sessionId: 's1' }));
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    await uploadImportFile(file, 'acc-1');
    const formData = mockFetch.mock.calls[0][1].body as FormData;
    expect(formData.get('accountId')).toBe('acc-1');
  });

  it('throws on error response', async () => {
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    mockFetch.mockResolvedValue(errorResponse(400, 'Invalid file'));
    await expect(uploadImportFile(file)).rejects.toThrow('Invalid file');
  });

  it('throws on network error', async () => {
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(uploadImportFile(file)).rejects.toThrow('Network failure');
  });
});

describe('saveColumnMapping', () => {
  const mapping = { date: 0, amount: 1, description: 2 };

  it('saves column mapping', async () => {
    const data = { sessionId: 's1', preview: [] };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await saveColumnMapping('s1', mapping as any);
    expect(mockFetch).toHaveBeenCalledWith('/api/import/s1/mapping', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapping),
    });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Invalid mapping'));
    await expect(saveColumnMapping('s1', mapping as any)).rejects.toThrow('Invalid mapping');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(saveColumnMapping('s1', mapping as any)).rejects.toThrow('Network failure');
  });
});

describe('confirmImport', () => {
  it('confirms import with selected rows', async () => {
    const data = { session: { id: 's1' }, importedCount: 10 };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await confirmImport('s1', [0, 1, 2]);
    expect(mockFetch).toHaveBeenCalledWith('/api/import/s1/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedRows: [0, 1, 2] }),
    });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Confirm error'));
    await expect(confirmImport('s1', [])).rejects.toThrow('Confirm error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(confirmImport('s1', [])).rejects.toThrow('Network failure');
  });
});

describe('undoImport', () => {
  it('undoes an import', async () => {
    const data = { undoneCount: 5 };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await undoImport('s1');
    expect(mockFetch).toHaveBeenCalledWith('/api/import/s1/undo', { method: 'DELETE' });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(404, 'Session not found'));
    await expect(undoImport('s1')).rejects.toThrow('Session not found');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(undoImport('s1')).rejects.toThrow('Network failure');
  });
});

describe('fetchImportSessions', () => {
  it('fetches import sessions', async () => {
    const data = [{ id: 's1', status: 'completed' }];
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchImportSessions();
    expect(mockFetch).toHaveBeenCalledWith('/api/import/sessions');
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, 'Server error'));
    await expect(fetchImportSessions()).rejects.toThrow('Server error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchImportSessions()).rejects.toThrow('Network failure');
  });
});

describe('deleteImportSession', () => {
  it('deletes an import session', async () => {
    mockFetch.mockResolvedValue({ ok: true } as Response);
    await deleteImportSession('s1');
    expect(mockFetch).toHaveBeenCalledWith('/api/import/s1', { method: 'DELETE' });
  });

  it('throws on error response with message', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Cannot delete'));
    await expect(deleteImportSession('s1')).rejects.toThrow('Cannot delete');
  });

  it('throws on error response without json body', async () => {
    mockFetch.mockResolvedValue(errorResponseNoBody(500));
    await expect(deleteImportSession('s1')).rejects.toThrow('Internal Server Error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(deleteImportSession('s1')).rejects.toThrow('Network failure');
  });
});
