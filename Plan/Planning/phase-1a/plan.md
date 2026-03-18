# Personal Assistant Home — Implementation Plan

## Context

Build a privacy-first, self-hosted personal assistant web app that helps users organise their financial, insurance, and health documents. The repo is already scaffolded with Claude_BestPractise template at `/Users/tommytien/Personal-GomuGomu/personal_assistant_home`.

**Key decisions made:**
- React + Vite (frontend) + Express (backend) — monorepo
- SQLite via Drizzle ORM — zero-config, file-based, easy backup
- Configurable AI provider per task — Claude API, Ollama (local), or other OpenAI-compatible providers
- PDF text extraction first (pdf-parse) — send extracted text to model, not raw PDF
- npm as package manager
- Fully local/self-hosted (sensitive financial/health data stays on machine)
- Financial features first, then insurance and health

---

## Architecture

```
Browser (React + Vite :5173)
   │ proxy /api → :3001
Express API (:3001, bound to 127.0.0.1 only)
   ├── Drizzle ORM → SQLite (data/assistant.db)
   ├── AI Router    → routes to configured provider per task type
   │     ├── Claude API  → api.anthropic.com
   │     ├── Ollama      → localhost:11434 (local models)
   │     └── OpenAI-compat → any provider with OpenAI-compatible API
   └── File Storage → uploads/ (raw PDFs, local only)
```

**Express binds to `127.0.0.1` only** — not `0.0.0.0`. Sensitive financial/health data must never be exposed to the network.

**Document processing flow:** Upload PDF → validate size (≤10MB, ≤50 pages) → save to disk → extract text via `pdf-parse` → send extracted text to configured AI provider → validate response (zod) → write to SQLite → return summary to frontend.

Text extraction first means:
- Works with any model (no vision/document capability required)
- Smaller payloads → faster, cheaper
- Fully offline possible with Ollama
- Trade-off: complex table layouts may lose formatting (user can re-process with Claude if needed)

---

## Tech Stack

| Layer | Packages |
|-------|----------|
| Frontend | react, react-dom, vite, react-router-dom, tailwindcss, recharts, @tanstack/react-query, react-dropzone, date-fns, lucide-react |
| Backend | express, drizzle-orm, drizzle-kit, better-sqlite3, zod, multer, uuid, cors, dotenv, tsx |
| AI Providers | @anthropic-ai/sdk (Claude), ollama (local models), openai (OpenAI-compatible providers) |
| PDF | pdf-parse (text extraction), pdf-lib (page counting/splitting), @types/pdf-parse (TS types) |
| Dev | concurrently (run Vite + Express together via `npm run dev`) |
| Testing | vitest, @testing-library/react, jsdom, supertest |
| Tooling | typescript (strict), eslint, @typescript-eslint |

**Note:** `better-sqlite3` requires native compilation (Python + build tools). Usually works out of the box on macOS. For Ollama, user must install separately (`brew install ollama`).

