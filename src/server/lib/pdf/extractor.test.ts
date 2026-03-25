import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDestroy, mockGetInfo, mockGetText, mockLogInfo, mockLogError } = vi.hoisted(() => ({
  mockDestroy: vi.fn(),
  mockGetInfo: vi.fn(),
  mockGetText: vi.fn(),
  mockLogInfo: vi.fn(),
  mockLogError: vi.fn(),
}));

vi.mock('../logger.js', () => ({
  createLogger: () => ({
    info: mockLogInfo,
    warn: vi.fn(),
    error: mockLogError,
    debug: vi.fn(),
  }),
}));

vi.mock('pdf-parse', () => ({
  PDFParse: class MockPDFParse {
    constructor(_opts: unknown) {
      // noop
    }
    getInfo = mockGetInfo;
    getText = mockGetText;
    destroy = mockDestroy;
  },
}));

import { isLikelyScannedPdf, extractTextFromPdf } from './extractor.js';

describe('isLikelyScannedPdf', () => {
  it('detects scanned PDFs with very little text', () => {
    expect(isLikelyScannedPdf('short', 5)).toBe(true);
  });

  it('does not flag PDFs with normal text density', () => {
    const text = 'a'.repeat(5000);
    expect(isLikelyScannedPdf(text, 5)).toBe(false);
  });

  it('handles zero page count without dividing by zero', () => {
    expect(isLikelyScannedPdf('', 0)).toBe(true);
  });

  it('returns false at exactly 50 chars per page', () => {
    expect(isLikelyScannedPdf('a'.repeat(50), 1)).toBe(false);
  });

  it('returns true at 49 chars per page', () => {
    expect(isLikelyScannedPdf('a'.repeat(49), 1)).toBe(true);
  });

  it('handles single page with adequate text', () => {
    expect(isLikelyScannedPdf('a'.repeat(100), 1)).toBe(false);
  });
});

describe('extractTextFromPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDestroy.mockResolvedValue(undefined);
  });

  it('extracts text from a PDF buffer successfully', async () => {
    mockGetInfo.mockResolvedValue({
      info: { Title: 'Test Doc', Author: 'Test Author' },
    });
    mockGetText.mockResolvedValue({
      text: 'Hello World',
      total: 3,
    });

    const buffer = Buffer.from('fake-pdf');
    const result = await extractTextFromPdf(buffer);

    expect(result).toEqual({
      text: 'Hello World',
      pages: 3,
      info: {
        title: 'Test Doc',
        author: 'Test Author',
      },
    });
  });

  it('uses pages.length when total is not available', async () => {
    mockGetInfo.mockResolvedValue({ info: {} });
    mockGetText.mockResolvedValue({
      text: 'Some text',
      pages: [1, 2],
    });

    const result = await extractTextFromPdf(Buffer.from('fake'));

    expect(result.pages).toBe(2);
  });

  it('defaults to 0 pages when neither total nor pages is available', async () => {
    mockGetInfo.mockResolvedValue({ info: {} });
    mockGetText.mockResolvedValue({
      text: 'Some text',
    });

    const result = await extractTextFromPdf(Buffer.from('fake'));

    expect(result.pages).toBe(0);
  });

  it('handles missing info fields (title and author)', async () => {
    mockGetInfo.mockResolvedValue({});
    mockGetText.mockResolvedValue({
      text: 'Text',
      total: 1,
    });

    const result = await extractTextFromPdf(Buffer.from('fake'));

    expect(result.info.title).toBeUndefined();
    expect(result.info.author).toBeUndefined();
  });

  it('calls destroy in finally block on success', async () => {
    mockGetInfo.mockResolvedValue({ info: {} });
    mockGetText.mockResolvedValue({ text: 'ok', total: 1 });

    await extractTextFromPdf(Buffer.from('fake'));

    expect(mockDestroy).toHaveBeenCalledOnce();
  });

  it('throws and calls destroy when extraction fails', async () => {
    const error = new Error('Parse failed');
    mockGetInfo.mockRejectedValue(error);

    await expect(extractTextFromPdf(Buffer.from('bad'))).rejects.toThrow('Parse failed');
    expect(mockDestroy).toHaveBeenCalledOnce();
  });

  it('logs error when extraction fails with an Error instance', async () => {
    const error = new Error('Extraction error');
    mockGetInfo.mockRejectedValue(error);

    await expect(extractTextFromPdf(Buffer.from('bad'))).rejects.toThrow();

    expect(mockLogError).toHaveBeenCalledWith('PDF extraction failed', error);
  });

  it('logs error when extraction fails with a non-Error value', async () => {
    mockGetInfo.mockRejectedValue('string error');

    await expect(extractTextFromPdf(Buffer.from('bad'))).rejects.toBe('string error');

    expect(mockLogError).toHaveBeenCalledWith(
      'PDF extraction failed',
      expect.objectContaining({ message: 'string error' }),
    );
  });

  it('logs info on successful extraction', async () => {
    mockGetInfo.mockResolvedValue({ info: {} });
    mockGetText.mockResolvedValue({ text: 'Hello', total: 2 });

    await extractTextFromPdf(Buffer.from('fake'));

    expect(mockLogInfo).toHaveBeenCalledWith('PDF text extracted', {
      pages: 2,
      textLength: 5,
    });
  });
});
