# Feature: document-processor

## Owner
Claude Code

## Scope
This feature owns all files within `src/server/features/document-processor/`.

## Description
Server-side document upload, PDF extraction, AI-powered structured data extraction, vision reprocessing, and file cleanup for financial documents.

## Boundary Rules
**HARD BLOCK: Do NOT edit files outside this folder without explicit user approval.**

- ONLY modify files within `src/server/features/document-processor/` freely
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
**External packages:** multer, pdf-lib, pdf-parse, uuid, @anthropic-ai/sdk, drizzle-orm
**Other features (read-only):** none

## Safe to Edit (no approval needed)
- `src/server/features/document-processor/**`
- `tests/**/document-processor/**`
- `docs/requirements/document-processor.md`
- This file

## Always Requires Approval
- `src/features/[OTHER]/*`, `src/shared/*`, `src/app/*`
- `package.json`, `tsconfig.json`, `ARCHITECTURE.md`, `.env.example`
- Database schemas, migrations, CI/CD config

## Progress
- [x] CLAUDE.md created (this file)
- [ ] Feature logger created: `src/server/features/document-processor/logger.ts`
- [ ] Requirements written
- [ ] Architecture updated
- [ ] Implementation complete
- [ ] All try-catch blocks use `log.error()`
- [ ] All API routes log entry + errors
- [ ] All external service calls log failures
- [ ] Tests passing
- [ ] Secret scan passed
- [ ] Self-review completed
- [ ] ARCHITECTURE.md Feature Log updated
- [ ] Cross-boundary edits logged below

## Cross-Boundary Edit Log
| Date | File | Change | Approved By |
|------|------|--------|-------------|
