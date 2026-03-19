# Phase 1B: Document Upload & Processing — Implementation Plan

## Context

Phase 1A (Foundation) is merged to main. The app has Express 5 + React 19 scaffolding, Drizzle ORM schema with 7 tables, AI provider router (Claude/Ollama/OpenAI-compat), PDF text extractor, and placeholder pages. Phase 1B adds the first real user-facing feature: uploading financial PDFs, extracting structured data via AI, and displaying results.

## Branch

`feature/phase-1b-document-upload` off `main`

## Feature Folders

- Server: `src/server/features/document-processor/`
- Client: `src/client/features/document-upload/`

---

## Cross-Boundary Edits (Rule 5)

These files live outside feature folders and require boundary alerts:

| File | Change | Risk |
|------|--------|------|
| `src/shared/types/index.ts` | Add `ExtractedTransaction`, `ExtractionResult`, `DocumentResponse` types; add `'pdf_vision_extraction'` to TaskType | Low |
| `src/shared/types/validation.ts` | Add Zod schemas for extraction output validation; update taskTypeSchema | Low |
| `src/server/app.ts` | Mount `documentRouter` | Low |
| `src/server/index.ts` | Start cleanup service on boot | Low |
| `src/server/lib/db/seed.ts` | Add `pdf_vision_extraction` task type to default AI settings | Low |
| `src/client/app/pages/documents.tsx` | Replace stub with feature component import | Low |
| `src/client/app/pages/settings.tsx` | Import and render `AiSettingsPanel` | Low |
| `src/client/app/app.tsx` | Add sibling route `/documents/:id` under Layout parent | Low |
| `ARCHITECTURE.md` | Update component map, API endpoints, feature log | Low |

---

## Implementation Steps (dependency order)

### Step 1: Setup — Feature scaffolding

**Create files:**
- `src/server/features/document-processor/CLAUDE.md` — from template
- `src/server/features/document-processor/logger.ts` — `createLogger('document-processor')`
- `src/client/features/document-upload/CLAUDE.md` — from template
- `src/client/features/document-upload/logger.ts` — `createLogger('document-upload')`

### Step 2: Shared types & validation (cross-boundary)

**Modify `src/shared/types/index.ts`** — add:
```ts
export interface ExtractedTransaction {
  date: string;           // ISO date
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  merchant?: string;
  isRecurring?: boolean;
}

export interface ExtractionResult {
  transactions: ExtractedTransaction[];
  accountSummary?: {
    openingBalance?: number;
    closingBalance?: number;
    totalCredits?: number;
    totalDebits?: number;
    currency?: string;
  };
  metadata?: {
    institution?: string;
    period?: string;
    accountNumber?: string;  // last 4 digits only
  };
}

export interface DocumentResponse {
  id: string;
  filename: string;
  docType: DocumentType;
  institution: string | null;
  period: string | null;
  processingStatus: ProcessingStatus;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  transactionCount?: number;
  isScanned?: boolean;  // derived from raw_extraction wrapper: { isScanned, aiResponse }
  hasFile: boolean;     // true when filePath IS NOT NULL in DB — used by client to show/hide Vision button
}

export interface TransactionResponse {
  id: string;
  documentId: string;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  merchant: string | null;
  isRecurring: boolean;
  createdAt: string;
  // categoryId intentionally omitted — belongs to Phase 1C (categorisation)
}

export interface AiSettingResponse {
  id: string;
  taskType: TaskType;
  provider: AIProviderType;
  model: string;
  fallbackProvider: AIProviderType | null;
  fallbackModel: string | null;
}
```

Add `'pdf_vision_extraction'` to `TaskType` union.

**Modify `src/shared/types/validation.ts`** — add:
```ts
export const extractedTransactionSchema = z.object({
  date: z.string(),
  description: z.string(),
  amount: z.number(),
  type: z.enum(['debit', 'credit']),
  merchant: z.string().optional(),
  isRecurring: z.boolean().optional(),
});

export const extractionResultSchema = z.object({
  transactions: z.array(extractedTransactionSchema),
  accountSummary: z.object({ ... }).optional(),
  metadata: z.object({ ... }).optional(),
});
```

Update `taskTypeSchema` to include `'pdf_vision_extraction'`.

### Step 3: Upload middleware

