import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { AnalysisPage } from '../analysis-page.js';

const mockGenerateMutate = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock('../../hooks.js', () => ({
  useGenerateAnalysis: vi.fn(() => ({
    mutate: mockGenerateMutate,
    isPending: false,
  })),
  useSnapshots: vi.fn(() => ({
    data: [],
  })),
  useSnapshot: vi.fn(() => ({
    data: null,
  })),
  useDeleteSnapshot: vi.fn(() => ({
    mutate: mockDeleteMutate,
    isPending: false,
  })),
}));

vi.mock('../generate-panel.js', () => ({
  GeneratePanel: ({ onGenerate, isGenerating, error }: any) => (
    <div data-testid="generate-panel">
      <button data-testid="generate-btn" onClick={() => onGenerate('2026-01-01', '2026-01-31')}>
        Generate
      </button>
      {isGenerating && <span data-testid="generating">Generating...</span>}
      {error && <span data-testid="generate-error">{error}</span>}
    </div>
  ),
}));

vi.mock('../insights-display.js', () => ({
  InsightsDisplay: ({ insights }: any) => (
    <div data-testid="insights-display">Insights: {JSON.stringify(insights)}</div>
  ),
}));

vi.mock('../snapshot-history.js', () => ({
  SnapshotHistory: ({ snapshots, activeId, onSelect, onDelete, isDeleting }: any) => (
    <div data-testid="snapshot-history">
      {snapshots.map((s: any) => (
        <div key={s.id}>
          <button data-testid={`select-${s.id}`} onClick={() => onSelect(s.id)}>
            {s.id}
          </button>
          <button data-testid={`delete-${s.id}`} onClick={() => onDelete(s.id)}>
            Delete
          </button>
        </div>
      ))}
      {isDeleting && <span data-testid="deleting">Deleting...</span>}
      <span data-testid="active-id">{activeId ?? 'none'}</span>
    </div>
  ),
}));

vi.mock('../empty-state.js', () => ({
  EmptyState: () => <div data-testid="empty-state">No analysis yet</div>,
}));

