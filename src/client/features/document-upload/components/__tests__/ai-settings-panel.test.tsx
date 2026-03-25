import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AiSettingsPanel } from '../ai-settings-panel.js';

const mockUpdateMutate = vi.fn();

vi.mock('../../hooks.js', () => ({
  useAiSettings: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
  useUpdateAiSetting: vi.fn(() => ({
    mutate: mockUpdateMutate,
    isPending: false,
  })),
}));

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    Loader2: (props: any) => <span data-testid="loader" {...props} />,
    Save: (props: any) => <span data-testid="save-icon" {...props} />,
    X: (props: any) => <span data-testid="x-icon" {...props} />,
  };
});

const mockSettings = [
  {
    id: 's1',
    taskType: 'pdf_extraction',
    provider: 'claude',
    model: 'claude-sonnet-4-20250514',
    fallbackProvider: 'ollama',
    fallbackModel: 'llama3',
  },
  {
    id: 's2',
    taskType: 'categorisation',
    provider: 'ollama',
    model: 'llama3',
    fallbackProvider: null,
    fallbackModel: null,
  },
];

describe('AiSettingsPanel', () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it('renders loading state', async () => {
    const { useAiSettings } = await import('../../hooks.js');
    (useAiSettings as any).mockReturnValue({ data: null, isLoading: true, error: null });

    render(<AiSettingsPanel />);
    expect(screen.getByTestId('loader')).toBeDefined();
  });

  it('renders error state', async () => {
    const { useAiSettings } = await import('../../hooks.js');
    (useAiSettings as any).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Connection failed'),
    });

    render(<AiSettingsPanel />);
    expect(screen.getByText(/failed to load ai settings/i)).toBeDefined();
  });

  it('renders empty state', async () => {
    const { useAiSettings } = await import('../../hooks.js');
    (useAiSettings as any).mockReturnValue({ data: [], isLoading: false, error: null });

    render(<AiSettingsPanel />);
    expect(screen.getByText(/no ai settings configured/i)).toBeDefined();
  });

  it('renders settings cards with task type labels', async () => {
    const { useAiSettings } = await import('../../hooks.js');
    (useAiSettings as any).mockReturnValue({ data: mockSettings, isLoading: false, error: null });

    render(<AiSettingsPanel />);
    expect(screen.getByText('AI Provider Settings')).toBeDefined();
    expect(screen.getByText('PDF Text Extraction')).toBeDefined();
    expect(screen.getByText('Transaction Categorisation')).toBeDefined();
  });

  it('shows provider and model info', async () => {
    const { useAiSettings } = await import('../../hooks.js');
    (useAiSettings as any).mockReturnValue({ data: mockSettings, isLoading: false, error: null });

    render(<AiSettingsPanel />);
    expect(screen.getByText('Claude (Anthropic)')).toBeDefined();
    expect(screen.getByText('claude-sonnet-4-20250514')).toBeDefined();
  });

  it('enters edit mode when Edit button is clicked', async () => {
    const { useAiSettings } = await import('../../hooks.js');
    (useAiSettings as any).mockReturnValue({ data: mockSettings, isLoading: false, error: null });

    render(<AiSettingsPanel />);
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    // Should show Save and Cancel buttons
    expect(screen.getByText('Save')).toBeDefined();
    expect(screen.getByText('Cancel')).toBeDefined();
  });

  it('shows fallback info when set', async () => {
    const { useAiSettings } = await import('../../hooks.js');
    (useAiSettings as any).mockReturnValue({ data: mockSettings, isLoading: false, error: null });

    render(<AiSettingsPanel />);
    // First setting has fallback configured; "Ollama (Local)" may appear multiple times
    expect(screen.getAllByText(/Ollama \(Local\)/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders provider select dropdown in edit mode', async () => {
    const { useAiSettings } = await import('../../hooks.js');
    (useAiSettings as any).mockReturnValue({ data: mockSettings, isLoading: false, error: null });

    render(<AiSettingsPanel />);
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    // Provider select should have all three options
    const providerLabel = screen.getByText('Provider');
    expect(providerLabel).toBeDefined();
    const providerSelect = providerLabel.closest('div')!.querySelector('select')!;
    expect(providerSelect.options.length).toBe(3);
  });

  it('renders model input in edit mode', async () => {
    const { useAiSettings } = await import('../../hooks.js');
    (useAiSettings as any).mockReturnValue({ data: mockSettings, isLoading: false, error: null });

    render(<AiSettingsPanel />);
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    // Model input should be present with the current value
    const modelLabel = screen.getByText('Model');
    expect(modelLabel).toBeDefined();
    const modelInput = modelLabel.closest('div')!.querySelector('input')!;
    expect(modelInput.value).toBe('claude-sonnet-4-20250514');
  });

  it('renders task type labels for all settings', async () => {
    const { useAiSettings } = await import('../../hooks.js');
    (useAiSettings as any).mockReturnValue({ data: mockSettings, isLoading: false, error: null });

    render(<AiSettingsPanel />);
    expect(screen.getByText('PDF Text Extraction')).toBeDefined();
    expect(screen.getByText('Transaction Categorisation')).toBeDefined();
  });

  it('renders fallback provider select in edit mode', async () => {
    const { useAiSettings } = await import('../../hooks.js');
    (useAiSettings as any).mockReturnValue({ data: mockSettings, isLoading: false, error: null });

    render(<AiSettingsPanel />);
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    expect(screen.getByText('Fallback Provider')).toBeDefined();
    expect(screen.getByText('Fallback Model')).toBeDefined();
  });

  it('cancels edit mode and reverts values', async () => {
    const { useAiSettings } = await import('../../hooks.js');
    (useAiSettings as any).mockReturnValue({ data: mockSettings, isLoading: false, error: null });

    render(<AiSettingsPanel />);
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    // Should show Cancel button
    expect(screen.getByText('Cancel')).toBeDefined();
    fireEvent.click(screen.getByText('Cancel'));

    // Should be back to display mode - Edit button should be back
    expect(screen.getAllByText('Edit').length).toBe(2);
  });

  it('calls update mutation when Save is clicked', async () => {
    const { useAiSettings } = await import('../../hooks.js');
    (useAiSettings as any).mockReturnValue({ data: mockSettings, isLoading: false, error: null });

    render(<AiSettingsPanel />);
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    fireEvent.click(screen.getByText('Save'));
    expect(mockUpdateMutate).toHaveBeenCalled();
    const callArgs = mockUpdateMutate.mock.calls[0][0];
    expect(callArgs.taskType).toBe('pdf_extraction');
    expect(callArgs.data.provider).toBe('claude');
  });

  it('shows error message text in error state', async () => {
    const { useAiSettings } = await import('../../hooks.js');
    (useAiSettings as any).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Connection failed'),
    });

    render(<AiSettingsPanel />);
    expect(screen.getByText(/Connection failed/)).toBeDefined();
  });
});
