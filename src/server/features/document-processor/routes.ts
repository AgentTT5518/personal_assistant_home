import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import { eq, count, and } from 'drizzle-orm';
import { db, schema } from '../../lib/db/index.js';
import { validateBody } from '../../shared/middleware/validate.js';
import { aiRateLimiter } from '../../shared/middleware/rate-limiter.js';
import { AppError } from '../../shared/middleware/error-handler.js';
import { uploadDocumentSchema, aiSettingsUpdateSchema } from '../../../shared/types/validation.js';
import type { DocumentResponse, TransactionResponse, AiSettingResponse, DocumentType, ProcessingStatus } from '../../../shared/types/index.js';
import { uploadSingle, handleMulterError } from './upload.middleware.js';
import { processDocument } from './extraction.service.js';
import { reprocessWithVision } from './vision.service.js';
import { log } from './logger.js';

// Express 5 params are string | string[]; this helper extracts a string.
function paramStr(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export const documentRouter = Router();

// --- Document endpoints ---

// POST /api/documents/upload
documentRouter.post(
  '/documents/upload',
  uploadSingle,
  handleMulterError,
  validateBody(uploadDocumentSchema),
  async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      throw new AppError(400, 'MISSING_FILE', 'No PDF file was uploaded');
    }

    const { docType, institution, period } = req.body as {
      docType: DocumentType;
      institution?: string;
      period?: string;
    };

    const documentId = uuidv4();
    const now = new Date().toISOString();

    try {
      db.insert(schema.documents)
        .values({
          id: documentId,
          filename: file.originalname,
          docType,
          institution: institution ?? null,
          period: period ?? null,
          processingStatus: 'pending',
          filePath: file.path,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    } catch (error) {
      // M3 fix: clean up orphaned file on DB insert failure
      try {
        await fs.unlink(file.path);
      } catch {
        // Best-effort cleanup
      }
      throw error;
    }

    log.info('Document uploaded', { documentId, filename: file.originalname, docType });

    // Fire-and-forget processing
    void processDocument(documentId);

    res.status(201).json({ id: documentId, processingStatus: 'pending' });
  },
);

// GET /api/documents
documentRouter.get('/documents', (req, res) => {
  const statusFilter = req.query.status as ProcessingStatus | undefined;
  const docTypeFilter = req.query.docType as DocumentType | undefined;

  let query = db
    .select()
    .from(schema.documents)
    .$dynamic();

  const conditions: ReturnType<typeof eq>[] = [];
  if (statusFilter) {
    conditions.push(eq(schema.documents.processingStatus, statusFilter));
  }
  if (docTypeFilter) {
    conditions.push(eq(schema.documents.docType, docTypeFilter));
  }

  if (conditions.length === 1) {
    query = query.where(conditions[0]);
  } else if (conditions.length > 1) {
    query = query.where(and(...conditions));
  }

  const docs = query.all();

  // Get transaction counts
  const txnCounts = db
    .select({ documentId: schema.transactions.documentId, count: count() })
    .from(schema.transactions)
    .groupBy(schema.transactions.documentId)
    .all();

  const countMap = new Map(txnCounts.map((r) => [r.documentId, r.count]));

  const response: DocumentResponse[] = docs.map((d) => {
    let isScanned: boolean | undefined;
    if (d.rawExtraction) {
      try {
        const raw = JSON.parse(d.rawExtraction);
        isScanned = raw.isScanned;
      } catch {
        // Extraction errored before storing structured data
      }
    }

    return {
      id: d.id,
      filename: d.filename,
      docType: d.docType as DocumentType,
      institution: d.institution,
      period: d.period,
      processingStatus: d.processingStatus as ProcessingStatus,
      processedAt: d.processedAt,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      transactionCount: countMap.get(d.id) ?? 0,
      isScanned,
      hasFile: d.filePath !== null,
    };
  });

  res.json(response);
});

// GET /api/documents/:id
documentRouter.get('/documents/:id', (req, res) => {
  const doc = db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, paramStr(req.params.id)))
    .get();

  if (!doc) {
    throw new AppError(404, 'NOT_FOUND', 'Document not found');
  }

  const txnCount = db
    .select({ count: count() })
    .from(schema.transactions)
    .where(eq(schema.transactions.documentId, doc.id))
    .get();

  let isScanned: boolean | undefined;
  if (doc.rawExtraction) {
    try {
      const raw = JSON.parse(doc.rawExtraction);
      isScanned = raw.isScanned;
    } catch {
      // Extraction errored
    }
  }

  const response: DocumentResponse = {
    id: doc.id,
    filename: doc.filename,
    docType: doc.docType as DocumentType,
    institution: doc.institution,
    period: doc.period,
    processingStatus: doc.processingStatus as ProcessingStatus,
    processedAt: doc.processedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    transactionCount: txnCount?.count ?? 0,
    isScanned,
    hasFile: doc.filePath !== null,
  };

  res.json(response);
});

