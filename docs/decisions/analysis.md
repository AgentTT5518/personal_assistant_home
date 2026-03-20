# Architecture Decision Record: Phase 1E — Analysis

## Decisions

### 1. Summarised aggregates over raw transactions
**Decision:** Send summarised data (totals, top-10 categories/merchants, monthly trends) to AI, not raw transactions.
**Reason:** Raw transactions would blow up token counts for users with thousands of transactions. Aggregates keep prompts under 4K tokens regardless of dataset size.

### 2. System message via messages array
**Decision:** Use `{ role: 'system' }` in the messages array, not `ChatOptions.systemPrompt`.
**Reason:** `ChatOptions.systemPrompt` is defined but unimplemented in all providers. The Claude provider extracts system messages by filtering messages for `role: 'system'`. The AI categorisation service follows this same pattern.

### 3. Synchronous AI call (not fire-and-forget)
**Decision:** POST `/api/analysis/generate` blocks until the AI responds.
**Reason:** Unlike AI categorisation (batch background processing), analysis is a single AI call the user explicitly triggered. A loading spinner for 5–15s is better UX than 202 + polling.

### 4. JSON_EXTRACT for snapshot list period
**Decision:** Use `JSON_EXTRACT(data, '$.period')` in the list query rather than adding dedicated columns.
**Reason:** Snapshot volumes are low (user-triggered, not automated). Adding `dateFrom`/`dateTo` columns would require a migration for premature optimisation. Revisit if performance becomes an issue.

### 5. Retry once on AI parse failure
**Decision:** On malformed JSON from AI, retry once with corrective prompt appended to conversation, then fail.
**Reason:** AI occasionally wraps JSON in markdown fences or returns incomplete responses. One retry with context usually fixes it. More retries waste tokens with diminishing returns.

### 6. react-markdown for section content
**Decision:** Use `react-markdown` (npm dependency) for rendering AI-generated Markdown content.
**Reason:** AI output can include arbitrary Markdown (headers, lists, bold, code blocks, tables). A regex-based converter would be fragile. `react-markdown` handles full CommonMark spec.

### 7. Promote DateRangePicker to shared
**Decision:** Move `DateRangePicker` from `dashboard/components/` to `src/client/shared/components/`.
**Reason:** Both dashboard and analysis pages need the same date range presets and UX. Duplication would create drift.

### 8. Currency selector inline in settings
**Decision:** Add `CurrencySelector` directly in `settings.tsx`, not as a separate feature module.
**Reason:** A full feature module (CLAUDE.md, logger, barrel export, tests dir) for one dropdown is over-engineered. Phase 1F will create the full settings feature module and promote settings hooks from dashboard.

### 9. Snapshot retention: keep indefinitely
**Decision:** No auto-expiry for analysis snapshots.
**Reason:** Volumes are low (user-triggered). Revisit in a future phase if storage becomes a concern.
