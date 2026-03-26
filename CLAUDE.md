# CLAUDE.md

<!-- TODO (manual): GitHub → Settings → Branches → enable branch protection on `main`, require `ci` status check to pass -->

## Project Identity
| Field | Value |
|-------|-------|
| Name | Personal Assistant Home |
| Description | AI-powered personal assistant to help organise your personal life |
| Framework | React 19 + Vite 6 (frontend) + Express 5 (backend) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS 4 |
| Database | SQLite via Drizzle ORM |
| AI Provider | Configurable per task — Claude API (default), Ollama, OpenAI-compatible |
| Auth | None (local single-user) |
| Package Manager | npm |
| Test Runner | Vitest |
| Deployment | Local / self-hosted |
| Dev Server Port | 5173 (client) / 3001 (server) |

## Commands
```
npm run dev          # Start dev server
npm run build        # Production build
npm test             # Run all tests
npm run lint         # Lint check
npm run typecheck    # TypeScript check
```

## Project Structure
```
src/
  client/                  # React frontend (Vite)
    app/                   # Pages / routes (dashboard, documents, transactions, analysis, settings)
    features/              # Frontend feature modules (each has CLAUDE.md + logger)
    shared/                # Cross-feature UI utilities and components
      components/            # Shared components (DateRangePicker, etc.)
      utils/                 # Shared utilities (formatCurrency, etc.)
    lib/logger.ts          # Client logger
    main.tsx               # Entry point
    index.css              # Tailwind CSS 4 imports
  server/                  # Express backend
    index.ts               # Entry point — binds to 127.0.0.1:3001
    app.ts                 # Express app setup
    features/              # Backend feature modules (each has CLAUDE.md + logger)
    shared/middleware/      # Error handler, validation, rate limiter
    lib/
      ai/                  # AI provider router + provider implementations
      pdf/                 # PDF text extraction + splitting
      db/                  # Drizzle instance, schema, migrations, seed
      logger.ts            # Server logger
  shared/types/            # Types shared between client and server
data/                      # SQLite DB file (gitignored)
uploads/                   # PDF storage (gitignored)
tests/                     # Integration tests
  test-results/            # Test run output logs (gitignored)
Plan/                      # Feature planning lifecycle
  Planning/                # Active plans (working drafts during planning)
  Archive/                 # Completed plans (moved here after development)
docs/                      # requirements/, decisions/, templates/
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

### Colors (Tailwind defaults — no custom theme)
- **Primary action:** `blue-600` / `blue-700` (hover)
- **Selected/active:** `bg-blue-100 text-blue-700`, nav active: `bg-blue-50 text-blue-700`
- **Success/income:** `green-500` / `green-600`
- **Danger/expense:** `red-500` / `red-600`
- **Text:** `gray-900` (headings), `gray-600` (body), `gray-500` (secondary), `gray-400` (disabled/icons)
- **Borders:** `gray-200` (cards), `gray-300` (inputs), `gray-100` (dividers)
- **Backgrounds:** `white` (cards), `gray-50` (page bg, hover states), `black/50` (modal overlay)

### Fonts
System fonts only (Tailwind default stack). No external font imports.

### UI Patterns
- **Buttons:** Primary `px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 min-h-[44px]`, Secondary same with `text-gray-700 bg-white border border-gray-300 hover:bg-gray-50`
- **Cards:** `bg-white rounded-lg border border-gray-200 p-6`
- **Modals:** `fixed inset-0 z-50 bg-black/50` overlay + `bg-white rounded-xl shadow-xl max-w-md mx-4 p-6`
- **Form inputs:** `w-full border border-gray-300 rounded-lg px-3 py-2 text-sm`
- **Page title:** `text-2xl font-bold text-gray-900 mb-6`
- **Empty states:** centered `py-16`, icon in `bg-gray-100 rounded-full p-4`, CTA button below
- **Touch targets:** min `44×44px` on all interactive elements
- **Icons:** Lucide React, 16–32px
- **Responsive:** mobile-first (`sm:`, `md:`, `lg:` breakpoints)

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
SECRET_SCAN_PATTERNS="sk-\|sk-ant-\|AKIA\|ghp_\|Bearer \|password\s*="
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
