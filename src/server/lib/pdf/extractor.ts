import { PDFParse } from 'pdf-parse';
import { createLogger } from '../logger.js';

const log = createLogger('pdf-extractor');

export interface PdfExtractionResult {
  text: string;
  pages: number;
  info: {
    title?: string;
    author?: string;
  };
}

export async function extractTextFromPdf(buffer: Buffer): Promise<PdfExtractionResult> {
  const parser = new PDFParse({ data: buffer });

  try {
    const info = await parser.getInfo();
    const textResult = await parser.getText();

    const pageCount = textResult.total ?? textResult.pages?.length ?? 0;

    log.info('PDF text extracted', {
      pages: pageCount,
      textLength: textResult.text.length,
    });

    return {
      text: textResult.text,
      pages: pageCount,
      info: {
        title: info.info?.Title,
        author: info.info?.Author,
      },
    };
  } catch (error) {
    log.error('PDF extraction failed', error instanceof Error ? error : new Error(String(error)));
    throw error;
  } finally {
    await parser.destroy();
  }
}

export function isLikelyScannedPdf(text: string, pageCount: number): boolean {
  const avgCharsPerPage = text.length / Math.max(pageCount, 1);
  return avgCharsPerPage < 50;
}