**Create `src/server/features/document-processor/upload.middleware.ts`**

- Multer with `diskStorage` — saves to `UPLOAD_DIR` (default: `uploads/`)
- UUID filenames: `${uuid}.pdf`
- File filter: PDF only (`application/pdf`)
- Size limit: 10MB
- Ensure upload directory exists on import
- **Add `UPLOAD_DIR=uploads/` to `.env.example`** (Rule 1: all env vars must appear in .env.example)

### Step 4: PDF splitter

**Create `src/server/features/document-processor/splitter.ts`**

```ts
export async function splitPdfIfNeeded(buffer: Buffer): Promise<Buffer[]>
```

- Uses `pdf-lib` to load PDF and check page count
- If <= 50 pages: return `[buffer]`
- If > 50 pages: split into 25-page chunks using `PDFDocument.create()` + `copyPages()`
- Last chunk gets the remainder (e.g. 51 pages → [25, 26])
- Returns array of `Buffer` chunks

**Create `src/server/features/document-processor/splitter.test.ts`**
- Test: <= 50 pages returns single buffer
- Test: exactly 50 pages returns single buffer
- Test: 75 pages returns 3 chunks (25, 25, 25)
- Test: 51 pages returns 2 chunks (25, 26) — non-multiple edge case

### Step 5: Prompt templates

**Create `src/server/features/document-processor/prompts/`**

Files:
- `bank-statement.ts` — extracts transactions, opening/closing balances
- `credit-card.ts` — extracts transactions, statement balance, minimum payment
- `payslip.ts` — maps gross/net/deductions as transactions
- `tax-return.ts` — maps income/deduction line items
- `investment-report.ts` — extracts holdings, dividends, capital gains
- `index.ts` — barrel mapping `DocumentType` to prompt builder

Each prompt builder:
```ts
export function buildPrompt(text: string, institution?: string, period?: string): Message[]
```

`prompts/index.ts` exports the dispatcher function:
```ts
export function getPromptForDocType(docType: DocumentType, text: string, institution?: string, period?: string): Message[]
```
Maps `DocumentType` to the appropriate `buildPrompt` call.

System message instructs AI to output JSON matching `ExtractionResult` schema. User message contains the raw extracted text.

### Step 6: Transaction deduplication

**Create `src/server/features/document-processor/dedup.ts`**

```ts
export function buildTransactionKey(t: ExtractedTransaction, institution: string | null): string
export function deduplicateTransactions(
  incoming: ExtractedTransaction[],
  institution: string | null,
  existingKeys: Set<string>
): ExtractedTransaction[]
```

Composite key: `${date}|${description}|${amount.toFixed(2)}|${institution ?? ''}`

**Important:** Amount uses `.toFixed(2)` to avoid floating-point stringify inconsistencies (e.g. `1.1` vs `1.1000000000000001`).

1. Deduplicate within the incoming batch (keep first occurrence)
2. Filter out transactions whose key exists in `existingKeys` (queried from DB by caller)

**Create `src/server/features/document-processor/dedup.test.ts`**
- Test: no duplicates returns all
- Test: intra-batch duplicates removed
- Test: duplicates against existing DB records removed
- Test: different institutions are not duplicates
- Test: floating-point amounts produce consistent keys (e.g. `0.1 + 0.2` matches `0.30`)

### Step 7: Extraction service (core pipeline)

**Create `src/server/features/document-processor/extraction.service.ts`**

```ts
export async function processDocument(documentId: string): Promise<void>
```

