import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { db, schema } from '../../lib/db/index.js';
import { runCleanup } from './cleanup.service.js';

vi.mock('fs/promises', () => ({
  default: {
    unlink: vi.fn(),
  },
}));

import fs from 'fs/promises';

const mockedFs = vi.mocked(fs);

function insertDocument(createdAt: string, filePath: string | null = '/tmp/test.pdf') {
  const id = uuidv4();
  db.insert(schema.documents)
    .values({
      id,
      filename: 'test.pdf',
      docType: 'bank_statement',
      processingStatus: 'completed',
      filePath,
      createdAt,
      updatedAt: createdAt,
    })
    .run();
  return id;
}

function getDocument(id: string) {
  return db.select().from(schema.documents).where(eq(schema.documents.id, id)).get();
}

describe('runCleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.UPLOAD_RETENTION_DAYS = '30';
  });

  afterEach(() => {
    db.delete(schema.documents).run();
    delete process.env.UPLOAD_RETENTION_DAYS;
  });

  it('deletes files older than retention period and nulls filePath', async () => {
    const oldDate = new Date(Date.now() - 31 * 86_400_000).toISOString();
    const docId = insertDocument(oldDate, '/tmp/old-file.pdf');

    mockedFs.unlink.mockResolvedValue(undefined);

    await runCleanup();

    expect(mockedFs.unlink).toHaveBeenCalledWith('/tmp/old-file.pdf');
    const doc = getDocument(docId);
    expect(doc?.filePath).toBeNull();
  });

  it('does not touch files within retention period', async () => {
    const recentDate = new Date().toISOString();
    const docId = insertDocument(recentDate, '/tmp/recent-file.pdf');

    await runCleanup();

    expect(mockedFs.unlink).not.toHaveBeenCalled();
    const doc = getDocument(docId);
    expect(doc?.filePath).toBe('/tmp/recent-file.pdf');
  });

  it('handles ENOENT gracefully and still nulls filePath', async () => {
    const oldDate = new Date(Date.now() - 31 * 86_400_000).toISOString();
    const docId = insertDocument(oldDate, '/tmp/gone-file.pdf');

    const enoent = new Error('ENOENT') as NodeJS.ErrnoException;
    enoent.code = 'ENOENT';
    mockedFs.unlink.mockRejectedValue(enoent);

    await runCleanup();

    const doc = getDocument(docId);
    expect(doc?.filePath).toBeNull();
  });

  it('skips documents with null filePath', async () => {
    const oldDate = new Date(Date.now() - 31 * 86_400_000).toISOString();
    insertDocument(oldDate, null);

    await runCleanup();

    expect(mockedFs.unlink).not.toHaveBeenCalled();
  });
});
