# Feature: accounts (client)

## Owner
Claude Code

## Scope
This feature owns all files within `src/client/features/accounts/`.

## Description
Client-side account management: account list page, account form modal, AccountSelector dropdown (reused in transactions, documents, bills, goals), AccountOverview dashboard widget with net worth display.

## Boundary Rules
**HARD BLOCK: Do NOT edit files outside this folder without explicit user approval.**

- ONLY modify files within `src/client/features/accounts/` freely
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
**Other features (read-only):** settings (currency hook)

## Safe to Edit (no approval needed)
- `src/client/features/accounts/**`
- `tests/**/accounts/**`
- `docs/requirements/accounts.md`
- This file

## Always Requires Approval
- `src/features/[OTHER]/*`, `src/shared/*`, `src/app/*`
- `package.json`, `tsconfig.json`, `ARCHITECTURE.md`, `.env.example`
- Database schemas, migrations, CI/CD config

## Progress
- [x] CLAUDE.md created (this file)
- [ ] Feature logger created: `src/client/features/accounts/logger.ts`
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
| 2026-03-21 | `src/client/app/layout.tsx` | Sidebar redesign: NavSection groups with collapsible headers, localStorage persistence, Accounts nav item | Master plan pre-approval |
| 2026-03-21 | `src/client/app/app.tsx` | Added /accounts route | Master plan pre-approval |
| 2026-03-21 | `src/client/app/pages/dashboard.tsx` | Added AccountOverview widget | Master plan pre-approval |
| 2026-03-21 | `src/client/features/dashboard/__tests__/recent-transactions.test.tsx` | Added accountId/accountName to mock TransactionResponse data | Required by type change |
