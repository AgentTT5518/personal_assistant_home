import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../logger.js', () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import {
  fetchReports,
  fetchReport,
  generateReport,
  downloadReportPdf,
  deleteReport,
} from '../api.js';

function okResponse(data: unknown) {
  return { ok: true, json: () => Promise.resolve(data) } as Response;
}

function errorResponse(status: number, message: string) {
  return {
    ok: false,
    status,
    statusText: 'Error',
    json: () => Promise.resolve({ error: { message } }),
  } as unknown as Response;
}

function errorResponseNoBody(status: number) {
  return {
    ok: false,
    status,
    statusText: 'Internal Server Error',
    json: () => Promise.reject(new Error('no json')),
  } as unknown as Response;
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('fetchReports', () => {
  it('fetches all reports', async () => {
    const data = [{ id: '1', title: 'Monthly' }];
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchReports();
    expect(mockFetch).toHaveBeenCalledWith('/api/reports');
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, 'Server error'));
    await expect(fetchReports()).rejects.toThrow('Server error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchReports()).rejects.toThrow('Network failure');
  });
});

describe('fetchReport', () => {
  it('fetches a single report', async () => {
    const data = { id: '1', title: 'Monthly' };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await fetchReport('1');
    expect(mockFetch).toHaveBeenCalledWith('/api/reports/1');
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(404, 'Not found'));
    await expect(fetchReport('999')).rejects.toThrow('Not found');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchReport('1')).rejects.toThrow('Network failure');
  });
});

describe('generateReport', () => {
  const payload = { periodFrom: '2026-01-01', periodTo: '2026-01-31', reportType: 'monthly' as const };

  it('generates a report', async () => {
    const data = { id: '2', ...payload };
    mockFetch.mockResolvedValue(okResponse(data));
    const result = await generateReport(payload);
    expect(mockFetch).toHaveBeenCalledWith('/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(result).toEqual(data);
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Invalid params'));
    await expect(generateReport(payload)).rejects.toThrow('Invalid params');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(generateReport(payload)).rejects.toThrow('Network failure');
  });
});

describe('downloadReportPdf', () => {
  it('downloads a PDF and triggers browser download', async () => {
    const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
    const mockUrl = 'blob:http://localhost/fake';
    const mockA = { href: '', download: '', click: vi.fn() } as unknown as HTMLAnchorElement;

    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    } as Response);

    vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(document, 'createElement').mockReturnValue(mockA);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockA as any);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockA as any);

    await downloadReportPdf('1', 'Monthly Report');

    expect(mockFetch).toHaveBeenCalledWith('/api/reports/1/pdf');
    expect(mockA.download).toBe('Monthly Report.pdf');
    expect(mockA.click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
  });

  it('sanitizes title for filename', async () => {
    const mockBlob = new Blob(['pdf content']);
    const mockA = { href: '', download: '', click: vi.fn() } as unknown as HTMLAnchorElement;

    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    } as Response);

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(document, 'createElement').mockReturnValue(mockA);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockA as any);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockA as any);

    await downloadReportPdf('1', 'Report <Special> (2026)');
    expect(mockA.download).toBe('Report Special 2026.pdf');
  });

  it('throws on error response with message', async () => {
    mockFetch.mockResolvedValue(errorResponse(404, 'PDF not found'));
    await expect(downloadReportPdf('1', 'Report')).rejects.toThrow('PDF not found');
  });

  it('throws on error response without json body', async () => {
    mockFetch.mockResolvedValue(errorResponseNoBody(500));
    await expect(downloadReportPdf('1', 'Report')).rejects.toThrow('Internal Server Error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(downloadReportPdf('1', 'Report')).rejects.toThrow('Network failure');
  });
});

describe('deleteReport', () => {
  it('deletes a report', async () => {
    mockFetch.mockResolvedValue({ ok: true } as Response);
    await deleteReport('1');
    expect(mockFetch).toHaveBeenCalledWith('/api/reports/1', { method: 'DELETE' });
  });

  it('throws on error response with message', async () => {
    mockFetch.mockResolvedValue(errorResponse(400, 'Cannot delete'));
    await expect(deleteReport('1')).rejects.toThrow('Cannot delete');
  });

  it('throws on error response without json body', async () => {
    mockFetch.mockResolvedValue(errorResponseNoBody(500));
    await expect(deleteReport('1')).rejects.toThrow('Internal Server Error');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(deleteReport('1')).rejects.toThrow('Network failure');
  });
});
