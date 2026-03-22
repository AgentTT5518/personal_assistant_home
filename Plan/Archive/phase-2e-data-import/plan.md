# Plan: Data Import — CSV/OFX/QIF (Phase 2E)

**Status:** Approved (covered by master plan)
**Created:** 2026-03-21
**Feature Branch:** `feature/phase-2e-data-import`

---

## Goal / Problem Statement
Users need to import transactions from CSV, OFX, and QIF files exported from their bank/financial apps. This supplements the existing PDF upload pipeline by supporting structured file formats directly — no AI extraction needed.

## Implementation Order

1. **Dependencies** — Install `papaparse` (CSV parsing) + `@types/papaparse`; hand-write QIF parser; hand-write OFX parser (XML-based, simpler than pulling in ofx-js)
2. **Schema** — Add `import_sessions` table; make `transactions.documentId` nullable; add `importSessionId` column to transactions
3. **Migration** — `npm run db:generate` (Drizzle will recreate transactions table for NOT NULL → nullable change)
4. **Test setup** — Update `tests/server-setup.ts` with new table + column changes
5. **Types** — Add `ImportSessionResponse`, `ImportPreviewRow`, `ColumnMapping`; extend `TransactionResponse` with `importSessionId`
6. **Validation** — Add import-related zod schemas (upload, column mapping, confirm)
7. **Server: Parsers** — `csv-parser.ts`, `ofx-parser.ts`, `qif-parser.ts` — all return `ExtractedTransaction[]`
8. **Server: Routes** — Import session CRUD, upload+parse, preview with dedup, confirm (batch insert), undo (delete by session)
9. **Client: Module** — api.ts, hooks.ts, logger.ts, index.ts
10. **Client: Components** — ImportWizard (4-step), FileUpload, ColumnMapper (CSV only), ImportPreview, ImportHistory
11. **Cross-boundary: Settings page** — Add "Import Data" button
12. **Cross-boundary: App routes** — Add `/import` route
13. **Cross-boundary: Sidebar** — Add Import nav item under Data section

## Schema Design

### New Table: `import_sessions`
```
id              TEXT PRIMARY KEY (UUID)
filename        TEXT NOT NULL
fileType        TEXT NOT NULL ('csv' | 'ofx' | 'qif')
accountId       TEXT REFERENCES accounts(id) ON DELETE SET NULL
columnMapping   TEXT (JSON string, CSV only)
totalRows       INTEGER NOT NULL DEFAULT 0
importedRows    INTEGER NOT NULL DEFAULT 0
duplicateRows   INTEGER NOT NULL DEFAULT 0
status          TEXT NOT NULL DEFAULT 'pending' ('pending' | 'mapped' | 'previewed' | 'completed' | 'failed')
errorMessage    TEXT
createdAt       TEXT NOT NULL
updatedAt       TEXT NOT NULL
```

### Modified: `transactions`
- `documentId`: change from `NOT NULL` → nullable (imported txns have no document)
- Add `importSessionId`: `TEXT REFERENCES import_sessions(id) ON DELETE SET NULL` (nullable)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/import/upload` | Upload file, create session, parse, return preview data |
| PUT | `/api/import/:id/mapping` | Save column mapping (CSV), re-parse with mapping, return preview |
| GET | `/api/import/:id/preview` | Get parsed rows with duplicate flags |
| POST | `/api/import/:id/confirm` | Commit non-duplicate rows as transactions |
| DELETE | `/api/import/:id/undo` | Delete all transactions for this session |
| GET | `/api/import/sessions` | List import sessions |
| DELETE | `/api/import/:id` | Delete session (and its transactions) |

## Parsers

### CSV Parser (papaparse)
- Auto-detect delimiter (comma, semicolon, tab)
- Return raw rows + detected headers
- Column mapping step maps headers → {date, description, amount, type, merchant}
- Handle amount sign conventions (negative = debit, or separate debit/credit columns)

### OFX Parser (hand-written)
- OFX is SGML/XML; parse `<STMTTRN>` elements
- Extract: DTPOSTED → date, NAME/MEMO → description, TRNAMT → amount, TRNTYPE → type
- Skip column mapping (format is structured)

### QIF Parser (hand-written)
- Line-based format: D=date, T=amount, P=payee, M=memo, ^=record separator
- Skip column mapping (format is structured)

## Duplicate Detection
- Reuse `buildTransactionKey()` from `document-processor/dedup.ts`
- On preview: query existing transaction keys from DB, flag matches
- On confirm: only insert non-duplicate rows (user can override per-row)

## Client Wizard Flow
1. **Upload** — File picker (accept .csv, .ofx, .qif), optional account selector
2. **Column Mapping** — (CSV only) Map detected columns to required fields, skip for OFX/QIF
3. **Preview** — Table showing parsed rows, duplicate flags (yellow highlight), row-level toggle to include/exclude
4. **Confirm** — Summary (X new, Y duplicates skipped), confirm button → POST confirm

## Cross-Boundary Alerts

| File | Change | Risk | Approval |
|------|--------|------|----------|
| `src/server/lib/db/schema/index.ts` | Add import_sessions table; make documentId nullable; add importSessionId to transactions | Med | Master plan |
| `src/shared/types/index.ts` | Add ImportSessionResponse, ImportPreviewRow, ColumnMapping types | Med | Master plan |
| `src/shared/types/validation.ts` | Add import schemas | Low | Master plan |
| `src/server/app.ts` | Register importRouter | Low | Master plan |
| `src/client/app/app.tsx` | Add /import route | Low | Master plan |
| `src/client/app/layout.tsx` | Add Import nav item to Data section | Low | Master plan |
| `src/client/app/pages/settings.tsx` | Add Import Data button/link | Low | Master plan |
| `tests/server-setup.ts` | Add import_sessions table, updated transactions columns | Low | Master plan |
| `package.json` | Add papaparse + @types/papaparse | Low | Master plan |

## Decisions Made
- Hand-write OFX/QIF parsers instead of pulling in npm packages (simpler, fewer deps, formats are well-defined)
- importSessionId FK uses ON DELETE SET NULL — deleting a session leaves transactions intact
- documentId becomes nullable — imported transactions have no source document
- Reuse existing dedup infrastructure from document-processor
- 4-step wizard as a dedicated /import page (not a modal — too complex for modal)

## Open Questions
- None (all resolved in master plan review)
