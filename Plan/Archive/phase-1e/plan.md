# Plan: Phase 1E — Analysis Page (AI Spending Insights)

**Status:** Planning — Implementation Detail
**Created:** 2026-03-20
**Feature Branch:** `feature/phase-1e-analysis`

---

## Context

Phases 1A–1D are complete. The app can upload financial PDFs, extract transactions via AI, categorise them (rule-based + AI), and display a dashboard with charts, currency config, and date range filtering.

**Decision: Option C split into two phases.**
- **Phase 1E** (this plan): Analysis page with AI spending insights + currency selector on Settings page
- **Phase 1F** (next): Settings page completion (CSV export, data management, DB stats, about section)

After 1E + 1F, all Phase 1A page stubs will be fully functional.

**Existing infrastructure this phase uses:**
- `analysis_snapshots` table: `id`, `snapshotType`, `data`, `generatedAt`, `createdAt`, `updatedAt`
- AI task type `analysis_insights` (seeded, configured for Sonnet)
- `app_settings` GET/PUT API (from 1D backend — no UI yet for currency)
- `useCurrency` hook + `formatCurrency` utility (from 1D dashboard)

---

## Goal / Problem Statement

The Analysis page is the app's AI headline feature — it turns raw transaction data into actionable spending insights. Currently it's a stub. The `analysis_snapshots` table and `analysis_insights` AI task type exist but are unused.

This phase builds:
1. A backend analysis service that sends transaction data to the configured AI provider and returns structured insights
2. Snapshot persistence so users can review past analyses without re-running AI
3. A frontend Analysis page displaying insights as readable cards/sections
4. A currency selector on the Settings page (small 1D loose end)

---

## Proposed Approach

### 1. Analysis Service (Backend)

**New feature:** `src/server/features/analysis/`

**`analysis.service.ts`** — core analysis generation:
- `generateAnalysis(dateFrom?: string, dateTo?: string): Promise<AnalysisSnapshot>`
- Queries transaction + category data for the given date range
- Builds a structured prompt with spending summary data (totals, by-category breakdowns, monthly trends, top merchants)
- Calls `routeToProvider('analysis_insights', messages, { maxTokens: 4096, temperature: 0.3 })`
- Parses AI response into structured `AnalysisInsights` format (see Data Structures below)
- Stores result in `analysis_snapshots` table (setting `id`, `snapshotType`, `data`, `generatedAt`, `createdAt`, `updatedAt`)
- Returns the snapshot

**System message in messages array (consistent with existing codebase):**
The `ChatOptions` interface defines a `systemPrompt` field, but **no provider implementation reads it**. The Claude provider (`providers/claude.ts:21`) extracts system messages by filtering `messages` for `role: 'system'` and passes them to the Anthropic API's `system` parameter. The AI categorisation service (`ai-categorisation.service.ts:100-105`) follows this same pattern. The analysis service will do the same:

- `messages[0]`: `{ role: 'system', content: 'You are a personal finance analyst. Analyse the spending data provided and return structured insights as JSON matching the specified schema. Be specific — reference actual numbers, categories, and merchants from the data. Do not give generic advice.' }`
- `messages[1]`: `{ role: 'user', content: <summarised data + JSON schema instructions> }`

**Prompt data — summarised aggregates (not raw transactions):**
Sending all transactions would blow up token counts for users with thousands of transactions. Instead, the service builds a summary payload:
- Total income / expenses / net for the period
- Top 10 spending categories with amounts and percentages
- Monthly totals (income + expenses) for trend analysis
- Top 10 merchants by total spend (**new query** — see below)
- Transaction count, date range
- Currency code (for context in recommendations)

The stats endpoint (`GET /api/transactions/stats`) provides category and monthly aggregates but **does not aggregate by merchant**. The analysis service needs its own merchant aggregation query:
```sql
SELECT merchant, SUM(amount) as total, COUNT(*) as count
FROM transactions
WHERE type = 'debit' AND merchant IS NOT NULL
  AND date >= ? AND date <= ?
GROUP BY merchant
ORDER BY total DESC
LIMIT 10
```
This is net-new query logic within the analysis service, not a reuse of the stats endpoint.

