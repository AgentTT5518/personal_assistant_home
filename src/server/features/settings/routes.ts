import { Router } from 'express';
import { z } from 'zod';
import { eq, count } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { db } from '../../lib/db/index.js';
import { appSettings, transactions, accountSummaries, documents, categories } from '../../lib/db/schema/index.js';
import { validateBody } from '../../shared/middleware/validate.js';
import { AppError } from '../../shared/middleware/error-handler.js';
import { log } from './logger.js';

export const settingsRouter = Router();

// --- Validation ---

const SUPPORTED_CURRENCIES = new Set(Intl.supportedValuesOf('currency'));

const updateAppSettingSchema = z.object({
  value: z.string().min(1, 'Value must not be empty'),
});

function validateSettingValue(key: string, value: string): void {
  if (key === 'currency' && !SUPPORTED_CURRENCIES.has(value)) {
    throw new AppError(400, 'VALIDATION_ERROR', `Invalid currency code: ${value}`);
  }
}

// --- Routes ---

// GET /api/settings/app — returns all app settings as Record<string, string>
settingsRouter.get('/settings/app', (_req, res, next) => {
  try {
    log.info('Fetching app settings');
    const rows = db.select().from(appSettings).all();
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    res.json(result);
  } catch (error) {
    log.error('Failed to fetch app settings', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// PUT /api/settings/app/:key — update a single app setting
settingsRouter.put('/settings/app/:key', validateBody(updateAppSettingSchema), (req, res, next) => {
  try {
    const key = req.params.key as string;
    const { value } = req.body as { value: string };

    log.info('Updating app setting', { key, value });

    validateSettingValue(key, value);

    const now = new Date().toISOString();
    const result = db
      .insert(appSettings)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value, updatedAt: now },
      })
      .run();

    if (result.changes === 0) {
      throw new AppError(404, 'SETTING_NOT_FOUND', `Setting '${key}' not found`);
    }

    const updated = db.select().from(appSettings).where(eq(appSettings.key, key)).get();
    res.json(updated);
  } catch (error) {
    if (error instanceof AppError) throw error;
    log.error('Failed to update app setting', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// --- DB Stats ---

// GET /api/settings/stats — database stats and app version
settingsRouter.get('/settings/stats', (_req, res, next) => {
  try {
    log.info('Fetching DB stats');

    const docCount = db.select({ count: count() }).from(documents).get();
    const txnCount = db.select({ count: count() }).from(transactions).get();
    const catCount = db.select({ count: count() }).from(categories).get();

    // DB file size
    const dbPath = process.env.DATABASE_PATH || 'data/assistant.db';
    let dbSizeBytes = 0;
    try {
      const stat = fs.statSync(dbPath);
      dbSizeBytes = stat.size;
    } catch {
      // DB file may not exist in test environment
    }

    // App version from package.json
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    let appVersion = 'unknown';
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { version?: string };
      appVersion = pkg.version ?? 'unknown';
    } catch {
      // package.json may not be available
    }

    res.json({
      documentCount: docCount?.count ?? 0,
      transactionCount: txnCount?.count ?? 0,
      categoryCount: catCount?.count ?? 0,
      dbSizeBytes,
      appVersion,
    });
  } catch (error) {
    log.error('Failed to fetch DB stats', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// --- Data Management ---

const confirmSchema = z.object({ confirm: z.literal(true) });

// DELETE /api/data/all — bulk delete all data
settingsRouter.delete('/data/all', validateBody(confirmSchema), (_req, res, next) => {
  try {
    log.info('Bulk deleting all data');

    // Read file paths before deleting documents
    const docs = db.select({ filePath: documents.filePath }).from(documents).all();

    let deletedTransactions = 0;
    let deletedAccountSummaries = 0;
    let deletedDocuments = 0;

    db.transaction((tx) => {
      // FK order: transactions first, then account summaries, then documents
      const txnResult = tx.delete(transactions).run();
      deletedTransactions = txnResult.changes;

      const asResult = tx.delete(accountSummaries).run();
      deletedAccountSummaries = asResult.changes;

      const docResult = tx.delete(documents).run();
      deletedDocuments = docResult.changes;
    });

    // Clean up uploaded files
    for (const doc of docs) {
      if (doc.filePath) {
        try {
          fs.unlinkSync(doc.filePath);
        } catch {
          // File may already be deleted or missing
        }
      }
    }

    log.info('Bulk delete complete', { deletedTransactions, deletedAccountSummaries, deletedDocuments });

    res.json({ deletedTransactions, deletedAccountSummaries, deletedDocuments });
  } catch (error) {
    log.error('Bulk delete failed', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});
