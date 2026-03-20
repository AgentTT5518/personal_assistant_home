# Requirements: Phase 1E — AI Spending Insights Analysis

## Overview
AI-powered spending analysis page that generates structured insights from transaction data, with snapshot history for reviewing past analyses.

## Functional Requirements

### Backend — Analysis Service
- Generate AI spending insights from summarised transaction aggregates (not raw transactions)
- Merchant aggregation query: top 10 merchants by spend (debit only, grouped by merchant)
- System message via `{ role: 'system' }` in messages array (not `ChatOptions.systemPrompt`)
- AI prompt includes: totals, top 10 categories with percentages, monthly trends, top 10 merchants, currency
- Retry logic: on AI JSON parse failure, retry once with corrective prompt, then fail with `AI_PARSE_ERROR`
- Zod validation of AI response ensuring 5 required sections

### Backend — Snapshot CRUD
- Persist analysis results in `analysis_snapshots` table (id, snapshotType, data, generatedAt, createdAt, updatedAt)
- List endpoint uses `JSON_EXTRACT(data, '$.period')` for period metadata (no schema migration)
- Snapshots retained indefinitely (user-triggered, low volume)

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/analysis/generate` | Generate new analysis (rate limited) |
| GET | `/api/analysis/snapshots` | List past snapshots (metadata only) |
| GET | `/api/analysis/snapshots/:id` | Get full snapshot with insights |
| DELETE | `/api/analysis/snapshots/:id` | Delete a snapshot |

### Frontend — Analysis Page
- Generate panel: date range selector (shared DateRangePicker) + generate button + loading state
- 5 insight section cards: overview, categories, trends, anomalies, recommendations
- Markdown rendering via `react-markdown` for AI-generated content
- Snapshot history: list past snapshots, click to load, delete button
- Auto-display most recent snapshot on page load
- Empty state when no analysis exists

### Frontend — Settings Page
- Currency selector: 10 common currencies (AUD, USD, GBP, EUR, JPY, CAD, NZD, SGD, HKD, CHF) + custom input
- Uses existing `useCurrency`, `useAppSettings`, `useUpdateAppSetting` hooks from dashboard

### Data Structures
- `AnalysisInsights`: period, currency, summary (totals), sections array
- `AnalysisSection`: title, type (5 enum values), content (Markdown), highlights, optional data
- `SnapshotMeta`: id, snapshotType, period, generatedAt

## Non-Functional Requirements
- Synchronous AI call (user waits 5–15s with loading spinner)
- Rate limited via `aiRateLimiter` (30 req/min)
- All errors logged via scoped feature loggers
- 40 tests: 23 server (service + routes) + 17 client (components)
