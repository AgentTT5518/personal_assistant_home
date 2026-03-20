import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { CurrencySelector } from '../components/currency-selector.js';

// Mock hooks
vi.mock('../hooks.js', () => ({
  useCurrency: vi.fn(() => 'AUD'),
  useUpdateAppSetting: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  })),
}));

import { useUpdateAppSetting } from '../hooks.js';

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

afterEach(cleanup);

describe('CurrencySelector', () => {
  it('renders common currency buttons', () => {
    render(<CurrencySelector />, { wrapper: createWrapper() });
    expect(screen.getByText('AUD')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByText('EUR')).toBeInTheDocument();
  });

  it('highlights the current currency', () => {
    render(<CurrencySelector />, { wrapper: createWrapper() });
    const audButton = screen.getByText('AUD').closest('button')!;
    expect(audButton.className).toContain('bg-blue-100');
  });

  it('calls mutate when selecting a different currency', () => {
    const mutate = vi.fn();
    vi.mocked(useUpdateAppSetting).mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useUpdateAppSetting>);

    render(<CurrencySelector />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('USD'));
    expect(mutate).toHaveBeenCalledWith({ key: 'currency', value: 'USD' });
  });

  it('does not call mutate when clicking the current currency', () => {
    const mutate = vi.fn();
    vi.mocked(useUpdateAppSetting).mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useUpdateAppSetting>);

    render(<CurrencySelector />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('AUD'));
    expect(mutate).not.toHaveBeenCalled();
  });

  it('renders custom currency input', () => {
    render(<CurrencySelector />, { wrapper: createWrapper() });
    expect(screen.getByPlaceholderText('Other (e.g. INR)')).toBeInTheDocument();
  });

  it('shows error message on failure', () => {
    vi.mocked(useUpdateAppSetting).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: true,
      error: new Error('Update failed'),
    } as unknown as ReturnType<typeof useUpdateAppSetting>);

    render(<CurrencySelector />, { wrapper: createWrapper() });
    expect(screen.getByText('Update failed')).toBeInTheDocument();
  });
});
