import type {
  ImportSessionResponse,
  ImportUploadResponse,
  ColumnMapping,
} from '@shared/types/index.js';
import { log } from './logger.js';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function uploadImportFile(
  file: File,
  accountId?: string,
): Promise<ImportUploadResponse> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (accountId) {
      formData.append('accountId', accountId);
    }

    const res = await fetch('/api/import/upload', {
      method: 'POST',
      body: formData,
    });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to upload import file', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function saveColumnMapping(
  sessionId: string,
  mapping: ColumnMapping,
): Promise<ImportUploadResponse> {
  try {
    const res = await fetch(`/api/import/${sessionId}/mapping`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapping),
    });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to save column mapping', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function confirmImport(
  sessionId: string,
  selectedRows: number[],
): Promise<{ session: ImportSessionResponse; importedCount: number }> {
  try {
    const res = await fetch(`/api/import/${sessionId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedRows }),
    });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to confirm import', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function undoImport(sessionId: string): Promise<{ undoneCount: number }> {
  try {
    const res = await fetch(`/api/import/${sessionId}/undo`, { method: 'DELETE' });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to undo import', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function fetchImportSessions(): Promise<ImportSessionResponse[]> {
  try {
    const res = await fetch('/api/import/sessions');
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to fetch import sessions', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function deleteImportSession(sessionId: string): Promise<void> {
  try {
    const res = await fetch(`/api/import/${sessionId}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
    }
  } catch (error) {
    log.error('Failed to delete import session', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
