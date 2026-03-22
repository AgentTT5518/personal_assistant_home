import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchGoals,
  fetchGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  contributeToGoal,
  syncGoalBalance,
} from './api.js';

export function useGoals(params?: { status?: string }) {
  return useQuery({
    queryKey: ['goals', params],
    queryFn: () => fetchGoals(params),
  });
}

export function useGoal(id: string) {
  return useQuery({
    queryKey: ['goals', id],
    queryFn: () => fetchGoal(id),
    enabled: !!id,
  });
}

export function useActiveGoals() {
  return useQuery({
    queryKey: ['goals', { status: 'active' }],
    queryFn: () => fetchGoals({ status: 'active' }),
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createGoal,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) => updateGoal(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useContributeToGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; amount: number; note?: string | null; date?: string }) =>
      contributeToGoal(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useSyncGoalBalance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncGoalBalance,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}
