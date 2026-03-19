import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DocumentType, ProcessingStatus } from '../../../shared/types/index.js';
import {
  fetchDocuments,
  fetchDocument,
  fetchDocumentTransactions,
  uploadDocument,
  deleteDocument,
  reprocessWithVision,
  fetchAiSettings,
  updateAiSetting,
} from './api.js';

export function useDocuments(filters?: { status?: ProcessingStatus; docType?: DocumentType }) {
  return useQuery({
    queryKey: ['documents', filters],
    queryFn: () => fetchDocuments(filters),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const hasInFlight = data.some((d) =>
        ['pending', 'processing'].includes(d.processingStatus),
      );
      return hasInFlight ? 3000 : false;
    },
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ['documents', id],
    queryFn: () => fetchDocument(id),
    refetchInterval: (query) => {
      const status = query.state.data?.processingStatus;
      return status && ['pending', 'processing'].includes(status) ? 3000 : false;
    },
  });
}

export function useDocumentTransactions(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['documents', id, 'transactions'],
    queryFn: () => fetchDocumentTransactions(id),
    enabled,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      docType,
      institution,
      period,
    }: {
      file: File;
      docType: DocumentType;
      institution?: string;
      period?: string;
    }) => uploadDocument(file, docType, institution, period),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useReprocessVision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reprocessWithVision(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useAiSettings() {
  return useQuery({
    queryKey: ['ai-settings'],
    queryFn: fetchAiSettings,
  });
}

export function useUpdateAiSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskType,
      data,
    }: {
      taskType: string;
      data: { provider: string; model: string; fallbackProvider?: string | null; fallbackModel?: string | null };
    }) => updateAiSetting(taskType, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
    },
  });
}
