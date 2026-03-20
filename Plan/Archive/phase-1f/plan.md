# Plan: Phase 1F — Settings Page Completion

**Status:** Complete
**Created:** 2026-03-20
**Feature Branch:** `feature/phase-1f-settings`

---

## Goal / Problem Statement
Complete the Settings page — the last Phase 1 page stub. This involves:
1. Creating a proper `src/client/features/settings/` module
2. Promoting settings hooks/API out of the dashboard feature into settings
3. Adding CSV transaction export
4. Adding data management actions (bulk delete, re-seed categories, re-run categorisation)
5. Adding DB stats / about section
6. Moving the inline `CurrencySelector` component into the settings feature module

After 1F, all page stubs from Phase 1A will be fully functional.

## Proposed Approach

### Implementation order
Backend-first: Steps 1–3 (scaffold + promote + update consumers) → Steps 4–5 (extract component, AiSettingsPanel decision) → Step 6 backend → Step 7 backend → Step 8 backend → run server tests as checkpoint → Steps 6–8 frontend → Step 9 remaining tests.

### Step 1: Scaffold the client settings feature module
Create `src/client/features/settings/` with:
- `CLAUDE.md` (feature boundary)
- `logger.ts` (scoped logger)
- `api.ts` (settings API calls — promoted from dashboard, including the `handleResponse()` helper)
- `hooks.ts` (settings hooks — promoted from dashboard)
- `components/currency-selector.tsx` (extracted from settings.tsx page)
- `components/data-management.tsx` (bulk delete, re-seed, re-run categorisation)
- `components/db-stats.tsx` (document count, transaction count, DB size, app version)
- `components/csv-export.tsx` (download button for transaction CSV)
- `index.ts` (public API — exports hooks, components, and any API functions needed by consumers)

**Note:** `index.ts` must be updated as each new component is added in Steps 6–8 to re-export `CsvExport`, `DataManagement`, and `DbStats`.

### Step 2: Promote settings hooks + API from dashboard
**Move from dashboard → settings feature:**
- `fetchAppSettings()`, `updateAppSetting()`, and the internal `handleResponse<T>()` helper from `dashboard/api.ts` → `settings/api.ts`
- `useAppSettings()`, `useCurrency()`, `useUpdateAppSetting()` from `dashboard/hooks.ts` → `settings/hooks.ts`

**After promotion, delete both files:**
- `dashboard/api.ts` — all exports promoted; no dashboard component imports from it (they use transactions hooks)
- `dashboard/hooks.ts` — all exports promoted; same reason

**Note:** Dashboard has no `index.ts`, so no barrel file needs updating. After deletion the dashboard feature contains only `CLAUDE.md`, `logger.ts`, `components/`, and `__tests__/`.

### Step 3: Update all consumers (3 files + 1 CLAUDE.md)
| File | Current Import | New Import |
|------|---------------|------------|
| `src/client/app/pages/settings.tsx` | `useCurrency`, `useUpdateAppSetting` from `../../features/dashboard/hooks.js` | from `../../features/settings/index.js` |
| `src/client/app/pages/dashboard.tsx` | `useCurrency` from `../../features/dashboard/hooks.js` | from `../../features/settings/index.js` |
| `src/client/features/transactions/components/stats-summary.tsx` | `useCurrency` from `../../dashboard/hooks.js` | from `../../settings/hooks.js` |
| `src/client/features/analysis/CLAUDE.md` | references "dashboard (useCurrency hook)" | update to reference "settings (useCurrency hook)" |

**Verified:** No `.ts`/`.tsx` file under `src/client/features/analysis/` imports from `dashboard/hooks` or `dashboard/api` — only the CLAUDE.md reference needs updating.

**Verified:** `useAppSettings` has no external consumers — it's only used internally by `useCurrency` within hooks.ts.

### Step 4: Extract CurrencySelector from settings.tsx page
Move the `CurrencySelector` component (lines 8-77 of `settings.tsx`) into `src/client/features/settings/components/currency-selector.tsx`. The page file will import it from the settings feature module.

### Step 5: AiSettingsPanel — leave in document-upload
The `AiSettingsPanel` is tightly coupled to `document-upload`'s API layer (ai-settings endpoints). Moving it would require pulling over its API calls and hooks too, creating unnecessary churn. **Decision: leave it in document-upload and import it from there on the settings page.** This is already how it works today.

### Step 6: CSV export backend + frontend
**Backend** — add to `src/server/features/transactions/routes.ts`:
- `GET /api/transactions/export/csv` — query transactions with optional `?from=&to=` date range query params (ISO date strings), default to all transactions. Stream as CSV with headers: date, description, amount, type, merchant, category, is_recurring. Set `Content-Type: text/csv` and `Content-Disposition: attachment; filename=transactions-YYYY-MM-DD.csv` (date of export).

