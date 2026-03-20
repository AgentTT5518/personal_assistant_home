# Requirements: Settings Page (Phase 1F)

**Feature:** Settings Page Completion
**Status:** Complete
**Date:** 2026-03-20

---

## Overview
Complete the Settings page — the last Phase 1 page stub. Provides a centralised location for app configuration, data export, data management, and system information.

## Functional Requirements

### FR-1: Currency Selection
- Display common currency buttons (AUD, USD, GBP, EUR, JPY, CAD, NZD, SGD, HKD, CHF)
- Highlight the currently active currency
- Allow custom currency input (minimum 3 characters)
- Show loading state while updating
- Show inline error on failure

### FR-2: AI Settings
- Display AI provider/model configuration panel (imported from document-upload feature)
- No changes to existing AI settings functionality

### FR-3: CSV Transaction Export
- Download transactions as CSV with headers: date, description, amount, type, merchant, category, is_recurring
- Optional date range filtering via DateRangePicker (defaults to last 3 months)
- Filename format: `transactions-YYYY-MM-DD.csv` (date of export)
- Loading state: button disabled with spinner while fetch in progress
- Show "No transactions to export" on empty result
- Show inline error on failure

### FR-4: Data Management — Delete All Data
- `DELETE /api/data/all` endpoint removes all transactions, account summaries, documents, and uploaded files from disk
- Requires `{ confirm: true }` request body as safety guard
- Deletion order respects foreign keys: transactions → account summaries → documents → files
- Returns counts: `{ deletedTransactions, deletedAccountSummaries, deletedDocuments }`
- Frontend: two-step confirmation (click → "Are you sure?" with cancel/confirm)
- Success shows inline message with counts; invalidates all React Query caches

### FR-5: Data Management — Re-seed Default Categories
- `POST /api/categories/re-seed` endpoint on category router
- Requires `{ confirm: true }` request body
- Nullifies `category_id` on all transactions first (FK has no ON DELETE cascade)
- Drops all category rules, then all categories
- Re-seeds default categories from shared seed function
- Frontend: two-step confirmation; success message hints to re-run categorisation
- Auto-invalidates categories query cache

### FR-6: Data Management — Re-run Categorisation
- Calls existing `POST /api/transactions/auto-categorise` endpoint
- No confirmation required (non-destructive)
- Shows success message with counts (categorised N of M)

### FR-7: Database Stats & About
- `GET /api/settings/stats` endpoint returns: document count, transaction count, category count, DB file size in bytes, app version from package.json
- Frontend displays stats in a card with icons and formatted values

## Non-Functional Requirements

### NFR-1: Hook Promotion
- Settings hooks (`useAppSettings`, `useCurrency`, `useUpdateAppSetting`) and API functions (`fetchAppSettings`, `updateAppSetting`, `handleResponse`) promoted from `dashboard/` to `settings/` feature module
- Dashboard `hooks.ts` and `api.ts` deleted; dashboard becomes purely presentational
- All consumers updated to import from settings

### NFR-2: API Centralisation
- All API calls centralised in `settings/api.ts`
- All mutations wrapped in React Query hooks in `settings/hooks.ts`
- `handleResponse` helper is private to api.ts — not exported from barrel

### NFR-3: Error Handling
- All backend endpoints use try-catch with `log.error()` and `next(error)`
- All frontend operations show inline error messages on failure
- Scoped logger: `createLogger('settings')`

## API Endpoints

| Method | Path | Router | Description |
|--------|------|--------|-------------|
| GET | `/api/transactions/export/csv` | transactionRouter | CSV export with optional `?from=&to=` date range |
| DELETE | `/api/data/all` | settingsRouter | Bulk delete all data (confirm required) |
| POST | `/api/categories/re-seed` | categoryRouter | Re-seed default categories (confirm required) |
| GET | `/api/settings/stats` | settingsRouter | DB stats and app version |
