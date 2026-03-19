# Phase 1C: Transactions — Implementation Plan

**Status:** Planning
**Created:** 2026-03-19
**Feature Branch:** `feature/phase-1c-transactions`

## Context

Phase 1B (Document Upload) is merged to main. The app can upload financial PDFs, extract structured data via AI, and display document-level results. The `transactions` table is already populated by the extraction pipeline with `date`, `description`, `amount`, `type`, `merchant`, and `isRecurring` fields. However, `categoryId` is always null — categorisation is Phase 1C's primary task. The `categories`, `categoryRules`, and `categoryId` foreign key are all in the schema but unused.

Phase 1C builds the transaction management layer: browsing/filtering/searching transactions across all documents, rule-based and AI-assisted categorisation, category management, and bulk operations.

## Branch

`feature/phase-1c-transactions` off `main`

## Feature Folders

- Server: `src/server/features/transactions/`
- Client: `src/client/features/transactions/`

---

## Cross-Boundary Edits (Rule 5)

| File | Change | Risk |
|------|--------|------|
| `src/shared/types/index.ts` | Add `CategoryResponse`, `CategoryRuleResponse`, `TransactionFilters`, `PaginatedResponse` types; extend `TransactionResponse` with `categoryId` + `categoryName` + `categoryColor` + `documentFilename` | Low |
| `src/shared/types/validation.ts` | Add Zod schemas for category create/update, category rule create, transaction update, bulk categorise, transaction filter query params | Low |
| `src/server/shared/middleware/validate.ts` | Add `validateQuery` middleware (parses `req.query` instead of `req.body`, same pattern as `validateBody`) | Low |
| `src/server/app.ts` | Mount `transactionRouter` and `categoryRouter` | Low |
| `src/server/lib/db/seed.ts` | Update existing flat categories to hierarchical structure; see Step 3 for migration strategy | Low |
| `src/server/features/document-processor/extraction.service.ts` | Add fire-and-forget `runRuleCategorisation()` call after successful extraction | Low |
| `src/server/features/document-processor/vision.service.ts` | Add fire-and-forget `runRuleCategorisation()` call after successful vision reprocess | Low |
| `src/client/app/pages/transactions.tsx` | Replace stub with feature component import | Low |
| `ARCHITECTURE.md` | Update component map, API endpoints, feature log | Low |

---

## Implementation Steps (dependency order)

### Step 1: Setup — Feature scaffolding

**Create files:**
- `src/server/features/transactions/CLAUDE.md` — from template
- `src/server/features/transactions/logger.ts` — `createLogger('transactions')`
- `src/client/features/transactions/CLAUDE.md` — from template
- `src/client/features/transactions/logger.ts` — `createLogger('transactions')`

### Step 2: Shared types, validation & validateQuery middleware (cross-boundary)

**Modify `src/server/shared/middleware/validate.ts`** — add `validateQuery`:

```ts
export function validateQuery<T extends z.ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const issues = result.error.issues;
      const message = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new AppError(400, 'VALIDATION_ERROR', message);
    }
    (req as any).query = result.data;
    next();
  };
}
```

Same pattern as existing `validateBody` but parses `req.query` instead of `req.body`. Coercion (via `z.coerce`) handles query string values being strings. Note: `(req as any).query` cast is needed because Express types `req.query` as `qs.ParsedQs`, not a generic object — unlike `req.body` which is typed as `any`.

**Modify `src/shared/types/index.ts`** — add:
```ts
export interface CategoryResponse {
  id: string;
  name: string;
  parentId: string | null;
  color: string;
  icon: string;
  isDefault: boolean;
  createdAt: string;
}

export interface CategoryRuleResponse {
  id: string;
  categoryId: string;
  categoryName: string;
  pattern: string;
  field: string;
  isAiGenerated: boolean;
  confidence: number;
  createdAt: string;
}

export interface TransactionFilters {
  search?: string;         // full-text search on description/merchant
  categoryId?: string;     // filter by category (use 'uncategorised' for null)
  type?: 'debit' | 'credit';
  dateFrom?: string;       // ISO date
  dateTo?: string;         // ISO date
  amountMin?: number;
  amountMax?: number;
  documentId?: string;     // filter by source document
  isRecurring?: boolean;
  sortBy?: 'date' | 'amount' | 'description';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

**Extend `TransactionResponse`** — add:
```ts
categoryId: string | null;
categoryName: string | null;   // joined from categories table
categoryColor: string | null;  // joined from categories table
documentFilename: string | null; // joined from documents table
```

**Modify `src/shared/types/validation.ts`** — add:
```ts
export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.string().uuid().nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z.string().min(1).max(50),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createCategoryRuleSchema = z.object({
  categoryId: z.string().uuid(),
  pattern: z.string().min(1).max(500),
  field: z.enum(['description', 'merchant']).default('description'),
});

