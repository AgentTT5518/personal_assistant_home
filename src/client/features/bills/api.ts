import type { BillResponse, BillCalendarEntry } from '../../../shared/types/index.js';
import { log } from './logger.js';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchBills(params?: { isActive?: boolean; upcoming?: number }): Promise<BillResponse[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
    if (params?.upcoming !== undefined) searchParams.set('upcoming', String(params.upcoming));
    const qs = searchParams.toString();
    const res = await fetch(`/api/bills${qs ? `?${qs}` : ''}`);
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to fetch bills', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function fetchBill(id: string): Promise<BillResponse> {
  try {
    const res = await fetch(`/api/bills/${id}`);
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to fetch bill', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function fetchBillsCalendar(from: string, to: string): Promise<BillCalendarEntry[]> {
  try {
    const res = await fetch(`/api/bills/calendar?from=${from}&to=${to}`);
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to fetch bills calendar', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function createBill(data: {
  name: string;
  accountId?: string | null;
  categoryId?: string | null;
  expectedAmount: number;
  frequency: string;
  nextDueDate: string;
  notes?: string | null;
}): Promise<BillResponse> {
  try {
    const res = await fetch('/api/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to create bill', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function updateBill(id: string, data: Record<string, unknown>): Promise<BillResponse> {
  try {
    const res = await fetch(`/api/bills/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to update bill', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function deleteBill(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/bills/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
    }
  } catch (error) {
    log.error('Failed to delete bill', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function markBillPaid(id: string): Promise<BillResponse> {
  try {
    const res = await fetch(`/api/bills/${id}/mark-paid`, { method: 'POST' });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to mark bill as paid', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function populateFromRecurring(): Promise<{ created: number; skipped: number; bills: BillResponse[] }> {
  try {
    const res = await fetch('/api/bills/populate-from-recurring', { method: 'POST' });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to populate bills from recurring', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
