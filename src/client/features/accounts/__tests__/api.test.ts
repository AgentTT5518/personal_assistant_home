import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../logger.js', () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import {
  fetchAccounts,
  fetchAccount,
  fetchNetWorth,
  createAccount,
  updateAccount,
  deleteAccount,
  recalculateBalance,
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

describe('fetchAccounts', () => {
  it('fetches all accounts without params', async () => {
    const data = [{ id: '1', name: 'Checking' }];
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchAccounts();
    expect(mockFetch).toHaveBeenCalledWith('/api/accounts');
    expect(result).toEqual(data);
  });

  it('fetches accounts with isActive=true', async () => {
    mockFetch.mockResolvedValue(okResponse([]));
    await fetchAccounts(true);
    expect(mockFetch).toHaveBeenCalledWith('/api/accounts?isActive=true');
  });

  it('fetches accounts with isActive=false', async () => {
    mockFetch.mockResolvedValue(okResponse([]));
    await fetchAccounts(false);
    expect(mockFetch).toHaveBeenCalledWith('/api/accounts?isActive=false');
  });

  it('throws on error response with message', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Bad request'));
    await expect(fetchAccounts()).rejects.toThrow('Bad request');
  });

  it('throws on error response without json body', async () => {
    mockFetch.mockResolvedValue(errorResponseNoBody(500));
    await expect(fetchAccounts()).rejects.toThrow('Internal Server Error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchAccounts()).rejects.toThrow('Network failure');
  });
});

describe('fetchAccount', () => {
  it('fetches a single account', async () => {
    const data = { id: '1', name: 'Savings' };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchAccount('1');
    expect(mockFetch).toHaveBeenCalledWith('/api/accounts/1');
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(404, 'Not found'));
    await expect(fetchAccount('999')).rejects.toThrow('Not found');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchAccount('1')).rejects.toThrow('Network failure');
  });
});

describe('fetchNetWorth', () => {
  it('fetches net worth', async () => {
    const data = { total: 5000 };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchNetWorth();
    expect(mockFetch).toHaveBeenCalledWith('/api/accounts/net-worth');
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, 'Server error'));
    await expect(fetchNetWorth()).rejects.toThrow('Server error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchNetWorth()).rejects.toThrow('Network failure');
  });
});

describe('createAccount', () => {
  const payload = { name: 'New Account', type: 'checking' as const };

  it('creates an account', async () => {
    const data = { id: '2', ...payload };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await createAccount(payload);
    expect(mockFetch).toHaveBeenCalledWith('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(422, 'Validation error'));
    await expect(createAccount(payload)).rejects.toThrow('Validation error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(createAccount(payload)).rejects.toThrow('Network failure');
  });
});

describe('updateAccount', () => {
  const payload = { name: 'Updated' };

  it('updates an account', async () => {
    const data = { id: '1', name: 'Updated' };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await updateAccount('1', payload);
    expect(mockFetch).toHaveBeenCalledWith('/api/accounts/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(404, 'Not found'));
    await expect(updateAccount('999', payload)).rejects.toThrow('Not found');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(updateAccount('1', payload)).rejects.toThrow('Network failure');
  });
});

describe('deleteAccount', () => {
  it('deletes an account (soft)', async () => {
    mockFetch.mockResolvedValue({ ok: true } as Response);
    await deleteAccount('1');
    expect(mockFetch).toHaveBeenCalledWith('/api/accounts/1', { method: 'DELETE' });
  });

  it('deletes an account (hard)', async () => {
    mockFetch.mockResolvedValue({ ok: true } as Response);
    await deleteAccount('1', true);
    expect(mockFetch).toHaveBeenCalledWith('/api/accounts/1?hard=true', { method: 'DELETE' });
  });

  it('throws on error response with message', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Cannot delete'));
    await expect(deleteAccount('1')).rejects.toThrow('Cannot delete');
  });

  it('throws on error response without json body', async () => {
    mockFetch.mockResolvedValue(errorResponseNoBody(500));
    await expect(deleteAccount('1')).rejects.toThrow('Internal Server Error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(deleteAccount('1')).rejects.toThrow('Network failure');
  });
});

describe('recalculateBalance', () => {
  it('recalculates balance', async () => {
    const data = { id: '1', currentBalance: 1000 };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await recalculateBalance('1');
    expect(mockFetch).toHaveBeenCalledWith('/api/accounts/1/recalculate', { method: 'POST' });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, 'Calculation error'));
    await expect(recalculateBalance('1')).rejects.toThrow('Calculation error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(recalculateBalance('1')).rejects.toThrow('Network failure');
  });
});
