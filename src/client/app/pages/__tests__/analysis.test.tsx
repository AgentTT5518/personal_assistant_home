import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('../../../features/analysis/index.js', () => ({
  AnalysisPage: () => (
    <div data-testid="analysis-page">
      <h2>Analysis</h2>
    </div>
  ),
}));

// The page re-exports AnalysisPage from the feature module
import { AnalysisPage } from '../analysis.js';

afterEach(cleanup);

describe('AnalysisPage (app page)', () => {
  it('renders the AnalysisPage component', () => {
    render(<AnalysisPage />);
    expect(screen.getByTestId('analysis-page')).toBeInTheDocument();
  });

  it('renders Analysis heading', () => {
    render(<AnalysisPage />);
    expect(screen.getByText('Analysis')).toBeInTheDocument();
  });
});