// GET /api/documents/:id/transactions
documentRouter.get('/documents/:id/transactions', (req, res) => {
  const doc = db
    .select({ id: schema.documents.id })
    .from(schema.documents)
    .where(eq(schema.documents.id, paramStr(req.params.id)))
    .get();

  if (!doc) {
    throw new AppError(404, 'NOT_FOUND', 'Document not found');
  }

  const txns = db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.documentId, paramStr(req.params.id)))
    .all();

  const response: TransactionResponse[] = txns.map((t) => ({
    id: t.id,
    documentId: t.documentId,
    date: t.date,
    description: t.description,
    amount: t.amount,
    type: t.type as 'debit' | 'credit',
    merchant: t.merchant,
    isRecurring: t.isRecurring ?? false,
    categoryId: t.categoryId,
    categoryName: null,
    categoryColor: null,
    documentFilename: null,
    createdAt: t.createdAt,
  }));

  res.json(response);
});

// POST /api/documents/:id/reprocess-vision
documentRouter.post('/documents/:id/reprocess-vision', aiRateLimiter, (req, res) => {
  const doc = db
    .select({ id: schema.documents.id, filePath: schema.documents.filePath })
    .from(schema.documents)
    .where(eq(schema.documents.id, paramStr(req.params.id)))
    .get();

  if (!doc) {
    throw new AppError(404, 'NOT_FOUND', 'Document not found');
  }

  if (!doc.filePath) {
    throw new AppError(400, 'FILE_UNAVAILABLE', 'Document file has been cleaned up — cannot reprocess');
  }

  log.info('Vision reprocess requested', { documentId: doc.id });

  // Fire-and-forget
  void reprocessWithVision(doc.id);

  res.status(202).json({ id: doc.id, processingStatus: 'processing' });
});

// DELETE /api/documents/:id
documentRouter.delete('/documents/:id', async (req, res) => {
  const doc = db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, paramStr(req.params.id)))
    .get();

  if (!doc) {
    throw new AppError(404, 'NOT_FOUND', 'Document not found');
  }

  // Delete file first (safer: if this fails, DB record survives for cleanup service)
  if (doc.filePath) {
    try {
      await fs.unlink(doc.filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        log.error('Failed to delete file during document deletion', error instanceof Error ? error : new Error(String(error)), {
          documentId: doc.id,
        });
      }
    }
  }

  // Atomic DB cleanup
  db.transaction((tx) => {
    tx.delete(schema.transactions).where(eq(schema.transactions.documentId, doc.id)).run();
    tx.delete(schema.accountSummaries).where(eq(schema.accountSummaries.documentId, doc.id)).run();
    tx.delete(schema.documents).where(eq(schema.documents.id, doc.id)).run();
  });

  log.info('Document deleted', { documentId: doc.id });

  res.status(204).end();
});

// --- AI Settings endpoints ---

// GET /api/ai-settings
documentRouter.get('/ai-settings', (_req, res) => {
  const settings = db.select().from(schema.aiSettings).all();

  const response: AiSettingResponse[] = settings.map((s) => ({
    id: s.id,
    taskType: s.taskType as AiSettingResponse['taskType'],
    provider: s.provider as AiSettingResponse['provider'],
    model: s.model,
    fallbackProvider: s.fallbackProvider as AiSettingResponse['fallbackProvider'],
    fallbackModel: s.fallbackModel,
  }));

  res.json(response);
});

// PUT /api/ai-settings/:taskType
documentRouter.put('/ai-settings/:taskType', validateBody(aiSettingsUpdateSchema), (req, res) => {
  const taskType = paramStr(req.params.taskType);

  const existing = db
    .select()
    .from(schema.aiSettings)
    .where(eq(schema.aiSettings.taskType, taskType))
    .get();

  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', `AI settings for task type '${taskType}' not found`);
  }

  const { provider, model, fallbackProvider, fallbackModel } = req.body as {
    provider: string;
    model: string;
    fallbackProvider?: string | null;
    fallbackModel?: string | null;
  };

  db.update(schema.aiSettings)
    .set({
      provider,
      model,
      fallbackProvider: fallbackProvider ?? null,
      fallbackModel: fallbackModel ?? null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.aiSettings.taskType, taskType))
    .run();

  log.info('AI settings updated', { taskType, provider, model });

  const updated = db
    .select()
    .from(schema.aiSettings)
    .where(eq(schema.aiSettings.taskType, taskType))
    .get()!;

  res.json({
    id: updated.id,
    taskType: updated.taskType,
    provider: updated.provider,
    model: updated.model,
    fallbackProvider: updated.fallbackProvider,
    fallbackModel: updated.fallbackModel,
  });
});
