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

export const aiSettingsUpdateSchema = z.object({
  provider: aiProviderTypeSchema,
  model: z.string().min(1).max(100),
  fallbackProvider: aiProviderTypeSchema.nullable().optional(),
  fallbackModel: z.string().max(100).nullable().optional(),
});
