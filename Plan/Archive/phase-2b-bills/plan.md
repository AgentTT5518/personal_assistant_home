# Plan: Upcoming Bills (Phase 2B)

**Status:** Pre-Approved (via master plan)
**Created:** 2026-03-22
**Feature Branch:** `feature/phase-2b-bills`

---

## Goal / Problem Statement
Users need to track upcoming recurring bills (rent, subscriptions, utilities) with due dates, see what's coming up, and mark bills as paid. The app already detects recurring transactions — bills builds on that data to provide forward-looking scheduling.

## Proposed Approach
Follow the master plan spec exactly. Implementation order:
1. Schema — `bills` table in Drizzle schema
2. Migration — `npm run db:generate`
3. Types — `BillFrequency`, `BillResponse`, `BillCalendarEntry` in shared types
4. Validation — Zod schemas for create/update bill
5. Server routes — full CRUD + mark-paid + calendar + populate-from-recurring
6. Client module — api, hooks, components (BillsList, BillsCalendar, BillForm, UpcomingBillsWidget, MarkPaidButton)
7. Cross-boundary wiring — layout nav, app routes, dashboard widget, server app.ts, schema

## Files to Create / Modify
| Action | File Path | Description |
|--------|-----------|-------------|
| Create | `src/server/features/bills/logger.ts` | Scoped logger |
| Create | `src/server/features/bills/routes.ts` | All API endpoints (CRUD, mark-paid, calendar, populate) |
| Create | `src/server/features/bills/routes.test.ts` | Server integration tests |
| Create | `src/server/features/bills/index.ts` | Re-export router |
| Create | `src/client/features/bills/logger.ts` | Scoped logger |
| Create | `src/client/features/bills/api.ts` | Fetch functions |
| Create | `src/client/features/bills/hooks.ts` | React Query hooks |
| Create | `src/client/features/bills/index.ts` | Re-exports |
| Create | `src/client/features/bills/components/bills-list.tsx` | Table with overdue/due-soon highlighting |
| Create | `src/client/features/bills/components/bills-calendar.tsx` | Month grid view |
| Create | `src/client/features/bills/components/bill-form.tsx` | Create/edit modal |
| Create | `src/client/features/bills/components/upcoming-bills-widget.tsx` | Dashboard widget (next 7 days) |
| Create | `src/client/app/pages/bills.tsx` | Bills page component |
| Modify | `src/server/lib/db/schema/index.ts` | Add `bills` table |
| Modify | `src/shared/types/index.ts` | Add bill types |
| Modify | `src/shared/types/validation.ts` | Add bill validation schemas |
| Modify | `src/server/app.ts` | Register billRouter |
| Modify | `src/client/app/app.tsx` | Add `/bills` route |
| Modify | `src/client/app/layout.tsx` | Add "Bills" to Planning nav section |
| Modify | `src/client/app/pages/dashboard.tsx` | Add UpcomingBillsWidget |

## Key Implementation Details

### mark-paid Date Advancement
- weekly: +7 days
- biweekly: +14 days
- monthly: +1 month (same day, clamped to month end via `Math.min(day, lastDayOfMonth)`)
- quarterly: +3 months
- yearly: +1 year

### populate-from-recurring
- Calls `getRecurringSummary()` from recurring-detection.service
- For each group: creates a bill with name=merchant, expectedAmount=averageAmount, frequency mapped from recurring detection
- Skips if a bill with same name already exists (case-insensitive, 10% amount tolerance)
- Sets accountId if all transactions in group share the same accountId

### Calendar Endpoint
- Returns bills grouped by nextDueDate within the from/to date range
- Includes overdue bills (nextDueDate < today) in the response

## Decisions Made
- No `isPaid` column — mark-paid advances `nextDueDate` instead (cleaner lifecycle, no reset needed)
- Bills are standalone entities, not linked to specific transactions
- Frequency enum matches recurring detection output: weekly/biweekly/monthly/quarterly/yearly
- Static routes (`/calendar`, `/populate-from-recurring`) registered before `/:id` param route

## Comments / Review Notes
- Pre-approved via Phase 2 master plan (4+ review rounds)
