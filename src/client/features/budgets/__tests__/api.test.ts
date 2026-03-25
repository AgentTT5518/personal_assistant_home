import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../logger.js', () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { fetchBudgets, fetchBudgetSummary, createBudget, updateBudget, deleteBudget } from '../api.js';

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

describe('fetchBudgets', () => {
  it('fetches all budgets', async () => {
    const data = [{ id: 'b1', categoryId: 'c1', amount: 500 }];
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchBudgets();
    expect(mockFetch).toHaveBeenCalledWith('/api/budgets');
    expect(result).toEqual(data);
  });

  it('throws on error response with message', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, 'Server error'));
    await expect(fetchBudgets()).rejects.toThrow('Server error');
  });

  it('throws on error response without json body', async () => {
    mockFetch.mockResolvedValue(errorResponseNoBody(500));
    await expect(fetchBudgets()).rejects.toThrow('Internal Server Error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchBudgets()).rejects.toThrow('Network failure');
  });
});

describe('fetchBudgetSummary', () => {
  it('fetches budget summary', async () => {
    const data = [{ categoryId: 'c1', spent: 200, budget: 500 }];
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchBudgetSummary();
    expect(mockFetch).toHaveBeenCalledWith('/api/budgets/summary');
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, 'Server error'));
    await expect(fetchBudgetSummary()).rejects.toThrow('Server error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchBudgetSummary()).rejects.toThrow('Network failure');
  });
});

describe('createBudget', () => {
  const payload = { categoryId: 'c1', amount: 500, period: 'monthly' };

  it('creates a budget', async () => {
    const data = { id: 'b1', ...payload };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await createBudget(payload);
    expect(mockFetch).toHaveBeenCalledWith('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(422, 'Validation error'));
    await expect(createBudget(payload)).rejects.toThrow('Validation error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(createBudget(payload)).rejects.toThrow('Network failure');
  });
});

describe('updateBudget', () => {
  const payload = { amount: 600 };

  it('updates a budget', async () => {
    const data = { id: 'b1', categoryId: 'c1', amount: 600 };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await updateBudget('b1', payload);
    expect(mockFetch).toHaveBeenCalledWith('/api/budgets/b1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(404, 'Not found'));
    await expect(updateBudget('999', payload)).rejects.toThrow('Not found');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(updateBudget('b1', payload)).rejects.toThrow('Network failure');
  });
});

describe('deleteBudget', () => {
  it('deletes a budget', async () => {
    mockFetch.mockResolvedValue({ ok: true } as Response);
    await deleteBudget('b1');
    expect(mockFetch).toHaveBeenCalledWith('/api/budgets/b1', { method: 'DELETE' });
  });

  it('throws on error response with message', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Cannot delete'));
    await expect(deleteBudget('b1')).rejects.toThrow('Cannot delete');
  });

  it('throws on error response without json body', async () => {
    mockFetch.mockResolvedValue(errorResponseNoBody(500));
    await expect(deleteBudget('b1')).rejects.toThrow('Internal Server Error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(deleteBudget('b1')).rejects.toThrow('Network failure');
  });
});
