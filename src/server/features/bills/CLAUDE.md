# Feature: bills

## Owner
Claude Code

## Scope
This feature owns all files within `src/server/features/bills/`.

## Description
Server-side upcoming bills management: CRUD for recurring bills with frequency-based scheduling, mark-paid date advancement, auto-population from recurring detection, and calendar view.

## Boundary Rules
**HARD BLOCK: Do NOT edit files outside this folder without explicit user approval.**

- ONLY modify files within `src/server/features/bills/` freely
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
**Shared modules:** `@shared/types`, `@shared/types/validation`, `src/server/lib/db/schema/index`
**External packages:** drizzle-orm, uuid, zod
**Other features (read-only):** transactions (recurring-detection.service for populate-from-recurring)

## Safe to Edit (no approval needed)
- `src/server/features/bills/**`
- `tests/**/bills/**`
- `docs/requirements/bills.md`
- This file

## Always Requires Approval
- `src/features/[OTHER]/*`, `src/shared/*`, `src/app/*`
- `package.json`, `tsconfig.json`, `ARCHITECTURE.md`, `.env.example`
- Database schemas, migrations, CI/CD config

## Progress
- [x] CLAUDE.md created (this file)
- [x] Feature logger created: `src/server/features/bills/logger.ts`
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
| 2026-03-22 | `src/server/lib/db/schema/index.ts` | Added `bills` table definition | Master plan pre-approval |
| 2026-03-22 | `src/server/app.ts` | Register `billRouter` at `/api` | Master plan pre-approval |
| 2026-03-22 | `src/shared/types/index.ts` | Added BillFrequency, BillResponse, BillCalendarEntry types | Master plan pre-approval |
| 2026-03-22 | `src/shared/types/validation.ts` | Added bill validation schemas | Master plan pre-approval |
