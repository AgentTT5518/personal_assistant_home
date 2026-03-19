import fs from 'fs/promises';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { db, schema } from '../../lib/db/index.js';
import { extractionResultSchema } from '../../../shared/types/validation.js';
import type { DocumentType } from '../../../shared/types/index.js';
import { getPromptForDocType } from './prompts/index.js';
import { deduplicateTransactions, buildTransactionKey } from './dedup.js';
import { runRuleCategorisation } from '../transactions/categorisation.service.js';
import { log } from './logger.js';

const BATCH_INSERT_SIZE = 100;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB defensive guard

function parseAiResponse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const match = /```(?:json)?\s*([\s\S]*?)\s*```/.exec(raw);
    if (match) {
      return JSON.parse(match[1]);
    }
    throw new Error('Failed to parse AI response as JSON');
  }
}

export async function reprocessWithVision(documentId: string): Promise<void> {
  const now = () => new Date().toISOString();

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is required for vision processing');
    }

    const doc = db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.id, documentId))
      .get();

    if (!doc) {
      throw new Error(`Document ${documentId} not found`);
    }

    if (!doc.filePath) {
      throw new Error(`Document ${documentId} file has been cleaned up — cannot reprocess`);
    }

    // Read PDF and validate size (defensive — multer enforces at upload)
    const buffer = await fs.readFile(doc.filePath);
    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(`File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }

    // Get model from ai_settings
    const settings = db
      .select()
      .from(schema.aiSettings)
      .where(eq(schema.aiSettings.taskType, 'pdf_vision_extraction'))
      .get();

    const model = settings?.model ?? 'claude-sonnet-4-5-20250514';

    // Pre-clear old data atomically
    db.transaction((tx) => {
      tx.delete(schema.transactions)
        .where(eq(schema.transactions.documentId, documentId))
        .run();
      tx.delete(schema.accountSummaries)
        .where(eq(schema.accountSummaries.documentId, documentId))
        .run();
      tx.update(schema.documents)
        .set({
          extractedText: null,
          processingStatus: 'processing',
          processedAt: null,
          updatedAt: now(),
        })
        .where(eq(schema.documents.id, documentId))
        .run();
    });

    log.info('Vision reprocessing started', { documentId, model });

    // Build system prompt from doc-type prompts
    const promptMessages = getPromptForDocType(
      doc.docType as DocumentType,
      '',
      doc.institution ?? undefined,
      doc.period ?? undefined,
    );
    const systemContent = promptMessages.find((m) => m.role === 'system')?.content ?? '';

    // Call Claude Vision API directly with native PDF support
    const client = new Anthropic();
    const response = await client.messages.create({
      model,
      max_tokens: 8192,
      system: systemContent,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: buffer.toString('base64'),
              },
            },
            {
              type: 'text',
              text: 'Extract the financial data from this PDF document per the instructions above.',
            },
          ],
        },
      ],
    });

    const aiResponse =
      response.content.find((block) => block.type === 'text')?.text ?? '';

    // Parse and validate
    const parsed = parseAiResponse(aiResponse);
    const validation = extractionResultSchema.safeParse(parsed);

    if (!validation.success) {
      log.error('Vision AI response validation failed', new Error(validation.error.message), { documentId });
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

    // Dedup against other documents' transactions (not the just-deleted ones)
    const existingTxns = db
      .select({ date: schema.transactions.date, description: schema.transactions.description, amount: schema.transactions.amount })
      .from(schema.transactions)
      .innerJoin(schema.documents, eq(schema.transactions.documentId, schema.documents.id))
      .where(eq(schema.documents.institution, doc.institution ?? ''))
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

    // Atomic write
    db.transaction((tx) => {
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

      tx.update(schema.documents)
        .set({
          processingStatus: 'completed',
          processedAt: now(),
          rawExtraction: JSON.stringify({ isScanned: true, aiResponse }),
          updatedAt: now(),
        })
        .where(eq(schema.documents.id, documentId))
        .run();
    });

    log.info('Vision reprocessing complete', {
      documentId,
      transactions: dedupedTransactions.length,
    });

    // Fire-and-forget rule categorisation on newly extracted transactions
    try {
      runRuleCategorisation();
    } catch (catErr) {
      log.error('Post-vision categorisation failed', catErr instanceof Error ? catErr : new Error(String(catErr)));
    }
  } catch (error) {
    log.error('Vision reprocessing failed', error instanceof Error ? error : new Error(String(error)), { documentId });
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
      log.error('Failed to update document status after vision failure', updateError instanceof Error ? updateError : new Error(String(updateError)));
    }
  }
}
