# Feature: goals

## Owner
Claude Code

## Scope
This feature owns all files within `src/client/features/goals/`.

## Description
Client-side goal tracking: goals page with goal cards grid, goal form modal, contribution modal, and dashboard progress widget showing top 3 active goals.

## Boundary Rules
**HARD BLOCK: Do NOT edit files outside this folder without explicit user approval.**

- ONLY modify files within `src/client/features/goals/` freely
- ASK before modifying: `src/shared/`, `src/app/`, other features, `package.json`, config files, schemas

## Dependencies
**Shared modules:** `@shared/types`, `src/client/shared/utils/format-currency`
**External packages:** @tanstack/react-query, lucide-react
**Other features (read-only):** accounts (AccountSelector), settings (useCurrency), transactions (categories for goal form)

## Safe to Edit (no approval needed)
- `src/client/features/goals/**`
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
| 2026-03-22 | `src/client/app/layout.tsx` | Added "Goals" to Planning nav section with Target icon | Master plan pre-approval |
| 2026-03-22 | `src/client/app/app.tsx` | Added `/goals` route | Master plan pre-approval |
| 2026-03-22 | `src/client/app/pages/dashboard.tsx` | Added GoalProgressWidget | Master plan pre-approval |
