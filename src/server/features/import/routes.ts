import { Router } from 'express';
import { eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { db, schema } from '../../lib/db/index.js';
import { validateBody } from '../../shared/middleware/validate.js';
import { AppError } from '../../shared/middleware/error-handler.js';
import { columnMappingSchema, importConfirmSchema } from '../../../shared/types/validation.js';
import type {
  ImportSessionResponse,
  ImportPreviewRow,
  ImportUploadResponse,
  ExtractedTransaction,
} from '../../../shared/types/index.js';
import { buildTransactionKey } from '../document-processor/dedup.js';
import { parseCsvRaw, mapCsvRows } from './csv-parser.js';
import { parseOfx } from './ofx-parser.js';
import { parseQif } from './qif-parser.js';
import { log } from './logger.js';

function paramStr(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export const importRouter = Router();

// In-memory storage for uploaded file content during import wizard
// Key: sessionId, Value: { rawContent, rawRows (CSV), transactions (OFX/QIF) }
const sessionCache = new Map<
  string,
  {
    rawContent: string;
    rawRows?: Record<string, string>[];
    headers?: string[];
    transactions?: ExtractedTransaction[];
  }
>();

// Multer config for import files (memory storage — we parse the content, not save to disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().split('.').pop();
    if (ext === 'csv' || ext === 'ofx' || ext === 'qfx' || ext === 'qif') {
      cb(null, true);
    } else {
      cb(new AppError(400, 'INVALID_FILE_TYPE', 'Only CSV, OFX, QFX, and QIF files are accepted'));
    }
  },
});

