# Plan: Multi-Account / Multi-Source Tracking (Phase 2A)

**Status:** Approved (via master plan)
**Created:** 2026-03-21
**Feature Branch:** `feature/phase-2a-accounts`

---

## Goal / Problem Statement
Users need to track multiple financial accounts (checking, savings, credit cards, investments) and see a unified net-worth view. This is the foundational schema change for Phase 2 — adds `accountId` to transactions and documents.

## Proposed Approach
Refer to master plan (`.claude/plans/woolly-doodling-marble.md`, Feature 2A section) for full strategy. This plan focuses on implementation specifics.

### Build Order
1. **Sidebar refactor** (cross-boundary prep) — convert flat nav to `NavSection` groups with collapsible headers
2. **Schema** — `accounts` table + nullable `accountId` on transactions/documents
3. **Migration** — `npm run db:generate` to produce migration file
4. **Shared types** — `AccountType`, `AccountResponse`, extend `TransactionResponse`/`TransactionFilters`
5. **Validation schemas** — Zod schemas for account CRUD
6. **Server routes** — Full CRUD + `/net-worth` + `/recalculate` + transaction assignment
7. **Server tests** — CRUD, net-worth calc, soft/hard delete, recalculate, backward compat
8. **Client module** — api, hooks, components (AccountList, AccountForm, AccountSelector)
9. **Client page** — `/accounts` route + AccountsPage
10. **Dashboard widget** — AccountOverview component
11. **Cross-boundary wiring** — app.tsx route, app.ts router registration, transaction routes accountId filter

### Boundary Alerts Required
All pre-approved in master plan. Will log each in CLAUDE.md as executed:

| File | Change | Risk |
|------|--------|------|
| `src/client/app/layout.tsx` | Sidebar redesign with NavSection groups + Accounts nav | Med |
| `src/client/app/app.tsx` | Add `/accounts` route | Low |
| `src/client/app/pages/dashboard.tsx` | Add AccountOverview widget | Low |
| `src/shared/types/index.ts` | Add account types, extend transaction types | Med |
| `src/shared/types/validation.ts` | Add account schemas, extend transaction filters | Low |
| `src/server/features/transactions/routes.ts` | Join accounts in GET, accept accountId filter | Med |
| `src/server/app.ts` | Register account router | Low |
| `src/server/lib/db/schema/index.ts` | Add accounts table, alter transactions + documents | Med |

### Key Implementation Notes
- **Route ordering:** `/net-worth` registered before `/:id` to avoid Express matching
- **Credit cards:** stored positive, treated negative in net-worth calc
- **DELETE:** always soft-delete; `?hard=true` only if zero linked transactions
- **currentBalance:** manual with optional `/recalculate` endpoint
- **Table names:** snake_case (`accounts` is already fine)
- **FKs:** nullable accountId = backward-compatible, no backfill needed

## Files to Create / Modify
| Action | File Path | Description |
|--------|-----------|-------------|
| Create | `src/server/features/accounts/logger.ts` | Scoped logger |
| Create | `src/server/features/accounts/routes.ts` | Account CRUD + net-worth + recalculate |
| Create | `src/server/features/accounts/routes.test.ts` | Server integration tests |
| Create | `src/server/features/accounts/index.ts` | Barrel export |
| Create | `src/client/features/accounts/logger.ts` | Scoped logger |
| Create | `src/client/features/accounts/api.ts` | API client functions |
| Create | `src/client/features/accounts/hooks.ts` | React Query hooks |
| Create | `src/client/features/accounts/components/account-list.tsx` | Account list table |
| Create | `src/client/features/accounts/components/account-form.tsx` | Create/edit modal |
| Create | `src/client/features/accounts/components/account-selector.tsx` | Reusable dropdown |
| Create | `src/client/features/accounts/components/account-overview.tsx` | Dashboard widget |
| Create | `src/client/features/accounts/index.ts` | Barrel export |
| Create | `src/client/app/pages/accounts.tsx` | Accounts page |
| Modify | `src/client/app/layout.tsx` | Sidebar NavSection refactor |
| Modify | `src/client/app/app.tsx` | Add /accounts route |
| Modify | `src/client/app/pages/dashboard.tsx` | Add AccountOverview widget |
| Modify | `src/shared/types/index.ts` | Account types |
| Modify | `src/shared/types/validation.ts` | Account validation schemas |
| Modify | `src/server/app.ts` | Register account router |
| Modify | `src/server/lib/db/schema/index.ts` | accounts table + accountId FKs |
| Modify | `src/server/features/transactions/routes.ts` | accountId filter + join |

## Open Questions
- None — all resolved in master plan review rounds

## Decisions Made
- All decisions documented in master plan (credit card convention, delete semantics, currentBalance strategy, route ordering, accountSummaries relationship)

## Comments / Review Notes
- Plan pre-approved via 4+ round master plan review
