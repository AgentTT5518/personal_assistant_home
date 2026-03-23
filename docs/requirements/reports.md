# Requirements: Monthly Reports / Export (Phase 2C)

## Overview
Generate structured financial reports for configurable date ranges with PDF export. Reports aggregate data from transactions, budgets, categories, and accounts into a comprehensive summary.

## Report Types
- **Monthly** — single calendar month
- **Quarterly** — 3-month period
- **Yearly** — full calendar year
- **Custom** — user-defined date range

## Report Contents (ReportData)
1. **Summary** — income, expenses, net, transaction count
2. **Budget vs Actual** — per-category budget amount vs actual spend with percentage
3. **Category Breakdown** — expense categories sorted by amount with percentage of total
4. **Top Merchants** — top 10 merchants by spend amount with transaction count
5. **Monthly Comparison** (optional) — income/expenses per month (for multi-month reports)
6. **Account Breakdown** (optional) — per-account income/expenses/net (when accounts exist)

## API Endpoints
- `POST /api/reports/generate` — create report from date range
- `GET /api/reports` — list reports (metadata only)
- `GET /api/reports/:id` — get full report with data
- `GET /api/reports/:id/pdf` — download or generate PDF
- `DELETE /api/reports/:id` — delete report and PDF file

## PDF Export
- Generated on demand via pdf-lib
- A4 format with sections: title, summary, budget vs actual table, category breakdown, top merchants, monthly comparison, account breakdown
- Stored on disk at `data/reports/` with path saved in `pdfPath` column
- Subsequent downloads serve cached PDF

## Client
- `/reports` page with 3-column layout (generate + history on left, viewer on right)
- Generate panel: report type selector + date range picker + generate button
- Report viewer: summary cards, Recharts pie chart (categories), bar chart (monthly comparison), data tables
- Report history: list with download/delete actions

## Schema
- `reports` table: id, title, reportType, periodFrom, periodTo, data (JSON), pdfPath (nullable), generatedAt, createdAt, updatedAt