export const updateTransactionSchema = z.object({
  categoryId: z.string().uuid().nullable(),
});

export const bulkCategoriseSchema = z.object({
  transactionIds: z.array(z.string().uuid()).min(1).max(500),
  categoryId: z.string().uuid().nullable(),
});

export const transactionFiltersSchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.enum(['debit', 'credit']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  amountMin: z.coerce.number().optional(),
  amountMax: z.coerce.number().optional(),
  documentId: z.string().uuid().optional(),
  isRecurring: z.coerce.boolean().optional(),
  sortBy: z.enum(['date', 'amount', 'description']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
```

### Step 3: Seed category hierarchy + update categorisation model (cross-boundary)

**Modify `src/server/lib/db/seed.ts`**

The current seed has 15 flat categories (Housing, Utilities, Groceries, etc.) and `categorisation` AI setting with Sonnet. Phase 1C needs:
1. Hierarchical categories with `parentId` relationships
2. A few new categories (Salary, Rent/Mortgage, Restaurants, Fees & Charges)
3. The categorisation AI setting updated from Sonnet to Haiku

**Migration strategy — `onConflictDoUpdate` instead of `onConflictDoNothing`:**

The current seed uses `onConflictDoNothing({ target: schema.categories.name })`, which means existing categories are never updated. Phase 1C changes this to `onConflictDoUpdate` for categories that need new fields (parentId, updated colors/icons). This ensures both fresh DBs and existing DBs get the hierarchy.

```ts
const defaultCategories = [
  // Top-level parents
  { name: 'Income',          color: '#22c55e', icon: 'dollar-sign', parentName: null },
  { name: 'Housing',         color: '#3b82f6', icon: 'home',        parentName: null },
  { name: 'Transport',       color: '#f59e0b', icon: 'car',         parentName: null },
  { name: 'Food & Dining',   color: '#ef4444', icon: 'utensils',    parentName: null },
  { name: 'Shopping',        color: '#8b5cf6', icon: 'shopping-bag', parentName: null },
  { name: 'Health',          color: '#06b6d4', icon: 'heart',       parentName: null },
  { name: 'Entertainment',   color: '#ec4899', icon: 'film',        parentName: null },
  { name: 'Subscriptions',   color: '#a855f7', icon: 'repeat',      parentName: null },
  { name: 'Insurance',       color: '#14b8a6', icon: 'shield',      parentName: null },
  { name: 'Savings',         color: '#10b981', icon: 'piggy-bank',  parentName: null },
  { name: 'Transfers',       color: '#6b7280', icon: 'arrow-right-left', parentName: null },
  { name: 'Fees & Charges',  color: '#f97316', icon: 'alert-circle', parentName: null },
  { name: 'Other',           color: '#9ca3af', icon: 'help-circle', parentName: null },
  // Children (inserted after parents so we can look up parentId by name)
  { name: 'Salary',          color: '#16a34a', icon: 'briefcase',    parentName: 'Income' },
  { name: 'Utilities',       color: '#1d4ed8', icon: 'zap',          parentName: 'Housing' },
  { name: 'Rent/Mortgage',   color: '#2563eb', icon: 'key',          parentName: 'Housing' },
  { name: 'Groceries',       color: '#dc2626', icon: 'shopping-cart', parentName: 'Food & Dining' },
  { name: 'Restaurants',     color: '#b91c1c', icon: 'coffee',       parentName: 'Food & Dining' },
];
```

Implementation approach:
1. Insert/update parents first (parents listed before children, `parentName: null`)
2. After parents are committed, query their IDs by name
3. Insert children with resolved `parentId`
4. Use `onConflictDoUpdate({ target: schema.categories.name })` to update `parentId`, `color`, `icon` on existing rows

**Handling renamed categories:** The current seed has "Dining Out" and "Health & Medical" and "Savings & Investments" and "Education". Phase 1C renames some:
- "Dining Out" → becomes child "Restaurants" under "Food & Dining" (new parent)
- "Health & Medical" → "Health" (shorter)
- "Savings & Investments" → "Savings" (shorter)
- "Education" → removed from defaults (uncommon for personal finance; users can add manually)

Since `onConflictDoUpdate` matches on `name` and the old names don't match the new names, the old categories will remain as-is (orphaned but harmless — they just won't have children). The new categories will be inserted alongside them. This is acceptable: users who already categorised transactions under "Dining Out" keep those assignments, and can manually consolidate if they want.

**Update categorisation AI setting:**

The `categorisation` task type already exists in seed with Sonnet (`claude-sonnet-4-5-20250514`). Change the seed to use Haiku (`claude-haiku-4-5-20251001`). Since the seed uses `onConflictDoNothing` for AI settings, this only affects fresh DBs. For existing DBs, the user can switch to Haiku via the Settings page (already functional from Phase 1B). This is the right default — don't silently downgrade an existing user's model choice.

Design choice: Haiku as the default for categorisation — it's a classification task that doesn't need Sonnet's reasoning. Fast and cheap for bulk operations. Users who prefer Sonnet can keep it via Settings.

### Step 4: Category routes

**Create `src/server/features/transactions/category.routes.ts`**

| Method | Path | Middleware | Purpose |
|--------|------|-----------|---------|
| `GET` | `/api/categories` | — | List all categories (flat list, client builds tree) |
| `POST` | `/api/categories` | `validateBody(createCategorySchema)` | Create category |
| `PUT` | `/api/categories/:id` | `validateBody(updateCategorySchema)` | Update category |
| `DELETE` | `/api/categories/:id` | — | Delete category (nullifies `categoryId` on linked transactions, cascades rules) |
| `GET` | `/api/categories/:id/rules` | — | List rules for category |
| `POST` | `/api/categories/rules` | `validateBody(createCategoryRuleSchema)` | Create rule |
| `DELETE` | `/api/categories/rules/:id` | — | Delete rule |

Key behaviors:
- **GET `/api/categories`** — returns flat list with `parentId`. Client builds the tree view. Includes transaction count per category via subquery.
- **DELETE `/api/categories/:id`** — refuses to delete if `isDefault: true` (400 error). On delete: sets `categoryId = null` on all linked transactions, then deletes all rules for this category, then deletes the category. All in a single `db.transaction()`.
- **POST `/api/categories/rules`** — validates that the pattern is a valid regex (wraps in try-catch `new RegExp(pattern)`). Rejects invalid patterns with 400.

**Create `src/server/features/transactions/category.routes.test.ts`**
- CRUD: create, list, update, delete
- Delete: verify transactions uncategorised, rules deleted
- Delete: default category rejected (400)
- Rule: valid regex accepted, invalid regex rejected (400)

### Step 5: Rule-based categorisation engine

**Create `src/server/features/transactions/categorisation.service.ts`**

```ts
export async function categoriseTransaction(transaction: { description: string; merchant: string | null }): Promise<string | null>
export async function categoriseTransactionsBatch(transactionIds: string[]): Promise<Map<string, string>>
export async function runRuleCategorisation(): Promise<{ categorised: number; total: number }>
```

**`categoriseTransaction()`:**
1. Load all category rules from DB, ordered by `confidence DESC`
2. For each rule: test `new RegExp(rule.pattern, 'i')` against the transaction's `rule.field` value (description or merchant)
3. Return the `categoryId` of the first matching rule, or `null` if no match

**`categoriseTransactionsBatch()`:**
1. Load specified transactions from DB
2. Load all rules once
3. For each transaction: apply rules (same logic as single)
4. Batch update all matched transactions in a single `db.transaction()` (batches of 100)
5. Return map of `transactionId → categoryId` for matched transactions

**`runRuleCategorisation()`:**
1. Query all uncategorised transactions (`categoryId IS NULL`)
2. Run `categoriseTransactionsBatch()` on them
3. Return stats: `{ categorised, total }`

This is called:
- After document processing completes (hook into extraction pipeline)
- When user creates a new category rule (re-run on uncategorised transactions)
- On-demand via API endpoint

**Create `src/server/features/transactions/categorisation.service.test.ts`**
- Test: matching rule returns correct categoryId
- Test: highest confidence rule wins when multiple match
- Test: no match returns null
- Test: regex patterns work (case-insensitive)
- Test: batch categorisation updates DB correctly
- Test: field matching (description vs merchant)

### Step 6: AI categorisation service

**Create `src/server/features/transactions/ai-categorisation.service.ts`**

```ts
export async function aiCategoriseTransactions(transactionIds: string[]): Promise<{ categorised: number; failed: number }>
```

Pipeline:
1. Load specified uncategorised transactions from DB
2. Load all categories from DB (for the AI to choose from)
3. Group transactions into batches of 20 (keeps prompt size manageable)
4. For each batch: build prompt with transaction descriptions + category list
5. Call `routeToProvider('categorisation', messages, { maxTokens: 4096, temperature: 0 })`
6. Parse AI response — expected format:
   ```json
   {
     "categorisations": [
       { "transactionId": "...", "categoryId": "...", "confidence": 0.95 }
     ]
   }
   ```
7. Validate with Zod, filter for confidence >= 0.7
8. Batch update transactions in DB
9. **Auto-generate rules:** For each AI categorisation with confidence >= 0.9, check if a similar rule already exists. If not, create a `categoryRule` with `isAiGenerated: true` and the matched pattern extracted from the description. This builds up the rule base over time so fewer transactions need AI categorisation.
10. Return stats

**Prompt design:**
- System: "You are a financial transaction categoriser. Given a list of transactions and available categories, assign each transaction to the most appropriate category."
- User: JSON array of `{ id, description, merchant, amount, type }` + available categories `{ id, name }`
- Instruct: output JSON only, include confidence scores, prefer specific subcategories over parents

Rate limiting: The AI categorisation endpoint uses `aiRateLimiter` from shared middleware.

**Create `src/server/features/transactions/ai-categorisation.service.test.ts`**
- Test: successful categorisation updates transactions
- Test: low confidence results filtered out
- Test: auto-generated rules created for high-confidence matches
- Test: handles AI response parsing errors gracefully

### Step 7: Transaction routes

**Create `src/server/features/transactions/routes.ts`**

| Method | Path | Middleware | Purpose |
|--------|------|-----------|---------|
| `GET` | `/api/transactions` | `validateQuery(transactionFiltersSchema)` | List transactions with filtering, sorting, pagination |
| `GET` | `/api/transactions/stats` | — | Aggregated stats (total income/expenses, by category, by month) |
| `PUT` | `/api/transactions/:id` | `validateBody(updateTransactionSchema)` | Update transaction (category assignment) |
| `POST` | `/api/transactions/bulk-categorise` | `validateBody(bulkCategoriseSchema)` | Bulk assign category to multiple transactions |
| `POST` | `/api/transactions/auto-categorise` | `aiRateLimiter` | Trigger rule-based categorisation on all uncategorised |
| `POST` | `/api/transactions/ai-categorise` | `validateBody`, `aiRateLimiter` | Trigger AI categorisation on specified transactions |

Key behaviors:

**GET `/api/transactions`:**
- Left join with `categories` to include `categoryName` and `categoryColor`
- Left join with `documents` to include `documentFilename` (included in `TransactionResponse` type, helpful for UI context — shows which document a transaction came from)
- Filtering: builds dynamic `where` clauses from validated query params
- `search` filter: `LIKE '%term%'` on `description` and `merchant` (SQLite doesn't have full-text search; `LIKE` is adequate for the expected data volumes)
- `categoryId = 'uncategorised'` special value: filters for `categoryId IS NULL`
- Pagination: `LIMIT pageSize OFFSET (page - 1) * pageSize`
- Returns `PaginatedResponse<TransactionResponse>`
- Includes `total` count for pagination controls (separate COUNT query)

**GET `/api/transactions/stats`:**
- Returns:
  ```ts
  {
    totalIncome: number;
    totalExpenses: number;
    netAmount: number;
    transactionCount: number;
    uncategorisedCount: number;
    byCategory: Array<{ categoryId: string; categoryName: string; categoryColor: string; total: number; count: number }>;
    byMonth: Array<{ month: string; income: number; expenses: number }>;
  }
  ```
- Accepts optional `dateFrom` and `dateTo` query params to scope the stats window
- Uses SQL aggregation queries (SUM, GROUP BY)

**POST `/api/transactions/auto-categorise`:**
- Calls `runRuleCategorisation()`
- Returns 200 with `{ categorised, total }` (synchronous — rule matching is fast enough to not need async)

**POST `/api/transactions/ai-categorise`:**
- Body: `{ transactionIds: string[] }` (max 500)
- Fires `aiCategoriseTransactions(transactionIds).catch((err) => log.error('AI categorisation failed', err instanceof Error ? err : new Error(String(err))))` (fire-and-forget with error isolation)
- Returns 202 Accepted

**Client polling strategy for AI categorisation:**
- After the 202 response, the `useAiCategorise` mutation's `onSuccess` callback enables a temporary `refetchInterval: 3000` on both `useTransactions` and `useTransactionStats` queries (via a shared `isAiCategorising` state flag)
- The client compares the `uncategorisedCount` from stats: when it stops changing between polls (two consecutive identical values), disable the polling and clear the flag
- This reuses the same polling pattern Phase 1B uses for document processing status — simple, no new infrastructure needed

**Create `src/server/features/transactions/routes.test.ts`**
- GET: filtering, sorting, pagination, search, uncategorised filter
- Stats: correct aggregation math
- PUT: category update persists
- Bulk categorise: multiple transactions updated
- Auto-categorise: runs rules and returns stats

### Step 8: Hook categorisation into extraction pipeline (cross-boundary)

**Modify `src/server/features/document-processor/extraction.service.ts`:**
- After successful extraction (status → 'completed'), add:
  ```ts
  runRuleCategorisation().catch((err) =>
    log.error('Post-extraction categorisation failed', err instanceof Error ? err : new Error(String(err)))
  );
  ```
- This is fire-and-forget but with explicit `.catch()` to prevent unhandled promise rejections (e.g., if a corrupt regex in a category rule throws). Extraction success is not affected — categorisation failure is logged and swallowed.

**Similarly for `src/server/features/document-processor/vision.service.ts`** — same `.catch(log.error)` pattern after vision reprocessing completes.

**Error isolation rationale:** Phase 1B's fire-and-forget calls (`void processDocument(id)`) are safe because the extraction service wraps its entire pipeline in try-catch internally. But `runRuleCategorisation()` is an external import from the transactions feature — if it throws (corrupt regex, DB error), the rejection must not crash the process. The `.catch()` wrapper provides that isolation.

### Step 9: Feature barrel + server integration (cross-boundary)

**Create `src/server/features/transactions/index.ts`**
- Exports `transactionRouter`, `categoryRouter`

**Modify `src/server/app.ts`**
- Mount: `app.use('/api', transactionRouter)` and `app.use('/api', categoryRouter)` before error handler

### Step 10: Client API & hooks

**Create `src/client/features/transactions/api.ts`**
- `fetchTransactions(filters: TransactionFilters)` — GET `/api/transactions` with query params
- `fetchTransactionStats(dateFrom?, dateTo?)` — GET `/api/transactions/stats`
- `updateTransaction(id, data)` — PUT `/api/transactions/:id`
- `bulkCategorise(transactionIds, categoryId)` — POST `/api/transactions/bulk-categorise`
- `triggerAutoCategorise()` — POST `/api/transactions/auto-categorise`
- `triggerAiCategorise(transactionIds)` — POST `/api/transactions/ai-categorise`
- `fetchCategories()` — GET `/api/categories`
- `createCategory(data)` — POST `/api/categories`
- `updateCategory(id, data)` — PUT `/api/categories/:id`
- `deleteCategory(id)` — DELETE `/api/categories/:id`
- `fetchCategoryRules(categoryId)` — GET `/api/categories/:id/rules`
- `createCategoryRule(data)` — POST `/api/categories/rules`
- `deleteCategoryRule(id)` — DELETE `/api/categories/rules/:id`

**Create `src/client/features/transactions/hooks.ts`**
- `useTransactions(filters, options?)` — React Query, refetches on filter change via query key. Accepts optional `refetchInterval` override for AI categorisation polling
- `useTransactionStats(dateFrom?, dateTo?, options?)` — React Query, accepts optional `refetchInterval` override
- `useUpdateTransaction()` — mutation, invalidates `['transactions']` + `['transaction-stats']`
- `useBulkCategorise()` — mutation, invalidates `['transactions']` + `['transaction-stats']` + `['categories']`
- `useAutoCategorise()` — mutation, invalidates `['transactions']` + `['transaction-stats']` + `['categories']` (category transaction counts change)
- `useAiCategorise()` — mutation, invalidates `['transactions']` + `['transaction-stats']` + `['categories']`
- `useCategories()` — React Query
- `useCreateCategory()` — mutation, invalidates `['categories']`
- `useUpdateCategory()` — mutation with invalidation
- `useDeleteCategory()` — mutation with invalidation
- `useCategoryRules(categoryId)` — React Query, enabled when `categoryId` is set
- `useCreateCategoryRule()` — mutation, invalidates `['category-rules']`
- `useDeleteCategoryRule()` — mutation with invalidation

### Step 11: Client components

**Create `src/client/features/transactions/components/transaction-table.tsx`**
- Paginated table with columns: Date, Description, Merchant, Amount, Type, Category, Source Doc
- Amount column: color-coded (green for credit, red for debit), formatted as currency
- Category column: colored badge showing category name; click to open inline category selector dropdown
- Sortable column headers (date, amount, description)
- Row selection checkboxes for bulk operations
- Empty state: "No transactions found. Upload documents to extract transactions."

**Create `src/client/features/transactions/components/transaction-filters.tsx`**
- Search input (debounced 300ms) for description/merchant
- Category dropdown filter (includes "Uncategorised" option)
- Type toggle: All / Debit / Credit
- Date range picker (from/to inputs, type="date")
- Amount range inputs (min/max)
- Document source dropdown (populated from documents list)
- Recurring toggle
- "Clear filters" button
- Active filter count badge

**Create `src/client/features/transactions/components/category-selector.tsx`**
- Dropdown/popover for selecting a category
- Shows categories as colored badges in a hierarchical list (parents, then indented children)
- Search/filter within the dropdown
- "Remove category" option (sets to null)
- Used both inline in the table and in bulk operations

**Create `src/client/features/transactions/components/bulk-actions-bar.tsx`**
- Appears when 1+ transactions are selected
- Shows: selected count, "Categorise as..." button (opens category selector), "Clear selection"
- Sticky at bottom of the page
- Calls `useBulkCategorise()` on confirm

**Create `src/client/features/transactions/components/category-manager.tsx`**
- Modal/panel for managing categories
- List of categories with color dot + name + transaction count + rule count
- Create new category: name, color picker, icon, optional parent
- Edit category inline
- Delete category (with confirmation: "X transactions will be uncategorised")
- Expand category to see/manage its rules
- Rule list: pattern, field, AI-generated badge, confidence, delete button
- Add rule: pattern input (validates as regex), field selector (description/merchant)

**Create `src/client/features/transactions/components/stats-summary.tsx`**
- Summary cards at top of transactions page:
  - Total Income (green)
  - Total Expenses (red)
  - Net Amount (green if positive, red if negative)
  - Uncategorised count (with "Auto-categorise" button)
- Date range filter for stats scope

**Create `src/client/features/transactions/transactions-page.tsx`**
- Composes: `StatsSummary` → `TransactionFilters` → `TransactionTable` + `BulkActionsBar`
- "Manage Categories" button opens `CategoryManager` modal
- "AI Categorise" button: triggers AI categorisation on all uncategorised (or selected) transactions

**Create `src/client/features/transactions/index.ts`**
- Exports `TransactionsPage`

### Step 12: Client page wiring (cross-boundary)

**Modify `src/client/app/pages/transactions.tsx`**
- Import and render `TransactionsPage`

### Step 13: ARCHITECTURE.md update

Update:
- Component Map: add transactions feature, categorisation services, category management
- API Endpoints: add all new endpoints (7 transaction + 7 category = 14 new endpoints)
- Feature Log: add Phase 1C entry

---

## Data Flow

```
                          ┌─────────────────────────────────┐
                          │  Phase 1B Extraction Pipeline    │
                          │  (existing — triggers on upload) │
                          └────────────┬────────────────────┘
                                       │ transactions inserted
                                       │ runRuleCategorisation().catch(log.error)
                                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Rule Categorisation Engine                                       │
│  1. Load all categoryRules (ordered by confidence DESC)          │
│  2. For each uncategorised transaction: test regex rules         │
│  3. First match → assign categoryId                              │
│  4. Batch update DB                                              │
└──────────────────────────────────┬───────────────────────────────┘
                                   │ still uncategorised?
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│  AI Categorisation (user-triggered)                               │
│  1. Batch transactions (20 per AI call)                          │
│  2. routeToProvider('categorisation', ...)                       │
│  3. Parse response, filter by confidence >= 0.7                  │
│  4. Update transactions + auto-create rules (confidence >= 0.9)  │
└──────────────────────────────────────────────────────────────────┘

Client: GET /api/transactions?search=...&categoryId=...&page=1
        ├── TransactionTable (paginated, sortable, inline category edit)
        ├── TransactionFilters (search, category, type, date, amount)
        ├── BulkActionsBar (multi-select → assign category)
        └── StatsSummary (income/expenses/net/uncategorised count)
```

---

## Migrations

No new DB tables or schema changes required. All tables (`transactions`, `categories`, `category_rules`) exist from Phase 1A schema. The `categoryId` FK on `transactions` is already nullable and ready for Phase 1C to populate.

Only data seeding is needed: default categories + `categorisation` AI setting.

---

## Key Design Decisions

1. **Rule-based first, AI second** — Rule matching is instant and free. AI categorisation is user-triggered (not automatic) to control costs and give users visibility into what's happening. Rules built up over time from AI results reduce future AI calls.
2. **Auto-generated rules from AI** — When AI categorises with >= 0.9 confidence, a rule is auto-created. This creates a feedback loop: first batch needs AI, subsequent similar transactions are caught by rules.
3. **Haiku for categorisation** — Transaction categorisation is a classification task, not a reasoning task. Haiku is fast and cheap, appropriate for batches of 20 transactions.
4. **Flat category list from API, tree in client** — Server returns flat list with `parentId`. Client builds the tree. Simpler server logic, flexible client rendering.
5. **`LIKE` search over full-text search** — SQLite FTS5 is powerful but adds migration complexity. `LIKE` on description/merchant is adequate for the expected data volumes (personal finance = thousands of transactions, not millions). Can upgrade later if needed.
6. **Synchronous auto-categorise, async AI categorise** — Rule matching is CPU-bound and fast (< 100ms for thousands of transactions). AI categorisation involves external API calls and is fire-and-forget with 202 response.
7. **Stats as separate endpoint** — Aggregation queries are independent of the paginated list query. Keeping them separate avoids recomputing stats on every page change.
8. **Pagination with separate COUNT** — Two queries (data + count) is the standard SQLite pagination pattern. More efficient than fetching all rows and counting in JS.

---

## Known Limitations (Phase 1C scope)

1. **No transaction editing beyond category** — Users can only change the category of a transaction, not edit the description/amount/date. These are AI-extracted values and manual editing is deferred (low priority — re-upload or reprocess is the fix for bad extraction).
2. **No category import/export** — Users can't export their category scheme or import one. This is a nice-to-have for a future phase.
3. **AI categorisation batches are sequential** — The 20-transaction batches are processed one at a time per AI call. Parallel batches could be faster but adds complexity and rate limiting concerns.
4. **`LIKE` search has no relevance ranking** — Results match by containment, not relevance. Upgrade to FTS5 if search quality becomes an issue.
5. **No undo for bulk categorisation** — Bulk operations are immediate. No undo/history mechanism.
6. **Default categories cannot be unmarked as default** — `isDefault: true` categories cannot be deleted (400 error), and there's no API to change `isDefault` to false. Users who want to restructure from scratch must work around the defaults. Acceptable for Phase 1C — adding an "unmark default" action is low priority since users can just ignore unused defaults.
7. **Category rule patterns are raw regex** — Non-technical users may struggle with regex syntax. The UI validates patterns and shows a 400 on invalid regex, but doesn't offer a simpler "contains" matching mode or a preview of what the pattern matches. A "simple mode" (auto-wrapping user input in regex escaping) could be added in a future iteration.

---

## Verification

1. **Tests:** `npm test` — all new tests pass (categorisation engine, rule matching, API endpoints, category CRUD)
2. **Typecheck:** `npm run typecheck` — no errors
3. **Lint:** `npm run lint` — clean
4. **Manual E2E:**
   - Start dev server (`npm run dev`)
   - Navigate to Transactions page — verify existing transactions from Phase 1B are listed
   - Filter by date range, search by description, filter by type — verify results
   - Click category on a transaction → select category → verify persists
   - Select multiple transactions → bulk categorise → verify all updated
   - Click "Auto-categorise" → verify rule engine runs, stats update
   - Open Category Manager → create custom category with rules → verify new rule matches
   - Trigger AI categorisation → verify transactions categorised, rules auto-created
   - Delete a category → verify transactions uncategorised
   - Check stats summary matches actual transaction data
5. **Secret scan:** `grep -rn "$SECRET_SCAN_PATTERNS" ...` — clean