Pipeline:
1. Load document record from DB
2. Update status → `'processing'`
3. Read PDF file from `filePath`
4. `splitPdfIfNeeded(buffer)` → `Buffer[]`
5. For each chunk: `extractTextFromPdf(chunk)` → `{ text, pages }`, then build a result object `{ text, pages, isScanned: isLikelyScannedPdf(text, pages) }`
6. Aggregate scanned status: `const isScanned = chunkResults.some(c => c.isScanned)` (true if any chunk appears scanned, since partial scans still degrade extraction quality)
7. Concatenate all chunk texts → `fullText = chunkResults.map(c => c.text).join('\n')`
8. Store `fullText` in `documents.extracted_text`
9. `getPromptForDocType(docType, fullText, institution, period)` → `Message[]`
10. `routeToProvider('pdf_extraction', messages, { maxTokens: 8192, temperature: 0 })`
11. `JSON.parse(aiResponse)` — with fallback regex `/```(?:json)?\s*([\s\S]*?)\s*```/` to extract JSON from markdown code blocks (AI models often wrap JSON in triple-backtick fences)
12. `extractionResultSchema.safeParse(parsed)` — if invalid: status → `'failed'`, store the Zod validation error message in `documents.raw_extraction` (as `{ error: safeParse.error.message }`) for debugging
13. Query existing transaction keys from DB for this institution
14. `deduplicateTransactions(result.transactions, institution, existingKeys)`
15. **Atomic write block** — wrap steps 15a–15d in `db.transaction(async (tx) => { ... })`:
    - 15a. Batch insert transactions into `transactions` table
    - 15b. Insert `accountSummary` into `account_summaries` table if present
    - 15c. Store raw AI response in `documents.raw_extraction` as `{ isScanned, aiResponse }` wrapper object
    - 15d. Update: `status → 'completed'`, `processed_at → new Date().toISOString()`
    If any step fails, the entire transaction rolls back, preventing partial data with 'failed' status.

Error handling: try-catch wraps entire pipeline. On failure: status → `'failed'`, log error.

**Create `src/server/features/document-processor/extraction.service.test.ts`**
- Mock `routeToProvider`, `extractTextFromPdf`, `splitPdfIfNeeded`
- Test: successful pipeline creates transactions in DB
- Test: AI validation failure sets status to `'failed'`
- Test: deduplication prevents duplicate inserts

### Step 8: Vision service (Claude-specific fallback)

**Create `src/server/features/document-processor/vision.service.ts`**

```ts
export async function reprocessWithVision(documentId: string): Promise<void>
```

