import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../logger.js', () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import {
  fetchBills,
  fetchBill,
  fetchBillsCalendar,
  createBill,
  updateBill,
  deleteBill,
  markBillPaid,
  populateFromRecurring,
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

describe('fetchBills', () => {
  it('fetches all bills without params', async () => {
    const data = [{ id: '1', name: 'Rent' }];
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchBills();
    expect(mockFetch).toHaveBeenCalledWith('/api/bills');
    expect(result).toEqual(data);
  });

  it('fetches bills with isActive param', async () => {
    mockFetch.mockResolvedValue(okResponse([]));
    await fetchBills({ isActive: true });
    expect(mockFetch).toHaveBeenCalledWith('/api/bills?isActive=true');
  });

  it('fetches bills with upcoming param', async () => {
    mockFetch.mockResolvedValue(okResponse([]));
    await fetchBills({ upcoming: 7 });
    expect(mockFetch).toHaveBeenCalledWith('/api/bills?upcoming=7');
  });

  it('fetches bills with both params', async () => {
    mockFetch.mockResolvedValue(okResponse([]));
    await fetchBills({ isActive: true, upcoming: 14 });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('isActive=true');
    expect(url).toContain('upcoming=14');
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, 'Server error'));
    await expect(fetchBills()).rejects.toThrow('Server error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchBills()).rejects.toThrow('Network failure');
  });
});

describe('fetchBill', () => {
  it('fetches a single bill', async () => {
    const data = { id: '1', name: 'Rent' };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchBill('1');
    expect(mockFetch).toHaveBeenCalledWith('/api/bills/1');
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(404, 'Not found'));
    await expect(fetchBill('999')).rejects.toThrow('Not found');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchBill('1')).rejects.toThrow('Network failure');
  });
});

describe('fetchBillsCalendar', () => {
  it('fetches bills calendar with date range', async () => {
    const data = [{ date: '2026-03-01', bills: [] }];
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchBillsCalendar('2026-03-01', '2026-03-31');
    expect(mockFetch).toHaveBeenCalledWith('/api/bills/calendar?from=2026-03-01&to=2026-03-31');
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Invalid dates'));
    await expect(fetchBillsCalendar('bad', 'bad')).rejects.toThrow('Invalid dates');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchBillsCalendar('2026-03-01', '2026-03-31')).rejects.toThrow('Network failure');
  });
});

describe('createBill', () => {
  const payload = { name: 'Rent', expectedAmount: 1500, frequency: 'monthly', nextDueDate: '2026-04-01' };

  it('creates a bill', async () => {
    const data = { id: '2', ...payload };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await createBill(payload);
    expect(mockFetch).toHaveBeenCalledWith('/api/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(422, 'Validation error'));
    await expect(createBill(payload)).rejects.toThrow('Validation error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(createBill(payload)).rejects.toThrow('Network failure');
  });
});

describe('updateBill', () => {
  it('updates a bill', async () => {
    const data = { id: '1', name: 'Updated Rent' };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await updateBill('1', { name: 'Updated Rent' });
    expect(mockFetch).toHaveBeenCalledWith('/api/bills/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Rent' }),
    });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(404, 'Not found'));
    await expect(updateBill('999', {})).rejects.toThrow('Not found');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(updateBill('1', {})).rejects.toThrow('Network failure');
  });
});

describe('deleteBill', () => {
  it('deletes a bill', async () => {
    mockFetch.mockResolvedValue({ ok: true } as Response);
    await deleteBill('1');
    expect(mockFetch).toHaveBeenCalledWith('/api/bills/1', { method: 'DELETE' });
  });

  it('throws on error response with message', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Cannot delete'));
    await expect(deleteBill('1')).rejects.toThrow('Cannot delete');
  });

  it('throws on error response without json body', async () => {
    mockFetch.mockResolvedValue(errorResponseNoBody(500));
    await expect(deleteBill('1')).rejects.toThrow('Internal Server Error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(deleteBill('1')).rejects.toThrow('Network failure');
  });
});

describe('markBillPaid', () => {
  it('marks a bill as paid', async () => {
    const data = { id: '1', isPaid: true };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await markBillPaid('1');
    expect(mockFetch).toHaveBeenCalledWith('/api/bills/1/mark-paid', { method: 'POST' });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(404, 'Not found'));
    await expect(markBillPaid('999')).rejects.toThrow('Not found');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(markBillPaid('1')).rejects.toThrow('Network failure');
  });
});

describe('populateFromRecurring', () => {
  it('populates bills from recurring', async () => {
    const data = { created: 3, skipped: 1, bills: [] };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await populateFromRecurring();
    expect(mockFetch).toHaveBeenCalledWith('/api/bills/populate-from-recurring', { method: 'POST' });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, 'Server error'));
    await expect(populateFromRecurring()).rejects.toThrow('Server error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(populateFromRecurring()).rejects.toThrow('Network failure');
  });
});
