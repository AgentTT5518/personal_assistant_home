# Decisions: Upcoming Bills (Phase 2B)

## D1: No isPaid Column
**Decision:** Remove isPaid and instead advance nextDueDate on mark-paid.
**Rationale:** Cleaner lifecycle — no ambiguous paid/unpaid state to reset. Overdue is simply `nextDueDate < today`. Once marked paid, the date advances automatically.

## D2: Bills are Standalone Entities
**Decision:** Bills are not linked to specific transactions.
**Rationale:** Bills represent expected future payments. The recurring detection service identifies patterns in past transactions but doesn't track individual bill-transaction matches.

## D3: Frequency Enum Matches Recurring Detection
**Decision:** Use the same frequency values as recurring detection: weekly, biweekly, monthly, quarterly, yearly.
**Rationale:** Enables seamless auto-population from recurring data without frequency mapping.

## D4: Month-End Clamping for Monthly Advance
**Decision:** Monthly advance from Jan 31 goes to Feb 28, not Mar 3.
**Rationale:** Users expect "monthly on the 31st" to mean end-of-month when months have fewer days.

## D5: Duplicate Detection for Populate-from-Recurring
**Decision:** Match by normalized name (case-insensitive) AND amount within 10% tolerance.
**Rationale:** Reuses the same 10% tolerance threshold as the recurring detection service for consistency.

## D6: Static Routes Before Parameterised
**Decision:** Register `/bills/calendar` and `/bills/populate-from-recurring` before `/:id`.
**Rationale:** Prevents Express matching literal path segments as `:id` parameter.
