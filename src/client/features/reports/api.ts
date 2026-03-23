import type { ReportResponse, ReportListItem, ReportType } from '../../../shared/types/index.js';
import { log } from './logger.js';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchReports(): Promise<ReportListItem[]> {
  try {
    const res = await fetch('/api/reports');
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to fetch reports', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function fetchReport(id: string): Promise<ReportResponse> {
  try {
    const res = await fetch(`/api/reports/${id}`);
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to fetch report', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function generateReport(data: {
  periodFrom: string;
  periodTo: string;
  reportType: ReportType;
}): Promise<ReportResponse> {
  try {
    const res = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  } catch (error) {
    log.error('Failed to generate report', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function downloadReportPdf(id: string, title: string): Promise<void> {
  try {
    const res = await fetch(`/api/reports/${id}/pdf`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9 _-]/g, '')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    log.error('Failed to download PDF', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function deleteReport(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
    }
  } catch (error) {
    log.error('Failed to delete report', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
