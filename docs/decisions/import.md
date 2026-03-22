# ADR: Data Import (Phase 2E)

## Decision 1: Hand-written OFX/QIF parsers
**Context:** OFX and QIF are well-defined, relatively simple formats. npm packages like ofx-js exist but add dependency weight.
**Decision:** Write parsers by hand — OFX via regex on STMTTRN blocks, QIF via line-by-line state machine.
**Rationale:** Simpler, fewer deps, full control over error handling. Both formats are stable and won't change.

## Decision 2: documentId becomes nullable
**Context:** Imported transactions have no source PDF document.
**Decision:** Change transactions.documentId from NOT NULL to nullable.
**Rationale:** Cleaner than creating dummy document records. SQLite migration handled via Drizzle table recreation.

## Decision 3: Import session tracking with undo
**Context:** Users need to be able to reverse a bad import.
**Decision:** Track importSessionId FK on transactions (ON DELETE SET NULL). Undo deletes all transactions linked to a session.
**Rationale:** Simple, reliable undo without needing soft-delete or snapshots. SET NULL means deleting a session leaves previously-imported transactions intact if user chooses.

## Decision 4: In-memory session cache for wizard state
**Context:** The import wizard needs to hold parsed file content across multiple API calls (upload → mapping → preview → confirm).
**Decision:** Use a Map in server memory keyed by sessionId.
**Rationale:** Simplest approach for single-user app. Trade-off: data lost on server restart (user re-uploads). No need for Redis or temp files.

## Decision 5: Dedicated /import page instead of modal
**Context:** The import flow has 4 steps with a potentially large preview table.
**Decision:** Full page at /import instead of a modal from Settings.
**Rationale:** Too complex for a modal. Added to sidebar under Data section for easy access.
