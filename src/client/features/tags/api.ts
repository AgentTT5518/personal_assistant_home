import type { TagResponse, SplitTransactionResponse } from '@shared/types/index.js';
import { log } from './logger.js';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// --- Tags ---

export async function fetchTags(): Promise<TagResponse[]> {
  try {
    const res = await fetch('/api/tags');
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to fetch tags', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function createTag(data: { name: string; color?: string }): Promise<TagResponse> {
  try {
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to create tag', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function updateTag(id: string, data: { name?: string; color?: string }): Promise<TagResponse> {
  try {
    const res = await fetch(`/api/tags/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to update tag', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function deleteTag(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
    }
  } catch (error) {
    log.error('Failed to delete tag', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

// --- Transaction-Tag Junction ---

export async function addTagsToTransaction(transactionId: string, tagIds: string[]): Promise<{ added: number }> {
  try {
    const res = await fetch(`/api/transactions/${transactionId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagIds }),
    });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to add tags to transaction', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function removeTagFromTransaction(transactionId: string, tagId: string): Promise<void> {
  try {
    const res = await fetch(`/api/transactions/${transactionId}/tags/${tagId}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
    }
  } catch (error) {
    log.error('Failed to remove tag from transaction', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function bulkTag(transactionIds: string[], tagId: string): Promise<{ added: number; tagId: string }> {
  try {
    const res = await fetch('/api/transactions/bulk-tag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionIds, tagId }),
    });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to bulk tag', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

// --- Split Transactions ---

export async function fetchSplits(transactionId: string): Promise<SplitTransactionResponse[]> {
  try {
    const res = await fetch(`/api/transactions/${transactionId}/splits`);
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to fetch splits', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function createSplits(
  transactionId: string,
  splits: Array<{ categoryId: string | null; amount: number; description: string }>,
): Promise<SplitTransactionResponse[]> {
  try {
    const res = await fetch(`/api/transactions/${transactionId}/splits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ splits }),
    });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to create splits', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function deleteSplits(transactionId: string): Promise<void> {
  try {
    const res = await fetch(`/api/transactions/${transactionId}/splits`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
    }
  } catch (error) {
    log.error('Failed to delete splits', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
