# Requirements: Goal Tracking / Savings Goals (Phase 2F)

## Overview
Goal tracking allows users to create savings goals with target amounts, track contributions over time, and optionally sync progress from linked bank accounts.

## Schema
- **goals** table: id, name, targetAmount, currentAmount (default 0), deadline (nullable), accountId FK, categoryId FK, status (active/completed/cancelled)
- **goal_contributions** table: id, goalId FK CASCADE, amount, note (nullable), date, createdAt

## API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/goals` | List goals (optional `?status=active`) |
| GET | `/api/goals/:id` | Get goal with contributions |
| POST | `/api/goals` | Create goal |
| PUT | `/api/goals/:id` | Update goal |
| DELETE | `/api/goals/:id` | Delete goal (cascades contributions) |
| POST | `/api/goals/:id/contribute` | Add contribution, increment currentAmount |
| POST | `/api/goals/:id/sync-balance` | Sync from linked account balance |

## Client Components
- **GoalsPage** (`/goals`): Cards grid with status filter tabs (All/Active/Completed/Cancelled)
- **GoalCard**: Progress bar, name, target vs current, deadline countdown, action buttons
- **GoalForm**: Create/edit modal with name, target, deadline, account, category, status
- **ContributeModal**: Quick-add contribution with amount and optional note
- **GoalProgressWidget**: Dashboard widget showing top 3 active goals with progress bars

## Business Rules
- Contributions add to currentAmount incrementally (not recalculated from SUM)
- sync-balance sets currentAmount = account.currentBalance, inserts a balancing contribution to keep SUM(contributions) = currentAmount
- sync-balance warns if the account is linked to multiple active goals
- Status transitions are manual (via PUT) — no auto-complete when reaching target
- Deleting a goal cascades all contributions

## Tests (20 tests)
- CRUD: create, read, list with status filter, update, delete with cascade
- Contributions: add, accumulate, custom date, reject invalid
- Sync Balance: sync from account, multi-goal warning, reject no account, negative diff, contribution log consistency
