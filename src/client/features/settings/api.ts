import { log } from './logger.js';

export interface DeleteAllResult {
  deletedTransactions: number;
  deletedAccountSummaries: number;
  deletedDocuments: number;
}

export interface ReSeedResult {
  message: string;
  categoriesSeeded: number;
}

export interface AutoCategoriseResult {
  categorised: number;
  total: number;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchAppSettings(): Promise<Record<string, string>> {
  try {
    const res = await fetch('/api/settings/app');
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to fetch app settings', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function updateAppSetting(key: string, value: string): Promise<{ key: string; value: string }> {
  try {
    const res = await fetch(`/api/settings/app/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to update app setting', error instanceof Error ? error : new Error(String(error)), { key });
    throw error;
  }
}

export async function deleteAllData(): Promise<DeleteAllResult> {
  try {
    const res = await fetch('/api/data/all', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to delete all data', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function reSeedCategories(): Promise<ReSeedResult> {
  try {
    const res = await fetch('/api/categories/re-seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to re-seed categories', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export interface DbStatsData {
  documentCount: number;
  transactionCount: number;
  categoryCount: number;
  dbSizeBytes: number;
  appVersion: string;
}

export async function fetchDbStats(): Promise<DbStatsData> {
  try {
    const res = await fetch('/api/settings/stats');
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to fetch DB stats', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function runAutoCategorise(): Promise<AutoCategoriseResult> {
  try {
    const res = await fetch('/api/transactions/auto-categorise', { method: 'POST' });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to run auto-categorise', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
