import type {
  DocumentResponse,
  TransactionResponse,
  AiSettingResponse,
  DocumentType,
  ProcessingStatus,
} from '../../../shared/types/index.js';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function uploadDocument(
  file: File,
  docType: DocumentType,
  institution?: string,
  period?: string,
): Promise<{ id: string; processingStatus: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('docType', docType);
  if (institution) formData.append('institution', institution);
  if (period) formData.append('period', period);

  const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
  return handleResponse(res);
}

export async function fetchDocuments(filters?: {
  status?: ProcessingStatus;
  docType?: DocumentType;
}): Promise<DocumentResponse[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.docType) params.set('docType', filters.docType);
  const qs = params.toString();
  const res = await fetch(`/api/documents${qs ? `?${qs}` : ''}`);
  return handleResponse(res);
}

export async function fetchDocument(id: string): Promise<DocumentResponse> {
  const res = await fetch(`/api/documents/${id}`);
  return handleResponse(res);
}

export async function fetchDocumentTransactions(id: string): Promise<TransactionResponse[]> {
  const res = await fetch(`/api/documents/${id}/transactions`);
  return handleResponse(res);
}

export async function reprocessWithVision(id: string): Promise<{ id: string; processingStatus: string }> {
  const res = await fetch(`/api/documents/${id}/reprocess-vision`, { method: 'POST' });
  return handleResponse(res);
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(body.error?.message ?? `Delete failed: ${res.status}`);
  }
}

export async function fetchAiSettings(): Promise<AiSettingResponse[]> {
  const res = await fetch('/api/ai-settings');
  return handleResponse(res);
}

export async function updateAiSetting(
  taskType: string,
  data: { provider: string; model: string; fallbackProvider?: string | null; fallbackModel?: string | null },
): Promise<AiSettingResponse> {
  const res = await fetch(`/api/ai-settings/${taskType}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}
