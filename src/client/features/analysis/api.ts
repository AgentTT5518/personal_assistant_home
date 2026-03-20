import type { AnalysisInsights, SnapshotMeta } from '../../../shared/types/index.js';
import { log } from './logger.js';

interface AnalysisSnapshot {
  id: string;
  snapshotType: string;
  data: AnalysisInsights;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function generateAnalysis(dateFrom?: string, dateTo?: string): Promise<AnalysisSnapshot> {
  try {
    const res = await fetch('/api/analysis/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateFrom, dateTo }),
    });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to generate analysis', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function fetchSnapshots(): Promise<SnapshotMeta[]> {
  try {
    const res = await fetch('/api/analysis/snapshots');
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to fetch snapshots', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function fetchSnapshot(id: string): Promise<AnalysisSnapshot> {
  try {
    const res = await fetch(`/api/analysis/snapshots/${encodeURIComponent(id)}`);
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to fetch snapshot', error instanceof Error ? error : new Error(String(error)), { id });
    throw error;
  }
}

export async function deleteSnapshot(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/analysis/snapshots/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    await handleResponse(res);
  } catch (error) {
    log.error('Failed to delete snapshot', error instanceof Error ? error : new Error(String(error)), { id });
    throw error;
  }
}

export type { AnalysisSnapshot };
