# Feature: import (Server)

## Owner
Claude Code

## Scope
This feature owns all files within `src/server/features/import/`.

## Description
Server-side data import handling for CSV, OFX, and QIF financial files. Manages import sessions, file parsing, column mapping, duplicate detection (reuses buildTransactionKey from document-processor), and transaction creation.

## Boundary Rules
**HARD BLOCK: Do NOT edit files outside this folder without explicit user approval.**

- ONLY modify files within `src/server/features/import/` freely
- ASK before modifying: `src/shared/`, `src/app/`, other features, `package.json`, config files, schemas
- When a cross-boundary edit is needed:
  ```
  BOUNDARY ALERT
  File:   [path]
  Reason: [why]
  Change: [what]
  Risk:   [Low/Med/High]
  Proceed? (yes/no)
  ```

## Dependencies
**Shared modules:** `@shared/types`, `@shared/types/validation`
**External packages:** papaparse, uuid, drizzle-orm, zod, multer
**Other features (read-only):** document-processor (buildTransactionKey, deduplicateTransactions)

## Safe to Edit (no approval needed)
- `src/server/features/import/**`
- `tests/**/import/**`
- `docs/requirements/import.md`
- This file

## Always Requires Approval
- `src/features/[OTHER]/*`, `src/shared/*`, `src/app/*`
- `package.json`, `tsconfig.json`, `ARCHITECTURE.md`, `.env.example`
- Database schemas, migrations, CI/CD config

## Progress
- [x] CLAUDE.md created (this file)
- [x] Feature logger created: `src/server/features/import/logger.ts`
- [x] Requirements written
- [x] Architecture updated
- [x] Implementation complete
- [x] All try-catch blocks use `log.error()`
- [x] All API routes log entry + errors
- [x] Tests passing
- [x] Secret scan passed
- [x] Self-review completed
- [x] ARCHITECTURE.md Feature Log updated
- [x] Cross-boundary edits logged below

## Cross-Boundary Edit Log
| Date | File | Change | Approved By |
|------|------|--------|-------------|
| 2026-03-21 | `src/server/app.ts` | Registered import router | Master plan pre-approval |
| 2026-03-21 | `src/server/lib/db/schema/index.ts` | Added import_sessions table | Master plan pre-approval |
| 2026-03-21 | `src/shared/types/index.ts` | Added import types | Master plan pre-approval |
| 2026-03-21 | `src/shared/types/validation.ts` | Added import schemas | Master plan pre-approval |
| 2026-03-21 | `tests/server-setup.ts` | Added import_sessions table to CI setup | Master plan pre-approval |
