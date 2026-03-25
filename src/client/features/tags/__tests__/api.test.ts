import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../logger.js', () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import {
  fetchTags,
  createTag,
  updateTag,
  deleteTag,
  addTagsToTransaction,
  removeTagFromTransaction,
  bulkTag,
  fetchSplits,
  createSplits,
  deleteSplits,
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

// --- Tags ---

describe('fetchTags', () => {
  it('fetches all tags', async () => {
    const data = [{ id: '1', name: 'Food' }];
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchTags();
    expect(mockFetch).toHaveBeenCalledWith('/api/tags');
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, 'Server error'));
    await expect(fetchTags()).rejects.toThrow('Server error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchTags()).rejects.toThrow('Network failure');
  });
});

describe('createTag', () => {
  it('creates a tag', async () => {
    const data = { id: '2', name: 'Travel' };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await createTag({ name: 'Travel', color: '#ff0000' });
    expect(mockFetch).toHaveBeenCalledWith('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Travel', color: '#ff0000' }),
    });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(422, 'Validation error'));
    await expect(createTag({ name: '' })).rejects.toThrow('Validation error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(createTag({ name: 'Test' })).rejects.toThrow('Network failure');
  });
});

describe('updateTag', () => {
  it('updates a tag', async () => {
    const data = { id: '1', name: 'Updated' };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await updateTag('1', { name: 'Updated' });
    expect(mockFetch).toHaveBeenCalledWith('/api/tags/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(404, 'Not found'));
    await expect(updateTag('999', {})).rejects.toThrow('Not found');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(updateTag('1', {})).rejects.toThrow('Network failure');
  });
});

describe('deleteTag', () => {
  it('deletes a tag', async () => {
    mockFetch.mockResolvedValue({ ok: true } as Response);
    await deleteTag('1');
    expect(mockFetch).toHaveBeenCalledWith('/api/tags/1', { method: 'DELETE' });
  });

  it('throws on error response with message', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Cannot delete'));
    await expect(deleteTag('1')).rejects.toThrow('Cannot delete');
  });

  it('throws on error response without json body', async () => {
    mockFetch.mockResolvedValue(errorResponseNoBody(500));
    await expect(deleteTag('1')).rejects.toThrow('Internal Server Error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(deleteTag('1')).rejects.toThrow('Network failure');
  });
});

// --- Transaction Tags ---

describe('addTagsToTransaction', () => {
  it('adds tags to a transaction', async () => {
    const data = { added: 2 };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await addTagsToTransaction('t1', ['tag1', 'tag2']);
    expect(mockFetch).toHaveBeenCalledWith('/api/transactions/t1/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagIds: ['tag1', 'tag2'] }),
    });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Invalid tags'));
    await expect(addTagsToTransaction('t1', [])).rejects.toThrow('Invalid tags');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(addTagsToTransaction('t1', ['tag1'])).rejects.toThrow('Network failure');
  });
});

describe('removeTagFromTransaction', () => {
  it('removes a tag from a transaction', async () => {
    mockFetch.mockResolvedValue({ ok: true } as Response);
    await removeTagFromTransaction('t1', 'tag1');
    expect(mockFetch).toHaveBeenCalledWith('/api/transactions/t1/tags/tag1', { method: 'DELETE' });
  });

  it('throws on error response with message', async () => {
    mockFetch.mockResolvedValue(errorResponse(404, 'Not found'));
    await expect(removeTagFromTransaction('t1', 'tag1')).rejects.toThrow('Not found');
  });

  it('throws on error response without json body', async () => {
    mockFetch.mockResolvedValue(errorResponseNoBody(500));
    await expect(removeTagFromTransaction('t1', 'tag1')).rejects.toThrow('Internal Server Error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(removeTagFromTransaction('t1', 'tag1')).rejects.toThrow('Network failure');
  });
});

describe('bulkTag', () => {
  it('bulk tags transactions', async () => {
    const data = { added: 3, tagId: 'tag1' };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await bulkTag(['t1', 't2', 't3'], 'tag1');
    expect(mockFetch).toHaveBeenCalledWith('/api/transactions/bulk-tag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionIds: ['t1', 't2', 't3'], tagId: 'tag1' }),
    });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Invalid request'));
    await expect(bulkTag([], 'tag1')).rejects.toThrow('Invalid request');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(bulkTag(['t1'], 'tag1')).rejects.toThrow('Network failure');
  });
});

// --- Splits ---

describe('fetchSplits', () => {
  it('fetches splits for a transaction', async () => {
    const data = [{ id: 's1', amount: 50 }];
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchSplits('t1');
    expect(mockFetch).toHaveBeenCalledWith('/api/transactions/t1/splits');
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(404, 'Not found'));
    await expect(fetchSplits('t1')).rejects.toThrow('Not found');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchSplits('t1')).rejects.toThrow('Network failure');
  });
});

describe('createSplits', () => {
  const splits = [{ categoryId: 'c1', amount: 50, description: 'Half' }];

  it('creates splits', async () => {
    const data = [{ id: 's1', ...splits[0] }];
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await createSplits('t1', splits);
    expect(mockFetch).toHaveBeenCalledWith('/api/transactions/t1/splits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ splits }),
    });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Invalid splits'));
    await expect(createSplits('t1', splits)).rejects.toThrow('Invalid splits');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(createSplits('t1', splits)).rejects.toThrow('Network failure');
  });
});

describe('deleteSplits', () => {
  it('deletes splits', async () => {
    mockFetch.mockResolvedValue({ ok: true } as Response);
    await deleteSplits('t1');
    expect(mockFetch).toHaveBeenCalledWith('/api/transactions/t1/splits', { method: 'DELETE' });
  });

  it('throws on error response with message', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Cannot delete'));
    await expect(deleteSplits('t1')).rejects.toThrow('Cannot delete');
  });

  it('throws on error response without json body', async () => {
    mockFetch.mockResolvedValue(errorResponseNoBody(500));
    await expect(deleteSplits('t1')).rejects.toThrow('Internal Server Error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(deleteSplits('t1')).rejects.toThrow('Network failure');
  });
});
