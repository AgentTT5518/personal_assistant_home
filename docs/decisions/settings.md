# Architecture Decision Record: Settings (Phase 1F)

**Feature:** Settings Page Completion
**Status:** Accepted
**Date:** 2026-03-20

---

## ADR-1: AiSettingsPanel stays in document-upload

**Context:** The settings page displays AI provider/model configuration. The `AiSettingsPanel` component currently lives in `document-upload/` with its own API layer (ai-settings endpoints).

**Decision:** Leave `AiSettingsPanel` in `document-upload` and import it from there on the settings page.

**Rationale:** Moving it would require pulling over its API calls and hooks too, creating unnecessary churn for no functional benefit. The import-across-features approach is already used elsewhere.

## ADR-2: Delete dashboard hooks.ts and api.ts after promotion

**Context:** Dashboard's `hooks.ts` and `api.ts` contain only settings-related hooks/API (`useAppSettings`, `useCurrency`, `useUpdateAppSetting`, `fetchAppSettings`, `updateAppSetting`, `handleResponse`). No dashboard component imports from either file — they all use transactions hooks.

**Decision:** Delete both files entirely. Dashboard has no `index.ts` barrel file, so no re-export update needed.

**Rationale:** Leaving empty files creates confusion. Dashboard becomes purely presentational (CLAUDE.md, logger.ts, components/, __tests__/).

## ADR-3: CSV export endpoint on transactions router

**Context:** CSV export is a transactions data operation triggered from the settings page.

**Decision:** `GET /api/transactions/export/csv` on the transactions router, not the settings router.

**Rationale:** It operates on transaction data and belongs with other transaction endpoints. The frontend component lives in settings (where the user triggers it) but the backend lives with the data it serves.

## ADR-4: Bulk delete via shared schema, not feature service layers

**Context:** `DELETE /api/data/all` needs to delete transactions, account summaries, and documents across multiple features.

**Decision:** The endpoint imports from the shared Drizzle schema (`src/server/lib/db/schema/index.ts`) and queries tables directly — not through other features' service layers.

**Rationale:** Avoids creating import dependencies between the settings backend and the transactions/document-processor feature modules. The shared schema is the stable contract.

## ADR-5: FK-ordered deletion with explicit file cleanup

**Context:** Transactions reference documents via FK. Account summaries also reference documents.

**Decision:** Deletion order: transactions → account summaries → documents → files (via `fs.unlinkSync`). Requires `{ confirm: true }` body as safety guard.

**Rationale:** Respects foreign key constraints without relying on cascade behaviour. File cleanup is explicit because document `file_path` values need to be read before the rows are deleted.

## ADR-6: Re-seed nullifies category_id before dropping categories

**Context:** The `transactions.category_id` FK to `categories.id` has no `ON DELETE CASCADE`.

**Decision:** `POST /api/categories/re-seed` first nullifies `category_id` on all transactions, then deletes all category rules and categories within a transaction, then calls `seedDefaultCategories()` outside the transaction.

**Rationale:** The FK constraint would block category deletion if transactions still reference them. Nullification is safer than adding cascade behaviour to an existing schema.

## ADR-7: Extracted reusable seedDefaultCategories function

**Context:** The category seeding logic was inline in `seed.ts`. The re-seed endpoint needs the same logic.

**Decision:** Extract into `src/server/lib/db/seed-categories.ts` as `seedDefaultCategories()`. Both `seed.ts` and the re-seed endpoint import it.

**Rationale:** Avoids duplicating the category definitions and insertion logic. Single source of truth for default categories.

## ADR-8: Two-step UI confirmation for destructive actions

**Context:** Delete All Data and Re-seed Categories are destructive and irreversible.

**Decision:** Both use a click → "Are you sure?" with cancel/confirm pattern. Re-run Categorisation does not require confirmation (non-destructive).

**Rationale:** Prevents accidental data loss while keeping the non-destructive action quick to trigger.

## ADR-9: API calls centralised in api.ts, mutations in hooks.ts

**Context:** Initial implementation had `data-management.tsx` making raw `fetch` calls with `handleResponse` imported from `api.ts`.

**Decision:** (Revised during review) All API calls moved to `api.ts` (`deleteAllData`, `reSeedCategories`, `runAutoCategorise`, `fetchDbStats`). Corresponding mutation hooks added to `hooks.ts`. `handleResponse` is now private to `api.ts`.

**Rationale:** Consistent with the rest of the codebase where components use hooks, not raw fetch. Keeps `handleResponse` as an internal implementation detail.