- Reads PDF buffer from `filePath` (errors if file already cleaned up)
- Validates 10MB limit (defensive guard — multer already enforces this at upload, but the file could theoretically be replaced on disk; add a code comment noting this intent)
- **Model selection:** queries `ai_settings` table for `taskType = 'pdf_vision_extraction'` to get the configured `model` string. This lets users reconfigure the vision model via the Settings page (e.g. switch to a newer Claude model).
- Calls `@anthropic-ai/sdk` directly (bypasses provider abstraction — vision requires document content blocks which the `AIProvider` interface doesn't support), passing the model from ai_settings
- Converts PDF to base64, builds message with `type: 'document'` content blocks using Anthropic's native PDF support:
  ```json
  {
    "type": "document",
    "source": {
      "type": "base64",
      "media_type": "application/pdf",
      "data": "<base64-encoded-pdf>"
    }
  }
  ```
  Note: No PDF-to-image conversion needed. Anthropic's document API supports up to 100 pages / 32MB per document. The existing 10MB validation already covers the size constraint.
- **Pre-clear step:** Within a single `db.transaction()`, atomically: delete existing transactions and account_summaries for this document, set `documents.extracted_text = null`, set `status → 'processing'`, and set `processed_at → null`. Grouping all of these in one transaction avoids a window where data is wiped but status still reads 'completed' — a client poll in that gap would see a completed document with no transactions.
- **API key guard:** Before any SDK call, check `if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required for vision processing')` — provides a descriptive error instead of an opaque SDK auth failure.
- **Prompt construction:** Extracts the system message from `getPromptForDocType(docType, '')` via `const systemContent = messages.find(m => m.role === 'system')?.content ?? ''` — the user message from that call is discarded since the vision service builds its own user content array:
  ```ts
  [
    { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Pdf } },
    { type: 'text', text: 'Extract the financial data from this PDF document per the instructions above.' }
  ]
  ```
- Parse AI response → validate with Zod → dedup (against other documents' transactions, not the just-deleted ones)
- **Atomic write block** — wrap all post-AI writes in `db.transaction()` (mirroring extraction service's pattern):
    - Batch insert transactions
    - Insert accountSummary if present
    - Store `{ isScanned: true, aiResponse }` in `documents.raw_extraction`
    - Update `status → 'completed'`, `processed_at → now`

Error handling: try-catch wraps the entire pipeline. On failure: `status → 'failed'`, log error. This prevents a silent failure from leaving the document stuck in 'processing' (since the fire-and-forget caller won't observe the rejection).

Design choice: Claude Vision is Claude-only. Extending the provider interface for image content blocks is unnecessary complexity for Phase 1B. The vision service imports `@anthropic-ai/sdk` directly but reads the model from `ai_settings` to remain user-configurable.

**Pre-existing gap (L2):** The Claude provider in `src/server/lib/ai/providers/claude.ts` hardcodes `claude-sonnet-4-5-20250514` and ignores the `model` field from ai_settings. This means the `pdf_extraction` task type's model config is also partially non-functional. Phase 1B fixes this for the vision service only (reads model from DB directly). Fixing the Claude provider to accept a dynamic model is deferred — it's a Phase 1A gap that affects all Claude-routed tasks equally.

### Step 9: Upload cleanup service

**Create `src/server/features/document-processor/cleanup.service.ts`**

```ts
export function startCleanupService(): void
export async function runCleanup(): Promise<void>
```

- **Add `UPLOAD_RETENTION_DAYS=30` to `.env.example`** (Rule 1: all env vars must appear in .env.example)
- `runCleanup()`: reads retention days via `parseInt(process.env.UPLOAD_RETENTION_DAYS ?? '30', 10)`. Queries documents where `filePath IS NOT NULL` and `createdAt < (now - retentionDays)`. For each: attempts `fs.unlink()` — catches `ENOENT` specifically and proceeds (file already gone), logs and skips on any other error. Sets `filePath = null` in DB regardless of whether unlink succeeded or threw ENOENT.
- `startCleanupService()`: runs cleanup immediately on boot, then sets `setInterval(runCleanup, 86_400_000)` (24 hours in ms) for daily runs.

**Create `src/server/features/document-processor/cleanup.service.test.ts`**
- Test: files older than retention are deleted
- Test: DB records updated to `filePath = null`
- Test: files within retention are untouched

### Step 10: Routes

**Create `src/server/features/document-processor/routes.ts`**

| Method | Path | Middleware | Purpose |
|--------|------|-----------|---------|
| `POST` | `/api/documents/upload` | `upload.single('file')` | Upload PDF + metadata |
| `GET` | `/api/documents` | — | List documents (optional `?status=` `?docType=` filters) |
| `GET` | `/api/documents/:id` | — | Get single document |
| `GET` | `/api/documents/:id/transactions` | — | Get transactions for document |
| `POST` | `/api/documents/:id/reprocess-vision` | `aiRateLimiter` | Trigger Claude Vision re-processing (202 Accepted) |
| `DELETE` | `/api/documents/:id` | — | Delete document + file + transactions |
| `GET` | `/api/ai-settings` | — | Get all AI settings |
| `PUT` | `/api/ai-settings/:taskType` | `validateBody(aiSettingsUpdateSchema)` | Update AI setting |

Key behaviors:
- **`isScanned` derivation (GET endpoints):** Both `GET /api/documents` and `GET /api/documents/:id` deserialize `documents.raw_extraction` (JSON string) and surface `isScanned` from the `{ isScanned, aiResponse }` wrapper. If `raw_extraction` is null (not yet processed) or the JSON parse fails (extraction errored before storing), `isScanned` is `undefined` in the response.
- Upload endpoint middleware chain: `[upload.single('file'), validateBody(uploadDocumentSchema)]` — multer runs first to populate `req.body` from multipart form, then `validateBody` (from `src/server/shared/middleware/validate.ts`) runs against the populated body
- Upload endpoint: validates `docType` from form data, creates DB record with `status: 'pending'`, fires `void processDocument(id)` (explicit `void` to signal intentional fire-and-forget and suppress unhandled promise warnings — the extraction service wraps its entire pipeline in try-catch internally), returns 201
- Vision reprocess endpoint: fires `void reprocessWithVision(id)` (fire-and-forget, same pattern as upload), returns 202 Accepted. Rate limiter (`aiRateLimiter`) applied (imports from shared middleware)
- Delete: first attempts `fs.unlink()` for the file (treats `ENOENT` as success — file already gone), then uses `db.transaction(async (tx) => { ... })` (Drizzle's transaction API) to atomically delete transactions + account_summaries + document record. This order is safer: if `fs.unlink()` fails with a real error (e.g. permissions), the DB record survives and the cleanup service can still find the file. If `fs.unlink()` succeeds but the DB transaction fails, the orphaned DB record is harmless (filePath still set, cleanup will no-op with ENOENT).
- Multer error handling: catch `MulterError` instances and return 400 with user-friendly message

**Create `src/server/features/document-processor/routes.test.ts`**
- Upload: rejects non-PDF (400), rejects >10MB (400), rejects missing/invalid docType (400), accepts valid PDF (201)
- CRUD: GET list, GET by id, GET 404, DELETE removes record + file
- AI settings: GET returns all, PUT updates, PUT rejects invalid provider

### Step 11: Feature barrel + server integration (cross-boundary)

**Create `src/server/features/document-processor/index.ts`**
- Exports `documentRouter`, `startCleanupService`

**Modify `src/server/app.ts`**
- Import and mount: `app.use('/api', documentRouter)` before error handler

**Modify `src/server/index.ts`**
- Import and call `startCleanupService()` after `app.listen()`

**Modify `src/server/lib/db/seed.ts`**
- Add `{ taskType: 'pdf_vision_extraction', provider: 'claude', model: 'claude-sonnet-4-5-20250514' }` to default AI settings

### Step 12: Client API & hooks

**Create `src/client/features/document-upload/api.ts`**
- `uploadDocument(file, docType, institution?, period?)` — POST FormData to `/api/documents/upload`
- `fetchDocuments(filters?)` — GET `/api/documents`
- `fetchDocument(id)` — GET `/api/documents/:id`
- `fetchDocumentTransactions(id)` — GET `/api/documents/:id/transactions`
- `reprocessWithVision(id)` — POST `/api/documents/:id/reprocess-vision`
- `deleteDocument(id)` — DELETE `/api/documents/:id`
- `fetchAiSettings()` — GET `/api/ai-settings`
- `updateAiSetting(taskType, data)` — PUT `/api/ai-settings/:taskType`

Note: Uses relative `/api/` paths (Vite proxy handles routing to backend in dev).

**Create `src/client/features/document-upload/hooks.ts`**
- `useDocuments(filters?)` — React Query with `refetchInterval` as a function: `(query) => query.state.data?.some(d => ['pending','processing'].includes(d.processingStatus)) ? 3000 : false` (polls only while any doc is in-flight, stops when all are settled). Note: `fetchDocuments()` returns `DocumentResponse[]` (plain array), so access `data` directly, not `data.documents`.
- `useDocument(id)` — `refetchInterval: (query) => ['pending', 'processing'].includes(query.state.data?.processingStatus) ? 3000 : false` (polls every 3s while pending/processing, stops on completed/failed)
- `useUploadDocument()` — mutation, invalidates `['documents']` on success
- `useDeleteDocument()` — mutation with invalidation
- `useReprocessVision()` — mutation with invalidation
- `useDocumentTransactions(id)` — query, enabled only when doc is completed
- `useAiSettings()` — query
- `useUpdateAiSetting()` — mutation with invalidation

### Step 13: Client components

**Create `src/client/features/document-upload/components/upload-dropzone.tsx`**
- `react-dropzone` with `accept: { 'application/pdf': ['.pdf'] }`, `maxSize: 10MB`, `multiple: false`
- On file drop: shows form with `docType` (select), `institution` (text), `period` (text)
- Submit calls `useUploadDocument().mutate()`
- Validation error display (wrong type, too large)

**Create `src/client/features/document-upload/components/document-list.tsx`**
- Table: filename, type, institution, status badge, date, actions
- Status badges: pending (gray), processing (yellow + spinner), completed (green), failed (red)
- Actions: Delete (with confirm), Re-process with Vision (shown only when `document.hasFile === true` AND status is failed or completed — mirrors the detail component's gate to prevent showing the button after cleanup removes the file)
- Filter controls for status and docType

**Create `src/client/features/document-upload/components/document-detail.tsx`**
- Document metadata display
- If completed: transaction table
- If failed: error info + "Re-process with Vision" button (only shown when `document.hasFile === true`)
- If pending or processing: spinner with status text

**Create `src/client/features/document-upload/components/ai-settings-panel.tsx`**
- Card per task type showing current provider + model
- Edit: provider dropdown (claude/ollama/openai_compat), model text input, fallback fields
- Save button calls `useUpdateAiSetting()`

**Create `src/client/features/document-upload/document-upload-page.tsx`**
- Composes `UploadDropzone` + `DocumentList`

**Create `src/client/features/document-upload/index.ts`**
- Exports `DocumentUploadPage`, `DocumentDetail`, `AiSettingsPanel`

### Step 14: Client page wiring (cross-boundary)

**Modify `src/client/app/pages/documents.tsx`**
- Import and render `DocumentUploadPage`

**Modify `src/client/app/pages/settings.tsx`**
- Import and render `AiSettingsPanel`

**Modify `src/client/app/app.tsx`**
- Add `/documents/:id` as a sibling route of `/documents` under the `<Layout>` parent (not nested inside the `/documents` route). Both render independently within the Layout outlet.

### Step 15: ARCHITECTURE.md update

Update:
- Component Map: add document-processor service, upload middleware, cleanup service, client features
- API Endpoints: add all 8 new endpoints
- Feature Log: add Phase 1B entry

---

## Data Flow

```
User drops PDF → POST /api/documents/upload (201 immediate)
                         ↓ async
                 processDocument(id)
                   ├─ splitPdfIfNeeded(buffer)
                   ├─ extractTextFromPdf(chunk) per chunk
                   ├─ concatenate text → documents.extracted_text
                   ├─ getPromptForDocType() → AI messages
                   ├─ routeToProvider('pdf_extraction', ...) → JSON
                   ├─ extractionResultSchema.safeParse()
                   ├─ deduplicateTransactions()
                   ├─ batch insert transactions
                   └─ status → 'completed', processed_at → now

Client polls GET /api/documents/:id every 3s until complete/failed
```

---

## Migrations

No new DB tables or schema changes are required. All 7 tables from Phase 1A (including `documents`, `transactions`, `account_summaries`, `ai_settings`) already have the fields needed for Phase 1B. No migration file will be generated.

## Key Design Decisions

1. **Fire-and-forget processing** — upload returns 201 immediately, processing is async. Client polls for status. Avoids HTTP timeouts.
2. **Vision bypasses provider abstraction** — `AIProvider.chat()` takes string `Message.content`. Claude's native PDF support needs `type: 'document'` content blocks. Vision service calls `@anthropic-ai/sdk` directly but reads the model from `ai_settings` to remain user-configurable.
3. **Rate limiter on vision route only** — upload triggers processing once per upload, not a concern. Vision re-processing is the repeated AI call worth rate-limiting.
4. **Polling over WebSockets** — single-user local app, React Query `refetchInterval: 3000` is simple and adequate.
5. **Dedup by composite key** — `date|description|amount.toFixed(2)|institution` prevents duplicate transactions across re-uploads. `.toFixed(2)` ensures deterministic float stringification.

## Known Limitations (Phase 1B scope)

1. **Large document input tokens** — the pipeline concatenates all chunk texts into `fullText` and sends it to the AI in a single call with `maxTokens: 8192` (output only). A 50-page bank statement could produce 50k+ input tokens. This works within Claude's context window but may be expensive. Chunked extraction (calling AI per-chunk and merging results) is deferred to a future phase if needed.
2. **Claude provider ignores model field** — `providers/claude.ts` hardcodes `claude-sonnet-4-5-20250514`. The `ai_settings.model` value for `pdf_extraction` is not used by the router path. The vision service works around this by reading the model directly from ai_settings. Fixing the Claude provider to accept dynamic models is a Phase 1A gap deferred to a future fix.

---

## Verification

1. **Tests:** `npm test` — all new tests pass (upload validation, extraction pipeline with mocked AI, dedup logic, splitter, cleanup)
2. **Typecheck:** `npm run typecheck` — no errors
3. **Lint:** `npm run lint` — clean
4. **Manual E2E:**
   - Start dev server (`npm run dev`)
   - Navigate to Documents page
   - Upload a small PDF → verify 201 response, document appears in list with "pending" status
   - Watch status transition to "processing" → "completed" (or "failed" if no AI key configured)
   - Check transactions appear for completed documents
   - Delete a document → verify removed from list and file deleted
   - Navigate to Settings → update AI provider → verify settings persist
5. **Secret scan:** `grep -rn "$SECRET_SCAN_PATTERNS" ...` — clean