**Dev scripts:**
```json
{
  "dev": "concurrently \"npm run dev:client\" \"npm run dev:server\"",
  "dev:client": "vite",
  "dev:server": "tsx watch src/server/index.ts",
  "build": "tsc -p tsconfig.server.json && vite build",
  "start": "node dist/server/index.js",
  "typecheck": "tsc --noEmit",
  "lint": "eslint src/",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

**Production:** `tsc -p tsconfig.server.json` compiles server to `dist/server/`, `vite build` compiles client to `dist/client/`. Express serves static assets from `dist/client/` in production. Root `tsconfig.json` is for `typecheck` (type-checks everything). `tsconfig.server.json` targets `src/server/` only and outputs to `dist/server/`. Always run locally in dev mode for personal use — production build is optional but available.

---

## AI Provider Router (Configurable per Task)

Users configure which AI provider to use for each task type via a settings page (stored in DB).

### Task Types and Default Providers

| Task Type | Description | Default Provider | Fallback | Why |
|-----------|-------------|-----------------|----------|-----|
| `pdf_extraction` | Extract structured data from PDF text | Claude API | — | Best accuracy for financial data |
| `categorisation` | Categorise transactions | Claude API | — | Default safe choice; user can switch to Ollama in settings |
| `analysis_insights` | Generate spending insights | Claude API | — | Benefits from stronger reasoning |
| `insurance_analysis` | Analyse insurance gaps | Claude API | — | Complex domain reasoning |
| `health_analysis` | Analyse health checkup results | Claude API | — | Medical domain knowledge |

All tasks default to Claude API for out-of-the-box reliability. Users can reconfigure any task to Ollama or OpenAI-compat via the settings page. When switching to Ollama, a fallback to Claude is auto-set.

### Provider Interface

All providers implement a common interface:

```ts
interface AIProvider {
  name: string;
  chat(messages: Message[], options?: ChatOptions): Promise<string>;
  isAvailable(): Promise<boolean>;
}
```

### Supported Providers

| Provider | Package | Config Env Vars | Notes |
|----------|---------|----------------|-------|
| Claude API | `@anthropic-ai/sdk` | `ANTHROPIC_API_KEY` | Best quality, requires API key |
| Ollama | `ollama` | `OLLAMA_BASE_URL` (default: `http://localhost:11434`) | Free, fully local, requires Ollama installed |
| OpenAI-compatible | `openai` | `OPENAI_API_KEY`, `OPENAI_BASE_URL` | Any provider with OpenAI-compatible API (OpenRouter, local vLLM, etc.) |

### Settings DB Table

**ai_settings**
```
id              TEXT PRIMARY KEY
task_type       TEXT NOT NULL UNIQUE
provider        TEXT NOT NULL (claude | ollama | openai_compat)
model           TEXT NOT NULL (e.g., "claude-sonnet-4-5-20250514", "llama3", "gpt-4o")
fallback_provider TEXT (optional — if primary fails, try this)
fallback_model  TEXT
created_at      TEXT
updated_at      TEXT
```

### Provider Selection Flow

```
Request comes in (e.g., categorise transactions)
   → Look up task_type in ai_settings
   → Get configured provider + model
   → Check provider.isAvailable()
      → Available: use it
      → Not available + has fallback: try fallback
      → Not available + no fallback: return error with setup instructions
```

---

## PDF Text Extraction Strategy

**Primary approach:** Extract text from PDF using `pdf-parse`, then send text to AI model.

```
PDF Upload → pdf-parse extracts text → text sent to AI provider → structured JSON response → zod validate → DB
```

**Why text-first:**
- Works with any model (no vision capability needed)
- Enables fully offline processing with Ollama
- Smaller payloads, faster processing, lower cost
- Most bank statements have selectable text (not scanned images)

**Fallback for poor extraction:**
- If `pdf-parse` returns very little text (likely a scanned/image PDF), flag the document
- User can choose to re-process with Claude using raw PDF (vision mode) via a "Re-process with Claude Vision" button
- This is a per-document fallback, not a system-wide setting
- Claude Vision fallback is subject to the same ≤10MB file size limit (already enforced at upload)

**Prompt strategy:**
- Extraction prompts include the raw text and instruct the model to find and structure transactions
- Different prompt templates per document type (bank statement, credit card, payslip, etc.)
- Prompts are designed to handle messy/garbled text from PDF extraction gracefully

---

## PDF Size Limits & Multi-Page Strategy

| Check | Limit | Action |
|-------|-------|--------|
| File size | ≤10MB | Reject at upload with clear error |
| Page count | ≤50 pages | Process as single unit (pdf-parse → AI) |
| Page count | >50 pages | Auto-split into 25-page chunks via pdf-lib, run pdf-parse on each chunk, send each to AI, merge + deduplicate results |

No hard page count rejection — accept any page count within the 10MB file size limit. Splitting is transparent to the user (they see a single progress bar).

Add `pdf-lib` (lightweight, no native deps) for page counting and splitting. Splitting preserves page integrity (pdf-lib handles this correctly). Each chunk goes through pdf-parse independently, then results are merged and deduplicated.

