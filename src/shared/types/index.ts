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
