# Requirements: Data Import (Phase 2E)

## Overview
Users can import transactions from CSV, OFX/QFX, and QIF files exported from banks and financial apps. Supplements the PDF upload pipeline with structured file format support.

## Functional Requirements

### File Upload
- Accept CSV, OFX, QFX, and QIF files up to 10MB
- Optional account association on upload
- Memory-based file storage (parsed in-memory, not saved to disk)

### CSV Parsing
- Auto-detect delimiters via papaparse
- Auto-map common column names (Date, Description, Amount, etc.)
- Manual column mapping when auto-mapping fails
- Support single amount column (negative = debit) or separate debit/credit columns
- Handle multiple date formats (ISO, DD/MM/YYYY, MM/DD/YYYY, compact)

### OFX/QFX Parsing
- Extract STMTTRN blocks from SGML/XML format
- Map DTPOSTED, TRNAMT, NAME, MEMO, TRNTYPE fields
- No column mapping needed (structured format)

### QIF Parsing
- Line-based parsing: D=date, T=amount, P=payee, M=memo
- Handle MM/DD/YYYY and apostrophe date formats
- No column mapping needed (structured format)

### Duplicate Detection
- Reuse buildTransactionKey() from document-processor
- Flag duplicates in preview (within batch and against existing DB)
- Per-row toggle to include/exclude duplicates

### Import Wizard (4 steps)
1. Upload: file picker + optional account selector
2. Column Mapping: CSV-only, map headers to fields
3. Preview: table with dedup flags, row selection
4. Confirm: summary + batch insert

### Import History
- List past import sessions with status and counts
- Undo: delete all transactions from a session
- Delete: remove session and its transactions

## Non-Functional Requirements
- Transactions created with null documentId (no source document)
- importSessionId FK with ON DELETE SET NULL
- Session cache in-memory (ephemeral, lost on server restart)
