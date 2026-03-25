import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import {
  fetchTransactions,
  fetchTransactionStats,
  updateTransaction,
  bulkCategorise,
  triggerAutoCategorise,
  triggerAiCategorise,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchCategoryRules,
  createCategoryRule,
  deleteCategoryRule,
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

// --- Transactions ---

describe('fetchTransactions', () => {
  it('fetches transactions with filters', async () => {
    const data = { data: [], total: 0, page: 1, pageSize: 50 };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchTransactions({ page: 1, pageSize: 50 });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/api/transactions');
    expect(url).toContain('page=1');
    expect(url).toContain('pageSize=50');
    expect(result).toEqual(data);
  });

  it('skips undefined/null/empty filter values', async () => {
    mockFetch.mockResolvedValue(okResponse({ data: [], total: 0 }));
    await fetchTransactions({ page: 1, search: undefined } as any);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).not.toContain('search');
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, 'Server error'));
    await expect(fetchTransactions({ page: 1 } as any)).rejects.toThrow('Server error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchTransactions({ page: 1 } as any)).rejects.toThrow('Network failure');
  });
});

describe('fetchTransactionStats', () => {
  it('fetches stats without date params', async () => {
    const data = { totalIncome: 5000, totalExpenses: 3000 };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchTransactionStats();
    expect(mockFetch).toHaveBeenCalledWith('/api/transactions/stats');
    expect(result).toEqual(data);
  });

  it('fetches stats with date range', async () => {
    mockFetch.mockResolvedValue(okResponse({}));
    await fetchTransactionStats('2026-01-01', '2026-01-31');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('dateFrom=2026-01-01');
    expect(url).toContain('dateTo=2026-01-31');
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, 'Server error'));
    await expect(fetchTransactionStats()).rejects.toThrow('Server error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchTransactionStats()).rejects.toThrow('Network failure');
  });
});

describe('updateTransaction', () => {
  it('updates a transaction', async () => {
    const data = { id: 't1', categoryId: 'c1' };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await updateTransaction('t1', { categoryId: 'c1' });
    expect(mockFetch).toHaveBeenCalledWith('/api/transactions/t1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: 'c1' }),
    });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(404, 'Not found'));
    await expect(updateTransaction('t1', { categoryId: null })).rejects.toThrow('Not found');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(updateTransaction('t1', { categoryId: null })).rejects.toThrow('Network failure');
  });
});

describe('bulkCategorise', () => {
  it('bulk categorises transactions', async () => {
    const data = { updated: 3, categoryId: 'c1' };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await bulkCategorise(['t1', 't2', 't3'], 'c1');
    expect(mockFetch).toHaveBeenCalledWith('/api/transactions/bulk-categorise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionIds: ['t1', 't2', 't3'], categoryId: 'c1' }),
    });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Invalid request'));
    await expect(bulkCategorise([], null)).rejects.toThrow('Invalid request');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(bulkCategorise(['t1'], 'c1')).rejects.toThrow('Network failure');
  });
});

describe('triggerAutoCategorise', () => {
  it('triggers auto categorise', async () => {
    const data = { categorised: 10, total: 20 };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await triggerAutoCategorise();
    expect(mockFetch).toHaveBeenCalledWith('/api/transactions/auto-categorise', { method: 'POST' });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, 'Server error'));
    await expect(triggerAutoCategorise()).rejects.toThrow('Server error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(triggerAutoCategorise()).rejects.toThrow('Network failure');
  });
});

describe('triggerAiCategorise', () => {
  it('triggers AI categorise', async () => {
    const data = { status: 'ok', count: 5 };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await triggerAiCategorise(['t1', 't2']);
    expect(mockFetch).toHaveBeenCalledWith('/api/transactions/ai-categorise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionIds: ['t1', 't2'] }),
    });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Invalid request'));
    await expect(triggerAiCategorise([])).rejects.toThrow('Invalid request');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(triggerAiCategorise(['t1'])).rejects.toThrow('Network failure');
  });
});

