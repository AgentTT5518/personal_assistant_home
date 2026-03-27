import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, isNotNull } from 'drizzle-orm';
import { db, schema } from '../../lib/db/index.js';
import { extractTextFromPdf, isLikelyScannedPdf } from '../../lib/pdf/extractor.js';
import { routeToProvider } from '../../lib/ai/router.js';
import { extractionResultSchema } from '../../../shared/types/validation.js';
import type { DocumentType } from '../../../shared/types/index.js';
import { splitPdfIfNeeded } from './splitter.js';
import { getPromptForDocType } from './prompts/index.js';
import { deduplicateTransactions, buildTransactionKey } from './dedup.js';
import { runRuleCategorisation } from '../transactions/categorisation.service.js';
import { parseAiResponse } from './json-repair.js';
import { log } from './logger.js';

const BATCH_INSERT_SIZE = 100;

// Text-based chunking for local models (Ollama) which struggle with large inputs
const CHUNK_TEXT_THRESHOLD = 6000;
const CHUNK_TARGET_SIZE = 5000;
const CHUNK_OVERLAP = 200;

function splitTextIntoChunks(text: string): string[] {
  if (text.length <= CHUNK_TEXT_THRESHOLD) return [text];

  const chunks: string[] = [];
  let offset = 0;

  while (offset < text.length) {
    let end = Math.min(offset + CHUNK_TARGET_SIZE, text.length);
    if (end < text.length) {
      const newlineIdx = text.lastIndexOf('\n', end);
      if (newlineIdx > offset + CHUNK_TARGET_SIZE * 0.5) end = newlineIdx + 1;
    }
    chunks.push(text.slice(offset, end));
    if (end >= text.length) break;
    const advance = end - offset - CHUNK_OVERLAP;
    if (advance <= 0) break;
    offset += advance;
  }

  return chunks;
}

