import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TransactionFilters } from '../../../shared/types/index.js';
import {
  fetchTransactions,
  fetchTransactionStats,
  updateTransaction,
  bulkCategorise,
  triggerAutoCategorise,
  triggerAiCategorise,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchCategoryRules,
  createCategoryRule,
  deleteCategoryRule,
} from './api.js';

// --- Transaction hooks ---

export function useTransactions(filters: TransactionFilters, options?: { refetchInterval?: number | false }) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => fetchTransactions(filters),
    refetchInterval: options?.refetchInterval,
  });
}

export function useTransactionStats(dateFrom?: string, dateTo?: string, options?: { refetchInterval?: number | false }) {
  return useQuery({
    queryKey: ['transaction-stats', dateFrom, dateTo],
    queryFn: () => fetchTransactionStats(dateFrom, dateTo),
    refetchInterval: options?.refetchInterval,
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, categoryId }: { id: string; categoryId: string | null }) =>
      updateTransaction(id, { categoryId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['transaction-stats'] });
    },
  });
}

export function useBulkCategorise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transactionIds, categoryId }: { transactionIds: string[]; categoryId: string | null }) =>
      bulkCategorise(transactionIds, categoryId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['transaction-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useAutoCategorise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => triggerAutoCategorise(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['transaction-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useAiCategorise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transactionIds: string[]) => triggerAiCategorise(transactionIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['transaction-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

// --- Category hooks ---

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; parentId?: string | null; color: string; icon: string }) =>
      createCategory(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; parentId?: string | null; color?: string; icon?: string } }) =>
      updateCategory(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['transaction-stats'] });
    },
  });
}

export function useCategoryRules(categoryId: string | null) {
  return useQuery({
    queryKey: ['category-rules', categoryId],
    queryFn: () => fetchCategoryRules(categoryId!),
    enabled: !!categoryId,
  });
}

export function useCreateCategoryRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { categoryId: string; pattern: string; field?: string }) =>
      createCategoryRule(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['category-rules'] });
    },
  });
}

export function useDeleteCategoryRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCategoryRule(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['category-rules'] });
    },
  });
}
