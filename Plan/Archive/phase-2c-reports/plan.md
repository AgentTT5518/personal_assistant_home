# Plan: Phase 2C — Monthly Reports / Export

**Status:** Approved (via master plan)
**Created:** 2026-03-23

## Context

Final Phase 2 feature. Reports aggregate data from all previous features (transactions, budgets, accounts, categories) into structured reports with PDF export.

## Implementation Specifics

### Build Order
1. Schema: `reports` table in Drizzle schema
2. Shared types: `ReportType`, `ReportData`, `ReportResponse` in `src/shared/types/index.ts`
3. Validation: `generateReportSchema` in `src/shared/types/validation.ts`
4. Server: `src/server/features/reports/` — logger, report-generator service, pdf-builder helper, routes, index
5. Client: `src/client/features/reports/` — logger, api, hooks, components (GenerateReportPanel, ReportViewer, ReportHistory, PDFDownloadButton), index
6. Cross-boundary: layout nav, app.tsx route, app.ts router registration
7. Tests: server routes + PDF generation + client (if pattern exists)
8. Test setup: add `reports` table to `tests/server-setup.ts`

### Report Generation Service
- Query transactions in date range for income/expenses/net/count
- Query budgets with spend calculation (reuse getPeriodDateRange logic from budgets)
- Query categories with GROUP BY for breakdown
- Query merchants with GROUP BY + ORDER BY amount DESC LIMIT 10
- Query monthly aggregation for multi-month reports
- Query accounts with per-account income/expenses if accounts exist

### PDF Generation (pdf-lib)
- `PdfTableBuilder` class: column definitions, row data, auto page breaks, text wrapping
- Report sections: title, summary, budget vs actual table, category breakdown table, top merchants table
- Keep it simple — text + tables only, no charts in PDF

### Cross-Boundary Changes (all Low risk, pre-approved)
| File | Change |
|------|--------|
| `src/server/lib/db/schema/index.ts` | Add `reports` table |
| `src/server/app.ts` | Register `reportRouter` |
| `src/shared/types/index.ts` | Add report types + ReportData interface |
| `src/shared/types/validation.ts` | Add report schemas |
| `src/client/app/layout.tsx` | Add "Reports" to Insights nav section |
| `src/client/app/app.tsx` | Add `/reports` route |
| `tests/server-setup.ts` | Add reports table to CI setup |

### Key Decisions
- PDF stored on disk at `data/reports/` (gitignored) — path stored in `pdfPath`
- Report data stored as JSON in `data` column — typed as `ReportData`
- monthlyComparison included for quarterly/yearly/custom reports spanning >1 month
- accountBreakdown included when accounts exist
