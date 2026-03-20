import type { AnalysisInsights } from '../../../../shared/types/index.js';
import { SectionCard } from './section-card.js';
import { formatCurrency } from '../../../shared/utils/format-currency.js';

interface InsightsDisplayProps {
  insights: AnalysisInsights;
}

export function InsightsDisplay({ insights }: InsightsDisplayProps) {
  const { summary, currency } = insights;

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Income</p>
          <p className="text-lg font-semibold text-green-600">
            {formatCurrency(summary.totalIncome, currency)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Expenses</p>
          <p className="text-lg font-semibold text-red-600">
            {formatCurrency(summary.totalExpenses, currency)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Net</p>
          <p className={`text-lg font-semibold ${summary.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(summary.netAmount, currency)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Transactions</p>
          <p className="text-lg font-semibold text-gray-900">{summary.transactionCount}</p>
        </div>
      </div>

      <div className="space-y-4">
        {insights.sections.map((section, i) => (
          <SectionCard key={i} section={section} />
        ))}
      </div>
    </div>
  );
}
