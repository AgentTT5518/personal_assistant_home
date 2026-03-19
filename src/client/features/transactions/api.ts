import type {
  TransactionResponse,
  TransactionFilters,
  TransactionStats,
  PaginatedResponse,
  CategoryResponse,
  CategoryRuleResponse,
} from '../../../shared/types/index.js';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

// --- Transaction API ---

export async function fetchTransactions(
  filters: TransactionFilters,
): Promise<PaginatedResponse<TransactionResponse>> {
  const qs = buildQueryString(filters as Record<string, unknown>);
  const res = await fetch(`/api/transactions${qs}`);
  return handleResponse(res);
}

export async function fetchTransactionStats(
  dateFrom?: string,
  dateTo?: string,
): Promise<TransactionStats> {
  const qs = buildQueryString({ dateFrom, dateTo });
  const res = await fetch(`/api/transactions/stats${qs}`);
  return handleResponse(res);
}

export async function updateTransaction(
  id: string,
  data: { categoryId: string | null },
): Promise<TransactionResponse> {
  const res = await fetch(`/api/transactions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function bulkCategorise(
  transactionIds: string[],
  categoryId: string | null,
): Promise<{ updated: number; categoryId: string | null }> {
  const res = await fetch('/api/transactions/bulk-categorise', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactionIds, categoryId }),
  });
  return handleResponse(res);
}

export async function triggerAutoCategorise(): Promise<{ categorised: number; total: number }> {
  const res = await fetch('/api/transactions/auto-categorise', { method: 'POST' });
  return handleResponse(res);
}

export async function triggerAiCategorise(
  transactionIds: string[],
): Promise<{ status: string; count: number }> {
  const res = await fetch('/api/transactions/ai-categorise', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactionIds }),
  });
  return handleResponse(res);
}

// --- Category API ---

export async function fetchCategories(): Promise<(CategoryResponse & { transactionCount: number })[]> {
  const res = await fetch('/api/categories');
  return handleResponse(res);
}

export async function createCategory(data: {
  name: string;
  parentId?: string | null;
  color: string;
  icon: string;
}): Promise<CategoryResponse> {
  const res = await fetch('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateCategory(
  id: string,
  data: { name?: string; parentId?: string | null; color?: string; icon?: string },
): Promise<CategoryResponse> {
  const res = await fetch(`/api/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteCategory(id: string): Promise<void> {
  const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(body.error?.message ?? `Delete failed: ${res.status}`);
  }
}

export async function fetchCategoryRules(categoryId: string): Promise<CategoryRuleResponse[]> {
  const res = await fetch(`/api/categories/${categoryId}/rules`);
  return handleResponse(res);
}

export async function createCategoryRule(data: {
  categoryId: string;
  pattern: string;
  field?: string;
}): Promise<CategoryRuleResponse> {
  const res = await fetch('/api/categories/rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteCategoryRule(id: string): Promise<void> {
  const res = await fetch(`/api/categories/rules/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(body.error?.message ?? `Delete failed: ${res.status}`);
  }
}
