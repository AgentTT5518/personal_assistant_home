# Architecture Decision Record: Tags / Split Transactions (Phase 2D)

## Decision 1: Split/Budget Double-Counting Prevention
**Choice:** Parent `categoryId` NULLed on split + `isSplit` flag as safety net
**Alternatives:** Only NULL categoryId (no flag), separate split tracking without modifying parent
**Rationale:** NULLing categoryId alone prevents double-counting but could be accidentally set back. The `isSplit` flag provides a second layer of protection — budget queries filter on `isSplit = 0` AND UNION with split_transactions.

## Decision 2: Parent Amount Edit → Auto-Delete Splits
**Choice:** Auto-delete all splits when parent amount changes
**Alternatives:** Proportional adjustment of split amounts
**Rationale:** Proportional adjustment is complex (rounding, edge cases with many splits) and may produce unexpected amounts. Auto-delete is simpler and safer — the user is notified and can re-split.

## Decision 3: No New Page for Tags
**Choice:** Tags managed via modal from Settings; splits via modal on transaction row
**Alternatives:** Dedicated /tags page
**Rationale:** Tags don't warrant their own page — CRUD is simple enough for a modal. Settings page is the natural "manage configuration" location. Splits are contextual to a specific transaction.

## Decision 4: Tag Filter Logic
**Choice:** AND logic (transactions must have ALL specified tags)
**Alternatives:** OR logic (transactions with ANY specified tag)
**Rationale:** AND is more useful for narrowing results (e.g., "tax-deductible" AND "2026"). OR would return too many results. Users can filter by single tag for OR-like behavior.

## Decision 5: previousCategoryId Preservation
**Choice:** Store original categoryId in `previousCategoryId` before NULLing on split
**Alternatives:** No preservation (user must re-categorize after unsplit)
**Rationale:** Better UX — unsplitting restores the original category automatically. Works correctly even when original categoryId was NULL.

## Decision 6: Table Naming
**Choice:** snake_case for all new tables (`transaction_tags`, `split_transactions`)
**Rationale:** Matches existing convention (`category_rules`, `account_summaries`, `ai_settings`).
