# Feature: tags (client)

## Owner
Claude Code

## Scope
This feature owns all files within `src/client/features/tags/`.

## Description
Client-side tag and split transaction management: TagManager modal (CRUD with color picker from Settings), TagSelector multi-select pill component, TagBadge display, SplitTransactionModal for splitting transactions into sub-allocations with category + amount + description per row.

## Boundary Rules
**HARD BLOCK: Do NOT edit files outside this folder without explicit user approval.**

- ONLY modify files within `src/client/features/tags/` freely
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
**Other features (read-only):** transactions (transaction table integration), settings (TagManager access point)

## Safe to Edit (no approval needed)
- `src/client/features/tags/**`
- `tests/**/tags/**`
- `docs/requirements/tags.md`
- This file

## Always Requires Approval
- `src/features/[OTHER]/*`, `src/shared/*`, `src/app/*`
- `package.json`, `tsconfig.json`, `ARCHITECTURE.md`, `.env.example`
- Database schemas, migrations, CI/CD config

## Progress
- [x] CLAUDE.md created (this file)
- [ ] Feature logger created: `src/client/features/tags/logger.ts`
- [ ] Requirements written
- [ ] Architecture updated
- [ ] Implementation complete
- [ ] All try-catch blocks use `log.error()`
- [ ] Tests passing
- [ ] Secret scan passed
- [ ] Self-review completed
- [ ] ARCHITECTURE.md Feature Log updated
- [ ] Cross-boundary edits logged below

## Cross-Boundary Edit Log
| Date | File | Change | Approved By |
|------|------|--------|-------------|
| 2026-03-21 | `src/client/app/pages/settings.tsx` | Added "Manage Tags" button + TagManager modal | Master plan pre-approval |
| 2026-03-21 | `src/client/features/dashboard/__tests__/recent-transactions.test.tsx` | Added isSplit/tags to mock TransactionResponse data | Required by type change |
