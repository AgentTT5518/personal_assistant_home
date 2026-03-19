import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { db, schema } from '../../lib/db/index.js';

// Hoist mock functions so they can be referenced in vi.mock factories
const { mockReadFile, mockExtractText, mockIsScanned, mockRouteToProvider, mockSplit } = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
  mockExtractText: vi.fn(),
  mockIsScanned: vi.fn(),
  mockRouteToProvider: vi.fn(),
  mockSplit: vi.fn(),
}));

vi.mock('fs/promises', () => ({ default: { readFile: mockReadFile }, readFile: mockReadFile }));
vi.mock('../../lib/pdf/extractor.js', () => ({ extractTextFromPdf: mockExtractText, isLikelyScannedPdf: mockIsScanned }));
vi.mock('../../lib/ai/router.js', () => ({ routeToProvider: mockRouteToProvider }));
vi.mock('./splitter.js', () => ({ splitPdfIfNeeded: mockSplit }));

// Mock the validation module to return the actual schemas — works around vitest
// module graph issues where mocking other modules causes partial module loading
vi.mock('../../../shared/types/validation.js', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const z = require('zod').z ?? require('zod');
  const extractedTransactionSchema = z.object({
    date: z.string(),
    description: z.string(),
    amount: z.number(),
    type: z.enum(['debit', 'credit']),
    merchant: z.string().optional(),
    isRecurring: z.boolean().optional(),
  });
  const extractionResultSchema = z.object({
    transactions: z.array(extractedTransactionSchema),
    accountSummary: z.object({
      openingBalance: z.number().optional(),
      closingBalance: z.number().optional(),
      totalCredits: z.number().optional(),
      totalDebits: z.number().optional(),
      currency: z.string().optional(),
    }).optional(),
    metadata: z.object({
      institution: z.string().optional(),
      period: z.string().optional(),
      accountNumber: z.string().optional(),
    }).optional(),
  });
  return { extractionResultSchema, extractedTransactionSchema };
});

import { processDocument } from './extraction.service.js';

function insertTestDocument(overrides: Partial<typeof schema.documents.$inferInsert> = {}) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.insert(schema.documents)
    .values({
      id,
      filename: 'test.pdf',
      docType: 'bank_statement',
      processingStatus: 'pending',
      filePath: '/tmp/test.pdf',
      createdAt: now,
      updatedAt: now,
      ...overrides,
    })
    .run();
  return id;
}

function getDocument(id: string) {
  return db.select().from(schema.documents).where(eq(schema.documents.id, id)).get();
}

function getTransactions(documentId: string) {
  return db.select().from(schema.transactions).where(eq(schema.transactions.documentId, documentId)).all();
}

describe('processDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    db.delete(schema.transactions).run();
    db.delete(schema.accountSummaries).run();
    db.delete(schema.documents).run();
  });

  it('processes a document and creates transactions in DB', async () => {
    const docId = insertTestDocument();
    const pdfBuffer = Buffer.from('fake-pdf');

    mockReadFile.mockResolvedValue(pdfBuffer);
    mockSplit.mockResolvedValue([pdfBuffer]);
    mockExtractText.mockResolvedValue({ text: 'Statement text', pages: 1, info: {} });
    mockIsScanned.mockReturnValue(false);
    mockRouteToProvider.mockResolvedValue(
      JSON.stringify({
        transactions: [
          { date: '2024-01-15', description: 'Woolworths', amount: 45.5, type: 'debit' },
          { date: '2024-01-16', description: 'Salary', amount: 3000, type: 'credit' },
        ],
        accountSummary: { openingBalance: 1000, closingBalance: 3954.5, currency: 'AUD' },
      }),
    );

    await processDocument(docId);

    const doc = getDocument(docId);
    expect(doc?.processingStatus).toBe('completed');
    expect(doc?.processedAt).toBeDefined();

    const txns = getTransactions(docId);
    expect(txns).toHaveLength(2);
    expect(txns[0].description).toBe('Woolworths');
    expect(txns[1].description).toBe('Salary');

    const summaries = db
      .select()
      .from(schema.accountSummaries)
      .where(eq(schema.accountSummaries.documentId, docId))
      .all();
    expect(summaries).toHaveLength(1);
    expect(summaries[0].openingBalance).toBe(1000);
  });

  it('sets status to failed when AI response fails validation', async () => {
    const docId = insertTestDocument();
    const pdfBuffer = Buffer.from('fake-pdf');

    mockReadFile.mockResolvedValue(pdfBuffer);
    mockSplit.mockResolvedValue([pdfBuffer]);
    mockExtractText.mockResolvedValue({ text: 'Statement text', pages: 1, info: {} });
    mockIsScanned.mockReturnValue(false);
    mockRouteToProvider.mockResolvedValue(JSON.stringify({ invalid: true }));

    await processDocument(docId);

    const doc = getDocument(docId);
    expect(doc?.processingStatus).toBe('failed');
    expect(doc?.rawExtraction).toBeDefined();
    const raw = JSON.parse(doc!.rawExtraction!);
    expect(raw.error).toBeDefined();
  });

  it('sets status to failed when AI provider throws', async () => {
    const docId = insertTestDocument();
    const pdfBuffer = Buffer.from('fake-pdf');

    mockReadFile.mockResolvedValue(pdfBuffer);
    mockSplit.mockResolvedValue([pdfBuffer]);
    mockExtractText.mockResolvedValue({ text: 'Statement text', pages: 1, info: {} });
    mockIsScanned.mockReturnValue(false);
    mockRouteToProvider.mockRejectedValue(new Error('API key invalid'));

    await processDocument(docId);

    const doc = getDocument(docId);
    expect(doc?.processingStatus).toBe('failed');
    const raw = JSON.parse(doc!.rawExtraction!);
    expect(raw.error).toBe('API key invalid');
  });

  it('handles missing document gracefully', async () => {
    await processDocument('nonexistent-id');
    // Should not throw — just logs and returns
  });

  it('sets status to failed when filePath is null', async () => {
    const docId = insertTestDocument({ filePath: null });

    await processDocument(docId);

    const doc = getDocument(docId);
    expect(doc?.processingStatus).toBe('failed');
  });

  it('parses AI response wrapped in markdown code fences', async () => {
    const docId = insertTestDocument();
    const pdfBuffer = Buffer.from('fake-pdf');

    mockReadFile.mockResolvedValue(pdfBuffer);
    mockSplit.mockResolvedValue([pdfBuffer]);
    mockExtractText.mockResolvedValue({ text: 'Statement text', pages: 1, info: {} });
    mockIsScanned.mockReturnValue(false);
    mockRouteToProvider.mockResolvedValue(
      '```json\n' +
        JSON.stringify({
          transactions: [{ date: '2024-01-15', description: 'Test', amount: 10, type: 'debit' }],
        }) +
        '\n```',
    );

    await processDocument(docId);

    const doc = getDocument(docId);
    expect(doc?.processingStatus).toBe('completed');

    const txns = getTransactions(docId);
    expect(txns).toHaveLength(1);
  });
});
