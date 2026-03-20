# Feature: budgets

## Owner
Claude Code

## Scope
This feature owns all files within `src/server/features/budgets/`.

## Description
Server-side budget management: CRUD for per-category spending limits with period-aware spend calculation (monthly/weekly/yearly).

## Boundary Rules
**HARD BLOCK: Do NOT edit files outside this folder without explicit user approval.**

- ONLY modify files within `src/server/features/budgets/` freely
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
**Other features (read-only):** none

## Safe to Edit (no approval needed)
- `src/server/features/budgets/**`
- `tests/**/budgets/**`
- `docs/requirements/budgets.md`
- This file

## Always Requires Approval
- `src/features/[OTHER]/*`, `src/shared/*`, `src/app/*`
- `package.json`, `tsconfig.json`, `ARCHITECTURE.md`, `.env.example`
- Database schemas, migrations, CI/CD config

## Progress
- [x] CLAUDE.md created (this file)
- [x] Feature logger created: `src/server/features/budgets/logger.ts`
- [ ] Requirements written
- [x] Architecture updated
- [x] Implementation complete
- [x] All try-catch blocks use `log.error()`
- [x] All API routes log entry + errors
- [ ] Tests passing
- [ ] Secret scan passed
- [ ] Self-review completed
- [x] ARCHITECTURE.md Feature Log updated
- [x] Cross-boundary edits logged below

## Cross-Boundary Edit Log
| Date | File | Change | Approved By |
|------|------|--------|-------------|
| 2026-03-20 | `src/server/lib/db/schema/index.ts` | Add `budgets` table definition | Phase 1 Polish plan pre-approval |
| 2026-03-20 | `src/server/app.ts` | Mount `budgetRouter` at `/api` | Phase 1 Polish plan pre-approval |
| 2026-03-20 | `src/shared/types/index.ts` | Add BudgetResponse, BudgetSummaryResponse, BudgetPeriod types | Phase 1 Polish plan pre-approval |
| 2026-03-20 | `src/shared/types/validation.ts` | Add createBudgetSchema, updateBudgetSchema | Phase 1 Polish plan pre-approval |
