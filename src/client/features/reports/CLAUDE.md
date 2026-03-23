# Feature: reports

## Owner
Claude Code

## Scope
This feature owns all files within `src/client/features/reports/`.

## Description
Client-side reports: reports page with generate panel (date range + type selector), report viewer with Recharts visualisations, report history list with download/delete, and PDF download button.

## Boundary Rules
**HARD BLOCK: Do NOT edit files outside this folder without explicit user approval.**

- ONLY modify files within `src/client/features/reports/` freely
- ASK before modifying: `src/shared/`, `src/app/`, other features, `package.json`, config files, schemas

## Dependencies
**Shared modules:** `@shared/types`, `src/client/shared/utils/format-currency`
**External packages:** @tanstack/react-query, lucide-react, recharts
**Other features (read-only):** none

## Safe to Edit (no approval needed)
- `src/client/features/reports/**`
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
| 2026-03-23 | `src/client/app/layout.tsx` | Added "Reports" to Insights nav section with FileBarChart icon | Master plan pre-approval |
| 2026-03-23 | `src/client/app/app.tsx` | Added `/reports` route | Master plan pre-approval |