**Chunk merging strategy for account_summaries:** When a statement spans multiple chunks, take opening balance from chunk 1, closing balance from the last chunk, sum total credits/debits across all chunks. Transactions are merged and deduplicated by composite key.

---

## Upload Cleanup & Retention Policy

- After successful extraction: keep PDF for 30 days, then auto-delete (background cleanup on server start + daily check)
- After failed extraction: keep PDF indefinitely (user may re-process)
- User can manually delete any PDF via the UI at any time
- Deletion removes file from `uploads/` and sets `documents.file_path = null` (transaction data in DB is preserved)
- Display storage usage in settings page: total PDFs, total size, oldest file
- Add `UPLOAD_RETENTION_DAYS=30` to `.env.example` (configurable)

---

## Analysis Cache Invalidation

**Strategy:** Timestamp-based invalidation.

- Each `analysis_snapshots` row has `generated_at` timestamp
- On every analysis request, check: are there any documents with `processed_at > generated_at`?
  - Yes → recompute, update snapshot
  - No → return cached result
- On document upload/delete: no eager invalidation needed (lazy check is sufficient and simpler)
- AI insights (expensive Claude calls) use same pattern but with a longer staleness threshold (user can force refresh)

---

## Test Configuration

Two Vitest projects in a single `vitest.config.ts`:

```ts
// vitest.config.ts
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'server',
          root: './src/server',
          environment: 'node',
          include: ['**/*.test.ts'],
        }
      },
      {
        test: {
          name: 'client',
          root: './src/client',
          environment: 'jsdom',
          include: ['**/*.test.ts', '**/*.test.tsx'],
          setupFiles: ['./tests/setup.ts'],
        }
      }
    ]
  }
});
```

Integration tests (e.g., supertest API tests) live in `tests/server/` and use the `node` environment. Component tests live alongside components in `src/client/`.

---

## Database Schema (key tables)

- **documents** — uploaded PDFs: id, filename, doc_type (bank_statement|credit_card|payslip|tax_return|investment_report), institution, period, processing_status, processed_at (ISO timestamp, nullable — set when status → completed), raw_extraction, extracted_text (raw text from pdf-parse), file_path (nullable — null after cleanup)
- **transactions** — extracted line items: date, description, amount, type (debit|credit), category_id, merchant, is_recurring
- **categories** — spending categories (seeded: Housing, Utilities, Groceries, Transport, etc.) with parent_id for tree structure
- **category_rules** — pattern-matching rules for auto-categorisation (both user-defined and AI-generated)
- **account_summaries** — per-statement summary: opening/closing balance, totals
- **analysis_snapshots** — cached analysis results with `generated_at` for invalidation
- **ai_settings** — per-task-type AI provider configuration (provider, model, fallback)
- **insurance_policies** (Phase 2) — extracted policy details, coverage, gaps
- **health_records** (Phase 3) — extracted test results, flags, recommendations

---

## Project Structure

```
src/
  client/                    # React frontend (Vite)
    app/                     # Pages (dashboard, documents, transactions, analysis, settings)
    features/                # Frontend feature modules (each with CLAUDE.md + logger)
      document-upload/       # Upload dropzone, document list, processing status
      transactions/          # Transaction table, category picker, filters
      financial-dashboard/   # Charts (recharts), insights panel, summary cards
    shared/                  # Cross-feature UI components
    lib/logger.ts

  server/                    # Express backend
    index.ts                 # Entry point — binds to 127.0.0.1:3001
    app.ts                   # Express app setup
    features/                # Backend feature modules (each with CLAUDE.md + logger)
      document-processor/    # Upload, Claude extraction, prompts per doc type
      transactions/          # CRUD, categorisation engine (rules + AI fallback)
      financial-analysis/    # Aggregation, trends, recurring detection, AI insights
    shared/middleware/       # Error handler, validation, rate limiter
    lib/
      ai/                    # AI provider system
        router.ts            # Routes task types to configured providers
        providers/
          claude.ts           # Claude API provider
          ollama.ts           # Ollama local provider
          openai-compat.ts    # OpenAI-compatible provider
        types.ts             # AIProvider interface, Message types
      pdf/
        extractor.ts         # pdf-parse text extraction
        splitter.ts          # pdf-lib page counting + splitting
      upload-cleanup.ts      # Retention policy enforcement
      db/                    # Drizzle instance, schema/, migrations/, seed

  shared/types/              # Types shared between client and server

data/                        # SQLite DB file (gitignored)
uploads/                     # PDF storage (gitignored)
```

