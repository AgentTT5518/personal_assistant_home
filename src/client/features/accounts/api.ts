import type { AccountResponse, NetWorthResponse, AccountType } from '../../../shared/types/index.js';
import { log } from './logger.js';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchAccounts(isActive?: boolean): Promise<AccountResponse[]> {
  try {
    const params = isActive !== undefined ? `?isActive=${isActive}` : '';
    const res = await fetch(`/api/accounts${params}`);
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to fetch accounts', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function fetchAccount(id: string): Promise<AccountResponse> {
  try {
    const res = await fetch(`/api/accounts/${id}`);
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to fetch account', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function fetchNetWorth(): Promise<NetWorthResponse> {
  try {
    const res = await fetch('/api/accounts/net-worth');
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to fetch net worth', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function createAccount(data: {
  name: string;
  type: AccountType;
  institution?: string | null;
  currency?: string;
  currentBalance?: number;
}): Promise<AccountResponse> {
  try {
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to create account', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function updateAccount(
  id: string,
  data: {
    name?: string;
    type?: AccountType;
    institution?: string | null;
    currency?: string;
    currentBalance?: number;
    isActive?: boolean;
  },
): Promise<AccountResponse> {
  try {
    const res = await fetch(`/api/accounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to update account', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function deleteAccount(id: string, hard = false): Promise<void> {
  try {
    const params = hard ? '?hard=true' : '';
    const res = await fetch(`/api/accounts/${id}${params}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
    }
  } catch (error) {
    log.error('Failed to delete account', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function recalculateBalance(id: string): Promise<AccountResponse> {
  try {
    const res = await fetch(`/api/accounts/${id}/recalculate`, { method: 'POST' });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to recalculate balance', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
