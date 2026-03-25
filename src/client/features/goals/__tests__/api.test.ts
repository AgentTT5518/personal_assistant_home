import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../logger.js', () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import {
  fetchGoals,
  fetchGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  contributeToGoal,
  syncGoalBalance,
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

describe('fetchGoals', () => {
  it('fetches all goals without params', async () => {
    const data = [{ id: '1', name: 'Emergency Fund' }];
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchGoals();
    expect(mockFetch).toHaveBeenCalledWith('/api/goals');
    expect(result).toEqual(data);
  });

  it('fetches goals with status param', async () => {
    mockFetch.mockResolvedValue(okResponse([]));
    await fetchGoals({ status: 'active' });
    expect(mockFetch).toHaveBeenCalledWith('/api/goals?status=active');
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, 'Server error'));
    await expect(fetchGoals()).rejects.toThrow('Server error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchGoals()).rejects.toThrow('Network failure');
  });
});

describe('fetchGoal', () => {
  it('fetches a single goal', async () => {
    const data = { id: '1', name: 'Emergency Fund' };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchGoal('1');
    expect(mockFetch).toHaveBeenCalledWith('/api/goals/1');
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(404, 'Not found'));
    await expect(fetchGoal('999')).rejects.toThrow('Not found');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchGoal('1')).rejects.toThrow('Network failure');
  });
});

describe('createGoal', () => {
  const payload = { name: 'Vacation', targetAmount: 5000 };

  it('creates a goal', async () => {
    const data = { id: '2', ...payload };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await createGoal(payload);
    expect(mockFetch).toHaveBeenCalledWith('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(422, 'Validation error'));
    await expect(createGoal(payload)).rejects.toThrow('Validation error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(createGoal(payload)).rejects.toThrow('Network failure');
  });
});

describe('updateGoal', () => {
  it('updates a goal', async () => {
    const data = { id: '1', name: 'Updated' };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await updateGoal('1', { name: 'Updated' });
    expect(mockFetch).toHaveBeenCalledWith('/api/goals/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(404, 'Not found'));
    await expect(updateGoal('999', {})).rejects.toThrow('Not found');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(updateGoal('1', {})).rejects.toThrow('Network failure');
  });
});

describe('deleteGoal', () => {
  it('deletes a goal', async () => {
    mockFetch.mockResolvedValue({ ok: true } as Response);
    await deleteGoal('1');
    expect(mockFetch).toHaveBeenCalledWith('/api/goals/1', { method: 'DELETE' });
  });

  it('throws on error response with message', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Cannot delete'));
    await expect(deleteGoal('1')).rejects.toThrow('Cannot delete');
  });

  it('throws on error response without json body', async () => {
    mockFetch.mockResolvedValue(errorResponseNoBody(500));
    await expect(deleteGoal('1')).rejects.toThrow('Internal Server Error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(deleteGoal('1')).rejects.toThrow('Network failure');
  });
});

describe('contributeToGoal', () => {
  const payload = { amount: 500 };

  it('contributes to a goal', async () => {
    const data = { id: '1', currentAmount: 1500 };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await contributeToGoal('1', payload);
    expect(mockFetch).toHaveBeenCalledWith('/api/goals/1/contribute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Invalid amount'));
    await expect(contributeToGoal('1', payload)).rejects.toThrow('Invalid amount');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(contributeToGoal('1', payload)).rejects.toThrow('Network failure');
  });
});

describe('syncGoalBalance', () => {
  it('syncs goal balance', async () => {
    const data = { id: '1', currentAmount: 2000 };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await syncGoalBalance('1');
    expect(mockFetch).toHaveBeenCalledWith('/api/goals/1/sync-balance', { method: 'POST' });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, 'Sync error'));
    await expect(syncGoalBalance('1')).rejects.toThrow('Sync error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(syncGoalBalance('1')).rejects.toThrow('Network failure');
  });
});
