import type { BudgetResponse, BudgetSummaryResponse } from '../../../shared/types/index.js';
import { log } from './logger.js';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchBudgets(): Promise<BudgetResponse[]> {
  try {
    const res = await fetch('/api/budgets');
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to fetch budgets', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function fetchBudgetSummary(): Promise<BudgetSummaryResponse[]> {
  try {
    const res = await fetch('/api/budgets/summary');
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to fetch budget summary', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function createBudget(data: { categoryId: string; amount: number; period?: string }): Promise<BudgetResponse> {
  try {
    const res = await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to create budget', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function updateBudget(id: string, data: { amount?: number; period?: string }): Promise<BudgetResponse> {
  try {
    const res = await fetch(`/api/budgets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to update budget', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function deleteBudget(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/budgets/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
    }
  } catch (error) {
    log.error('Failed to delete budget', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
