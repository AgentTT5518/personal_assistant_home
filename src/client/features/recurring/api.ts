import type { RecurringGroup } from '../../../shared/types/index.js';
import { log } from './logger.js';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchRecurringSummary(): Promise<RecurringGroup[]> {
  try {
    const res = await fetch('/api/transactions/recurring-summary');
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to fetch recurring summary', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function detectRecurring(): Promise<{ groups: RecurringGroup[]; groupCount: number }> {
  try {
    const res = await fetch('/api/transactions/detect-recurring', { method: 'POST' });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to run recurring detection', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
