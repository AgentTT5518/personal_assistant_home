# Plan: Phase 2F — Goal Tracking / Savings Goals

**Status:** Approved (via master plan)
**Created:** 2026-03-22

## Implementation Order

1. Schema — Add `goals` and `goal_contributions` tables to Drizzle schema
2. Types — Add `GoalStatus`, `GoalResponse`, `GoalContributionResponse` to shared types
3. Validation — Add `createGoalSchema`, `updateGoalSchema`, `contributeSchema` to validation
4. Server routes — CRUD + contribute + sync-balance endpoints
5. Client API — fetch functions for all endpoints
6. Client hooks — React Query hooks for all operations
7. Client components — GoalCard, GoalForm, ContributeModal, GoalProgressWidget
8. Client page — GoalsPage with cards grid
9. Cross-boundary — layout nav, app routes, dashboard widget, server app.ts
10. Tests — Server CRUD, contribution math, sync-balance, client components
11. Test setup — Add tables to `tests/server-setup.ts`

## Key Implementation Details

### Schema
- `goals`: id, name, targetAmount, currentAmount (default 0), deadline (nullable), accountId FK, categoryId FK, status (default 'active')
- `goal_contributions`: id, goalId FK CASCADE, amount, note (nullable), date, createdAt

### Contribution Math
- `contribute` endpoint: adds contribution row, then increments `currentAmount` by contribution amount
- `sync-balance`: inserts balancing contribution (amount = account.currentBalance - goal.currentAmount), sets currentAmount = account.currentBalance
- Warn if account linked to multiple goals on sync-balance

### Status Enum
- `active` | `completed` | `cancelled`
- Status transitions managed via PUT (no auto-complete on reaching target — user decides)

## Boundary Alerts (all Low risk, pre-approved by master plan)
- `src/server/lib/db/schema/index.ts` — Add 2 tables
- `src/server/app.ts` — Register router
- `src/shared/types/index.ts` — Add types
- `src/shared/types/validation.ts` — Add schemas
- `src/client/app/layout.tsx` — Add Goals nav item
- `src/client/app/app.tsx` — Add /goals route
- `src/client/app/pages/dashboard.tsx` — Add GoalProgressWidget
- `tests/server-setup.ts` — Add tables to CI setup
