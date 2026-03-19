# Feature: settings

## Owner
Claude Code

## Scope
This feature owns all files within `src/server/features/settings/`.

## Description
Server-side app settings management: key-value store for user preferences (currency, etc.) with validation.

## Boundary Rules
**HARD BLOCK: Do NOT edit files outside this folder without explicit user approval.**

- ONLY modify files within `src/server/features/settings/` freely
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
**Shared modules:** `@shared/types/validation`
**External packages:** drizzle-orm, zod
**Other features (read-only):** none

## Safe to Edit (no approval needed)
- `src/server/features/settings/**`
- `tests/**/settings/**`
- `docs/requirements/settings.md`
- This file

## Always Requires Approval
- `src/features/[OTHER]/*`, `src/shared/*`, `src/app/*`
- `package.json`, `tsconfig.json`, `ARCHITECTURE.md`, `.env.example`
- Database schemas, migrations, CI/CD config

## Progress
- [x] CLAUDE.md created (this file)
- [x] Feature logger created: `src/server/features/settings/logger.ts`
- [ ] Requirements written
- [ ] Architecture updated
- [x] Implementation complete
- [x] All try-catch blocks use `log.error()`
- [x] All API routes log entry + errors
- [ ] Tests passing
- [ ] Self-review completed
- [ ] ARCHITECTURE.md Feature Log updated
- [ ] Cross-boundary edits logged below

## Cross-Boundary Edit Log
| Date | File | Change | Approved By |
|------|------|--------|-------------|
| 2026-03-19 | `src/server/lib/db/schema/index.ts` | Added `appSettings` table | Phase 1D plan pre-approval |
| 2026-03-19 | `src/server/lib/db/seed.ts` | Added currency seed row | Phase 1D plan pre-approval |
| 2026-03-19 | `src/server/app.ts` | Register settingsRouter | Phase 1D plan pre-approval |
