# Feature: dashboard

## Owner
Claude Code

## Scope
This feature owns all files within `src/client/features/dashboard/`.

## Description
Client-side financial dashboard: summary cards, category breakdown chart, monthly trend chart, recent transactions list, and date range filtering. This feature is purely presentational — all settings hooks/API have been promoted to the `settings` feature module (Phase 1F).

## Boundary Rules
**HARD BLOCK: Do NOT edit files outside this folder without explicit user approval.**

- ONLY modify files within `src/client/features/dashboard/` freely
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
**Shared modules:** `@shared/types`, `src/client/shared/utils/format-currency`
**External packages:** @tanstack/react-query, recharts, lucide-react
**Other features (read-only):** transactions (useTransactionStats, useTransactions hooks), settings (useCurrency hook)

## Safe to Edit (no approval needed)
- `src/client/features/dashboard/**`
- `tests/**/dashboard/**`
- `docs/requirements/dashboard.md`
- This file

## Always Requires Approval
- `src/features/[OTHER]/*`, `src/shared/*`, `src/app/*`
- `package.json`, `tsconfig.json`, `ARCHITECTURE.md`, `.env.example`
- Database schemas, migrations, CI/CD config

## Progress
- [x] CLAUDE.md created (this file)
- [x] Feature logger created: `src/client/features/dashboard/logger.ts`
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
| 2026-03-19 | `src/client/shared/utils/format-currency.ts` | Created shared currency formatter | Phase 1D plan pre-approval |
| 2026-03-19 | `src/client/app/pages/dashboard.tsx` | Replace stub with full dashboard | Phase 1D plan pre-approval |
| 2026-03-19 | `src/client/features/transactions/components/stats-summary.tsx` | Retrofit to use shared formatCurrency | Phase 1D plan pre-approval |