**Frontend** — `settings/components/csv-export.tsx`:
- Download button with integrated DateRangePicker (reuse shared component) for optional date filtering
- Constructs URL with query params, fetches and triggers browser download via blob URL
- Loading state: button disabled + spinner while fetch is in progress
- Error handling: on failure (network error, non-200 response), show inline error message below the button. On empty result set (0 transactions), show "No transactions to export" message.

### Step 7: Data management backend + frontend
**Backend** — add new endpoints:
- `DELETE /api/data/all` on settings router — deletes all transactions, account summaries, documents, and uploaded files from disk. Requires `{ confirm: true }` body. Returns `{ deletedTransactions: number, deletedAccountSummaries: number, deletedDocuments: number }`.
  - **Cross-feature access:** This endpoint will import from the shared Drizzle schema (`src/server/lib/db/schema/index.ts`) and query `transactions`, `accountSummaries`, and `documents` tables directly via raw Drizzle queries — not through other features' service layers. Deletion order: transactions first (FK to documents), then account summaries (FK to documents), then documents. For file cleanup, it reads `documents.file_path` values and deletes files from the `uploads/` directory using `fs.unlink`. This avoids creating import dependencies on the transactions or document-processor feature modules.
- `POST /api/categories/re-seed` on **category router** (`src/server/features/transactions/category.routes.ts`) — nullifies `category_id` on all transactions first (since the FK has no `ON DELETE` cascade), then drops all categories (cascading rules), then re-seeds defaults from `src/server/lib/db/seed.ts`. Requires `{ confirm: true }` body. The UI should hint that users may want to re-run categorisation after re-seeding to re-assign transactions to the new default categories.
- `POST /api/transactions/auto-categorise` — already exists!

**Frontend** — `settings/components/data-management.tsx`:
- "Delete All Data" button with confirmation dialog (warns it deletes transactions, account summaries, documents, and uploaded files)
- "Re-seed Default Categories" button with confirmation dialog (hints to re-run categorisation afterwards)
- "Re-run Categorisation" button (calls existing auto-categorise endpoint)
- All destructive buttons show a two-step confirmation: click → "Are you sure?" with cancel/confirm
- Success feedback: on completion, show inline success message with counts (e.g. "Deleted 42 transactions, 5 documents") and invalidate relevant React Query caches so dashboard/stats refresh
- Error feedback: on failure, show inline error message below the button
- After successful re-seed, auto-invalidate categories query cache

### Step 8: DB stats backend + frontend
**Backend** — add to server settings routes:
- `GET /api/settings/stats` — returns document count, transaction count, category count, DB file size in bytes, app version from package.json

**Frontend** — `settings/components/db-stats.tsx`:
- Display stats in a card: counts, DB size (formatted), app version

### Step 9: Tests
- `src/client/features/settings/__tests__/hooks.test.ts` — test useCurrency, useAppSettings, useUpdateAppSetting
- `src/client/features/settings/__tests__/currency-selector.test.tsx` — test currency selection UI
- `src/client/features/settings/__tests__/csv-export.test.tsx` — test download trigger, loading state, error handling
- `src/client/features/settings/__tests__/data-management.test.tsx` — test confirmation dialogs and API calls
- `src/client/features/settings/__tests__/db-stats.test.tsx` — test stats display
- `src/server/features/settings/routes.test.ts` — extend with stats and bulk delete endpoint tests
- `src/server/features/transactions/routes.test.ts` — extend with CSV export tests
- `src/server/features/transactions/category.routes.test.ts` — extend with re-seed endpoint test

## Files to Create / Modify