**AI response retry on parse failure:**
If the AI returns malformed JSON that fails Zod validation:
1. Make one retry call to `routeToProvider` with the same system message and the original user message, plus an additional assistant message containing the malformed response, plus a user message: "Your previous response was not valid JSON. Please return only valid JSON matching the schema."
2. If the retry also fails validation, return the error to the client with `{ error: 'AI_PARSE_ERROR', message: 'Failed to parse AI response' }`. The client shows an error state with a "Try Again" button.
3. No further retries — two attempts is the limit.

**`routes.ts`** — API endpoints:
| Method | Path | Description | Rate Limited |
|--------|------|-------------|-------------|
| POST | `/api/analysis/generate` | Generate new analysis for date range | Yes (AI call) |
| GET | `/api/analysis/snapshots` | List past snapshots (metadata only — id, type, dateRange, generatedAt) | No |
| GET | `/api/analysis/snapshots/:id` | Get full snapshot with insights data | No |
| DELETE | `/api/analysis/snapshots/:id` | Delete a snapshot | No |

**POST `/api/analysis/generate`:**
- Body: `{ dateFrom?: string, dateTo?: string }`
- Validates date range
- Calls `generateAnalysis()` synchronously (single AI call, should return in 5–15s)
- Returns 200 with the full snapshot (not fire-and-forget — user waits for result)
- Rate limited via `aiRateLimiter`

**Why synchronous, not fire-and-forget:**
Unlike AI categorisation (which processes batches of transactions in the background), analysis is a single AI call that the user explicitly triggered and is waiting for. A loading spinner for 5–15s is better UX than a 202 + polling pattern here.

**GET `/api/analysis/snapshots` — snapshot list without JSON parsing:**
The `period` field (dateFrom/dateTo) is embedded inside the `data` JSON column. To avoid parsing every snapshot's JSON for the list endpoint, the service extracts `period` at generation time and includes it as a top-level field in the response. Two approaches considered:

1. **Parse JSON in the list query** — `JSON_EXTRACT(data, '$.period')` in SQLite. Simple, no schema change, adequate for the expected low snapshot count (tens, not thousands).
2. **Add top-level columns** — `dateFrom`/`dateTo` columns on `analysis_snapshots`. Cleaner queries but requires a migration for an optimization that's premature at this scale.

**Decision:** Use `JSON_EXTRACT` in the list query. Snapshot volumes will be low (user-triggered, not automated). Revisit if performance becomes an issue.

### 2. Data Structures

**`analysis_snapshots` table columns (existing schema at `schema/index.ts:66-73`):**
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID, set on insert |
| `snapshotType` | TEXT NOT NULL | Always `'analysis_insights'` for this phase |
| `data` | TEXT NOT NULL | JSON string of `AnalysisInsights` |
| `generatedAt` | TEXT NOT NULL | ISO timestamp of when AI generated the response |
| `createdAt` | TEXT NOT NULL | ISO timestamp, set on insert |
| `updatedAt` | TEXT NOT NULL | ISO timestamp, set on insert (same as createdAt initially) |

**`AnalysisInsights` (stored as JSON in `analysis_snapshots.data`):**
```ts
interface AnalysisInsights {
  period: { from: string; to: string };
  currency: string;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netAmount: number;
    transactionCount: number;
  };
  sections: AnalysisSection[];
}

interface AnalysisSection {
  title: string;           // e.g. "Spending Overview", "Top Categories", "Trends"
  type: 'overview' | 'categories' | 'trends' | 'anomalies' | 'recommendations';
  content: string;         // Markdown-formatted analysis text
  highlights?: string[];   // Key takeaways as bullet points
  data?: Record<string, unknown>; // Optional structured data for future charting
}
```

**Required sections (AI is instructed to always include these 5):**
1. **Spending Overview** (`overview`) — high-level summary of the period
2. **Top Categories** (`categories`) — where the money goes, with percentages
3. **Trends** (`trends`) — month-over-month changes, direction of spending
4. **Anomalies** (`anomalies`) — unusual transactions or spikes vs prior months
5. **Recommendations** (`recommendations`) — actionable savings tips based on the data

