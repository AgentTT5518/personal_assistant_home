import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAppSettings,
  updateAppSetting,
  deleteAllData,
  reSeedCategories,
  runAutoCategorise,
} from './api.js';

export function useAppSettings() {
  return useQuery({
    queryKey: ['app-settings'],
    queryFn: fetchAppSettings,
    staleTime: Infinity,
  });
}

export function useCurrency(): string {
  const { data } = useAppSettings();
  return data?.currency ?? 'AUD';
}

export function useUpdateAppSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => updateAppSetting(key, value),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    },
  });
}

export function useDeleteAllData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAllData,
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
  });
}

export function useReSeedCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reSeedCategories,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useAutoCategorise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: runAutoCategorise,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
