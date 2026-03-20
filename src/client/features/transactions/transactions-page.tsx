import { useState, useCallback, useRef, useEffect } from 'react';
import { Settings, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import type { TransactionFilters } from '../../../shared/types/index.js';
import { useTransactions, useTransactionStats, useAiCategorise } from './hooks.js';
import { StatsSummary } from './components/stats-summary.js';
import { TransactionFiltersBar } from './components/transaction-filters.js';
import { TransactionTable } from './components/transaction-table.js';
import { BulkActionsBar } from './components/bulk-actions-bar.js';
import { CategoryManager } from './components/category-manager.js';
import { useDetectRecurring, useRecurringSummary, RecurringGroupPanel } from '../recurring/index.js';
import { useCurrency } from '../settings/index.js';

export function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFilters>({
    sortBy: 'date',
    sortOrder: 'desc',
    page: 1,
    pageSize: 50,
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [isAiCategorising, setIsAiCategorising] = useState(false);
  const prevUncategorisedRef = useRef<number | null>(null);
  const stableCountRef = useRef(0);

  const { data, isLoading } = useTransactions(filters, {
    refetchInterval: isAiCategorising ? 3000 : false,
  });
  const { data: stats } = useTransactionStats(undefined, undefined, {
    refetchInterval: isAiCategorising ? 3000 : false,
  });

  const aiCategorise = useAiCategorise();
  const detectRecurring = useDetectRecurring();
  const { data: recurringSummary, isLoading: recurringLoading } = useRecurringSummary();
  const currency = useCurrency();

  // Stop polling when uncategorised count stabilises
  useEffect(() => {
    if (!isAiCategorising || !stats) return;

    if (prevUncategorisedRef.current === stats.uncategorisedCount) {
      stableCountRef.current++;
      if (stableCountRef.current >= 2) {
        setIsAiCategorising(false);
        stableCountRef.current = 0;
      }
    } else {
      stableCountRef.current = 0;
    }
    prevUncategorisedRef.current = stats.uncategorisedCount;
  }, [stats?.uncategorisedCount, isAiCategorising, stats]);

  const handleAiCategorise = useCallback(() => {
    // Get uncategorised transaction IDs from current data, or trigger for all
    const uncategorisedIds = data?.data
      .filter((t) => !t.categoryId)
      .map((t) => t.id) ?? [];

    if (uncategorisedIds.length === 0) return;

    prevUncategorisedRef.current = null;
    stableCountRef.current = 0;
    setIsAiCategorising(true);
    aiCategorise.mutate(uncategorisedIds);
  }, [data, aiCategorise]);

  const handleFiltersChange = useCallback((newFilters: TransactionFilters) => {
    setFilters(newFilters);
    setSelectedIds(new Set());
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Transactions</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {stats && stats.uncategorisedCount > 0 && (
            <button
              onClick={handleAiCategorise}
              disabled={aiCategorise.isPending || isAiCategorising}
              className="flex items-center gap-1.5 bg-purple-600 text-white text-sm px-3 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {isAiCategorising ? (
                <><Loader2 className="animate-spin" size={14} /> AI Categorising...</>
              ) : (
                <><Sparkles size={14} /> AI Categorise</>
              )}
            </button>
          )}
          <button
            onClick={() => detectRecurring.mutate()}
            disabled={detectRecurring.isPending}
            className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 px-3 py-2 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {detectRecurring.isPending ? (
              <><Loader2 className="animate-spin" size={14} /> Detecting...</>
            ) : (
              <><RefreshCw size={14} /> Detect Recurring</>
            )}
          </button>
          <button
            onClick={() => setShowCategoryManager(true)}
            className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 px-3 py-2 rounded-md hover:bg-gray-50"
          >
            <Settings size={14} />
            Categories
          </button>
        </div>
      </div>

      <StatsSummary
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        refetchInterval={isAiCategorising ? 3000 : false}
      />

      <TransactionFiltersBar
        filters={filters}
        onChange={handleFiltersChange}
      />

      {filters.isRecurring && (
        <RecurringGroupPanel
          groups={recurringSummary}
          isLoading={recurringLoading}
          currency={currency}
        />
      )}

      <TransactionTable
        data={data}
        isLoading={isLoading}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      <BulkActionsBar
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      {showCategoryManager && (
        <CategoryManager onClose={() => setShowCategoryManager(false)} />
      )}
    </div>
  );
}
