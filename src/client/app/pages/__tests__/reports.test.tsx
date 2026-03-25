import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('../../../features/reports/index.js', () => ({
  GenerateReportPanel: () => <div data-testid="generate-report-panel">GenerateReportPanel</div>,
  ReportViewer: () => <div data-testid="report-viewer">ReportViewer</div>,
  ReportHistory: () => <div data-testid="report-history">ReportHistory</div>,
  useReport: () => ({ data: null, isLoading: false }),
}));

vi.mock('../../../features/settings/index.js', () => ({
  useCurrency: () => 'AUD',
}));

import { ReportsPage } from '../reports.js';

afterEach(cleanup);

describe('ReportsPage', () => {
  it('renders Reports heading', () => {
    render(<ReportsPage />);
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('renders GenerateReportPanel', () => {
    render(<ReportsPage />);
    expect(screen.getByTestId('generate-report-panel')).toBeInTheDocument();
  });

  it('renders ReportHistory', () => {
    render(<ReportsPage />);
    expect(screen.getByTestId('report-history')).toBeInTheDocument();
  });

  it('renders placeholder text when no report selected', () => {
    render(<ReportsPage />);
    expect(screen.getByText(/Generate a report or select one/)).toBeInTheDocument();
  });
});
