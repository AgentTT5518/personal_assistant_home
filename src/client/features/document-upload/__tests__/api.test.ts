import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import {
  uploadDocument,
  fetchDocuments,
  fetchDocument,
  fetchDocumentTransactions,
  reprocessWithVision,
  deleteDocument,
  fetchAiSettings,
  updateAiSetting,
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

describe('uploadDocument', () => {
  it('uploads a document without optional params', async () => {
    const data = { id: 'd1', processingStatus: 'pending' };
    mockFetch.mockResolvedValue(okResponse(data));
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' });
    const result = await uploadDocument(file, 'bank_statement' as any);
    expect(mockFetch).toHaveBeenCalledWith('/api/documents/upload', {
      method: 'POST',
      body: expect.any(FormData),
    });
    const formData = mockFetch.mock.calls[0][1].body as FormData;
    expect(formData.get('file')).toBe(file);
    expect(formData.get('docType')).toBe('bank_statement');
    expect(formData.get('institution')).toBeNull();
    expect(formData.get('period')).toBeNull();
    expect(result).toEqual(data);
  });

  it('uploads a document with institution and period', async () => {
    mockFetch.mockResolvedValue(okResponse({ id: 'd1', processingStatus: 'pending' }));
    const file = new File(['pdf'], 'test.pdf');
    await uploadDocument(file, 'bank_statement' as any, 'Chase', '2026-01');
    const formData = mockFetch.mock.calls[0][1].body as FormData;
    expect(formData.get('institution')).toBe('Chase');
    expect(formData.get('period')).toBe('2026-01');
  });

  it('throws on error response', async () => {
    const file = new File(['pdf'], 'test.pdf');
    mockFetch.mockResolvedValue(errorResponse(400, 'Invalid file'));
    await expect(uploadDocument(file, 'bank_statement' as any)).rejects.toThrow('Invalid file');
  });

  it('throws on network error', async () => {
    const file = new File(['pdf'], 'test.pdf');
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(uploadDocument(file, 'bank_statement' as any)).rejects.toThrow('Network failure');
  });
});

describe('fetchDocuments', () => {
  it('fetches all documents without filters', async () => {
    const data = [{ id: 'd1' }];
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchDocuments();
    expect(mockFetch).toHaveBeenCalledWith('/api/documents');
    expect(result).toEqual(data);
  });

  it('fetches documents with status filter', async () => {
    mockFetch.mockResolvedValue(okResponse([]));
    await fetchDocuments({ status: 'completed' as any });
    expect(mockFetch).toHaveBeenCalledWith('/api/documents?status=completed');
  });

  it('fetches documents with docType filter', async () => {
    mockFetch.mockResolvedValue(okResponse([]));
    await fetchDocuments({ docType: 'bank_statement' as any });
    expect(mockFetch).toHaveBeenCalledWith('/api/documents?docType=bank_statement');
  });

  it('fetches documents with both filters', async () => {
    mockFetch.mockResolvedValue(okResponse([]));
    await fetchDocuments({ status: 'completed' as any, docType: 'bank_statement' as any });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('status=completed');
    expect(url).toContain('docType=bank_statement');
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, 'Server error'));
    await expect(fetchDocuments()).rejects.toThrow('Server error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchDocuments()).rejects.toThrow('Network failure');
  });
});

describe('fetchDocument', () => {
  it('fetches a single document', async () => {
    const data = { id: 'd1', name: 'Statement' };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchDocument('d1');
    expect(mockFetch).toHaveBeenCalledWith('/api/documents/d1');
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(404, 'Not found'));
    await expect(fetchDocument('d999')).rejects.toThrow('Not found');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchDocument('d1')).rejects.toThrow('Network failure');
  });
});

describe('fetchDocumentTransactions', () => {
  it('fetches document transactions', async () => {
    const data = [{ id: 't1', amount: 100 }];
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchDocumentTransactions('d1');
    expect(mockFetch).toHaveBeenCalledWith('/api/documents/d1/transactions');
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(404, 'Not found'));
    await expect(fetchDocumentTransactions('d999')).rejects.toThrow('Not found');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchDocumentTransactions('d1')).rejects.toThrow('Network failure');
  });
});

describe('reprocessWithVision', () => {
  it('reprocesses with vision', async () => {
    const data = { id: 'd1', processingStatus: 'processing' };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await reprocessWithVision('d1');
    expect(mockFetch).toHaveBeenCalledWith('/api/documents/d1/reprocess-vision', { method: 'POST' });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Cannot reprocess'));
    await expect(reprocessWithVision('d1')).rejects.toThrow('Cannot reprocess');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(reprocessWithVision('d1')).rejects.toThrow('Network failure');
  });
});

describe('deleteDocument', () => {
  it('deletes a document', async () => {
    mockFetch.mockResolvedValue({ ok: true } as Response);
    await deleteDocument('d1');
    expect(mockFetch).toHaveBeenCalledWith('/api/documents/d1', { method: 'DELETE' });
  });

  it('throws on error response with message', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Cannot delete'));
    await expect(deleteDocument('d1')).rejects.toThrow('Cannot delete');
  });

  it('throws on error response without json body', async () => {
    mockFetch.mockResolvedValue(errorResponseNoBody(500));
    await expect(deleteDocument('d1')).rejects.toThrow('Internal Server Error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(deleteDocument('d1')).rejects.toThrow('Network failure');
  });
});

describe('fetchAiSettings', () => {
  it('fetches AI settings', async () => {
    const data = [{ taskType: 'extract', provider: 'claude' }];
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchAiSettings();
    expect(mockFetch).toHaveBeenCalledWith('/api/ai-settings');
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, 'Server error'));
    await expect(fetchAiSettings()).rejects.toThrow('Server error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchAiSettings()).rejects.toThrow('Network failure');
  });
});

describe('updateAiSetting', () => {
  const payload = { provider: 'claude', model: 'opus' };

  it('updates an AI setting', async () => {
    const data = { taskType: 'extract', ...payload };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await updateAiSetting('extract', payload);
    expect(mockFetch).toHaveBeenCalledWith('/api/ai-settings/extract', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Invalid setting'));
    await expect(updateAiSetting('extract', payload)).rejects.toThrow('Invalid setting');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(updateAiSetting('extract', payload)).rejects.toThrow('Network failure');
  });
});
