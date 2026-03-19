import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { splitPdfIfNeeded } from './splitter.js';

async function createPdfWithPages(pageCount: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    doc.addPage();
  }
  const bytes = await doc.save();
  return Buffer.from(bytes);
}

async function getPageCount(buffer: Buffer): Promise<number> {
  const doc = await PDFDocument.load(buffer);
  return doc.getPageCount();
}

describe('splitPdfIfNeeded', () => {
  it('returns single buffer for PDF with <= 50 pages', async () => {
    const buffer = await createPdfWithPages(10);
    const chunks = await splitPdfIfNeeded(buffer);
    expect(chunks).toHaveLength(1);
    expect(await getPageCount(chunks[0])).toBe(10);
  });

  it('returns single buffer for exactly 50 pages', async () => {
    const buffer = await createPdfWithPages(50);
    const chunks = await splitPdfIfNeeded(buffer);
    expect(chunks).toHaveLength(1);
    expect(await getPageCount(chunks[0])).toBe(50);
  });

  it('splits 75 pages into 3 chunks of 25', async () => {
    const buffer = await createPdfWithPages(75);
    const chunks = await splitPdfIfNeeded(buffer);
    expect(chunks).toHaveLength(3);
    expect(await getPageCount(chunks[0])).toBe(25);
    expect(await getPageCount(chunks[1])).toBe(25);
    expect(await getPageCount(chunks[2])).toBe(25);
  });

  it('splits 51 pages into 3 chunks (25 + 25 + 1)', async () => {
    const buffer = await createPdfWithPages(51);
    const chunks = await splitPdfIfNeeded(buffer);
    expect(chunks).toHaveLength(3);
    expect(await getPageCount(chunks[0])).toBe(25);
    expect(await getPageCount(chunks[1])).toBe(25);
    expect(await getPageCount(chunks[2])).toBe(1);
  });
});