---

## Phased Implementation

### Phase 0: CLAUDE.md Completion (before any code)

1. Update Project Identity — fill all [TBD] fields:
   - Framework: React 19 + Vite 6 + Express 5
   - Styling: Tailwind CSS 4
   - Database: SQLite via Drizzle ORM
   - Auth: none (local single-user)
   - Test Runner: Vitest
   - Deployment: Local / self-hosted
   - Dev Server Port: 5173 (client), 3001 (server)
2. Update Project Structure in CLAUDE.md to match actual `src/client/`, `src/server/` layout
3. Add `sk-ant-` to SECRET_SCAN_PATTERNS (Anthropic API keys)
4. Update `.env.example` with: `ANTHROPIC_API_KEY`, `OLLAMA_BASE_URL=http://localhost:11434`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `DATABASE_PATH=data/assistant.db`, `UPLOAD_DIR=uploads`, `PORT=3001`, `UPLOAD_RETENTION_DAYS=30`
5. Add `data/`, `uploads/`, `dist/` to `.gitignore`
6. Create plan files: `Plan/Planning/phase-1a/plan.md`, etc.

### Phase 1A: Foundation

1. `npm init`, install all dependencies
2. Configure TypeScript (strict, root tsconfig.json + tsconfig.server.json), ESLint
3. Set up Vite + React + Tailwind CSS 4 + React Router (basic shell with nav). **Note:** Tailwind v4 uses CSS-first config (`@import "tailwindcss"` in CSS), no `tailwind.config.js`. Follow v4 docs, not v3 examples.
4. Set up Express 5 with TypeScript, bind to `127.0.0.1`. **Note:** Express 5 handles async errors automatically (no need for `express-async-errors` wrapper). Follow v5 migration patterns.
5. Configure `concurrently` for `npm run dev`
6. Configure Vite proxy (`/api` → `:3001`)
7. Set up Drizzle ORM + SQLite (WAL mode), create schema + migrations (including `ai_settings` table)
8. Seed categories table + default AI settings. All tasks default to Claude API. Ollama-preferred tasks (categorisation) are seeded with `fallback_provider = 'claude'` so they work out of the box even without Ollama installed. Users can switch to Ollama in settings once they've installed it.
9. Copy logger template to `src/server/lib/logger.ts` and `src/client/lib/logger.ts`
10. Build AI provider router (`src/server/lib/ai/`) — provider interface, Claude + Ollama + OpenAI-compat implementations
11. Build PDF text extractor (`src/server/lib/pdf/extractor.ts`) using pdf-parse
12. Set up shared types, zod validation, error handling middleware
13. Configure Vitest with dual projects (server/node + client/jsdom)
14. Update ARCHITECTURE.md

### Phase 1B: Document Upload & Processing

Feature: `src/server/features/document-processor/` + `src/client/features/document-upload/`

1. Upload endpoint (multer, PDF-only, ≤10MB)
2. Page counting (pdf-lib) — if >50 pages, auto-split into 25-page chunks
3. PDF text extraction pipeline (pdf-parse per chunk → store extracted_text in documents table)
4. Extraction prompt templates per doc type (in `prompts/` folder)
5. Processing pipeline: upload → validate size → count pages → split if needed → pdf-parse text per chunk → AI provider extract → zod validate → merge + deduplicate → write to DB
6. Fallback: "Re-process with Claude Vision" button for scanned/image PDFs with poor text extraction (same ≤10MB limit)
7. Upload cleanup service (retention policy, runs on server start + daily)
8. AI settings API + settings page (configure provider per task type, designed as extensible component — storage settings added in Phase 1D)
9. Simple rate limiter middleware for AI provider calls (protect against accidental loops hitting Claude API)
10. Frontend: drag-and-drop upload, document list, processing status, delete button
11. Tests: upload validation, mock AI extraction, DB write verification

