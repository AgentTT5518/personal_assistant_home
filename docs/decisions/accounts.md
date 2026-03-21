# Decisions: Multi-Account / Multi-Source Tracking (Phase 2A)

## Credit Card Balance Convention
**Decision:** Store credit card `currentBalance` as positive (amount owed). Net-worth endpoint treats it as negative.
**Why:** More intuitive for users — they enter their balance as shown on their statement. The sign flip is handled server-side in the net-worth calculation only.

## DELETE Semantics
**Decision:** DELETE is always soft-delete (sets isActive=false). Hard delete via `?hard=true` query param, only succeeds if zero linked transactions/documents.
**Why:** Prevents accidental data loss. Users can always soft-delete safely; hard delete is opt-in with a safety check.

## currentBalance Strategy
**Decision:** Manual entry with optional `/recalculate` endpoint, NOT auto-updated on every transaction change.
**Why:** Auto-updating would be fragile — imported data may be partial, users may not link all transactions. Manual control with recalculate-on-demand is more reliable.

## accountSummaries Relationship
**Decision:** No FK between the new `accounts` table and existing `accountSummaries`. They serve different purposes.
**Why:** `accountSummaries` stores per-document extracted data (historical snapshot from a bank statement PDF). The new `accounts` table is user-managed persistent metadata. The relationship is indirect via documentId.

## Route Ordering
**Decision:** Register `/net-worth` before `/:id` on the accounts router.
**Why:** Express matches routes sequentially — without this, `net-worth` would be captured as an `:id` parameter.

## Nullable Foreign Keys
**Decision:** `accountId` on transactions and documents is nullable with ON DELETE SET NULL.
**Why:** Backward-compatible — existing data continues to work without migration. No backfill needed.

## Sidebar Navigation Redesign
**Decision:** Replace flat nav list with `NavSection` collapsible groups. Settings pinned at bottom.
**Why:** Preparing for Phase 2 features that add 5+ new pages — flat list would be unwieldy. Collapsible groups provide better organization with localStorage persistence.
