import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateAnalysis, fetchSnapshots, fetchSnapshot, deleteSnapshot } from './api.js';
import type { AnalysisSnapshot } from './api.js';

export function useSnapshots() {
  return useQuery({
    queryKey: ['analysis-snapshots'],
    queryFn: fetchSnapshots,
  });
}

export function useSnapshot(id: string | null) {
  return useQuery({
    queryKey: ['analysis-snapshot', id],
    queryFn: () => fetchSnapshot(id!),
    enabled: !!id,
  });
}

export function useGenerateAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }) =>
      generateAnalysis(dateFrom, dateTo),
    onSuccess: (data: AnalysisSnapshot) => {
      void queryClient.invalidateQueries({ queryKey: ['analysis-snapshots'] });
      queryClient.setQueryData(['analysis-snapshot', data.id], data);
    },
  });
}

export function useDeleteSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSnapshot(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['analysis-snapshots'] });
    },
  });
}
