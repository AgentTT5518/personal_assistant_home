# Feature: settings

## Owner
Claude Code

## Scope
This feature owns all files within `src/client/features/settings/`.

## Description
Client-side settings page: currency selection, CSV transaction export, data management (bulk delete, re-seed categories), DB stats/about section.

## Boundary Rules
**HARD BLOCK: Do NOT edit files outside this folder without explicit user approval.**

- ONLY modify files within `src/client/features/settings/` freely
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
**Shared modules:** `src/client/shared/components/date-range-picker`
**External packages:** @tanstack/react-query, lucide-react
**Other features (read-only):** document-upload (AiSettingsPanel)

## Safe to Edit (no approval needed)
- `src/client/features/settings/**`
- `tests/**/settings/**`
- `docs/requirements/settings.md`
- This file

## Always Requires Approval
- `src/features/[OTHER]/*`, `src/shared/*`, `src/app/*`
- `package.json`, `tsconfig.json`, `ARCHITECTURE.md`, `.env.example`
- Database schemas, migrations, CI/CD config

## Progress
- [x] CLAUDE.md created (this file)
- [x] Feature logger created: `src/client/features/settings/logger.ts`
- [x] Requirements written: `docs/requirements/settings.md`
- [x] Architecture updated: ARCHITECTURE.md component map, endpoints, feature log
- [x] Implementation complete
- [x] All try-catch blocks use `log.error()`
- [x] Tests passing (34 client + 61 server across affected files)
- [x] Self-review completed
- [x] ARCHITECTURE.md Feature Log updated
- [x] Cross-boundary edits logged below

## Cross-Boundary Edit Log
| Date | File | Change | Approved By |
|------|------|--------|-------------|
| 2026-03-20 | `src/client/app/pages/settings.tsx` | Rewrite to import from settings feature | Phase 1F plan pre-approval |
| 2026-03-20 | `src/client/app/pages/dashboard.tsx` | Import useCurrency from settings | Phase 1F plan pre-approval |
| 2026-03-20 | `src/client/features/transactions/components/stats-summary.tsx` | Import useCurrency from settings | Phase 1F plan pre-approval |
| 2026-03-20 | `src/client/features/analysis/CLAUDE.md` | Update cross-feature reference | Phase 1F plan pre-approval |
| 2026-03-20 | `src/client/features/dashboard/CLAUDE.md` | Note purely presentational | Phase 1F plan pre-approval |
| 2026-03-20 | `src/server/features/settings/routes.ts` | Add stats + bulk delete endpoints | Phase 1F plan pre-approval |
| 2026-03-20 | `src/server/features/transactions/routes.ts` | Add CSV export endpoint | Phase 1F plan pre-approval |
| 2026-03-20 | `src/server/features/transactions/category.routes.ts` | Add re-seed endpoint | Phase 1F plan pre-approval |
