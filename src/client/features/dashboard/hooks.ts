import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAppSettings, updateAppSetting } from './api.js';

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
