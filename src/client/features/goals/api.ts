import type { GoalResponse } from '../../../shared/types/index.js';
import { log } from './logger.js';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchGoals(params?: { status?: string }): Promise<GoalResponse[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    const qs = searchParams.toString();
    const res = await fetch(`/api/goals${qs ? `?${qs}` : ''}`);
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to fetch goals', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function fetchGoal(id: string): Promise<GoalResponse> {
  try {
    const res = await fetch(`/api/goals/${id}`);
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to fetch goal', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function createGoal(data: {
  name: string;
  targetAmount: number;
  deadline?: string | null;
  accountId?: string | null;
  categoryId?: string | null;
}): Promise<GoalResponse> {
  try {
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to create goal', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function updateGoal(id: string, data: Record<string, unknown>): Promise<GoalResponse> {
  try {
    const res = await fetch(`/api/goals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to update goal', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function deleteGoal(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
    }
  } catch (error) {
    log.error('Failed to delete goal', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function contributeToGoal(id: string, data: {
  amount: number;
  note?: string | null;
  date?: string;
}): Promise<GoalResponse> {
  try {
    const res = await fetch(`/api/goals/${id}/contribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to contribute to goal', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function syncGoalBalance(id: string): Promise<GoalResponse & { warning?: string }> {
  try {
    const res = await fetch(`/api/goals/${id}/sync-balance`, { method: 'POST' });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to sync goal balance', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
