import { log } from './logger.js';

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
