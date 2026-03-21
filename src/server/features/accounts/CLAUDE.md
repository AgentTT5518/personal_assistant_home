# Feature: accounts (server)

## Owner
Claude Code

## Scope
This feature owns all files within `src/server/features/accounts/`.

## Description
Server-side account management: full CRUD for financial accounts, net-worth calculation (credit cards as negative), balance recalculation from linked transactions, soft-delete with optional hard-delete, transaction/document account assignment.

## Boundary Rules
**HARD BLOCK: Do NOT edit files outside this folder without explicit user approval.**

- ONLY modify files within `src/server/features/accounts/` freely
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
**Other features (read-only):** transactions (accountId FK)

## Safe to Edit (no approval needed)
- `src/server/features/accounts/**`
- `tests/**/accounts/**`
- `docs/requirements/accounts.md`
- This file

## Always Requires Approval
- `src/features/[OTHER]/*`, `src/shared/*`, `src/app/*`
- `package.json`, `tsconfig.json`, `ARCHITECTURE.md`, `.env.example`
- Database schemas, migrations, CI/CD config

## Progress
- [x] CLAUDE.md created (this file)
- [ ] Feature logger created: `src/server/features/accounts/logger.ts`
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
| 2026-03-21 | `src/server/lib/db/schema/index.ts` | Added accounts table, accountId FK on transactions + documents | Master plan pre-approval |
| 2026-03-21 | `src/server/app.ts` | Register accountRouter | Master plan pre-approval |
| 2026-03-21 | `src/shared/types/index.ts` | Added AccountType, AccountResponse, NetWorthResponse; extended TransactionResponse + TransactionFilters with accountId | Master plan pre-approval |
| 2026-03-21 | `src/shared/types/validation.ts` | Added account schemas, extended transactionFiltersSchema with accountId | Master plan pre-approval |
| 2026-03-21 | `src/server/features/transactions/routes.ts` | Added accounts join in GET, accountId filter | Master plan pre-approval |
| 2026-03-21 | `src/server/features/document-processor/routes.ts` | Added accountId/accountName to TransactionResponse mapping | Master plan pre-approval |