// POST /api/import/upload — Upload file, create session, parse, return preview
importRouter.post('/import/upload', upload.single('file'), (req, res, next) => {
  try {
    log.info('Import file upload');

    if (!req.file) {
      throw new AppError(400, 'NO_FILE', 'No file was uploaded');
    }

    const content = req.file.buffer.toString('utf-8');
    const ext = req.file.originalname.toLowerCase().split('.').pop() ?? '';
    const accountId = typeof req.body.accountId === 'string' && req.body.accountId ? req.body.accountId : null;

    let fileType: 'csv' | 'ofx' | 'qif';
    if (ext === 'csv') fileType = 'csv';
    else if (ext === 'ofx' || ext === 'qfx') fileType = 'ofx';
    else if (ext === 'qif') fileType = 'qif';
    else throw new AppError(400, 'INVALID_FILE_TYPE', `Unsupported file extension: .${ext}`);

    const now = new Date().toISOString();
    const sessionId = uuidv4();

    let headers: string[] | undefined;
    let preview: ImportPreviewRow[];
    let needsMapping = false;
    let transactions: ExtractedTransaction[];

    if (fileType === 'csv') {
      const parsed = parseCsvRaw(content);
      headers = parsed.headers;

      // Try auto-mapping common column names
      const autoMapping = tryAutoMapCsv(headers);
      if (autoMapping) {
        transactions = mapCsvRows(parsed.rawRows, autoMapping);
        preview = buildPreview(transactions, accountId);
      } else {
        needsMapping = true;
        transactions = [];
        preview = [];
      }

      sessionCache.set(sessionId, {
        rawContent: content,
        rawRows: parsed.rawRows,
        headers,
        transactions: autoMapping ? transactions : undefined,
      });
    } else if (fileType === 'ofx') {
      transactions = parseOfx(content);
      preview = buildPreview(transactions, accountId);
      sessionCache.set(sessionId, { rawContent: content, transactions });
    } else {
      transactions = parseQif(content);
      preview = buildPreview(transactions, accountId);
      sessionCache.set(sessionId, { rawContent: content, transactions });
    }

    // Create session in DB
    const totalRows = needsMapping ? 0 : transactions.length;
    const duplicateRows = needsMapping ? 0 : preview.filter((r) => r.isDuplicate).length;

    db.insert(schema.importSessions)
      .values({
        id: sessionId,
        filename: req.file.originalname,
        fileType,
        accountId,
        totalRows,
        duplicateRows,
        status: needsMapping ? 'pending' : 'previewed',
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const session = getSessionResponse(sessionId);
    if (!session) {
      throw new AppError(500, 'SESSION_CREATE_FAILED', 'Failed to create import session');
    }

    const response: ImportUploadResponse = {
      session,
      headers,
      preview,
      needsMapping,
    };

    res.status(201).json(response);
  } catch (error) {
    log.error('Failed to upload import file', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// PUT /api/import/:id/mapping — Save column mapping, re-parse CSV
importRouter.put('/import/:id/mapping', validateBody(columnMappingSchema), (req, res, next) => {
  try {
    const id = paramStr(req.params.id);
    log.info('Saving column mapping', { sessionId: id });

    const session = db.select().from(schema.importSessions).where(eq(schema.importSessions.id, id)).get();
    if (!session) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Import session not found');
    }
    if (session.fileType !== 'csv') {
      throw new AppError(400, 'NOT_CSV', 'Column mapping is only applicable to CSV files');
    }

    const cached = sessionCache.get(id);
    if (!cached?.rawRows) {
      throw new AppError(400, 'SESSION_EXPIRED', 'Session data expired. Please re-upload the file.');
    }

    const mapping = req.body;
    const transactions = mapCsvRows(cached.rawRows, mapping);
    const preview = buildPreview(transactions, session.accountId);

    // Update cache with mapped transactions
    cached.transactions = transactions;
    sessionCache.set(id, cached);

    const now = new Date().toISOString();
    db.update(schema.importSessions)
      .set({
        columnMapping: JSON.stringify(mapping),
        totalRows: transactions.length,
        duplicateRows: preview.filter((r) => r.isDuplicate).length,
        status: 'previewed',
        updatedAt: now,
      })
      .where(eq(schema.importSessions.id, id))
      .run();

    const updatedSession = getSessionResponse(id);

    const response: ImportUploadResponse = {
      session: updatedSession!,
      headers: cached.headers,
      preview,
      needsMapping: false,
    };

    res.json(response);
  } catch (error) {
    log.error('Failed to save column mapping', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// GET /api/import/:id/preview — Get parsed rows with duplicate flags
importRouter.get('/import/:id/preview', (req, res, next) => {
  try {
    const id = paramStr(req.params.id);
    log.info('Getting import preview', { sessionId: id });

    const session = db.select().from(schema.importSessions).where(eq(schema.importSessions.id, id)).get();
    if (!session) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Import session not found');
    }

    const cached = sessionCache.get(id);
    if (!cached?.transactions) {
      throw new AppError(400, 'SESSION_EXPIRED', 'Session data expired. Please re-upload the file.');
    }

    const preview = buildPreview(cached.transactions, session.accountId);
    res.json({ preview });
  } catch (error) {
    log.error('Failed to get import preview', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// POST /api/import/:id/confirm — Commit selected rows as transactions
importRouter.post('/import/:id/confirm', validateBody(importConfirmSchema), (req, res, next) => {
  try {
    const id = paramStr(req.params.id);
    const { selectedRows } = req.body as { selectedRows: number[] };
    log.info('Confirming import', { sessionId: id, selectedCount: selectedRows.length });

    const session = db.select().from(schema.importSessions).where(eq(schema.importSessions.id, id)).get();
    if (!session) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Import session not found');
    }
    if (session.status === 'completed') {
      throw new AppError(400, 'ALREADY_COMPLETED', 'This import session has already been completed');
    }

    const cached = sessionCache.get(id);
    if (!cached?.transactions) {
      throw new AppError(400, 'SESSION_EXPIRED', 'Session data expired. Please re-upload the file.');
    }

    const selectedSet = new Set(selectedRows);
    const toImport = cached.transactions.filter((_, i) => selectedSet.has(i));

    if (toImport.length === 0) {
      throw new AppError(400, 'NO_ROWS_SELECTED', 'No rows selected for import');
    }

    const now = new Date().toISOString();
    let importedCount = 0;

    // Get existing keys for final dedup check
    const existingKeys = getExistingTransactionKeys(session.accountId);

    for (const txn of toImport) {
      const key = buildTransactionKey(txn, null);
      if (existingKeys.has(key)) {
        continue;
      }

      db.insert(schema.transactions)
        .values({
          id: uuidv4(),
          documentId: null,
          importSessionId: id,
          date: txn.date,
          description: txn.description,
          amount: txn.amount,
          type: txn.type,
          merchant: txn.merchant ?? null,
          accountId: session.accountId,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      existingKeys.add(key);
      importedCount++;
    }

    // Update session
    db.update(schema.importSessions)
      .set({
        importedRows: importedCount,
        status: 'completed',
        updatedAt: now,
      })
      .where(eq(schema.importSessions.id, id))
      .run();

    // Clean up cache
    sessionCache.delete(id);

    const updatedSession = getSessionResponse(id);
    res.json({ session: updatedSession, importedCount });
  } catch (error) {
    log.error('Failed to confirm import', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// DELETE /api/import/:id/undo — Delete all transactions from this session
importRouter.delete('/import/:id/undo', (req, res, next) => {
  try {
    const id = paramStr(req.params.id);
    log.info('Undoing import', { sessionId: id });

    const session = db.select().from(schema.importSessions).where(eq(schema.importSessions.id, id)).get();
    if (!session) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Import session not found');
    }

    // Delete transactions linked to this session
    const result = db
      .delete(schema.transactions)
      .where(eq(schema.transactions.importSessionId, id))
      .run();

    // Reset session status
    const now = new Date().toISOString();
    db.update(schema.importSessions)
      .set({
        importedRows: 0,
        status: 'pending',
        updatedAt: now,
      })
      .where(eq(schema.importSessions.id, id))
      .run();

    res.json({ undoneCount: result.changes });
  } catch (error) {
    log.error('Failed to undo import', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// GET /api/import/sessions — List import sessions
importRouter.get('/import/sessions', (_req, res, next) => {
  try {
    log.info('Listing import sessions');

    const rows = db
      .select({
        id: schema.importSessions.id,
        filename: schema.importSessions.filename,
        fileType: schema.importSessions.fileType,
        accountId: schema.importSessions.accountId,
        accountName: schema.accounts.name,
        totalRows: schema.importSessions.totalRows,
        importedRows: schema.importSessions.importedRows,
        duplicateRows: schema.importSessions.duplicateRows,
        status: schema.importSessions.status,
        errorMessage: schema.importSessions.errorMessage,
        createdAt: schema.importSessions.createdAt,
        updatedAt: schema.importSessions.updatedAt,
      })
      .from(schema.importSessions)
      .leftJoin(schema.accounts, eq(schema.importSessions.accountId, schema.accounts.id))
      .orderBy(sql`${schema.importSessions.createdAt} DESC`)
      .all();

    const sessions: ImportSessionResponse[] = rows.map((r) => ({
      id: r.id,
      filename: r.filename,
      fileType: r.fileType as 'csv' | 'ofx' | 'qif',
      accountId: r.accountId,
      accountName: r.accountName ?? null,
      totalRows: r.totalRows,
      importedRows: r.importedRows,
      duplicateRows: r.duplicateRows,
      status: r.status as ImportSessionResponse['status'],
      errorMessage: r.errorMessage,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    res.json(sessions);
  } catch (error) {
    log.error('Failed to list import sessions', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// DELETE /api/import/:id — Delete session and its transactions
importRouter.delete('/import/:id', (req, res, next) => {
  try {
    const id = paramStr(req.params.id);
    log.info('Deleting import session', { sessionId: id });

    const session = db.select().from(schema.importSessions).where(eq(schema.importSessions.id, id)).get();
    if (!session) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Import session not found');
    }

    // Delete transactions linked to this session first
    db.delete(schema.transactions)
      .where(eq(schema.transactions.importSessionId, id))
      .run();

    // Delete session
    db.delete(schema.importSessions)
      .where(eq(schema.importSessions.id, id))
      .run();

    // Clean up cache
    sessionCache.delete(id);

    res.json({ success: true });
  } catch (error) {
    log.error('Failed to delete import session', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// --- Helpers ---

function getSessionResponse(id: string): ImportSessionResponse | null {
  const row = db
    .select({
      id: schema.importSessions.id,
      filename: schema.importSessions.filename,
      fileType: schema.importSessions.fileType,
      accountId: schema.importSessions.accountId,
      accountName: schema.accounts.name,
      totalRows: schema.importSessions.totalRows,
      importedRows: schema.importSessions.importedRows,
      duplicateRows: schema.importSessions.duplicateRows,
      status: schema.importSessions.status,
      errorMessage: schema.importSessions.errorMessage,
      createdAt: schema.importSessions.createdAt,
      updatedAt: schema.importSessions.updatedAt,
    })
    .from(schema.importSessions)
    .leftJoin(schema.accounts, eq(schema.importSessions.accountId, schema.accounts.id))
    .where(eq(schema.importSessions.id, id))
    .get();

  if (!row) return null;

  return {
    id: row.id,
    filename: row.filename,
    fileType: row.fileType as 'csv' | 'ofx' | 'qif',
    accountId: row.accountId,
    accountName: row.accountName ?? null,
    totalRows: row.totalRows,
    importedRows: row.importedRows,
    duplicateRows: row.duplicateRows,
    status: row.status as ImportSessionResponse['status'],
    errorMessage: row.errorMessage,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function getExistingTransactionKeys(_accountId: string | null): Set<string> {
  const rows = db
    .select({
      date: schema.transactions.date,
      description: schema.transactions.description,
      amount: schema.transactions.amount,
    })
    .from(schema.transactions)
    .all();

  const keys = new Set<string>();
  for (const r of rows) {
    const key = `${r.date}|${r.description}|${r.amount.toFixed(2)}|`;
    keys.add(key);
  }
  return keys;
}

function buildPreview(transactions: ExtractedTransaction[], accountId: string | null): ImportPreviewRow[] {
  const existingKeys = getExistingTransactionKeys(accountId);
  const seen = new Set<string>();

  return transactions.map((t, index) => {
    const key = buildTransactionKey(t, null);
    const isDuplicate = existingKeys.has(key) || seen.has(key);
    seen.add(key);

    return {
      rowIndex: index,
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type,
      merchant: t.merchant ?? null,
      isDuplicate,
      duplicateKey: key,
      selected: !isDuplicate,
    };
  });
}

function tryAutoMapCsv(headers: string[]): import('../../../shared/types/index.js').ColumnMapping | null {
  const lower = headers.map((h) => h.toLowerCase().trim());

  const dateCol = headers[lower.findIndex((h) => /^(date|transaction.?date|posted.?date|value.?date)$/i.test(h))];
  const descCol = headers[lower.findIndex((h) => /^(description|narrative|memo|details|particulars|reference)$/i.test(h))];
  const amtCol = headers[lower.findIndex((h) => /^(amount|value|sum|total)$/i.test(h))];
  const typeCol = headers[lower.findIndex((h) => /^(type|transaction.?type|dr.?cr)$/i.test(h))];
  const debitCol = headers[lower.findIndex((h) => /^(debit|debit.?amount|withdrawal)$/i.test(h))];
  const creditCol = headers[lower.findIndex((h) => /^(credit|credit.?amount|deposit)$/i.test(h))];
  const merchantCol = headers[lower.findIndex((h) => /^(merchant|payee|vendor)$/i.test(h))];

  if (!dateCol || !descCol) return null;
  if (!amtCol && !(debitCol && creditCol)) return null;

  return {
    date: dateCol,
    description: descCol,
    amount: amtCol || debitCol,
    ...(typeCol ? { type: typeCol } : {}),
    ...(debitCol ? { debitAmount: debitCol } : {}),
    ...(creditCol ? { creditAmount: creditCol } : {}),
    ...(merchantCol ? { merchant: merchantCol } : {}),
  };
}
