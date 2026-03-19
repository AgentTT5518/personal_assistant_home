import { z } from 'zod';

export const documentTypeSchema = z.enum([
  'bank_statement',
  'credit_card',
  'payslip',
  'tax_return',
  'investment_report',
]);

export const processingStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);

export const aiProviderTypeSchema = z.enum(['claude', 'ollama', 'openai_compat']);

export const taskTypeSchema = z.enum([
  'pdf_extraction',
  'pdf_vision_extraction',
  'categorisation',
  'analysis_insights',
  'insurance_analysis',
  'health_analysis',
]);

export const uploadDocumentSchema = z.object({
  docType: documentTypeSchema,
  institution: z.string().min(1).max(200).optional(),
  period: z.string().max(100).optional(),
});

export const extractedTransactionSchema = z.object({
  date: z.string().date(),
  description: z.string(),
  amount: z.number(),
  type: z.enum(['debit', 'credit']),
  merchant: z.string().optional(),
  isRecurring: z.boolean().optional(),
});

export const extractionResultSchema = z.object({
  transactions: z.array(extractedTransactionSchema),
  accountSummary: z
    .object({
      openingBalance: z.number().optional(),
      closingBalance: z.number().optional(),
      totalCredits: z.number().optional(),
      totalDebits: z.number().optional(),
      currency: z.string().optional(),
    })
    .optional(),
  metadata: z
    .object({
      institution: z.string().optional(),
      period: z.string().optional(),
      accountNumber: z.string().optional(),
    })
    .optional(),
});

export const aiSettingsUpdateSchema = z.object({
  provider: aiProviderTypeSchema,
  model: z.string().min(1).max(100),
  fallbackProvider: aiProviderTypeSchema.nullable().optional(),
  fallbackModel: z.string().max(100).nullable().optional(),
});
