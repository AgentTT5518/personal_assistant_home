import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  uploadImportFile,
  saveColumnMapping,
  confirmImport,
  undoImport,
  fetchImportSessions,
  deleteImportSession,
} from './api.js';
import type { ColumnMapping } from '@shared/types/index.js';

export function useImportSessions() {
  return useQuery({
    queryKey: ['import-sessions'],
    queryFn: fetchImportSessions,
  });
}

export function useUploadImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, accountId }: { file: File; accountId?: string }) =>
      uploadImportFile(file, accountId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['import-sessions'] });
    },
  });
}

export function useSaveColumnMapping() {
  return useMutation({
    mutationFn: ({ sessionId, mapping }: { sessionId: string; mapping: ColumnMapping }) =>
      saveColumnMapping(sessionId, mapping),
  });
}

export function useConfirmImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, selectedRows }: { sessionId: string; selectedRows: number[] }) =>
      confirmImport(sessionId, selectedRows),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['import-sessions'] });
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useUndoImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: undoImport,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['import-sessions'] });
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useDeleteImportSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteImportSession,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['import-sessions'] });
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
