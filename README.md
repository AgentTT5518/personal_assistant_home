# Personal Assistant Home

AI-powered personal assistant to help organise your personal life. Built with Claude Code best practices.

## What's Included

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Main rules file — project identity, conventions, 5 mandatory rules, feature workflow |
| `ARCHITECTURE.md` | Living architecture document template — updated after every feature |
| `docs/github-workflow-guide.md` | 12-step feature development workflow using git worktrees |
| `docs/parallel-development.md` | Rules for multiple developers working on the same repo |
| `docs/project-setup-guide.md` | Decision tree for choosing which artifacts to create |
| `docs/skills-guide.md` | Guide to creating custom Claude Code slash commands |
| `docs/evals-guide.md` | Guide to AI output quality testing |
| `docs/brand-voice-guide.md` | Guide to defining brand voice for AI outputs |
| `docs/command-policy.md` | Three-tier command permission policy for Claude Code operations |
| `.github/workflows/ci.yml` | CI pipeline — runs typecheck, lint, test, secret scan on every PR |
| `.github/workflows/cd.yml` | CD pipeline — builds and deploys on merge to main (Vercel reference) |
| `docs/templates/FEATURE-CLAUDE.md` | Per-feature boundary template — prevents cross-feature edits |
| `docs/templates/logger-template.ts` | Structured logger factory — creates feature-scoped loggers |
| `docs/templates/skill-template.md` | Starter file for custom skills |
| `docs/templates/eval-template/` | Starter structure for evals (rubric + test cases) |
| `docs/templates/brand/` | Brand identity, style guide, and tone matrix templates |
| `.claude/commands/project-setup.md` | Interactive setup skill — run with `/project-setup` |

## Quick Start

1. Copy all files into your new project root
2. Open `CLAUDE.md` and complete the **Setup Checklist** at the top
3. Fill in the `ARCHITECTURE.md` template (already present at project root)
4. Copy `docs/templates/logger-template.ts` to `src/lib/logger.ts`
5. Run `/project-setup` to scaffold additional artifacts (skills, evals, brand docs)
6. Replace `[pm]` in `.github/workflows/ci.yml` and `cd.yml` with your package manager
7. GitHub: enable branch protection on `main` → Settings → Branches → require `ci` to pass
8. GitHub (if deploying): add deploy secrets → Settings → Secrets and variables → Actions
9. Start building — follow the Feature Workflow in `CLAUDE.md`

## What the 5 Mandatory Rules Enforce

| Rule | What It Prevents |
|------|-----------------|
| 1. Secret Protection | API keys leaked to GitHub or build output |
| 2. Test & Review | Untested code, skipped failures, missing test logs |
| 3. Error Logging | Bare `console.log`, untagged errors, missing context |
| 4. Update ARCHITECTURE.md | Stale documentation after features ship |
| 5. Feature Boundary | Uncontrolled edits to shared code without approval |

## Feature Development Flow

See `docs/github-workflow-guide.md` for the full 12-step workflow. Summary:

```
Create worktree -> Diagnose -> Plan -> Implement -> Test -> Verify -> Manual test -> Commit -> PR -> Merge -> Pull main -> Cleanup
```

## Per-Feature Logger Setup

Each feature creates its own scoped logger (not a global one):

```
src/features/[name]/logger.ts:
  import { createLogger } from '@/lib/logger';
  export const log = createLogger('[name]');
```

All feature files import from their local `./logger`. The feature tag is baked in — can't be forgotten.

## Parallel Development

When 2+ developers work on the same repo:
- Each developer uses a separate git worktree
- Shared contracts (types/interfaces) merge to `main` first
- Only one person modifies shared resources at a time
- See `docs/parallel-development.md` for the full guide
