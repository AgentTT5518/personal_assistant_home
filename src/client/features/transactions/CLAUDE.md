# Feature: transactions

## Owner
Claude Code

## Scope
This feature owns all files within `src/client/features/transactions/`.

## Description
Client-side transaction browsing, filtering, search, category management UI, bulk categorisation, and stats dashboard.

## Boundary Rules
**HARD BLOCK: Do NOT edit files outside this folder without explicit user approval.**

- ONLY modify files within `src/client/features/transactions/` freely
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
**Shared modules:** `@shared/types`
**External packages:** @tanstack/react-query, lucide-react
**Other features (read-only):** none

## Safe to Edit (no approval needed)
- `src/client/features/transactions/**`
- `tests/**/transactions/**`
- `docs/requirements/transactions.md`
- This file

## Always Requires Approval
- `src/features/[OTHER]/*`, `src/shared/*`, `src/app/*`
- `package.json`, `tsconfig.json`, `ARCHITECTURE.md`, `.env.example`
- Database schemas, migrations, CI/CD config

## Progress
- [x] CLAUDE.md created (this file)
- [x] Feature logger created: `src/client/features/transactions/logger.ts`
- [ ] Requirements written
- [ ] Architecture updated
- [ ] Implementation complete
- [ ] All try-catch blocks use `log.error()`
- [ ] Tests passing
- [ ] Self-review completed
- [ ] ARCHITECTURE.md Feature Log updated
- [ ] Cross-boundary edits logged below

## Cross-Boundary Edit Log
| Date | File | Change | Approved By |
|------|------|--------|-------------|
