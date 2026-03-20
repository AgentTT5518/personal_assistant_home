# Feature: recurring

## Owner
Claude Code

## Scope
This feature owns all files within `src/client/features/recurring/`.

## Description
Client-side recurring transaction UI: dashboard summary card showing estimated monthly recurring expenses, and a grouped panel showing detected recurring transaction groups (consumed by the transactions feature).

## Boundary Rules
**HARD BLOCK: Do NOT edit files outside this folder without explicit user approval.**

## Dependencies
**Shared modules:** `@shared/types`, `src/client/shared/utils/format-currency`
**External packages:** @tanstack/react-query, lucide-react
**Other features (read-only):** none

## Consumers
The transactions feature (`src/client/features/transactions/`) imports `RecurringGroupPanel` and `useDetectRecurring` from this feature's public API.

## Cross-Boundary Edit Log
| Date | File | Change | Approved By |
|------|------|--------|-------------|
| 2026-03-20 | `src/client/app/pages/dashboard.tsx` | Import + render RecurringSummaryCard widget | Phase 1 Polish plan pre-approval |
