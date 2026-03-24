# Feature: import (Client)

## Owner
Claude Code

## Scope
This feature owns all files within `src/client/features/import/`.

## Description
Client-side data import wizard for CSV, OFX, and QIF financial files. Provides a 4-step workflow: upload, column mapping (CSV only), preview with duplicate detection, and confirm/commit.

## Boundary Rules
**HARD BLOCK: Do NOT edit files outside this folder without explicit user approval.**

- ONLY modify files within `src/client/features/import/` freely
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
**External packages:** @tanstack/react-query, lucide-react
**Other features (read-only):** accounts (AccountSelector)

## Safe to Edit (no approval needed)
- `src/client/features/import/**`
- `tests/**/import/**`
- `docs/requirements/import.md`
- This file

## Always Requires Approval
- `src/features/[OTHER]/*`, `src/shared/*`, `src/app/*`
- `package.json`, `tsconfig.json`, `ARCHITECTURE.md`, `.env.example`
- Database schemas, migrations, CI/CD config

## Progress
- [x] CLAUDE.md created (this file)
- [x] Feature logger created: `src/client/features/import/logger.ts`
- [x] Requirements written
- [x] Architecture updated
- [x] Implementation complete
- [x] All try-catch blocks use `log.error()`
- [x] Tests passing
- [x] Secret scan passed
- [x] Self-review completed
- [x] ARCHITECTURE.md Feature Log updated
- [x] Cross-boundary edits logged below

## Cross-Boundary Edit Log
| Date | File | Change | Approved By |
|------|------|--------|-------------|
| 2026-03-21 | `src/client/app/app.tsx` | Added `/import` route | Master plan pre-approval |
| 2026-03-21 | `src/client/app/layout.tsx` | Added "Import" nav item | Master plan pre-approval |
