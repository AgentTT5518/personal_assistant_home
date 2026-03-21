# Feature: tags (server)

## Owner
Claude Code

## Scope
This feature owns all files within `src/server/features/tags/`.

## Description
Server-side tag and split transaction management: tag CRUD with usage counts, transaction-tag junction operations (add/remove/bulk), split transaction CRUD with sum validation, budget spend query integration (UNION with split_transactions for split-aware calculation), auto-delete splits on parent amount edit.

## Boundary Rules
**HARD BLOCK: Do NOT edit files outside this folder without explicit user approval.**

- ONLY modify files within `src/server/features/tags/` freely
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
**Other features (read-only):** transactions (FK relationships), budgets (spend query cross-boundary)

## Safe to Edit (no approval needed)
- `src/server/features/tags/**`
- `tests/**/tags/**`
- `docs/requirements/tags.md`
- This file

## Always Requires Approval
- `src/features/[OTHER]/*`, `src/shared/*`, `src/app/*`
- `package.json`, `tsconfig.json`, `ARCHITECTURE.md`, `.env.example`
- Database schemas, migrations, CI/CD config

## Progress
- [x] CLAUDE.md created (this file)
- [ ] Feature logger created: `src/server/features/tags/logger.ts`
- [ ] Requirements written
- [ ] Architecture updated
- [ ] Implementation complete
- [ ] All try-catch blocks use `log.error()`
- [ ] All API routes log entry + errors
- [ ] Tests passing
- [ ] Secret scan passed
- [ ] Self-review completed
- [ ] ARCHITECTURE.md Feature Log updated
- [ ] Cross-boundary edits logged below

## Cross-Boundary Edit Log
| Date | File | Change | Approved By |
|------|------|--------|-------------|
| 2026-03-21 | `src/server/lib/db/schema/index.ts` | Added tags, transaction_tags, split_transactions tables; isSplit + previousCategoryId on transactions | Master plan pre-approval |
| 2026-03-21 | `src/server/app.ts` | Register tagRouter | Master plan pre-approval |
| 2026-03-21 | `src/shared/types/index.ts` | Added TagResponse, SplitTransactionResponse, TagInfo; extended TransactionResponse with tags/isSplit; extended TransactionFilters with tagIds | Master plan pre-approval |
| 2026-03-21 | `src/shared/types/validation.ts` | Added tag/split schemas; extended transactionFiltersSchema with tagIds | Master plan pre-approval |
| 2026-03-21 | `src/server/features/transactions/routes.ts` | Added tags via GROUP_CONCAT subquery in GET; added tagIds filter; added split guard on PUT; added parseTagJson helper | Master plan pre-approval |
| 2026-03-21 | `src/server/features/budgets/routes.ts` | Split-aware budget spend: unsplit + split UNION | Master plan pre-approval |
| 2026-03-21 | `src/server/features/document-processor/routes.ts` | Added isSplit/tags to TransactionResponse mapping | Master plan pre-approval |
| 2026-03-21 | `tests/server-setup.ts` | Added new tables/columns for CI | Master plan pre-approval |
