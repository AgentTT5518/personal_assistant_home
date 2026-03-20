import { useState, useCallback } from 'react';
import { Loader2, ArrowUp, ArrowDown, FileText } from 'lucide-react';
import type { TransactionResponse, TransactionFilters, PaginatedResponse } from '../../../../shared/types/index.js';
import { useUpdateTransaction } from '../hooks.js';
import { CategorySelector } from './category-selector.js';

interface TransactionTableProps {
  data: PaginatedResponse<TransactionResponse> | undefined;
  isLoading: boolean;
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}

export function TransactionTable({
  data,
  isLoading,
  filters,
  onFiltersChange,
  selectedIds,
  onSelectionChange,
}: TransactionTableProps) {
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const updateTransaction = useUpdateTransaction();

  const formatCurrency = (amount: number, type: string) => {
    const formatted = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
    return type === 'credit' ? `+${formatted}` : `-${formatted}`;
  };

  const handleSort = useCallback(
    (column: 'date' | 'amount' | 'description') => {
      const newOrder =
        filters.sortBy === column && filters.sortOrder === 'asc' ? 'desc' : 'asc';
      onFiltersChange({ ...filters, sortBy: column, sortOrder: newOrder });
    },
    [filters, onFiltersChange],
  );

  const handleSelectAll = useCallback(() => {
    if (!data) return;
    if (selectedIds.size === data.data.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.data.map((t) => t.id)));
    }
  }, [data, selectedIds, onSelectionChange]);

  const handleSelectOne = useCallback(
    (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onSelectionChange(next);
    },
    [selectedIds, onSelectionChange],
  );

  const handleCategoryChange = useCallback(
    (txnId: string, categoryId: string | null) => {
      updateTransaction.mutate({ id: txnId, categoryId });
      setEditingCategoryId(null);
    },
    [updateTransaction],
  );

  const SortIcon = ({ column }: { column: string }) => {
    if (filters.sortBy !== column) return null;
    return filters.sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <FileText size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-600 mb-2">No transactions found</h3>
        <p className="text-sm text-gray-400">
          Upload documents to extract transactions, or adjust your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-3 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.size === data.data.length && data.data.length > 0}
                  onChange={handleSelectAll}
                  className="rounded"
                />
              </th>
              <th
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                onClick={() => handleSort('date')}
              >
                <span className="flex items-center gap-1">Date <SortIcon column="date" /></span>
              </th>
              <th
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                onClick={() => handleSort('description')}
              >
                <span className="flex items-center gap-1">Description <SortIcon column="description" /></span>
              </th>
              <th className="hidden sm:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Merchant
              </th>
              <th
                className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                onClick={() => handleSort('amount')}
              >
                <span className="flex items-center justify-end gap-1">Amount <SortIcon column="amount" /></span>
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="hidden sm:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.data.map((txn) => (
              <tr
                key={txn.id}
                className={`hover:bg-gray-50 ${selectedIds.has(txn.id) ? 'bg-blue-50' : ''}`}
              >
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(txn.id)}
                    onChange={() => handleSelectOne(txn.id)}
                    className="rounded"
                  />
                </td>
                <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{txn.date}</td>
                <td className="px-3 py-3 text-gray-900 max-w-xs truncate">{txn.description}</td>
                <td className="hidden sm:table-cell px-3 py-3 text-gray-500 max-w-32 truncate">{txn.merchant ?? '—'}</td>
                <td className={`px-3 py-3 text-right font-mono whitespace-nowrap ${txn.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(txn.amount, txn.type)}
                </td>
                <td className="px-3 py-3 relative">
                  <button
                    onClick={() => setEditingCategoryId(editingCategoryId === txn.id ? null : txn.id)}
                    className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border hover:bg-gray-50"
                    style={txn.categoryColor ? {
                      backgroundColor: `${txn.categoryColor}15`,
                      borderColor: `${txn.categoryColor}40`,
                      color: txn.categoryColor,
                    } : {
                      borderColor: '#d1d5db',
                      color: '#9ca3af',
                    }}
                  >
                    {txn.categoryName ?? 'Uncategorised'}
                  </button>
                  {editingCategoryId === txn.id && (
                    <CategorySelector
                      value={txn.categoryId}
                      onChange={(catId) => handleCategoryChange(txn.id, catId)}
                      onClose={() => setEditingCategoryId(null)}
                    />
                  )}
                </td>
                <td className="hidden sm:table-cell px-3 py-3 text-xs text-gray-400 max-w-24 truncate">
                  {txn.documentFilename ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm">
          <span className="text-gray-500">
            Showing {(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} of {data.total}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onFiltersChange({ ...filters, page: (filters.page ?? 1) - 1 })}
              disabled={(filters.page ?? 1) <= 1}
              className="px-3 py-2 min-h-[44px] rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-gray-600">
              Page {data.page} of {data.totalPages}
            </span>
            <button
              onClick={() => onFiltersChange({ ...filters, page: (filters.page ?? 1) + 1 })}
              disabled={(filters.page ?? 1) >= data.totalPages}
              className="px-3 py-2 min-h-[44px] rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
