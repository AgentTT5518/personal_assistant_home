import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { InsightsDisplay } from '../components/insights-display.js';
import type { AnalysisInsights } from '../../../../shared/types/index.js';

afterEach(cleanup);

const MOCK_INSIGHTS: AnalysisInsights = {
  period: { from: '2026-01-01', to: '2026-01-31' },
  currency: 'AUD',
  summary: {
    totalIncome: 5000,
    totalExpenses: 3000,
    netAmount: 2000,
    transactionCount: 10,
  },
  sections: [
    { title: 'Spending Overview', type: 'overview', content: 'You spent **$3,000** this month.', highlights: ['Under budget'] },
    { title: 'Top Categories', type: 'categories', content: 'Groceries is top.', highlights: ['40% on food'] },
    { title: 'Trends', type: 'trends', content: 'Spending is rising.', highlights: ['Up 10%'] },
    { title: 'Anomalies', type: 'anomalies', content: 'Large purchase detected.', highlights: ['$500 at electronics'] },
    { title: 'Recommendations', type: 'recommendations', content: 'Consider reducing dining.', highlights: ['Save $200/month'] },
  ],
};

describe('InsightsDisplay', () => {
  it('renders all 5 section cards', () => {
    render(<InsightsDisplay insights={MOCK_INSIGHTS} />);
    expect(screen.getByText('Spending Overview')).toBeInTheDocument();
    expect(screen.getByText('Top Categories')).toBeInTheDocument();
    expect(screen.getByText('Trends')).toBeInTheDocument();
    expect(screen.getByText('Anomalies')).toBeInTheDocument();
    expect(screen.getByText('Recommendations')).toBeInTheDocument();
  });

  it('renders summary stats', () => {
    render(<InsightsDisplay insights={MOCK_INSIGHTS} />);
    expect(screen.getByText('Income')).toBeInTheDocument();
    expect(screen.getByText('Expenses')).toBeInTheDocument();
    expect(screen.getByText('Net')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
  });

  it('renders transaction count', () => {
    render(<InsightsDisplay insights={MOCK_INSIGHTS} />);
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('renders highlights', () => {
    render(<InsightsDisplay insights={MOCK_INSIGHTS} />);
    expect(screen.getByText('Under budget')).toBeInTheDocument();
    expect(screen.getByText('Save $200/month')).toBeInTheDocument();
  });

  it('renders markdown content', () => {
    render(<InsightsDisplay insights={MOCK_INSIGHTS} />);
    // react-markdown renders **$3,000** as a <strong> element
    const boldText = screen.getByText('$3,000');
    expect(boldText.tagName).toBe('STRONG');
  });

  it('handles sections without highlights', () => {
    const insights = {
      ...MOCK_INSIGHTS,
      sections: [
        { title: 'Spending Overview', type: 'overview' as const, content: 'No highlights here.' },
        { title: 'Top Categories', type: 'categories' as const, content: 'Text.' },
        { title: 'Trends', type: 'trends' as const, content: 'Text.' },
        { title: 'Anomalies', type: 'anomalies' as const, content: 'Text.' },
        { title: 'Recommendations', type: 'recommendations' as const, content: 'Text.' },
      ],
    };
    render(<InsightsDisplay insights={insights} />);
    expect(screen.getByText('No highlights here.')).toBeInTheDocument();
  });
});
