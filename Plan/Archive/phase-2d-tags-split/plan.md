# Plan: Tags / Split Transactions (Phase 2D)

**Status:** Approved (covered by master plan)
**Created:** 2026-03-21
**Feature Branch:** `feature/phase-2d-tags-split`

---

## Goal / Problem Statement
Users need to tag transactions for cross-category organisation (e.g. "holiday", "tax-deductible") and split single transactions into multiple budget-category allocations (e.g. a grocery receipt split between "Food" and "Household").

## Implementation Order

1. **Schema** — Add 3 new tables (`tags`, `transaction_tags`, `split_transactions`) + 2 new columns on `transactions` (`isSplit`, `previousCategoryId`)
2. **Migration** — Generate via `npm run db:generate`
3. **Test setup** — Update `tests/server-setup.ts` with new tables/columns
4. **Types** — Add `TagResponse`, `SplitTransactionResponse`; extend `TransactionResponse` with `tags`, `isSplit`; extend `TransactionFilters` with `tagIds`
5. **Validation** — Add tag/split zod schemas
6. **Server routes** — Tag CRUD, transaction-tag junction, split CRUD with sum validation
7. **Cross-boundary: Transaction routes** — Join tags via subquery in GET, auto-delete splits on parent amount edit
8. **Cross-boundary: Budget routes** — UNION with split_transactions for split-aware spend
9. **Client module** — API, hooks, TagManager, TagSelector, TagBadge, SplitTransactionModal
10. **Cross-boundary: Settings page** — Add "Manage Tags" link
11. **Cross-boundary: Transaction table** — Show tag pills, add Tag/Split row actions

## Cross-Boundary Alerts

| File | Change | Risk | Approval |
|------|--------|------|----------|
| `src/server/lib/db/schema/index.ts` | Add tags, transaction_tags, split_transactions tables; add isSplit + previousCategoryId to transactions | Med | Master plan |
| `src/shared/types/index.ts` | Add TagResponse, SplitTransactionResponse; extend TransactionResponse with tags/isSplit | Med | Master plan |
| `src/shared/types/validation.ts` | Add tag/split schemas | Low | Master plan |
| `src/server/features/transactions/routes.ts` | Join tags via GROUP_CONCAT in GET; auto-delete splits on parent amount edit in PUT | Med | Master plan |
| `src/server/features/budgets/routes.ts` | Budget spend: UNION with split_transactions | Med | Master plan |
| `src/client/app/pages/settings.tsx` | Add "Manage Tags" link | Low | Master plan |
| `src/server/app.ts` | Register tagRouter | Low | Master plan |
| `tests/server-setup.ts` | Add new tables/columns for CI | Low | Master plan |

## Decisions Made
- Split/budget double-counting: parent categoryId NULLed on split, isSplit flag as safety net
- Parent amount edit auto-deletes splits (simpler than proportional adjustment)
- No new page — tags via Settings modal, splits via transaction row modal
- All table names snake_case: `transaction_tags`, `split_transactions`

## Open Questions
- None (all resolved in master plan review)
