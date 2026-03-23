import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchReports, fetchReport, generateReport, deleteReport } from './api.js';
import type { ReportType } from '../../../shared/types/index.js';

export function useReports() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: fetchReports,
  });
}

export function useReport(id: string | null) {
  return useQuery({
    queryKey: ['reports', id],
    queryFn: () => fetchReport(id!),
    enabled: !!id,
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { periodFrom: string; periodTo: string; reportType: ReportType }) =>
      generateReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
