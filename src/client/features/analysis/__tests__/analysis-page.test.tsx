import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const mockHooks = vi.hoisted(() => ({
  useGenerateAnalysis: vi.fn(),
  useSnapshots: vi.fn(),
  useSnapshot: vi.fn(),
  useDeleteSnapshot: vi.fn(),
}));

vi.mock('../hooks.js', () => mockHooks);

vi.mock('../components/generate-panel.js', () => ({
  GeneratePanel: (props: Record<string, unknown>) => (
    <div data-testid="generate-panel" data-generating={String(props.isGenerating)} />
  ),
}));

vi.mock('../components/insights-display.js', () => ({
  InsightsDisplay: () => <div data-testid="insights-display" />,
}));

vi.mock('../components/snapshot-history.js', () => ({
  SnapshotHistory: () => <div data-testid="snapshot-history" />,
}));

vi.mock('../components/empty-state.js', () => ({
  EmptyState: () => <div data-testid="empty-state" />,
}));

import { AnalysisPage } from '../components/analysis-page.js';

afterEach(cleanup);

function setupMocks(overrides: Record<string, unknown> = {}) {
  mockHooks.useGenerateAnalysis.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    ...overrides.generateMutation as object,
  });
  mockHooks.useDeleteSnapshot.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    ...overrides.deleteMutation as object,
  });
  mockHooks.useSnapshots.mockReturnValue({
    data: overrides.snapshots ?? [],
  });
  mockHooks.useSnapshot.mockReturnValue({
    data: overrides.activeSnapshot ?? undefined,
  });
}

describe('AnalysisPage', () => {
  it('renders heading', () => {
    setupMocks();
    render(<AnalysisPage />);
    expect(screen.getByText('Analysis')).toBeInTheDocument();
  });

  it('renders sub-components', () => {
    setupMocks();
    render(<AnalysisPage />);
    expect(screen.getByTestId('generate-panel')).toBeInTheDocument();
    expect(screen.getByTestId('snapshot-history')).toBeInTheDocument();
  });

  it('shows empty state when no insights and not generating', () => {
    setupMocks();
    render(<AnalysisPage />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('shows insights display when active snapshot has data', () => {
    setupMocks({ activeSnapshot: { id: 's1', data: { sections: [] } } });
    render(<AnalysisPage />);
    expect(screen.getByTestId('insights-display')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('hides empty state when generating', () => {
    setupMocks({ generateMutation: { isPending: true, mutate: vi.fn() } });
    render(<AnalysisPage />);
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });
});
