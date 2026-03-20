# Feature: budgets

## Owner
Claude Code

## Scope
This feature owns all files within `src/client/features/budgets/`.

## Description
Client-side budget management: budget settings page for creating/editing/deleting per-category spending limits, and a dashboard progress widget showing spent vs budget with color-coded progress bars.

## Boundary Rules
**HARD BLOCK: Do NOT edit files outside this folder without explicit user approval.**

- ONLY modify files within `src/client/features/budgets/` freely
- ASK before modifying: `src/shared/`, `src/app/`, other features, `package.json`, config files, schemas

## Dependencies
**Shared modules:** `@shared/types`, `src/client/shared/utils/format-currency`
**External packages:** @tanstack/react-query, lucide-react, react-router-dom
**Other features (read-only):** transactions (useCategories hook), settings (useCurrency hook)

## Safe to Edit (no approval needed)
- `src/client/features/budgets/**`
- This file

## Always Requires Approval
- `src/features/[OTHER]/*`, `src/shared/*`, `src/app/*`
- `package.json`, `tsconfig.json`, `ARCHITECTURE.md`, `.env.example`

## Progress
- [x] CLAUDE.md created (this file)
- [x] Feature logger created
- [x] Implementation complete
- [x] Cross-boundary edits logged below

## Cross-Boundary Edit Log
| Date | File | Change | Approved By |
|------|------|--------|-------------|
| 2026-03-20 | `src/client/app/app.tsx` | Add `/budgets` route | Phase 1 Polish plan pre-approval |
| 2026-03-20 | `src/client/app/pages/dashboard.tsx` | Import + render BudgetProgress widget | Phase 1 Polish plan pre-approval |
| 2026-03-20 | `src/client/app/pages/settings.tsx` | Add "Manage Budgets" link | Phase 1 Polish plan pre-approval |
