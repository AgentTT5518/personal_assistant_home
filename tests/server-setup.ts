import { sqlite } from '../src/server/lib/db/index.js';

// Create all tables if they don't exist — ensures CI works with a fresh DB
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    doc_type TEXT NOT NULL,
    institution TEXT,
    period TEXT,
    processing_status TEXT NOT NULL DEFAULT 'pending',
    processed_at TEXT,
    raw_extraction TEXT,
    extracted_text TEXT,
    file_path TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    parent_id TEXT,
    color TEXT,
    icon TEXT,
    is_default INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id),
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    category_id TEXT REFERENCES categories(id),
    merchant TEXT,
    is_recurring INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS category_rules (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES categories(id),
    pattern TEXT NOT NULL,
    field TEXT NOT NULL DEFAULT 'description',
    is_ai_generated INTEGER DEFAULT 0,
    confidence REAL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS account_summaries (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id),
    opening_balance REAL,
    closing_balance REAL,
    total_credits REAL,
    total_debits REAL,
    currency TEXT DEFAULT 'AUD',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS analysis_snapshots (
    id TEXT PRIMARY KEY,
    snapshot_type TEXT NOT NULL,
    data TEXT NOT NULL,
    generated_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ai_settings (
    id TEXT PRIMARY KEY,
    task_type TEXT NOT NULL UNIQUE,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    fallback_provider TEXT,
    fallback_model TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);
