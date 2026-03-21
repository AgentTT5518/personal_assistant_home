# Requirements: Multi-Account / Multi-Source Tracking (Phase 2A)

## Overview
Users can track multiple financial accounts (checking, savings, credit cards, investments) with balances and see a unified net-worth view.

## Functional Requirements

### Account Management
- CRUD operations for accounts with name, type, institution, currency, and balance
- Account types: checking, savings, credit_card, investment
- Default currency: AUD
- Accounts can be deactivated (soft-delete) or hard-deleted (only if no linked transactions)

### Balance Tracking
- currentBalance is set manually on creation and editable via update
- Optional recalculate endpoint: computes balance from linked transactions (SUM credits - SUM debits)
- Recalculate only available when account has linked transactions

### Net Worth
- Aggregates balances across all active accounts
- Credit card balances stored as positive (amount owed), treated as negative for net worth calculation

### Transaction/Document Linking
- Transactions and documents can be optionally assigned to an account
- Nullable foreign keys — backward compatible with existing data
- Bulk assign multiple transactions to an account
- ON DELETE SET NULL for both FKs

### Navigation
- Sidebar redesigned with collapsible NavSection groups (Overview, Data, Planning, Insights)
- Collapsed state persisted in localStorage
- Settings pinned at bottom outside groups

## Non-Functional Requirements
- All new columns nullable — no backfill needed
- 29 server integration tests covering CRUD, net-worth, recalculate, soft/hard delete, backward compatibility
- Mobile responsive (44px touch targets, responsive table columns)
