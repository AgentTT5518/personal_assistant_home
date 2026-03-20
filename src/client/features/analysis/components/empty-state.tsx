import { BarChart3 } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="text-center py-16">
      <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">No analysis yet</h3>
      <p className="text-gray-500 max-w-md mx-auto">
        Select a date range and generate insights to get AI-powered analysis of your spending patterns.
      </p>
    </div>
  );
}
