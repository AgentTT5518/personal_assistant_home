# Plan: Phase 1D — Dashboard

**Status:** Planning — Implementation Detail
**Created:** 2026-03-19
**Feature Branch:** `feature/dashboard`

---

## Goal / Problem Statement

The Dashboard is the app's landing page but currently shows a stub. Phases 1A–1C built the full data pipeline (upload → extract → categorise), and the stats API endpoint (`GET /api/transactions/stats`) already returns income/expense totals, category breakdowns, and monthly trends. Phase 1D turns that data into a visual financial overview.

---

## Decisions Made

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Scope | Option A — Dashboard only | Tightest scope, highest impact |
| Charting library | Recharts (already installed — `recharts@^3.8.0`) | React-native, composable, good TS support; already in bundle |
| Currency | Configurable | Store user's preferred currency; default AUD |
| Default date range | Last 3 months (calendar months) | Good balance of recent context without noise |
| Date range semantics | Calendar months back from today | "Last 3 months" from March 19 → January 1. Consistent: always the 1st of the month N months ago. |
| Currency selector location | Settings page only | Dashboard reads stored value |
| Currency codes | Any ISO 4217 via `Intl.NumberFormat` | No hardcoded list needed |

---

## Proposed Approach

### 1. Currency Configuration (lightweight backend addition)

The existing `ai_settings` table won't work for app-level config.

**Option chosen: New `app_settings` key-value table.** Simple, extensible for future settings (date format, locale, etc.).

- New table: `app_settings` (`key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL`)
- Migration generated via `npx drizzle-kit generate` (consistent with existing `src/server/lib/db/migrations/` pattern), then applied via `npm run db:migrate`
- Seed row added to the existing seed file (`src/server/lib/db/seed.ts`): `{ key: 'currency', value: 'AUD' }`
- Two new endpoints: `GET /api/settings/app` and `PUT /api/settings/app/:key`
- **PUT validation for `currency` key:** validate against `Intl.supportedValuesOf('currency')` to reject invalid codes. For unknown keys, apply non-empty string validation as a baseline. Validation uses Zod schemas consistent with the rest of the app.
- Client reads currency on app load via React Query with `staleTime: Infinity` — currency changes extremely rarely, so no automatic refetching. Manual invalidation triggered on successful PUT from the Settings page.

### 2. Dashboard Feature Module (client)

New feature at `src/client/features/dashboard/` with these components:

#### Date Range Picker
- Preset buttons: "This Month", "Last 3 Months", "Last 6 Months", "This Year", "All Time"
- Custom range via two date inputs
- Default selection: "Last 3 Months"
- **Date semantics:** "Last N months" means the 1st of the month N months before the current month through today. E.g., on March 19 2026, "Last 3 Months" = Jan 1 2026 → today. "This Month" = Mar 1 2026 → today. "All Time" passes no dateFrom/dateTo.
- Computes `dateFrom`/`dateTo` ISO strings and passes them to the dashboard page state

#### Summary Cards
- Reuse the stat card visual pattern from `StatsSummary` (income, expenses, net, transaction count)
- Dashboard-specific component that uses the dashboard's date range state
- Does NOT include the "Auto-categorise" button (that belongs on the Transactions page)

#### Category Breakdown Chart (Recharts `PieChart`)
- Doughnut/pie chart of expenses by category
- Uses `stats.byCategory` data — already has `categoryColor`
- Legend with category names + amounts
- Tooltip showing category name, amount, percentage
- Handles empty state (no categorised transactions)

#### Monthly Trend Chart (Recharts `BarChart` or `ComposedChart`)
- Grouped bars: income (green) vs expenses (red) per month
- Optional line overlay for net amount
- Uses `stats.byMonth` data — already has `{ month, income, expenses }`
- X-axis: month labels (e.g., "Jan 2026")
- Y-axis: currency-formatted values
- Responsive container

#### Recent Transactions List
- Shows latest 5 transactions (uses existing `GET /api/transactions` with `pageSize=5&sortBy=date&sortOrder=desc`)
- Compact row: date | description | amount (coloured by type) | category badge
- "View all" link → navigates to Transactions page

#### Empty State
- Shown when `stats.transactionCount === 0`
- Message + CTA button linking to Documents page to upload first statement

### 3. Dashboard Page Wiring

Replace the stub in `src/client/app/pages/dashboard.tsx`:
- State: `dateFrom`, `dateTo` (initialised to last-3-months using calendar month logic)
- **Reuses `useTransactionStats` from `src/client/features/transactions/hooks.ts`** — no re-implementation. The dashboard's `hooks.ts` only contains `useAppSettings` and `useCurrency` (for the app settings API).
- **Reuses `useTransactions` from `src/client/features/transactions/hooks.ts`** for the recent transactions list (with `pageSize=5&sortBy=date&sortOrder=desc` filters).
- Layout: date picker → summary cards → two charts side-by-side (stack on mobile) → recent transactions

