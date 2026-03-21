import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAccounts,
  fetchAccount,
  fetchNetWorth,
  createAccount,
  updateAccount,
  deleteAccount,
  recalculateBalance,
} from './api.js';
import type { AccountType } from '../../../shared/types/index.js';

export function useAccounts(isActive?: boolean) {
  return useQuery({
    queryKey: ['accounts', { isActive }],
    queryFn: () => fetchAccounts(isActive),
  });
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: ['accounts', id],
    queryFn: () => fetchAccount(id),
    enabled: !!id,
  });
}

export function useNetWorth() {
  return useQuery({
    queryKey: ['accounts', 'net-worth'],
    queryFn: fetchNetWorth,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      type?: AccountType;
      institution?: string | null;
      currency?: string;
      currentBalance?: number;
      isActive?: boolean;
    }) => updateAccount(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hard }: { id: string; hard?: boolean }) => deleteAccount(id, hard),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useRecalculateBalance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recalculateBalance,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
