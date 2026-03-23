import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { app } from '../../app.js';
import { db, schema } from '../../lib/db/index.js';

function seedDocument(filename = 'test.pdf') {
  const now = new Date().toISOString();
  const id = uuidv4();
  db.insert(schema.documents).values({
    id, filename, docType: 'bank_statement', processingStatus: 'completed',
    createdAt: now, updatedAt: now,
  }).run();
  return id;
}

function seedTransaction(documentId: string, overrides: Partial<typeof schema.transactions.$inferInsert> = {}) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.insert(schema.transactions).values({
    id, documentId, date: '2026-01-15', description: 'Existing', amount: 100, type: 'debit',
    createdAt: now, updatedAt: now, ...overrides,
  }).run();
  return id;
}

function createTempFile(content: string, ext: string): string {
  const tmpDir = os.tmpdir();
  const filePath = path.join(tmpDir, `test-import-${Date.now()}.${ext}`);
  fs.writeFileSync(filePath, content);
  return filePath;
}

beforeEach(() => {
  db.delete(schema.reports).run();
  db.delete(schema.goalContributions).run();
  db.delete(schema.goals).run();
  db.delete(schema.splitTransactions).run();
  db.delete(schema.transactionTags).run();
  db.delete(schema.tags).run();
  db.delete(schema.budgets).run();
  db.delete(schema.bills).run();
  db.delete(schema.categoryRules).run();
  db.delete(schema.transactions).run();
  db.delete(schema.importSessions).run();
  db.delete(schema.accountSummaries).run();
  db.delete(schema.documents).run();
  db.delete(schema.accounts).run();
  db.delete(schema.categories).run();
});

