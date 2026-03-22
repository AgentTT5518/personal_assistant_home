# Requirements: Upcoming Bills (Phase 2B)

## Overview
Track recurring bills with due dates, mark-paid functionality, and auto-population from detected recurring transactions.

## Functional Requirements

### Bill Management
- CRUD operations for bills with name, expected amount, frequency, next due date
- Optional account and category association
- Optional notes field
- Active/inactive toggle

### Frequencies
- Weekly, biweekly, monthly, quarterly, yearly
- Monthly advances clamp to month end (e.g., Jan 31 → Feb 28)

### Mark-Paid Lifecycle
- No isPaid column — mark-paid advances nextDueDate to next occurrence
- Overdue = nextDueDate < today
- Once paid, date advances and bill is no longer overdue

### Auto-Population from Recurring
- Uses existing recurring detection data (getRecurringSummary)
- Creates bills from detected recurring transaction groups
- Skips duplicates: same name (case-insensitive) and amount within 10% tolerance
- Sets accountId if all transactions in group share same account

### Calendar View
- Bills grouped by nextDueDate within date range
- Only active bills shown in calendar

### Dashboard Widget
- Shows bills due in next 7 days
- Overdue/today/tomorrow labels with color coding
- Quick mark-paid action
- Total due amount

## API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/bills` | List (optional ?isActive, ?upcoming=N) |
| GET | `/api/bills/calendar` | Grouped by date (?from, ?to) |
| POST | `/api/bills/populate-from-recurring` | Auto-create from recurring |
| GET | `/api/bills/:id` | Get single |
| POST | `/api/bills` | Create |
| PUT | `/api/bills/:id` | Update |
| DELETE | `/api/bills/:id` | Delete |
| POST | `/api/bills/:id/mark-paid` | Advance due date |

## Test Coverage
- 29 tests covering CRUD, mark-paid (all frequency types + month-end clamping), calendar grouping, populate-from-recurring (creation + duplicate skip), validation
