import { PDFDocument } from 'pdf-lib';
import { log } from './logger.js';

const MAX_PAGES_PER_DOCUMENT = 50;
const CHUNK_SIZE = 25;

export async function splitPdfIfNeeded(buffer: Buffer): Promise<Buffer[]> {
  const pdfDoc = await PDFDocument.load(buffer);
  const pageCount = pdfDoc.getPageCount();

  if (pageCount <= MAX_PAGES_PER_DOCUMENT) {
    return [buffer];
  }

  log.info('Splitting large PDF', { pageCount, chunkSize: CHUNK_SIZE });

  const chunks: Buffer[] = [];

  for (let start = 0; start < pageCount; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE, pageCount);
    const chunkDoc = await PDFDocument.create();
    const copiedPages = await chunkDoc.copyPages(
      pdfDoc,
      Array.from({ length: end - start }, (_, i) => start + i),
    );

    for (const page of copiedPages) {
      chunkDoc.addPage(page);
    }

    const chunkBytes = await chunkDoc.save();
    chunks.push(Buffer.from(chunkBytes));
  }

  log.info('PDF split complete', { chunks: chunks.length });
  return chunks;
}
