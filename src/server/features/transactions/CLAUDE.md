# Feature: transactions

## Owner
Claude Code

## Scope
This feature owns all files within `src/server/features/transactions/`.

## Description
Server-side transaction management: filtering, searching, pagination, rule-based and AI-assisted categorisation, category CRUD, and bulk operations.

## Boundary Rules
**HARD BLOCK: Do NOT edit files outside this folder without explicit user approval.**

- ONLY modify files within `src/server/features/transactions/` freely
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
**External packages:** uuid, drizzle-orm, zod
**Other features (read-only):** document-processor (extraction pipeline hooks)

## Safe to Edit (no approval needed)
- `src/server/features/transactions/**`
- `tests/**/transactions/**`
- `docs/requirements/transactions.md`
- This file

## Always Requires Approval
- `src/features/[OTHER]/*`, `src/shared/*`, `src/app/*`
- `package.json`, `tsconfig.json`, `ARCHITECTURE.md`, `.env.example`
- Database schemas, migrations, CI/CD config

## Progress
- [x] CLAUDE.md created (this file)
- [x] Feature logger created: `src/server/features/transactions/logger.ts`
- [ ] Requirements written
- [ ] Architecture updated
- [ ] Implementation complete
- [ ] All try-catch blocks use `log.error()`
- [ ] All API routes log entry + errors
- [ ] All external service calls log failures
- [ ] Tests passing
- [ ] Secret scan passed
- [ ] Self-review completed
- [ ] ARCHITECTURE.md Feature Log updated
- [ ] Cross-boundary edits logged below

## Cross-Boundary Edit Log
| Date | File | Change | Approved By |
|------|------|--------|-------------|
| 2026-03-20 | `src/shared/types/index.ts` | Added `RecurringGroup` type for recurring detection endpoints | Phase 1 Polish plan pre-approval |