export async function processDocument(documentId: string): Promise<void> {
  const now = () => new Date().toISOString();

  try {
    const doc = db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.id, documentId))
      .get();

    if (!doc) {
      log.error('Document not found', new Error(`Document ${documentId} not found`));
      return;
    }

    if (!doc.filePath) {
      log.error('Document has no file path', new Error(`Document ${documentId} missing filePath`));
      db.update(schema.documents)
        .set({ processingStatus: 'failed', updatedAt: now() })
        .where(eq(schema.documents.id, documentId))
        .run();
      return;
    }

    // Mark as processing
    db.update(schema.documents)
      .set({ processingStatus: 'processing', updatedAt: now() })
      .where(eq(schema.documents.id, documentId))
      .run();

    // Read and split PDF
    const buffer = await fs.readFile(doc.filePath);
    const chunks = await splitPdfIfNeeded(buffer);

    log.info('PDF loaded', { documentId, chunks: chunks.length });

    // Extract text from each chunk
    const chunkResults = await Promise.all(
      chunks.map(async (chunk) => {
        const result = await extractTextFromPdf(chunk);
        return {
          text: result.text,
          pages: result.pages,
          isScanned: isLikelyScannedPdf(result.text, result.pages),
        };
      }),
    );

    const isScanned = chunkResults.some((c) => c.isScanned);
    const fullText = chunkResults.map((c) => c.text).join('\n');

    // Store extracted text
    db.update(schema.documents)
      .set({ extractedText: fullText, updatedAt: now() })
      .where(eq(schema.documents.id, documentId))
      .run();

    // Split text into chunks for large documents (helps local models avoid timeouts)
    const textChunks = splitTextIntoChunks(fullText);
    if (textChunks.length > 1) {
      log.info('Text chunking applied', { documentId, chunks: textChunks.length, totalChars: fullText.length });
    }

    // Process each chunk through AI and merge results
    type ExtractedTxn = { date: string; description: string; amount: number; type: 'debit' | 'credit'; merchant?: string; isRecurring?: boolean };
    type AccountSummary = { openingBalance?: number; closingBalance?: number; totalCredits?: number; totalDebits?: number; currency?: string };
    type DocMetadata = { institution?: string; period?: string; accountNumber?: string };
    const allTransactions: ExtractedTxn[] = [];
    let lastAccountSummary: AccountSummary | undefined;
    let lastMetadata: DocMetadata | undefined;
    let lastAiResponse = '';
    const allRepairs: string[] = [];

    for (let ci = 0; ci < textChunks.length; ci++) {
      const chunkText = textChunks[ci];
      const messages = getPromptForDocType(
        doc.docType as DocumentType,
        chunkText,
        doc.institution ?? undefined,
        doc.period ?? undefined,
      );

      try {
        const aiResponse = await routeToProvider('pdf_extraction', messages, {
          maxTokens: 8192,
          temperature: 0,
        });

        lastAiResponse = aiResponse;

        const { parsed, repairs } = parseAiResponse(aiResponse);
        allRepairs.push(...repairs);

        const chunkValidation = extractionResultSchema.safeParse(parsed);
        if (chunkValidation.success) {
          allTransactions.push(...chunkValidation.data.transactions);
          if (chunkValidation.data.accountSummary) lastAccountSummary = chunkValidation.data.accountSummary;
          if (chunkValidation.data.metadata) lastMetadata = chunkValidation.data.metadata;
        } else {
          log.warn('Chunk validation failed, attempting partial extraction', {
            documentId,
            chunk: ci + 1,
            totalChunks: textChunks.length,
            errors: chunkValidation.error.issues.length,
          });
        }
      } catch (chunkErr) {
        log.warn('Chunk AI call failed', {
          documentId,
          chunk: ci + 1,
          totalChunks: textChunks.length,
          error: chunkErr instanceof Error ? chunkErr.message : String(chunkErr),
        });
      }
    }

    if (allRepairs.length > 0) {
      log.info('JSON repairs applied to AI response', { documentId, repairs: allRepairs });
    }

    // Deduplicate transactions from overlapping chunks (same date+description+amount)
    const chunkDedup = new Set<string>();
    const dedupedChunkTransactions = allTransactions.filter((t) => {
      const key = `${t.date}|${t.description}|${t.amount.toFixed(2)}`;
      if (chunkDedup.has(key)) return false;
      chunkDedup.add(key);
      return true;
    });

    // Build a synthetic validation result
    const validation = extractionResultSchema.safeParse({
      transactions: dedupedChunkTransactions,
      accountSummary: lastAccountSummary,
      metadata: lastMetadata,
    });

    if (!validation.success) {
      log.error('AI response validation failed', new Error(validation.error.message), { documentId });
      db.update(schema.documents)
        .set({
          processingStatus: 'failed',
          rawExtraction: JSON.stringify({ error: validation.error.message }),
          updatedAt: now(),
        })
        .where(eq(schema.documents.id, documentId))
        .run();
      return;
    }

    const result = validation.data;
    const aiResponse = lastAiResponse;

    // Deduplicate against existing transactions
    const existingTxns = db
      .select({ date: schema.transactions.date, description: schema.transactions.description, amount: schema.transactions.amount })
      .from(schema.transactions)
      .innerJoin(schema.documents, eq(schema.transactions.documentId, schema.documents.id))
      .where(
        and(
          doc.institution ? eq(schema.documents.institution, doc.institution) : isNotNull(schema.documents.id),
        ),
      )
      .all();

    const existingKeys = new Set(
      existingTxns.map((t) =>
        buildTransactionKey(
          { date: t.date, description: t.description, amount: t.amount, type: 'debit' },
          doc.institution,
        ),
      ),
    );

    const dedupedTransactions = deduplicateTransactions(
      result.transactions,
      doc.institution,
      existingKeys,
    );

    // Atomic write: transactions + account summary + status update
    db.transaction((tx) => {
      // Batch insert transactions in chunks of BATCH_INSERT_SIZE
      for (let i = 0; i < dedupedTransactions.length; i += BATCH_INSERT_SIZE) {
        const batch = dedupedTransactions.slice(i, i + BATCH_INSERT_SIZE);
        tx.insert(schema.transactions)
          .values(
            batch.map((t) => ({
              id: uuidv4(),
              documentId,
              date: t.date,
              description: t.description,
              amount: t.amount,
              type: t.type,
              merchant: t.merchant ?? null,
              isRecurring: t.isRecurring ?? false,
              createdAt: now(),
              updatedAt: now(),
            })),
          )
          .run();
      }

      // Insert account summary if present
      if (result.accountSummary) {
        tx.insert(schema.accountSummaries)
          .values({
            id: uuidv4(),
            documentId,
            openingBalance: result.accountSummary.openingBalance ?? null,
            closingBalance: result.accountSummary.closingBalance ?? null,
            totalCredits: result.accountSummary.totalCredits ?? null,
            totalDebits: result.accountSummary.totalDebits ?? null,
            currency: result.accountSummary.currency ?? 'AUD',
            createdAt: now(),
            updatedAt: now(),
          })
          .run();
      }

      // Store raw AI response wrapper
      tx.update(schema.documents)
        .set({
          processingStatus: 'completed',
          processedAt: now(),
          rawExtraction: JSON.stringify({ isScanned, aiResponse }),
          updatedAt: now(),
        })
        .where(eq(schema.documents.id, documentId))
        .run();
    });

    log.info('Document processing complete', {
      documentId,
      transactions: dedupedTransactions.length,
      isScanned,
    });

    // Fire-and-forget rule categorisation on newly extracted transactions
    try {
      runRuleCategorisation();
    } catch (catErr) {
      log.error('Post-extraction categorisation failed', catErr instanceof Error ? catErr : new Error(String(catErr)));
    }
  } catch (error) {
    log.error('Document processing failed', error instanceof Error ? error : new Error(String(error)), { documentId });
    try {
      db.update(schema.documents)
        .set({
          processingStatus: 'failed',
          rawExtraction: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
          updatedAt: now(),
        })
        .where(eq(schema.documents.id, documentId))
        .run();
    } catch (updateError) {
      log.error('Failed to update document status', updateError instanceof Error ? updateError : new Error(String(updateError)));
    }
  }
}
