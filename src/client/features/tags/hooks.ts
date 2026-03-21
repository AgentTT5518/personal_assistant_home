import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchTags,
  createTag,
  updateTag,
  deleteTag,
  addTagsToTransaction,
  removeTagFromTransaction,
  bulkTag,
  fetchSplits,
  createSplits,
  deleteSplits,
} from './api.js';

// --- Tags ---

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: fetchTags,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; color?: string } }) =>
      updateTag(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tags'] });
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

// --- Transaction Tags ---

export function useAddTagsToTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transactionId, tagIds }: { transactionId: string; tagIds: string[] }) =>
      addTagsToTransaction(transactionId, tagIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useRemoveTagFromTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transactionId, tagId }: { transactionId: string; tagId: string }) =>
      removeTagFromTransaction(transactionId, tagId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useBulkTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transactionIds, tagId }: { transactionIds: string[]; tagId: string }) =>
      bulkTag(transactionIds, tagId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

// --- Splits ---

export function useSplits(transactionId: string, enabled = true) {
  return useQuery({
    queryKey: ['splits', transactionId],
    queryFn: () => fetchSplits(transactionId),
    enabled,
  });
}

export function useCreateSplits() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      transactionId,
      splits,
    }: {
      transactionId: string;
      splits: Array<{ categoryId: string | null; amount: number; description: string }>;
    }) => createSplits(transactionId, splits),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['splits'] });
      void queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useDeleteSplits() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSplits,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['splits'] });
      void queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}
