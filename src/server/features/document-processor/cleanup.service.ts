import fs from 'fs/promises';
import { and, eq, isNotNull, lt } from 'drizzle-orm';
import { db, schema } from '../../lib/db/index.js';
import { log } from './logger.js';

const DAY_MS = 86_400_000;

export async function runCleanup(): Promise<void> {
  const retentionDays = parseInt(process.env.UPLOAD_RETENTION_DAYS ?? '30', 10);
  const cutoff = new Date(Date.now() - retentionDays * DAY_MS).toISOString();

  log.info('Running upload cleanup', { retentionDays, cutoff });

  const expiredDocs = db
    .select({ id: schema.documents.id, filePath: schema.documents.filePath })
    .from(schema.documents)
    .where(and(isNotNull(schema.documents.filePath), lt(schema.documents.createdAt, cutoff)))
    .all();

  let cleaned = 0;

  for (const doc of expiredDocs) {
    if (!doc.filePath) continue;

    try {
      await fs.unlink(doc.filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        log.error('Failed to delete file', error instanceof Error ? error : new Error(String(error)), {
          documentId: doc.id,
          filePath: doc.filePath,
        });
        continue;
      }
      // ENOENT = file already gone, proceed to null out filePath
    }

    db.update(schema.documents)
      .set({ filePath: null, updatedAt: new Date().toISOString() })
      .where(eq(schema.documents.id, doc.id))
      .run();

    cleaned++;
  }

  log.info('Upload cleanup complete', { cleaned, total: expiredDocs.length });
}

export function startCleanupService(): ReturnType<typeof setInterval> {
  // Run immediately on boot
  void runCleanup();

  // Then daily
  return setInterval(() => {
    void runCleanup();
  }, DAY_MS);
}
