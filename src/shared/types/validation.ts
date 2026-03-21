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

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.string().uuid().nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z.string().min(1).max(50),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createCategoryRuleSchema = z.object({
  categoryId: z.string().uuid(),
  pattern: z.string().min(1).max(500),
  field: z.enum(['description', 'merchant']).default('description'),
});

export const updateTransactionSchema = z.object({
  categoryId: z.string().uuid().nullable(),
});

export const bulkCategoriseSchema = z.object({
  transactionIds: z.array(z.string().uuid()).min(1).max(500),
  categoryId: z.string().uuid().nullable(),
});

export const generateAnalysisSchema = z.object({
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
});

export const budgetPeriodSchema = z.enum(['monthly', 'weekly', 'yearly']);

export const createBudgetSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.number().positive(),
  period: budgetPeriodSchema.default('monthly'),
});

export const updateBudgetSchema = z.object({
  amount: z.number().positive().optional(),
  period: budgetPeriodSchema.optional(),
});

export const accountTypeSchema = z.enum(['checking', 'savings', 'credit_card', 'investment']);

export const createAccountSchema = z.object({
  name: z.string().min(1).max(200),
  type: accountTypeSchema,
  institution: z.string().max(200).nullable().optional(),
  currency: z.string().min(3).max(3).default('AUD'),
  currentBalance: z.number().default(0),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: accountTypeSchema.optional(),
  institution: z.string().max(200).nullable().optional(),
  currency: z.string().min(3).max(3).optional(),
  currentBalance: z.number().optional(),
  isActive: z.boolean().optional(),
});

export const assignAccountSchema = z.object({
  accountId: z.string().uuid().nullable(),
});

export const bulkAssignAccountSchema = z.object({
  transactionIds: z.array(z.string().uuid()).min(1).max(500),
  accountId: z.string().uuid().nullable(),
});

export const transactionFiltersSchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.enum(['debit', 'credit']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  amountMin: z.coerce.number().optional(),
  amountMax: z.coerce.number().optional(),
  documentId: z.string().uuid().optional(),
  isRecurring: z.coerce.boolean().optional(),
  accountId: z.string().uuid().optional(),
  sortBy: z.enum(['date', 'amount', 'description']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
