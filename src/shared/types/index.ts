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
  createdAt: string;
}

export interface AiSettingResponse {
  id: string;
  taskType: TaskType;
  provider: AIProviderType;
  model: string;
  fallbackProvider: AIProviderType | null;
  fallbackModel: string | null;
}
