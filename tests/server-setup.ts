import { sqlite } from '../src/server/lib/db/index.js';

// Add new columns to existing tables if they don't exist (safe migration for dev DBs)
try {
  sqlite.exec('ALTER TABLE transactions ADD COLUMN is_split INTEGER DEFAULT 0');
} catch { /* column already exists */ }
try {
  sqlite.exec('ALTER TABLE transactions ADD COLUMN previous_category_id TEXT');
} catch { /* column already exists */ }
try {
  sqlite.exec('ALTER TABLE transactions ADD COLUMN import_session_id TEXT');
} catch { /* column already exists */ }

// Create all tables if they don't exist — ensures CI works with a fresh DB
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    institution TEXT,
    currency TEXT DEFAULT 'AUD',
    current_balance REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

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
    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
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

  CREATE TABLE IF NOT EXISTS import_sessions (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    column_mapping TEXT,
    total_rows INTEGER NOT NULL DEFAULT 0,
    imported_rows INTEGER NOT NULL DEFAULT 0,
    duplicate_rows INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    document_id TEXT REFERENCES documents(id),
    import_session_id TEXT REFERENCES import_sessions(id) ON DELETE SET NULL,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    category_id TEXT REFERENCES categories(id),
    merchant TEXT,
    is_recurring INTEGER DEFAULT 0,
    is_split INTEGER DEFAULT 0,
    previous_category_id TEXT,
    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
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

  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    period TEXT NOT NULL DEFAULT 'monthly',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS budgets_category_id_unique ON budgets(category_id);

  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#6b7280',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transaction_tags (
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE
  );

  CREATE UNIQUE INDEX IF NOT EXISTS transaction_tags_unique ON transaction_tags(transaction_id, tag_id);

  CREATE TABLE IF NOT EXISTS split_transactions (
    id TEXT PRIMARY KEY,
    parent_transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL DEFAULT 0,
    deadline TEXT,
    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS goal_contributions (
    id TEXT PRIMARY KEY,
    goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    note TEXT,
    date TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    expected_amount REAL NOT NULL,
    frequency TEXT NOT NULL,
    next_due_date TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);
