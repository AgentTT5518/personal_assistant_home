import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import { appSettings } from '../../lib/db/schema/index.js';
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
