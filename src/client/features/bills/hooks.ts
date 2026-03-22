import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchBills,
  fetchBill,
  fetchBillsCalendar,
  createBill,
  updateBill,
  deleteBill,
  markBillPaid,
  populateFromRecurring,
} from './api.js';

export function useBills(params?: { isActive?: boolean; upcoming?: number }) {
  return useQuery({
    queryKey: ['bills', params],
    queryFn: () => fetchBills(params),
  });
}

export function useBill(id: string) {
  return useQuery({
    queryKey: ['bills', id],
    queryFn: () => fetchBill(id),
    enabled: !!id,
  });
}

export function useBillsCalendar(from: string, to: string) {
  return useQuery({
    queryKey: ['bills', 'calendar', from, to],
    queryFn: () => fetchBillsCalendar(from, to),
    enabled: !!from && !!to,
  });
}

export function useUpcomingBills() {
  return useQuery({
    queryKey: ['bills', 'upcoming'],
    queryFn: () => fetchBills({ isActive: true, upcoming: 7 }),
  });
}

export function useCreateBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBill,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
  });
}

export function useUpdateBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) => updateBill(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
  });
}

export function useDeleteBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteBill,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
  });
}

export function useMarkBillPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markBillPaid,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
  });
}

export function usePopulateFromRecurring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: populateFromRecurring,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
  });
}