**Snapshot metadata (for list endpoint):**
```ts
interface SnapshotMeta {
  id: string;
  snapshotType: string;
  period: { from: string; to: string };
  generatedAt: string;
}
```

### 3. Analysis Page (Frontend)

**New feature:** `src/client/features/analysis/`

**Components:**
- **`analysis-page.tsx`** — main page layout, state management
- **`generate-panel.tsx`** — date range selector + "Generate Insights" button + loading state
- **`insights-display.tsx`** — renders the structured sections as cards
- **`section-card.tsx`** — individual insight section (title, content as rendered Markdown, highlight bullets)
- **`snapshot-history.tsx`** — sidebar/dropdown listing past snapshots, click to load
- **`empty-state.tsx`** — shown when no analysis exists yet

**Page layout:**
```
┌─────────────────────────────────────────────┐
│  Analysis                                    │
│                                              │
│  ┌─── Generate Panel ────────────────────┐  │
│  │ Date range: [Last 3 Months ▾]         │  │
│  │ [Generate Insights]  [History (3) ▾]  │  │
│  └───────────────────────────────────────┘  │
│                                              │
│  ┌─── Spending Overview ─────────────────┐  │
│  │ Summary text...                        │  │
│  │ • Highlight 1                          │  │
│  │ • Highlight 2                          │  │
│  └───────────────────────────────────────┘  │
│                                              │
│  ┌─── Top Categories ───────────────────┐   │
│  │ Analysis text...                       │  │
│  │ • Highlight 1                          │  │
│  └───────────────────────────────────────┘  │
│                                              │
│  ┌─── Trends ───────────────────────────┐   │
│  │ ...                                    │  │
│  └───────────────────────────────────────┘  │
│                                              │
│  ┌─── Anomalies ────────────────────────┐   │
│  │ ...                                    │  │
│  └───────────────────────────────────────┘  │
│                                              │
│  ┌─── Recommendations ──────────────────┐   │
│  │ ...                                    │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Date range picker — promote existing component to shared:**
The dashboard's `DateRangePicker` (`src/client/features/dashboard/components/date-range-picker.tsx`) is a self-contained component with presets (This Month, Last 3/6 Months, This Year, All Time) and custom range support. The analysis page needs the same presets and same UX. Rather than duplicating, promote it to `src/client/shared/components/date-range-picker.tsx` and import from both dashboard and analysis features.

**Cross-boundary edits for this promotion:**
1. Create `src/client/shared/components/` directory (currently `src/client/shared/` only contains `utils/`)
2. Move `date-range-picker.tsx` from `src/client/features/dashboard/components/` to `src/client/shared/components/`
3. Update import in `src/client/app/pages/dashboard.tsx` (lines 4-5 — imports `DateRangePicker`, `getDefaultDateRange`, and `DateRange` type)
4. Move test file `src/client/features/dashboard/__tests__/date-range-picker.test.tsx` to `src/client/shared/components/__tests__/date-range-picker.test.tsx` and update its import path (line 3 — imports from `../components/date-range-picker.js`)
5. Import from shared in the analysis `generate-panel.tsx`

**Markdown rendering — `react-markdown`:**
The AI's `content` field is Markdown. AI output can include arbitrary Markdown (headers, lists, bold, code blocks, tables). A regex-based converter would be fragile and require ongoing maintenance for edge cases. `react-markdown` is the right tool: mature, tree-shakeable, handles the full CommonMark spec.

**Implementation step:** `npm install react-markdown` added to step 1 of the implementation order.

The `section-card.tsx` component renders `content` via `<ReactMarkdown>{section.content}</ReactMarkdown>`. No `dangerouslySetInnerHTML` needed. Since this is a local single-user app with AI-generated content (not external user input), no additional sanitisation is required.

**Loading state:**
- "Generate Insights" button shows a spinner + "Analysing your spending..." message
- Disable button during generation
- On error: show error message with "Try Again" button

**Snapshot history:**
- Dropdown or sidebar listing past snapshots by date
- Click a snapshot to load its insights (no AI call — reads from DB)
- Delete button on each snapshot
- Most recent snapshot auto-displayed on page load (if any exist)

**Snapshot retention:** Keep all snapshots indefinitely. Volumes are low (user-triggered, not automated — a heavy user might generate a few per week). No auto-expiry mechanism needed for Phase 1E. Revisit in a future phase if storage becomes a concern.

### 4. Currency Selector on Settings Page

Small addition to complete the 1D loose end. Inline in `settings.tsx` — no separate feature module.

The currency selector is a single dropdown + save button. Creating a full feature module (`CLAUDE.md`, `logger.ts`, `index.ts`, barrel export, tests dir) for one component is over-engineered. Instead:
- Add a `CurrencySelector` component directly in `src/client/app/pages/settings.tsx` (or as a small co-located file `src/client/app/components/currency-selector.tsx` if settings.tsx gets too long)
- Uses the existing `useCurrency`, `useAppSettings`, and `useUpdateAppSetting` hooks from `src/client/features/dashboard/hooks.ts`
- Uses the existing `PUT /api/settings/app/currency` endpoint via `useUpdateAppSetting`
- These settings-related hooks living in the dashboard feature is a known awkwardness — Phase 1F can promote them to the settings feature module when it's created

**CurrencySelector behavior:**
- Dropdown with common currencies (AUD, USD, GBP, EUR, JPY, CAD, NZD, SGD, HKD, CHF) + "Other" option with text input
- On change: calls PUT endpoint, invalidates `app-settings` React Query cache (dashboard + analysis pick up new currency)

---

## Cross-Feature Boundary Approvals (Rule 5)

| Import | Source | Used By | Type | Risk |
|--------|--------|---------|------|------|
| `routeToProvider` | `src/server/lib/ai/router.ts` | `analysis.service.ts` | AI routing | Low |
| `analysisSnapshots` | `src/server/lib/db/schema/index.ts` | `analysis.service.ts`, `routes.ts` | DB schema read/write | Low |
| `useCurrency`, `useAppSettings`, `useUpdateAppSetting` | `src/client/features/dashboard/hooks.ts` | Settings page (currency selector) | Hooks (read + mutation) | Low |
| `formatCurrency` | `src/client/shared/utils/format-currency.ts` | Analysis page components | Shared util | None |
| `DateRangePicker` (promote to shared) | `src/client/features/dashboard/components/date-range-picker.tsx` → `src/client/shared/components/date-range-picker.tsx` | Dashboard + Analysis | Move to shared | Low |
| DateRangePicker test (move with component) | `src/client/features/dashboard/__tests__/date-range-picker.test.tsx` → `src/client/shared/components/__tests__/date-range-picker.test.tsx` | — | Move test file | Low |
| `src/client/app/pages/dashboard.tsx` | App pages | Update DateRangePicker import path | Import path change | Low |
| `src/server/app.ts` | Server app | Register analysis routes | Route registration | Low |
| `src/client/app/pages/analysis.tsx` | App pages | Replace stub | Page modification | Low |
| `src/client/app/pages/settings.tsx` | App pages | Add currency selector | Page modification | Low |
| `src/shared/types/index.ts` | Shared types | Add analysis types | Type addition | Low |
| `src/shared/types/validation.ts` | Shared types | Add analysis validation schemas | Schema addition | Low |

---

## Files to Create / Modify

| Action | File Path | Description |
|--------|-----------|-------------|
| **Create** | `src/server/features/analysis/CLAUDE.md` | Feature boundary doc |
| Create | `src/server/features/analysis/logger.ts` | Scoped logger |
| Create | `src/server/features/analysis/analysis.service.ts` | AI analysis generation + merchant aggregation query + snapshot persistence |
| Create | `src/server/features/analysis/routes.ts` | API endpoints (generate, list, get, delete snapshots) |
| Create | `src/server/features/analysis/index.ts` | Feature barrel export |
| **Create** | `src/client/features/analysis/CLAUDE.md` | Feature boundary doc |
| Create | `src/client/features/analysis/logger.ts` | Scoped logger |
| Create | `src/client/features/analysis/api.ts` | API calls (generate, list, get, delete) |
| Create | `src/client/features/analysis/hooks.ts` | React Query hooks |
| Create | `src/client/features/analysis/components/analysis-page.tsx` | Main page layout + state |
| Create | `src/client/features/analysis/components/generate-panel.tsx` | Date range + generate button (imports shared DateRangePicker) |
| Create | `src/client/features/analysis/components/insights-display.tsx` | Renders insight sections |
| Create | `src/client/features/analysis/components/section-card.tsx` | Individual section card (uses react-markdown) |
| Create | `src/client/features/analysis/components/snapshot-history.tsx` | Past snapshot list |
| Create | `src/client/features/analysis/components/empty-state.tsx` | No analysis CTA |
| Create | `src/client/features/analysis/index.ts` | Feature barrel export |
| **Create** | `tests/analysis.test.ts` | Integration tests for analysis API |
| Create | `src/client/features/analysis/__tests__/generate-panel.test.tsx` | Generate panel rendering + interaction |
| Create | `src/client/features/analysis/__tests__/insights-display.test.tsx` | Section rendering + Markdown content |
| Create | `src/client/features/analysis/__tests__/snapshot-history.test.tsx` | History list rendering |
| **Create** | `src/client/shared/components/` | New shared components directory (currently only `utils/` exists under `shared/`) |
| **Move** | `src/client/features/dashboard/components/date-range-picker.tsx` → `src/client/shared/components/date-range-picker.tsx` | Promote to shared component |
| **Move** | `src/client/features/dashboard/__tests__/date-range-picker.test.tsx` → `src/client/shared/components/__tests__/date-range-picker.test.tsx` | Move test alongside promoted component |
| **Modify** | `src/client/app/pages/dashboard.tsx` | Update DateRangePicker/DateRange/getDefaultDateRange imports to shared path (lines 4-5) |
| Modify | `src/shared/types/index.ts` | Add `AnalysisInsights`, `AnalysisSection`, `SnapshotMeta` types |
| Modify | `src/shared/types/validation.ts` | Add `generateAnalysisSchema` |
| Modify | `src/server/app.ts` | Register analysis routes |
| Modify | `src/client/app/pages/analysis.tsx` | Replace stub with feature import |
| Modify | `src/client/app/pages/settings.tsx` | Add currency selector inline |
| Modify | `package.json` | Add `react-markdown` dependency |

---

## Implementation Order

1. **Dependencies:** `npm install react-markdown`
2. **Shared types + validation:** Add `AnalysisInsights`, `AnalysisSection`, `SnapshotMeta` types and Zod schemas
3. **Promote DateRangePicker:** Create `src/client/shared/components/` directory, move component + test file there, update imports in `dashboard.tsx`
4. **Backend analysis feature:** CLAUDE.md, logger, `analysis.service.ts` (including merchant aggregation query + retry logic), `routes.ts`, register in `app.ts`
5. **Integration tests:** Test generate (mocked AI), list (JSON_EXTRACT for period), get, delete snapshot endpoints
6. **Frontend analysis feature:** CLAUDE.md, logger, `api.ts`, `hooks.ts`
7. **Frontend components:** empty-state → section-card (with react-markdown) → generate-panel → insights-display → snapshot-history → analysis-page
8. **Page wiring:** Replace analysis.tsx stub
9. **Settings — currency selector:** Add CurrencySelector inline in settings.tsx
10. **ARCHITECTURE.md update**

---

## Testing Plan

| Test File | What It Covers |
|-----------|---------------|
| `tests/analysis.test.ts` | POST generate (mocked AI response), retry on malformed JSON, GET snapshots list (period extracted via JSON_EXTRACT), GET snapshot by ID, DELETE snapshot, validation errors, merchant aggregation correctness |
| `src/client/features/analysis/__tests__/generate-panel.test.tsx` | Date range presets (via shared DateRangePicker), generate button click, loading state, disabled during generation |
| `src/client/features/analysis/__tests__/insights-display.test.tsx` | Renders all 5 section types, handles missing optional fields, Markdown content renders via react-markdown |
| `src/client/features/analysis/__tests__/snapshot-history.test.tsx` | Lists snapshots, click loads snapshot, delete button, empty state |

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| AI returns malformed JSON | Medium | Zod validation on AI response; retry once with corrective prompt (see retry logic above); error state with "Try Again" on second failure |
| AI insights are generic / unhelpful | Medium | Detailed prompt with actual numbers; structured output format forces specificity; system message instructs against generic advice; user can re-generate |
| Long AI response time (>15s) | Low | Loading state with message; timeout at 60s with error; Sonnet is fast for structured output |
| Token count too high for large datasets | Low | We send summarised aggregates, not raw transactions; capped at top-10 categories/merchants |
| Markdown rendering edge cases | Very Low | `react-markdown` handles full CommonMark spec; local single-user app, no XSS risk |

---

## Phase 1F Preview (Settings Completion — next phase)

For reference, 1F will cover:
- Full `src/client/features/settings/` module (CLAUDE.md, logger, etc.)
- Promote settings hooks (`useAppSettings`, `useCurrency`, `useUpdateAppSetting`) from `dashboard/hooks.ts` to the new settings feature module (currently consumed by dashboard, transactions `StatsSummary`, and settings page)
- CSV transaction export
- Data management (bulk delete, re-seed categories, re-run categorisation)
- DB stats / about section (document count, transaction count, DB size)
- Any additional app settings that emerge from 1E usage

---

## Open Questions
- (all resolved — see Decisions Made)

## Decisions Made
- Option C split into Phase 1E (Analysis) + Phase 1F (Settings) — user decision
- Phase 1E includes currency selector on Settings page (small, completes 1D loose end)
- Synchronous AI call (not fire-and-forget) — user waits for single analysis result
- Send summarised aggregates to AI, not raw transactions — controls token usage
- 5 required insight sections for consistent output structure (structured JSON, not free-form — the entire plan is designed around this)
- Use `{ role: 'system' }` in messages array for system-level instructions (consistent with existing codebase — `ChatOptions.systemPrompt` is defined but unimplemented in all providers)
- Merchant aggregation is a new query in the analysis service (not available from existing stats endpoint)
- Retry once on AI JSON parse failure with corrective prompt; fail with error on second attempt
- Use `JSON_EXTRACT` for snapshot list period extraction (adequate for low volumes; no schema migration)
- Snapshot retention: keep indefinitely (user-triggered, low volume; revisit in future phase if needed)
- Markdown rendering: `react-markdown` (npm dependency) — handles full CommonMark spec, regex approach too fragile for arbitrary AI output
- Promote `DateRangePicker` from dashboard to `src/client/shared/components/` — avoids duplication, same presets/UX needed
- Currency selector inline in `settings.tsx` — defer full settings feature module to Phase 1F
- `analysis_snapshots.updatedAt` set on insert (same as `createdAt`); no update workflow in Phase 1E
- Currency selector: no dedicated test file in Phase 1E — it's a simple dropdown + save using existing hooks/endpoint. Phase 1F will add comprehensive settings tests when the full module is built

## Comments / Review Notes
- Review round 1: 10 items addressed. Schema column (updatedAt), react-markdown decision, systemPrompt usage, merchant query gap, DateRangePicker promotion, retry logic, JSON_EXTRACT for list, inline currency selector, open questions resolved.
- Review round 2: 4 items addressed. (1) systemPrompt is unimplemented — switched to messages array pattern matching ai-categorisation.service.ts. (2) DateRangePicker test file existence check — initially reported as missing (glob missed `__tests__` directory), corrected in round 3. (3) `src/client/shared/components/` directory creation noted in implementation order. (4) `useUpdateAppSetting` added to boundary table; hook location awkwardness acknowledged, deferred to 1F.
- Review round 3 (alignment review): 6 items corrected. (1) DateRangePicker test file DOES exist at `dashboard/__tests__/date-range-picker.test.tsx` — added move to Files table + boundary table + implementation order. (2) Files table "dashboard/components/ imports" row was vague — replaced with specific `app/pages/dashboard.tsx` path and line numbers. (3) Phase 1F preview now mentions promoting settings hooks from dashboard. (4) Currency selector test decision made explicit (no test in 1E, deferred to 1F). (5) `src/client/shared/components/` directory creation added to Files table. (6) Boundary table now includes test file move and dashboard.tsx import update as separate entries.