describe('AnalysisPage', () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it('renders the page heading', () => {
    render(<AnalysisPage />);
    expect(screen.getByText('Analysis')).toBeInTheDocument();
  });

  it('renders the GeneratePanel', () => {
    render(<AnalysisPage />);
    expect(screen.getByTestId('generate-panel')).toBeInTheDocument();
  });

  it('renders the SnapshotHistory', () => {
    render(<AnalysisPage />);
    expect(screen.getByTestId('snapshot-history')).toBeInTheDocument();
  });

  it('renders the EmptyState when no active snapshot and not generating', () => {
    render(<AnalysisPage />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('hides EmptyState when generating', async () => {
    const { useGenerateAnalysis } = await import('../../hooks.js');
    (useGenerateAnalysis as any).mockReturnValue({
      mutate: mockGenerateMutate,
      isPending: true,
    });

    render(<AnalysisPage />);
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('auto-selects the most recent snapshot on load', async () => {
    const { useSnapshots } = await import('../../hooks.js');
    (useSnapshots as any).mockReturnValue({
      data: [
        { id: 'snap-1', createdAt: '2026-01-15' },
        { id: 'snap-2', createdAt: '2026-01-10' },
      ],
    });

    render(<AnalysisPage />);
    expect(screen.getByTestId('active-id').textContent).toBe('snap-1');
  });

  it('displays InsightsDisplay when active snapshot has data', async () => {
    const { useSnapshots, useSnapshot } = await import('../../hooks.js');
    (useSnapshots as any).mockReturnValue({
      data: [{ id: 'snap-1', createdAt: '2026-01-15' }],
    });
    (useSnapshot as any).mockReturnValue({
      data: { id: 'snap-1', data: { spending: 'high' } },
    });

    render(<AnalysisPage />);
    expect(screen.getByTestId('insights-display')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('calls generate mutation when generate button is clicked', async () => {
    // Reset mock to capture the mutate call
    let capturedMutate: any;
    const { useGenerateAnalysis } = await import('../../hooks.js');
    (useGenerateAnalysis as any).mockReturnValue({
      mutate: (...args: any[]) => {
        capturedMutate = args;
        mockGenerateMutate(...args);
      },
      isPending: false,
    });

    render(<AnalysisPage />);
    fireEvent.click(screen.getByTestId('generate-btn'));

    expect(mockGenerateMutate).toHaveBeenCalled();
    // Check the first argument (params) passed to mutate
    expect(capturedMutate[0]).toEqual({ dateFrom: '2026-01-01', dateTo: '2026-01-31' });
  });

  it('calls delete mutation when delete button is clicked', async () => {
    const { useSnapshots } = await import('../../hooks.js');
    (useSnapshots as any).mockReturnValue({
      data: [{ id: 'snap-1', createdAt: '2026-01-15' }],
    });

    let capturedDeleteArgs: any;
    const { useDeleteSnapshot } = await import('../../hooks.js');
    (useDeleteSnapshot as any).mockReturnValue({
      mutate: (...args: any[]) => {
        capturedDeleteArgs = args;
        mockDeleteMutate(...args);
      },
      isPending: false,
    });

    render(<AnalysisPage />);
    fireEvent.click(screen.getByTestId('delete-snap-1'));

    expect(mockDeleteMutate).toHaveBeenCalled();
    expect(capturedDeleteArgs[0]).toBe('snap-1');
  });

  it('selects a snapshot when clicked in history', async () => {
    const { useSnapshots } = await import('../../hooks.js');
    (useSnapshots as any).mockReturnValue({
      data: [
        { id: 'snap-1', createdAt: '2026-01-15' },
        { id: 'snap-2', createdAt: '2026-01-10' },
      ],
    });

    render(<AnalysisPage />);
    // Initially auto-selects snap-1
    expect(screen.getByTestId('active-id').textContent).toBe('snap-1');

    // Click snap-2 to select it
    fireEvent.click(screen.getByTestId('select-snap-2'));
    expect(screen.getByTestId('active-id').textContent).toBe('snap-2');
  });

  it('passes isGenerating to GeneratePanel', async () => {
    const { useGenerateAnalysis } = await import('../../hooks.js');
    (useGenerateAnalysis as any).mockReturnValue({
      mutate: mockGenerateMutate,
      isPending: true,
    });

    render(<AnalysisPage />);
    expect(screen.getByTestId('generating')).toBeInTheDocument();
  });

  it('passes isDeleting to SnapshotHistory', async () => {
    const { useDeleteSnapshot } = await import('../../hooks.js');
    (useDeleteSnapshot as any).mockReturnValue({
      mutate: mockDeleteMutate,
      isPending: true,
    });

    render(<AnalysisPage />);
    expect(screen.getByTestId('deleting')).toBeInTheDocument();
  });

  it('shows error message when generate fails', async () => {
    // Simulate generate mutation calling onError callback
    const { useGenerateAnalysis } = await import('../../hooks.js');
    (useGenerateAnalysis as any).mockReturnValue({
      mutate: (params: any, opts: any) => {
        opts.onError(new Error('API error'));
      },
      isPending: false,
    });

    render(<AnalysisPage />);
    fireEvent.click(screen.getByTestId('generate-btn'));

    expect(screen.getByTestId('generate-error').textContent).toBe('API error');
  });

  it('sets active snapshot when generate succeeds', async () => {
    const { useGenerateAnalysis, useSnapshot } = await import('../../hooks.js');
    (useGenerateAnalysis as any).mockReturnValue({
      mutate: (params: any, opts: any) => {
        opts.onSuccess({ id: 'new-snap' });
      },
      isPending: false,
    });
    (useSnapshot as any).mockReturnValue({
      data: { id: 'new-snap', data: { spending: 'low' } },
    });

    render(<AnalysisPage />);
    fireEvent.click(screen.getByTestId('generate-btn'));

    expect(screen.getByTestId('active-id').textContent).toBe('new-snap');
  });

  it('renders delete button for snapshots', async () => {
    const { useSnapshots } = await import('../../hooks.js');
    (useSnapshots as any).mockReturnValue({
      data: [{ id: 'snap-1', createdAt: '2026-01-15' }],
    });

    render(<AnalysisPage />);
    expect(screen.getByTestId('delete-snap-1')).toBeInTheDocument();
  });
});
