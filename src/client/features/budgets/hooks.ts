import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBudgets, fetchBudgetSummary, createBudget, updateBudget, deleteBudget } from './api.js';

export function useBudgets() {
  return useQuery({
    queryKey: ['budgets'],
    queryFn: fetchBudgets,
  });
}

export function useBudgetSummary() {
  return useQuery({
    queryKey: ['budgets', 'summary'],
    queryFn: fetchBudgetSummary,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBudget,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; amount?: number; period?: string }) => updateBudget(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteBudget,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}
