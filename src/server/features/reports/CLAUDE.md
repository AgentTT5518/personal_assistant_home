# Feature: reports

## Owner
Claude Code

## Scope
This feature owns all files within `src/server/features/reports/`.

## Description
Server-side report generation: aggregates transaction data into structured reports (monthly/quarterly/yearly/custom), stores as JSON, and generates PDF exports using pdf-lib.

## Boundary Rules
**HARD BLOCK: Do NOT edit files outside this folder without explicit user approval.**

- ONLY modify files within `src/server/features/reports/` freely
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
**External packages:** drizzle-orm, uuid, zod, pdf-lib
**Other features (read-only):** budgets (getPeriodDateRange logic), transactions (data queries)

## Safe to Edit (no approval needed)
- `src/server/features/reports/**`
- `tests/**/reports/**`
- `docs/requirements/reports.md`
- This file

## Always Requires Approval
- `src/features/[OTHER]/*`, `src/shared/*`, `src/app/*`
- `package.json`, `tsconfig.json`, `ARCHITECTURE.md`, `.env.example`
- Database schemas, migrations, CI/CD config

## Progress
- [x] CLAUDE.md created (this file)
- [x] Feature logger created: `src/server/features/reports/logger.ts`
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
| 2026-03-23 | `src/server/lib/db/schema/index.ts` | Added `reports` table definition | Master plan pre-approval |
| 2026-03-23 | `src/server/app.ts` | Register `reportRouter` at `/api` | Master plan pre-approval |
| 2026-03-23 | `src/shared/types/index.ts` | Added ReportType, ReportData, ReportResponse, ReportListItem types | Master plan pre-approval |
| 2026-03-23 | `src/shared/types/validation.ts` | Added reportTypeSchema, generateReportSchema | Master plan pre-approval |
| 2026-03-23 | `tests/server-setup.ts` | Added reports table to CI setup | Master plan pre-approval |
