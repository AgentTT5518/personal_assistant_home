import { sqliteTable, text, real, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  filename: text('filename').notNull(),
  docType: text('doc_type').notNull(),
  institution: text('institution'),
  period: text('period'),
  processingStatus: text('processing_status').notNull().default('pending'),
  processedAt: text('processed_at'),
  rawExtraction: text('raw_extraction'),
  extractedText: text('extracted_text'),
  filePath: text('file_path'),
  accountId: text('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  documentId: text('document_id').references(() => documents.id),
  importSessionId: text('import_session_id').references(() => importSessions.id, { onDelete: 'set null' }),
  date: text('date').notNull(),
  description: text('description').notNull(),
  amount: real('amount').notNull(),
  type: text('type').notNull(),
  categoryId: text('category_id').references(() => categories.id),
  merchant: text('merchant'),
  isRecurring: integer('is_recurring', { mode: 'boolean' }).default(false),
  isSplit: integer('is_split', { mode: 'boolean' }).default(false),
  previousCategoryId: text('previous_category_id'),
  accountId: text('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  parentId: text('parent_id'),
  color: text('color'),
  icon: text('icon'),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const categoryRules = sqliteTable('category_rules', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').notNull().references(() => categories.id),
  pattern: text('pattern').notNull(),
  field: text('field').notNull().default('description'),
  isAiGenerated: integer('is_ai_generated', { mode: 'boolean' }).default(false),
  confidence: real('confidence'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const accountSummaries = sqliteTable('account_summaries', {
  id: text('id').primaryKey(),
  documentId: text('document_id').notNull().references(() => documents.id),
  openingBalance: real('opening_balance'),
  closingBalance: real('closing_balance'),
  totalCredits: real('total_credits'),
  totalDebits: real('total_debits'),
  currency: text('currency').default('AUD'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const analysisSnapshots = sqliteTable('analysis_snapshots', {
  id: text('id').primaryKey(),
  snapshotType: text('snapshot_type').notNull(),
  data: text('data').notNull(),
  generatedAt: text('generated_at').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const budgets = sqliteTable('budgets', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }).unique(),
  amount: real('amount').notNull(),
  period: text('period').notNull().default('monthly'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  institution: text('institution'),
  currency: text('currency').default('AUD'),
  currentBalance: real('current_balance').default(0),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color').default('#6b7280'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const transactionTags = sqliteTable('transaction_tags', {
  transactionId: text('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => [
  uniqueIndex('transaction_tags_unique').on(table.transactionId, table.tagId),
]);

export const splitTransactions = sqliteTable('split_transactions', {
  id: text('id').primaryKey(),
  parentTransactionId: text('parent_transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  amount: real('amount').notNull(),
  description: text('description').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const importSessions = sqliteTable('import_sessions', {
  id: text('id').primaryKey(),
  filename: text('filename').notNull(),
  fileType: text('file_type').notNull(),
  accountId: text('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  columnMapping: text('column_mapping'),
  totalRows: integer('total_rows').notNull().default(0),
  importedRows: integer('imported_rows').notNull().default(0),
  duplicateRows: integer('duplicate_rows').notNull().default(0),
  status: text('status').notNull().default('pending'),
  errorMessage: text('error_message'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const aiSettings = sqliteTable('ai_settings', {
  id: text('id').primaryKey(),
  taskType: text('task_type').notNull().unique(),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  fallbackProvider: text('fallback_provider'),
  fallbackModel: text('fallback_model'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