describe('Import Upload', () => {
  it('POST /api/import/upload accepts CSV with auto-mapping', async () => {
    const csv = 'Date,Description,Amount\n2026-01-15,Test Purchase,-50.00\n2026-01-16,Salary,3000.00';
    const filePath = createTempFile(csv, 'csv');

    try {
      const res = await request(app)
        .post('/api/import/upload')
        .attach('file', filePath)
        .field('accountId', '');

      expect(res.status).toBe(201);
      expect(res.body.session).toBeDefined();
      expect(res.body.session.fileType).toBe('csv');
      expect(res.body.needsMapping).toBe(false);
      expect(res.body.preview).toHaveLength(2);
      expect(res.body.preview[0].description).toBe('Test Purchase');
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it('POST /api/import/upload accepts OFX file', async () => {
    const ofx = `<OFX>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260115120000
<TRNAMT>-50.00
<NAME>Test Merchant
</STMTTRN>
</OFX>`;
    const filePath = createTempFile(ofx, 'ofx');

    try {
      const res = await request(app)
        .post('/api/import/upload')
        .attach('file', filePath);

      expect(res.status).toBe(201);
      expect(res.body.session.fileType).toBe('ofx');
      expect(res.body.needsMapping).toBe(false);
      expect(res.body.preview).toHaveLength(1);
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it('POST /api/import/upload accepts QIF file', async () => {
    const qif = `!Type:Bank
D01/15/2026
T-50.00
PTest Merchant
^`;
    const filePath = createTempFile(qif, 'qif');

    try {
      const res = await request(app)
        .post('/api/import/upload')
        .attach('file', filePath);

      expect(res.status).toBe(201);
      expect(res.body.session.fileType).toBe('qif');
      expect(res.body.preview).toHaveLength(1);
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it('POST /api/import/upload rejects unsupported file types', async () => {
    const filePath = createTempFile('test content', 'txt');

    try {
      const res = await request(app)
        .post('/api/import/upload')
        .attach('file', filePath);

      // Multer filter rejects it
      expect(res.status).toBe(400);
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it('POST /api/import/upload returns 400 with no file', async () => {
    const res = await request(app)
      .post('/api/import/upload');

    expect(res.status).toBe(400);
  });
});

describe('Import Confirm', () => {
  it('confirms import and creates transactions', async () => {
    const csv = 'Date,Description,Amount\n2026-03-01,New Transaction,-75.00';
    const filePath = createTempFile(csv, 'csv');

    try {
      const uploadRes = await request(app)
        .post('/api/import/upload')
        .attach('file', filePath);

      expect(uploadRes.status).toBe(201);
      const sessionId = uploadRes.body.session.id;

      const confirmRes = await request(app)
        .post(`/api/import/${sessionId}/confirm`)
        .send({ selectedRows: [0] });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.importedCount).toBe(1);
      expect(confirmRes.body.session.status).toBe('completed');

      // Verify transaction was created
      const txRes = await request(app).get('/api/transactions?search=New%20Transaction');
      expect(txRes.body.data.length).toBeGreaterThanOrEqual(1);
    } finally {
      fs.unlinkSync(filePath);
    }
  });
});

describe('Import Sessions', () => {
  it('GET /api/import/sessions lists sessions', async () => {
    const csv = 'Date,Description,Amount\n2026-01-15,Test,-50.00';
    const filePath = createTempFile(csv, 'csv');

    try {
      await request(app)
        .post('/api/import/upload')
        .attach('file', filePath);

      const res = await request(app).get('/api/import/sessions');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].filename).toMatch(/test-import/);
    } finally {
      fs.unlinkSync(filePath);
    }
  });
});

describe('Import Undo', () => {
  it('DELETE /api/import/:id/undo removes imported transactions', async () => {
    const csv = 'Date,Description,Amount\n2026-03-10,Undo Test,-99.00';
    const filePath = createTempFile(csv, 'csv');

    try {
      const uploadRes = await request(app)
        .post('/api/import/upload')
        .attach('file', filePath);

      const sessionId = uploadRes.body.session.id;

      await request(app)
        .post(`/api/import/${sessionId}/confirm`)
        .send({ selectedRows: [0] });

      // Verify transaction exists
      const beforeUndo = await request(app).get('/api/transactions?search=Undo%20Test');
      expect(beforeUndo.body.data.length).toBe(1);

      // Undo
      const undoRes = await request(app).delete(`/api/import/${sessionId}/undo`);
      expect(undoRes.status).toBe(200);
      expect(undoRes.body.undoneCount).toBe(1);

      // Verify transaction is gone
      const afterUndo = await request(app).get('/api/transactions?search=Undo%20Test');
      expect(afterUndo.body.data.length).toBe(0);
    } finally {
      fs.unlinkSync(filePath);
    }
  });
});

describe('Import Delete', () => {
  it('DELETE /api/import/:id deletes session and transactions', async () => {
    const csv = 'Date,Description,Amount\n2026-03-10,Delete Test,-50.00';
    const filePath = createTempFile(csv, 'csv');

    try {
      const uploadRes = await request(app)
        .post('/api/import/upload')
        .attach('file', filePath);

      const sessionId = uploadRes.body.session.id;

      await request(app)
        .post(`/api/import/${sessionId}/confirm`)
        .send({ selectedRows: [0] });

      const delRes = await request(app).delete(`/api/import/${sessionId}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      // Session should be gone
      const sessionsRes = await request(app).get('/api/import/sessions');
      const found = sessionsRes.body.find((s: { id: string }) => s.id === sessionId);
      expect(found).toBeUndefined();
    } finally {
      fs.unlinkSync(filePath);
    }
  });
});

describe('Import Duplicate Detection', () => {
  it('flags duplicate rows in preview', async () => {
    const docId = seedDocument();
    // Seed an existing transaction that will match
    seedTransaction(docId, { date: '2026-01-15', description: 'Existing Purchase', amount: 50, type: 'debit' });

    const csv = 'Date,Description,Amount\n2026-01-15,Existing Purchase,-50.00\n2026-01-16,New Item,-25.00';
    const filePath = createTempFile(csv, 'csv');

    try {
      const res = await request(app)
        .post('/api/import/upload')
        .attach('file', filePath);

      expect(res.status).toBe(201);
      const duplicateRow = res.body.preview.find((r: ImportPreviewRow) => r.description === 'Existing Purchase');
      const newRow = res.body.preview.find((r: ImportPreviewRow) => r.description === 'New Item');
      expect(duplicateRow?.isDuplicate).toBe(true);
      expect(newRow?.isDuplicate).toBe(false);
    } finally {
      fs.unlinkSync(filePath);
    }
  });
});

interface ImportPreviewRow {
  description: string;
  isDuplicate: boolean;
}