### 4. Shared Currency Utility

Create a small shared utility for currency formatting:
- `formatCurrency(value: number, currency: string): string` — wraps `Intl.NumberFormat`
- Used by dashboard components and retrofitted into the existing `StatsSummary` component
- **This is a cross-boundary file creation** in `src/client/shared/` — approved in this plan (see boundary approvals below)

---

## Cross-Feature Boundary Approvals (Rule 5)

The dashboard feature requires read-only imports from other features and creation of shared utilities. All cross-boundary dependencies are listed here as pre-approved:

| Import | Source | Used By | Type | Risk |
|--------|--------|---------|------|------|
| `useTransactionStats` | `src/client/features/transactions/hooks.ts` | Dashboard page (`dashboard.tsx`) | Read-only hook | Low |
| `useTransactions` | `src/client/features/transactions/hooks.ts` | `recent-transactions.tsx` | Read-only hook | Low |
| `TransactionStats`, `TransactionResponse`, `TransactionFilters` | `src/shared/types/index.ts` | Dashboard components | Type imports only | None |
| `formatCurrency` (new) | `src/client/shared/utils/format-currency.ts` | Dashboard components + `StatsSummary` retrofit | New shared util | Low |
| `StatsSummary` modification | `src/client/features/transactions/components/stats-summary.tsx` | Retrofit to use `formatCurrency` + configured currency | Edit existing feature file | Low |
| `src/server/lib/db/schema/index.ts` | DB schema | Add `appSettings` table | Schema modification | Low |
| `src/server/app.ts` | Server app | Register settings routes | Route registration | Low |
| `src/client/app/pages/dashboard.tsx` | App pages | Replace stub | Page modification | Low |
| `src/server/lib/db/seed.ts` | DB seed | Add currency seed row | Seed modification | Low |

---

## Files to Create / Modify

| Action | File Path | Description |
|--------|-----------|-------------|
| **Create** | `src/server/features/settings/` | App settings feature (routes, CLAUDE.md, logger) |
| Create | `src/server/features/settings/routes.ts` | GET /api/settings/app, PUT /api/settings/app/:key |
| Create | `src/server/features/settings/CLAUDE.md` | Feature boundary doc |
| Create | `src/server/features/settings/logger.ts` | Scoped logger |
| **Create** | `src/client/features/dashboard/` | Dashboard feature module |
| Create | `src/client/features/dashboard/CLAUDE.md` | Feature boundary doc |
| Create | `src/client/features/dashboard/logger.ts` | Scoped logger |
| Create | `src/client/features/dashboard/components/date-range-picker.tsx` | Period selector with presets + custom range |
| Create | `src/client/features/dashboard/components/summary-cards.tsx` | 4 stat cards (income/expenses/net/count) |
| Create | `src/client/features/dashboard/components/category-chart.tsx` | Recharts PieChart — expenses by category |
| Create | `src/client/features/dashboard/components/monthly-trend-chart.tsx` | Recharts BarChart — income vs expenses |
| Create | `src/client/features/dashboard/components/recent-transactions.tsx` | Latest 5 transactions list |
| Create | `src/client/features/dashboard/components/empty-state.tsx` | No-data CTA |
| Create | `src/client/features/dashboard/hooks.ts` | `useAppSettings`, `useCurrency` hooks only (stats/transactions hooks reused from transactions feature) |
| Create | `src/client/features/dashboard/api.ts` | App settings API calls (fetchAppSettings, updateAppSetting) |
| **Create** | `src/client/shared/utils/format-currency.ts` | Shared currency formatter (cross-boundary — approved above) |
| **Create** | `tests/settings.test.ts` | Integration tests for app settings API |
| **Create** | `src/client/features/dashboard/__tests__/date-range-picker.test.tsx` | Date range computation + rendering tests |
| **Create** | `src/client/features/dashboard/__tests__/summary-cards.test.tsx` | Summary cards rendering + empty state |
| **Create** | `src/client/features/dashboard/__tests__/category-chart.test.tsx` | PieChart mount + empty data handling |
| **Create** | `src/client/features/dashboard/__tests__/monthly-trend-chart.test.tsx` | BarChart mount + data rendering |
| **Create** | `src/client/features/dashboard/__tests__/recent-transactions.test.tsx` | Recent list rendering |
| **Create** | `src/client/shared/utils/__tests__/format-currency.test.ts` | formatCurrency unit tests (multiple currencies) |
| **Modify** | `src/client/app/pages/dashboard.tsx` | Replace stub with full dashboard |
| **Modify** | `src/server/lib/db/schema/index.ts` | Add `appSettings` table (cross-boundary — approved above) |
| **Modify** | `src/server/lib/db/seed.ts` | Add currency seed row (cross-boundary — approved above) |
| **Modify** | `src/server/app.ts` | Register settings routes (cross-boundary — approved above) |
| Modify | `src/client/features/transactions/components/stats-summary.tsx` | Use shared `formatCurrency` + configured currency (cross-boundary — approved above) |

