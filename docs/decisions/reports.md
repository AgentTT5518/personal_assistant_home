# Decisions: Monthly Reports / Export (Phase 2C)

## ADR-1: JSON data storage over normalised tables
**Context:** Reports contain complex nested data (summary, arrays of budget/category/merchant breakdowns).
**Decision:** Store report data as JSON in a single `data` TEXT column, typed as `ReportData` in shared types.
**Rationale:** Reports are read-heavy and write-once. JSON avoids complex joins for read and allows flexible schema evolution. The `ReportData` interface ensures type safety at application level.

## ADR-2: pdf-lib for PDF generation
**Context:** Need PDF export. Options: pdf-lib (already installed, low-level), pdfmake (higher-level, not installed).
**Decision:** Use pdf-lib with a custom `PdfTableBuilder` helper for tables.
**Rationale:** Avoids new dependency. Tables are the only complex element (no charts in PDF). The builder handles column widths, text wrapping, and page breaks.

## ADR-3: On-demand PDF generation with caching
**Context:** PDF generation is expensive. Options: generate on report create, generate on first download.
**Decision:** Generate PDF on first download, cache to disk, serve cached on subsequent downloads.
**Rationale:** Most reports may never be downloaded as PDF (the in-app viewer with charts is richer). Lazy generation avoids wasted work.

## ADR-4: Budget vs actual uses report date range, not budget period
**Context:** Budgets have their own period (monthly/weekly/yearly). Reports cover a custom date range.
**Decision:** Budget vs actual in reports queries transactions for the report's date range, not the budget's configured period.
**Rationale:** Users expect the report to show spending within the specified period, even if budgets are configured for different periods.

## ADR-5: Split-transaction aware aggregation
**Context:** Split transactions affect category breakdown and budget calculations.
**Decision:** Category breakdown and budget vs actual queries use the same UNION pattern as the budgets feature — unsplit transactions (isSplit=0) + split_transactions portions.
**Rationale:** Consistency with existing budget spend calculation. Prevents double-counting.
