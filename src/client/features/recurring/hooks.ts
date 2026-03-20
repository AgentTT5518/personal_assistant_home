import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchRecurringSummary, detectRecurring } from './api.js';

export function useRecurringSummary() {
  return useQuery({
    queryKey: ['recurring-summary'],
    queryFn: fetchRecurringSummary,
  });
}

export function useDetectRecurring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: detectRecurring,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['recurring-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
