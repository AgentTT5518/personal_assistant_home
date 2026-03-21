# Feature Requirements: Tags / Split Transactions (Phase 2D)

## Tags

### Tag CRUD
- Users can create, update, and delete tags with a name and color
- Tag names must be unique (case-sensitive)
- Default color: `#6b7280`
- Deleting a tag cascades to remove all junction rows (transaction-tag links)

### Transaction Tagging
- Users can add/remove tags on individual transactions via multi-select pill component
- Users can bulk-add a single tag to multiple transactions
- Tags are displayed as colored badge pills on transaction rows
- Transaction listing supports filtering by `tagIds` (AND logic — must have ALL specified tags)

### Tag Management
- Tags are managed via a modal accessible from the Settings page
- Modal shows all tags with usage counts, edit (name + color), and delete
- Color picker uses 10 preset colors

## Split Transactions

### Split Creation
- Users can split a transaction into 2–20 sub-allocations
- Each split has: category, amount, description
- Split amounts must sum exactly to the parent transaction amount (±$0.01 tolerance)
- Creating splits: parent's `categoryId` → `previousCategoryId`, `categoryId` = NULL, `isSplit` = true
- Replaces existing splits if already split

### Split Removal
- Removing splits: `previousCategoryId` → `categoryId`, clear `previousCategoryId`, `isSplit` = false
- Works correctly when original `categoryId` was NULL

### Budget Double-Counting Prevention
- Budget spend calculation queries unsplit transactions (WHERE `isSplit = 0`) UNION with split_transactions
- Parent transaction with `isSplit = 1` is excluded from budget spend even if categoryId is non-NULL (safety net)

### Split Guards
- Cannot change category of a split transaction directly — must remove splits first
- Split modal accessible from transaction row actions

## Schema

### New Tables
- `tags` (id, name, color, created_at, updated_at)
- `transaction_tags` (transaction_id, tag_id) — composite unique index
- `split_transactions` (id, parent_transaction_id, category_id, amount, description, created_at, updated_at)

### Altered Tables
- `transactions`: added `is_split` (boolean, default 0), `previous_category_id` (nullable text)

## API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/tags` | List tags with usage counts |
| POST | `/api/tags` | Create tag |
| PUT | `/api/tags/:id` | Update tag |
| DELETE | `/api/tags/:id` | Delete tag |
| POST | `/api/transactions/:id/tags` | Add tags to transaction |
| DELETE | `/api/transactions/:id/tags/:tagId` | Remove tag from transaction |
| POST | `/api/transactions/bulk-tag` | Bulk add tag to multiple transactions |
| GET | `/api/transactions/:id/splits` | Get splits |
| POST | `/api/transactions/:id/splits` | Create/replace splits |
| DELETE | `/api/transactions/:id/splits` | Remove all splits |
