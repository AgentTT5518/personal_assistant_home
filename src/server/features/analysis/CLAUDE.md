# Feature: analysis

## Owner
Claude Code

## Scope
This feature owns all files within `src/server/features/analysis/`.

## Description
Server-side AI spending analysis: generates structured insights from summarised transaction data, persists snapshots for historical review.

## Boundary Rules
**HARD BLOCK: Do NOT edit files outside this folder without explicit user approval.**

- ONLY modify files within `src/server/features/analysis/` freely
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
**External packages:** drizzle-orm, uuid, zod
**Other features (read-only):** none (queries transactions table directly)

## Safe to Edit (no approval needed)
- `src/server/features/analysis/**`
- `tests/**/analysis/**`
- `docs/requirements/analysis.md`
- This file

## Always Requires Approval
- `src/features/[OTHER]/*`, `src/shared/*`, `src/app/*`
- `package.json`, `tsconfig.json`, `ARCHITECTURE.md`, `.env.example`
- Database schemas, migrations, CI/CD config

## Progress
- [x] CLAUDE.md created (this file)
- [x] Feature logger created: `src/server/features/analysis/logger.ts`
- [ ] Requirements written
- [ ] Architecture updated
- [x] Implementation complete
- [x] All try-catch blocks use `log.error()`
- [x] All API routes log entry + errors
- [x] All external service calls log failures
- [ ] Tests passing
- [ ] Secret scan passed
- [ ] Self-review completed
- [ ] ARCHITECTURE.md Feature Log updated
- [ ] Cross-boundary edits logged below

## Cross-Boundary Edit Log
| Date | File | Change | Approved By |
|------|------|--------|-------------|
| 2026-03-20 | `src/shared/types/index.ts` | Added AnalysisInsights, AnalysisSection, SnapshotMeta types | Phase 1E plan pre-approval |
| 2026-03-20 | `src/shared/types/validation.ts` | Added generateAnalysisSchema | Phase 1E plan pre-approval |
| 2026-03-20 | `src/server/app.ts` | Register analysisRouter | Phase 1E plan pre-approval |