| Action | File Path | Description |
|--------|-----------|-------------|
| Create | `src/client/features/settings/CLAUDE.md` | Feature boundary doc |
| Create | `src/client/features/settings/logger.ts` | Scoped logger |
| Create | `src/client/features/settings/api.ts` | Settings API calls + handleResponse helper (promoted from dashboard) |
| Create | `src/client/features/settings/hooks.ts` | Settings hooks (promoted from dashboard) |
| Create | `src/client/features/settings/components/currency-selector.tsx` | Extracted from settings page |
| Create | `src/client/features/settings/components/csv-export.tsx` | CSV download button with date range + error handling |
| Create | `src/client/features/settings/components/data-management.tsx` | Bulk delete, re-seed, re-run |
| Create | `src/client/features/settings/components/db-stats.tsx` | Database stats card |
| Create | `src/client/features/settings/index.ts` | Public exports (hooks + all components) |
| Create | `src/client/features/settings/__tests__/hooks.test.ts` | Hook tests |
| Create | `src/client/features/settings/__tests__/currency-selector.test.tsx` | Component test |
| Create | `src/client/features/settings/__tests__/csv-export.test.tsx` | Component test |
| Create | `src/client/features/settings/__tests__/data-management.test.tsx` | Component test |
| Create | `src/client/features/settings/__tests__/db-stats.test.tsx` | Component test |
| Delete | `src/client/features/dashboard/hooks.ts` | All hooks promoted to settings |
| Delete | `src/client/features/dashboard/api.ts` | All API calls + handleResponse promoted to settings |
| Modify | `src/client/app/pages/settings.tsx` | Import from settings feature, remove inline CurrencySelector |
| Modify | `src/client/app/pages/dashboard.tsx` | Import useCurrency from settings |
| Modify | `src/client/features/transactions/components/stats-summary.tsx` | Import useCurrency from settings |
| Modify | `src/client/features/analysis/CLAUDE.md` | Update cross-feature reference from dashboard to settings |
| Modify | `src/client/features/dashboard/CLAUDE.md` | Note hooks/api deleted; dashboard is now purely presentational |
| Modify | `src/server/features/settings/routes.ts` | Add GET /api/settings/stats and DELETE /api/data/all endpoints |
| Modify | `src/server/features/settings/routes.test.ts` | Add stats and bulk delete endpoint tests |
| Modify | `src/server/features/transactions/routes.ts` | Add GET /api/transactions/export/csv |
| Modify | `src/server/features/transactions/routes.test.ts` | Add CSV export tests |
| Modify | `src/server/features/transactions/category.routes.ts` | Add POST /api/categories/re-seed |
| Modify | `src/server/features/transactions/category.routes.test.ts` | Add re-seed endpoint tests |
| Modify | `ARCHITECTURE.md` | Update Component Map, API Endpoints, Feature Log |

## Open Questions
- [x] Should `AiSettingsPanel` move to settings? **Decision: No — leave in document-upload, import from there**
- [x] Should dashboard `api.ts` and `hooks.ts` be deleted or left empty? **Decision: Delete — dashboard components use transactions hooks, not these**
- [x] Should CSV export support date range filtering or always export all? **Decision: Yes — support optional `?from=&to=` query params, default to all**
- [x] Should "Delete All Transactions" also delete associated documents, or just the transactions? **Decision: Delete both — transactions AND associated documents (including uploaded files from disk)**
- [x] Should the bulk delete endpoint require a confirmation body param (e.g. `{ confirm: true }`) as a safety measure? **Decision: Yes — require `{ confirm: true }` body**

## Decisions Made
- **AiSettingsPanel stays in document-upload** — tightly coupled to its API layer, moving would create unnecessary churn
- **Delete dashboard hooks.ts and api.ts** — they contain only settings hooks/API which are all being promoted; dashboard components import from transactions feature, not these files. Dashboard has no index.ts so no barrel file update needed.
- **CSV export endpoint goes on transactions router** (`GET /api/transactions/export/csv`) — it's a transactions operation, not a settings one. Supports optional `?from=&to=` date range query params.
- **DB stats endpoint goes on settings router** (`GET /api/settings/stats`) — it's app-level metadata
- **Bulk delete removes transactions, account summaries, AND documents** — `DELETE /api/data/all` deletes all three entity types plus uploaded files from disk. Deletion order respects FKs: transactions → account summaries → documents → files. Requires `{ confirm: true }` body as safety guard. Returns counts for all three. Accesses DB via shared Drizzle schema (not other feature service layers) and cleans up files directly via `fs.unlink`.
- **Re-seed categories on category router** — `POST /api/categories/re-seed` on `category.routes.ts`, requires `{ confirm: true }` body. Nullifies `category_id` on transactions before deleting categories (no `ON DELETE` cascade on FK). UI hints to re-run categorisation afterwards.
- **Two-step UI confirmation** — all destructive actions in data management use click → confirm/cancel pattern
- **Backend-first implementation order** — all backend endpoints built and server-tested before frontend components, providing a clean checkpoint

## Comments / Review Notes
- This is the last Phase 1 page stub — after 1F, the full Phase 1 surface is live
- The hook promotion is the riskiest part (3 consumer files + 1 CLAUDE.md) — do it first, run typecheck immediately
- Dashboard feature becomes purely presentational after this (CLAUDE.md, logger.ts, components/, __tests__/ — no hooks, no api, no index.ts)