### New DB migration
- Generated via `npx drizzle-kit generate` → applied via `npm run db:migrate`
- `app_settings` table: `key TEXT PK`, `value TEXT NOT NULL`, `updated_at TEXT NOT NULL`
- Seed row added to `src/server/lib/db/seed.ts`: `{ key: 'currency', value: 'AUD' }`

### New API endpoints
| Method | Path | Description | Validation |
|--------|------|-------------|------------|
| GET | `/api/settings/app` | Returns all app settings as `Record<string, string>` | — |
| PUT | `/api/settings/app/:key` | Update a single app setting | Zod body schema: `{ value: string }`. For `currency` key: validate against `Intl.supportedValuesOf('currency')`. For unknown keys: non-empty string. |

---

## Implementation Order

1. **DB + Backend:** `app_settings` schema, `npx drizzle-kit generate`, seed, settings routes with validation
2. **Shared utility:** `formatCurrency` function + unit tests
3. **Dashboard feature scaffolding:** CLAUDE.md, logger, api.ts, hooks.ts (`useAppSettings`/`useCurrency` only)
4. **Components (parallel):** date-range-picker, summary-cards, empty-state
5. **Charts:** category-chart, monthly-trend-chart
6. **Recent transactions:** component reusing `useTransactions` from transactions feature
7. **Page assembly:** wire everything into dashboard.tsx
8. **Retrofit:** update StatsSummary to use shared `formatCurrency` + configured currency
9. **Tests:** component tests + integration tests for settings endpoints
10. **Cleanup:** ARCHITECTURE.md update, self-review

---

## Testing Plan

| Test File | What It Covers |
|-----------|---------------|
| `tests/settings.test.ts` | Settings API: GET returns seeded defaults, PUT updates currency, PUT rejects invalid currency code, PUT rejects empty value |
| `src/client/shared/utils/__tests__/format-currency.test.ts` | formatCurrency with AUD, USD, EUR, GBP, JPY (zero decimals) |
| `src/client/features/dashboard/__tests__/date-range-picker.test.tsx` | Preset date computation (calendar month logic), custom range, default selection |
| `src/client/features/dashboard/__tests__/summary-cards.test.tsx` | Renders 4 cards with data, handles zero values |
| `src/client/features/dashboard/__tests__/category-chart.test.tsx` | PieChart renders with category data, empty state when no categories |
| `src/client/features/dashboard/__tests__/monthly-trend-chart.test.tsx` | BarChart renders with monthly data, handles single-month edge case |
| `src/client/features/dashboard/__tests__/recent-transactions.test.tsx` | Renders transaction rows, "View all" link, empty state |

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Cross-feature dependency on transactions hooks | Low | Read-only usage; all imports pre-approved above; no modifications to transactions feature internals |
| Currency retrofit breaks StatsSummary | Low | Small change (swap hardcoded string for prop); existing tests catch regressions |
| Date range picker complexity | Low | Simple preset buttons + native date inputs, no date picker library |
| `Intl.supportedValuesOf('currency')` browser support | Low | Available in all modern browsers (Chrome 93+, Firefox 93+, Safari 15.4+); server-side Node 18+ |

---

## Open Questions
- [x] Should the currency selector be a dropdown on the Settings page, or also accessible from the dashboard? → **Settings page only.** Dashboard reads the stored value.
- [x] Any specific currencies to support beyond the common ones (AUD, USD, GBP, EUR, etc.)? → **Use `Intl.NumberFormat` with any ISO 4217 currency code.** No hardcoded list needed.
- [x] Recharts dependency? → **Already installed** (`recharts@^3.8.0` in `package.json`). No package.json modification needed.
- [x] How does dashboard get stats data? → **Reuses `useTransactionStats` and `useTransactions` from transactions feature.** Dashboard's own hooks.ts only has `useAppSettings`/`useCurrency`.
- [x] Date range "Last 3 months" semantics? → **Calendar months.** 1st of the month N months ago through today.
- [x] Currency cache strategy? → `staleTime: Infinity`, manual invalidation on PUT.
- [x] PUT validation for currency? → Validate against `Intl.supportedValuesOf('currency')`. Unknown keys get non-empty string check.

## Comments / Review Notes
-
