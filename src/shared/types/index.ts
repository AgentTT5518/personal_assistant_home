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

export interface TransactionResponse {
  id: string;
  documentId: string;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  merchant: string | null;
  isRecurring: boolean;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  documentFilename: string | null;
  createdAt: string;
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
