# CLAUDE.md

## Setup Checklist
<!-- NOTE: This is a template repo. All items below are intentionally unchecked and all [placeholder] values are intentionally unfilled. Complete these items when using this template for a real project. The [pm] tokens in Commands and Rules are also intentional placeholders — replace them with your actual package manager (npm/pnpm/bun). -->
<!-- Complete ALL items before starting any feature work. Remove each [ ] as you go. -->
- [x] Fill in Project Identity table below
- [x] Replace `[pm]` with your package manager in Commands and Rules
- [ ] Update Project Structure with your actual folders
- [ ] Add project-specific code conventions (fonts, colors, patterns)
- [ ] Define SECRET_SCAN_PATTERNS for your API keys
- [x] Verify `.gitignore` includes `.env*` and `!.env.example`
- [ ] Copy `docs/templates/logger-template.ts` to `src/lib/logger.ts`
- [x] Create ARCHITECTURE.md from template at project root
- [ ] Run `/project-setup` to scaffold additional artifacts (skills, evals, brand docs)
- [x] Replace `[pm]` in `.github/workflows/ci.yml` and `cd.yml` with your package manager
- [ ] GitHub: enable branch protection on `main` → Settings → Branches → require `ci` status check to pass
- [ ] GitHub (if deploying): add deploy secrets → Settings → Secrets and variables → Actions (e.g. Vercel: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`)
<!-- DELETE this checklist once all items are done — a clean CLAUDE.md = a configured project -->

## Project Identity
| Field | Value |
|-------|-------|
| Name | Personal Assistant Home |
| Description | AI-powered personal assistant to help organise your personal life |
| Framework | [TBD — decide during /project-setup] |
| Language | TypeScript (strict mode) |
| Styling | [TBD] |
| Database | [TBD] |
| AI Provider | Claude API |
| Auth | [TBD] |
| Package Manager | npm |
| Test Runner | [TBD] |
| Deployment | [TBD] |
| Dev Server Port | [TBD] |

## Commands
```
npm run dev          # Start dev server
npm run build        # Production build
npm test             # Run all tests
npm run lint         # Lint check
npm run typecheck    # TypeScript check
```
<!-- Replace [pm] with your package manager. Add project-specific commands as needed. -->

## Project Structure
```
src/
  app/                    # Pages / routes
  features/               # Feature modules (each has its own CLAUDE.md)
    [feature-name]/
      CLAUDE.md           # Feature boundary rules
      components/ hooks/ services/ types.ts
  shared/                 # Cross-feature code (ask before modifying)
  lib/                    # Project-wide utilities (logger, db, config)
tests/                    # Mirrors src/ structure
  test-results/           # Test run output logs (gitignored)
Plan/                     # Feature planning lifecycle
  Planning/               # Active plans (working drafts during planning)
  Archive/                # Completed plans (moved here after development)
docs/                     # requirements/, decisions/, templates/
```

## Code Conventions
- No `any` without justification comment
- Functional components with hooks only
- Named exports over default exports
- `async/await` over `.then()` chains
- Every async op wrapped in try-catch with typed errors
- Use project logger (`src/lib/logger.ts`), never bare `console.log`
- File naming: kebab-case for files, PascalCase for components
- Declare type dependencies explicitly — never rely on transitive `@types/*` packages (see `docs/dependency-hygiene.md`)
<!-- Add project-specific conventions below (fonts, colors, patterns) -->

## Git Workflow
- Branches: `feature/[short-desc]`, `fix/[short-desc]`
- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
- Never commit to `main` directly
- Run full test suite before every commit

### Parallel Development (2+ developers on same repo)
- Use git worktrees: `git worktree add ../project-[feature] feature/[name]`
- One Claude Code session per worktree — never share
- **Shared contracts first** — agree on types/interfaces, merge to `main` before feature work
- **Lock shared resources** — only one person modifies `src/app/` routes or migrations at a time
- Rebase on `main` before opening PR
- Full guide: `docs/parallel-development.md`

## Secret Patterns
<!-- REQUIRED: Add patterns specific to your project's API keys -->
```
SECRET_SCAN_PATTERNS="sk-\|AKIA\|ghp_\|Bearer \|password\s*="
```
<!-- Examples to add per project:
  Firebase: firebase.*apiKey
  Google:   AIza
  Tavily:   tvly-
  Stripe:   sk_live_\|pk_live_
-->

---

## MANDATORY RULES

### Rule 1: Secret Protection
Before every commit, scan for exposed secrets:
```bash
grep -rn "$SECRET_SCAN_PATTERNS" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" --include="*.env" src/ tests/ . 2>/dev/null | grep -v node_modules | grep -v ".env.example"
```
- All secrets in `.env.local` only (never committed)
- `.env*` (except `.env.example`) MUST be in `.gitignore`
- Verify `.gitignore` includes: `.env*`, `!.env.example`
- `.env.example` must exist with placeholders for all required vars
- Secrets only in server-side code (API routes, server components) — never in client bundle
- New env vars -> add to `.env.example` immediately
- Before deploy: verify build output and logs do not contain secrets
- **If a secret is detected, STOP. Do not commit. Alert the user.**

### Rule 2: Test & Review Every Feature
- Write tests DURING implementation, not after
- Run before every commit and save results:
  ```bash
  npm run typecheck && npm run lint && npm test 2>&1 | tee tests/test-results/$(date +%Y%m%d-%H%M%S).log
  ```
- Test result logs saved to `tests/test-results/` (add this directory to `.gitignore`)
- Self-review checklist:
  - Matches requirements in `docs/requirements/`?
  - All new code paths tested? Error cases handled?
  - No hardcoded config values? No bare `console.log`?
  - No unjustified `any` types? Secret scan passed (Rule 1)?
- **If tests fail, fix before moving on. Never skip.**

### Rule 3: Error Logging
- Logger factory lives at `src/lib/logger.ts` (create from `docs/templates/logger-template.ts`)
- **Every feature MUST create its own scoped logger:**
  ```
  src/features/[name]/logger.ts:
    import { createLogger } from '@/lib/logger';
    export const log = createLogger('[name]');
  ```
- All feature files import from their local `./logger`, not from `src/lib/logger` directly
- Every try-catch -> `log.error('description', error)`
- Every API route -> log entry + errors
- Every external service call -> log failures with context
- NEVER log secrets, passwords, or tokens
- No bare `console.log/error/warn` in production code

### Rule 4: Update ARCHITECTURE.md After Every Feature
- Lives at project root
- After each feature: update Component Map, API Endpoints, Feature Log
- Always update "Last updated" date

### Rule 5: Feature Boundary — HARD BLOCK
**NEVER edit files outside your current feature folder without user approval.**
- ONLY modify files within `src/features/[current-feature]/` freely
- ASK before touching: other features, `src/shared/`, `src/app/`, `package.json`, config files, schemas
- Use this format:
  ```
  BOUNDARY ALERT
  File:   [path]
  Reason: [why]
  Change: [what]
  Risk:   [Low/Med/High]
  Proceed? (yes/no)
  ```
- Log approved cross-boundary edits in feature's SCRATCHPAD.md

---

## Feature Workflow
```
1. BOUNDARY  -> Copy docs/templates/FEATURE-CLAUDE.md to src/features/[name]/CLAUDE.md
              -> Replace [FEATURE_NAME] with actual name, fill in Owner + Description
2. PLAN      -> Create Plan/Planning/[feature]/ folder
              -> Copy docs/templates/plan-template.md to Plan/Planning/[feature]/plan.md
              -> Iterate on plan with Claude — save progress to plan.md
3. REVIEW    -> User reviews plan.md, adds comments/feedback
              -> Resolve open questions, finalize approach
4. APPROVE   -> User gives go-ahead to start development
5. DESIGN    -> Update ARCHITECTURE.md with planned changes
6. BUILD     -> Implement + tests + logger (ask before cross-boundary edits)
7. TEST      -> Secret scan + tests + self-review checklist
8. COMPLETE  -> Finalize docs/requirements/[feature].md (from plan)
              -> Finalize docs/decisions/[feature].md (from plan decisions)
              -> Update ARCHITECTURE.md Feature Log
              -> Move Plan/Planning/[feature]/ to Plan/Archive/[feature]/
9. COMMIT    -> Conventional commit -> push feature branch -> PR
```

## Reference Docs
- `ARCHITECTURE.md` — Living system design
- `docs/github-workflow-guide.md` — Step-by-step feature development workflow
- `docs/project-setup-guide.md` — Decision guide for artifact selection (skills, evals, brand docs)
- `docs/skills-guide.md` — How to create custom Claude Code skills
- `docs/evals-guide.md` — How to set up AI output quality testing
- `docs/brand-voice-guide.md` — How to define writing style and brand voice
- `docs/command-policy.md` — Command permission tiers for Claude Code operations
- `Plan/Planning/` — Active feature plans (working drafts)
- `Plan/Archive/` — Completed feature plans
- `docs/templates/plan-template.md` — Plan file template
- `docs/requirements/` — Finalized feature specs (written on completion)
- `docs/decisions/` — Finalized Architecture Decision Records (written on completion)
- `docs/templates/FEATURE-CLAUDE.md` — Feature boundary template
- `docs/templates/logger-template.ts` — Structured logger implementation
- `docs/templates/skill-template.md` — Custom skill starter file
- `docs/templates/eval-template/` — Eval test structure starter (rubric + test cases)
- `docs/templates/brand/` — Brand identity, style guide, and tone matrix templates
- `docs/parallel-development.md` — Multi-developer worktree workflow
- `docs/dependency-hygiene.md` — Explicit type dependencies and lockfile parity
- `.claude/commands/project-setup.md` — Interactive project setup skill (`/project-setup`)