// --- Categories ---

describe('fetchCategories', () => {
  it('fetches categories', async () => {
    const data = [{ id: 'c1', name: 'Food', transactionCount: 5 }];
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchCategories();
    expect(mockFetch).toHaveBeenCalledWith('/api/categories');
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, 'Server error'));
    await expect(fetchCategories()).rejects.toThrow('Server error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchCategories()).rejects.toThrow('Network failure');
  });
});

describe('createCategory', () => {
  const payload = { name: 'Food', color: '#ff0000', icon: 'utensils' };

  it('creates a category', async () => {
    const data = { id: 'c2', ...payload };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await createCategory(payload);
    expect(mockFetch).toHaveBeenCalledWith('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(422, 'Validation error'));
    await expect(createCategory(payload)).rejects.toThrow('Validation error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(createCategory(payload)).rejects.toThrow('Network failure');
  });
});

describe('updateCategory', () => {
  it('updates a category', async () => {
    const data = { id: 'c1', name: 'Updated' };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await updateCategory('c1', { name: 'Updated' });
    expect(mockFetch).toHaveBeenCalledWith('/api/categories/c1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(404, 'Not found'));
    await expect(updateCategory('c999', {})).rejects.toThrow('Not found');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(updateCategory('c1', {})).rejects.toThrow('Network failure');
  });
});

describe('deleteCategory', () => {
  it('deletes a category', async () => {
    mockFetch.mockResolvedValue({ ok: true } as Response);
    await deleteCategory('c1');
    expect(mockFetch).toHaveBeenCalledWith('/api/categories/c1', { method: 'DELETE' });
  });

  it('throws on error response with message', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Cannot delete'));
    await expect(deleteCategory('c1')).rejects.toThrow('Cannot delete');
  });

  it('throws on error response without json body', async () => {
    mockFetch.mockResolvedValue(errorResponseNoBody(500));
    await expect(deleteCategory('c1')).rejects.toThrow('Internal Server Error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(deleteCategory('c1')).rejects.toThrow('Network failure');
  });
});

describe('fetchCategoryRules', () => {
  it('fetches category rules', async () => {
    const data = [{ id: 'r1', pattern: 'grocery' }];
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchCategoryRules('c1');
    expect(mockFetch).toHaveBeenCalledWith('/api/categories/c1/rules');
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(404, 'Not found'));
    await expect(fetchCategoryRules('c999')).rejects.toThrow('Not found');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchCategoryRules('c1')).rejects.toThrow('Network failure');
  });
});

describe('createCategoryRule', () => {
  const payload = { categoryId: 'c1', pattern: 'grocery' };

  it('creates a category rule', async () => {
    const data = { id: 'r2', ...payload };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await createCategoryRule(payload);
    expect(mockFetch).toHaveBeenCalledWith('/api/categories/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(422, 'Validation error'));
    await expect(createCategoryRule(payload)).rejects.toThrow('Validation error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(createCategoryRule(payload)).rejects.toThrow('Network failure');
  });
});

describe('deleteCategoryRule', () => {
  it('deletes a category rule', async () => {
    mockFetch.mockResolvedValue({ ok: true } as Response);
    await deleteCategoryRule('r1');
    expect(mockFetch).toHaveBeenCalledWith('/api/categories/rules/r1', { method: 'DELETE' });
  });

  it('throws on error response with message', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Cannot delete'));
    await expect(deleteCategoryRule('r1')).rejects.toThrow('Cannot delete');
  });

  it('throws on error response without json body', async () => {
    mockFetch.mockResolvedValue(errorResponseNoBody(500));
    await expect(deleteCategoryRule('r1')).rejects.toThrow('Internal Server Error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(deleteCategoryRule('r1')).rejects.toThrow('Network failure');
  });
});
