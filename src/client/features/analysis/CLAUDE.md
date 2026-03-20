# Feature: analysis

## Owner
Claude Code

## Scope
This feature owns all files within `src/client/features/analysis/`.

## Description
Client-side AI spending analysis page: generate AI insights, view structured analysis sections with Markdown rendering, manage snapshot history.

## Boundary Rules
**HARD BLOCK: Do NOT edit files outside this folder without explicit user approval.**

- ONLY modify files within `src/client/features/analysis/` freely
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
**Shared modules:** `@shared/types`, `src/client/shared/components/date-range-picker`, `src/client/shared/utils/format-currency`
**External packages:** @tanstack/react-query, react-markdown, lucide-react
**Other features (read-only):** dashboard (useCurrency hook)

## Safe to Edit (no approval needed)
- `src/client/features/analysis/**`
- `tests/**/analysis/**`
- `docs/requirements/analysis.md`
- This file

## Always Requires Approval
- `src/features/[OTHER]/*`, `src/shared/*`, `src/app/*`
- `package.json`, `tsconfig.json`, `ARCHITECTURE.md`, `.env.example`
- Database schemas, migrations, CI/CD config

## Progress
- [x] CLAUDE.md created (this file)
- [x] Feature logger created
- [ ] Requirements written
- [ ] Architecture updated
- [x] Implementation complete
- [x] All try-catch blocks use `log.error()`
- [ ] Tests passing
- [ ] Self-review completed
- [ ] ARCHITECTURE.md Feature Log updated
- [ ] Cross-boundary edits logged below

## Cross-Boundary Edit Log
| Date | File | Change | Approved By |
|------|------|--------|-------------|
| 2026-03-20 | `src/client/app/pages/analysis.tsx` | Replace stub with feature import | Phase 1E plan pre-approval |
