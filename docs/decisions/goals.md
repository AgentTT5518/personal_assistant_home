# Architecture Decision Record: Goal Tracking (Phase 2F)

## Context
Users need a way to set savings goals (e.g., emergency fund, holiday), track progress via manual contributions, and optionally sync from account balances.

## Decisions

### 1. Contribution-based tracking (not computed)
**Decision:** `currentAmount` is maintained incrementally by contributions, not recalculated from SUM each time.
**Rationale:** Simpler, faster. The sync-balance endpoint inserts a balancing contribution to maintain the invariant that SUM(contributions) = currentAmount.

### 2. Manual status transitions
**Decision:** Status transitions (active → completed/cancelled) are manual via PUT, not auto-triggered.
**Rationale:** Users may want to continue contributing past the target, or may reach the target via account growth rather than explicit contributions. Auto-complete would be confusing.

### 3. sync-balance as convenience, not primary flow
**Decision:** sync-balance is a shortcut for single-purpose accounts. For shared accounts, users use manual contributions.
**Rationale:** A single account linked to multiple goals makes automatic balance sync ambiguous. The endpoint warns in this case.

### 4. Nullable deadline
**Decision:** Deadline is optional — some goals (e.g., emergency fund) have no end date.
**Rationale:** Forcing a deadline for open-ended goals would be confusing.

### 5. No auto-delete of contributions on goal update
**Decision:** Changing targetAmount does not affect existing contributions.
**Rationale:** Unlike split transactions (which must sum to parent), contributions are independent records. Changing the target simply changes the progress percentage.
