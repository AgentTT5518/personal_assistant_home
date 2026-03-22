export type DocumentType =
  | 'bank_statement'
  | 'credit_card'
  | 'payslip'
  | 'tax_return'
  | 'investment_report';

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type TransactionType = 'debit' | 'credit';
export type AIProviderType = 'claude' | 'ollama' | 'openai_compat';

export type TaskType =
  | 'pdf_extraction'
  | 'pdf_vision_extraction'
  | 'categorisation'
  | 'analysis_insights'
  | 'insurance_analysis'
  | 'health_analysis';

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface ExtractedTransaction {
  date: string;
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
    accountNumber?: string;
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
  isScanned?: boolean;
  hasFile: boolean;
}

export type ImportFileType = 'csv' | 'ofx' | 'qif';
export type ImportStatus = 'pending' | 'mapped' | 'previewed' | 'completed' | 'failed';

export interface ImportSessionResponse {
  id: string;
  filename: string;
  fileType: ImportFileType;
  accountId: string | null;
  accountName: string | null;
  totalRows: number;
  importedRows: number;
  duplicateRows: number;
  status: ImportStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ColumnMapping {
  date: string;
  description: string;
  amount: string;
  type?: string;
  debitAmount?: string;
  creditAmount?: string;
  merchant?: string;
}

export interface ImportPreviewRow {
  rowIndex: number;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  merchant: string | null;
  isDuplicate: boolean;
  duplicateKey: string;
  selected: boolean;
}

export interface ImportUploadResponse {
  session: ImportSessionResponse;
  headers?: string[];
  preview: ImportPreviewRow[];
  needsMapping: boolean;
}

export interface TransactionResponse {
  id: string;
  documentId: string | null;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  merchant: string | null;
  isRecurring: boolean;
  isSplit: boolean;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  documentFilename: string | null;
  accountId: string | null;
  accountName: string | null;
  importSessionId: string | null;
  tags: TagInfo[];
  createdAt: string;
}

export interface TagInfo {
  id: string;
  name: string;
  color: string;
}

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
  search?: string;
  categoryId?: string;
  type?: 'debit' | 'credit';
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  documentId?: string;
  isRecurring?: boolean;
  accountId?: string;
  tagIds?: string[];
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

export interface TransactionStats {
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  transactionCount: number;
  uncategorisedCount: number;
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    total: number;
    count: number;
  }>;
  byMonth: Array<{ month: string; income: number; expenses: number }>;
}

export interface AiSettingResponse {
  id: string;
  taskType: TaskType;
  provider: AIProviderType;
  model: string;
  fallbackProvider: AIProviderType | null;
  fallbackModel: string | null;
}

export interface AnalysisSection {
  title: string;
  type: 'overview' | 'categories' | 'trends' | 'anomalies' | 'recommendations';
  content: string;
  highlights?: string[];
  data?: Record<string, unknown>;
}

export interface AnalysisInsights {
  period: { from: string; to: string };
  currency: string;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netAmount: number;
    transactionCount: number;
  };
  sections: AnalysisSection[];
}

export interface SnapshotMeta {
  id: string;
  snapshotType: string;
  period: { from: string; to: string };
  generatedAt: string;
}

export interface RecurringGroup {
  merchant: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  averageAmount: number;
  frequency: string;
  lastDate: string;
  nextExpectedDate: string;
  transactionCount: number;
}

export type AccountType = 'checking' | 'savings' | 'credit_card' | 'investment';

export interface AccountResponse {
  id: string;
  name: string;
  type: AccountType;
  institution: string | null;
  currency: string;
  currentBalance: number;
  isActive: boolean;
  transactionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface NetWorthResponse {
  netWorth: number;
  accounts: Array<{
    id: string;
    name: string;
    type: AccountType;
    balance: number;
    effectiveBalance: number;
  }>;
}

export interface TagResponse {
  id: string;
  name: string;
  color: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SplitTransactionResponse {
  id: string;
  parentTransactionId: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  amount: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type BillFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface BillResponse {
  id: string;
  name: string;
  accountId: string | null;
  accountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  expectedAmount: number;
  frequency: BillFrequency;
  nextDueDate: string;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillCalendarEntry {
  date: string;
  bills: BillResponse[];
}

export type GoalStatus = 'active' | 'completed' | 'cancelled';

export interface GoalResponse {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  accountId: string | null;
  accountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  status: GoalStatus;
  contributions?: GoalContributionResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface GoalContributionResponse {
  id: string;
  goalId: string;
  amount: number;
  note: string | null;
  date: string;
  createdAt: string;
}

export type BudgetPeriod = 'monthly' | 'weekly' | 'yearly';

export interface BudgetResponse {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  amount: number;
  period: BudgetPeriod;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetSummaryResponse {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  budgetAmount: number;
  period: BudgetPeriod;
  spent: number;
  remaining: number;
  percentUsed: number;
}