### Phase 1C: Transaction Management & Categorisation

Feature: `src/server/features/transactions/` + `src/client/features/transactions/`

1. Transaction listing API with filtering/sorting/pagination
2. Rule-based categorisation engine (check `category_rules` first)
3. AI-assisted categorisation fallback (batch uncategorised → Claude → create new rules)
4. Deduplication: composite key (date + description + amount + institution)
5. Frontend: transaction table, inline category editing, filters, search
6. Category management UI (create/edit/delete custom categories + rules)
7. Tests: rule matching, deduplication logic, API endpoints

### Phase 1D: Financial Analysis & Dashboard

Feature: `src/server/features/financial-analysis/` + `src/client/features/financial-dashboard/`

1. Aggregation queries (monthly totals, category breakdowns, YoY comparison)
2. Recurring expense detection (same merchant, similar amount, regular interval)
3. Analysis caching with timestamp-based invalidation
4. Dashboard with Recharts: spending overview, category breakdown, trends, top merchants, income vs expenses
5. AI insights endpoint: send aggregated data to Claude for spending observations + recommendations
6. Settings page: storage usage, retention config, data management
7. Tests: aggregation logic, cache invalidation, recurring detection

### Phase 2: Insurance Policy Analyser (later)
Same upload pipeline with insurance-specific extraction prompts. Claude extracts coverage, exclusions, excess. Analysis identifies gaps and recommends improvements.

### Phase 3: Health Checkup Analyser (later)
Same pattern. Claude extracts test results and reference ranges. Track trends over time. Traffic-light health dashboard.

---

## Key Design Decisions

1. **Text extraction first** — use `pdf-parse` to extract text from PDFs, send text (not raw PDF) to AI. Works with any model, enables fully offline processing. Fallback to Claude Vision for scanned/image PDFs.
2. **Configurable AI per task** — users choose which provider (Claude, Ollama, OpenAI-compat) handles each task type. Enables fully local processing or hybrid cloud/local.
3. **Hybrid categorisation** — rule-based for speed + AI fallback for accuracy. AI suggestions become new rules over time (learning system).
4. **Deduplication** — composite key (date + description + amount + institution) to catch overlapping statements.
5. **Monorepo** — client and server in same repo, shared types in `src/shared/`.
6. **Localhost only** — Express binds to `127.0.0.1`, never `0.0.0.0`.
7. **Lazy cache invalidation** — check `generated_at` vs latest `processed_at` on read, not on write.
8. **30-day PDF retention** — auto-cleanup after extraction, configurable via env var.
9. **Dev-first production** — `tsx watch` for dev, `tsc + vite build` available for production but optional for personal use.

---

## Critical Files to Modify/Create

- `CLAUDE.md` — update Project Identity, Project Structure, SECRET_SCAN_PATTERNS
- `ARCHITECTURE.md` — update with actual architecture after each phase
- `.env.example` — add all env vars
- `.gitignore` — add `data/`, `uploads/`, `dist/`
- `package.json` — all dependencies and scripts
- `tsconfig.json` — TypeScript strict config
- `vite.config.ts` — Vite + proxy config
- `vitest.config.ts` — dual project test config
- `drizzle.config.ts` — Drizzle migration config
- `tsconfig.server.json` — server-only TypeScript config (targets src/server/, outputs to dist/server/)
- `Plan/Planning/phase-1a/plan.md` (and per-phase plan files)

---

## Verification

After each phase:
1. `npm run typecheck && npm run lint && npm test`
2. `npm run dev` — both client and server start without errors
3. Manual test: upload a real bank statement PDF → verify extracted transactions appear correctly
4. Verify categorisation works (rule match + AI fallback)
5. Check dashboard renders charts with real data
6. Confirm Express only listens on 127.0.0.1 (`lsof -i :3001`)
7. Confirm no secrets in committed code (Rule 1 scan)
8. Verify `uploads/` and `data/` are gitignored
