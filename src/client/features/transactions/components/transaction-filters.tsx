import { useState, useCallback, useEffect } from 'react';
import { Search, X, Filter } from 'lucide-react';
import type { TransactionFilters } from '../../../../shared/types/index.js';
import { useCategories } from '../hooks.js';

interface TransactionFiltersBarProps {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
}

export function TransactionFiltersBar({ filters, onChange }: TransactionFiltersBarProps) {
  const { data: categories } = useCategories();
  const [searchInput, setSearchInput] = useState(filters.search ?? '');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== (filters.search ?? '')) {
        onChange({ ...filters, search: searchInput || undefined, page: 1 });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filters, onChange]);

  const updateFilter = useCallback(
    (key: keyof TransactionFilters, value: unknown) => {
      onChange({ ...filters, [key]: value || undefined, page: 1 });
    },
    [filters, onChange],
  );

  const clearFilters = useCallback(() => {
    setSearchInput('');
    onChange({ sortBy: 'date', sortOrder: 'desc', page: 1, pageSize: filters.pageSize });
  }, [filters.pageSize, onChange]);

  // Count active filters
  const activeCount = [
    filters.search,
    filters.categoryId,
    filters.type,
    filters.dateFrom,
    filters.dateTo,
    filters.amountMin,
    filters.amountMax,
    filters.documentId,
    filters.isRecurring,
  ].filter((v) => v !== undefined && v !== null).length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search description or merchant..."
            className="w-full pl-8 pr-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:border-blue-400"
          />
        </div>

        {/* Category filter */}
        <select
          value={filters.categoryId ?? ''}
          onChange={(e) => updateFilter('categoryId', e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All Categories</option>
          <option value="uncategorised">Uncategorised</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Type filter */}
        <select
          value={filters.type ?? ''}
          onChange={(e) => updateFilter('type', e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          <option value="debit">Debit</option>
          <option value="credit">Credit</option>
        </select>

        {/* Clear filters */}
        {activeCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-2 py-2"
          >
            <X size={14} />
            Clear ({activeCount})
          </button>
        )}
      </div>

      {/* Second row: date range and amount range */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <Filter size={12} />
          <span>Date:</span>
        </div>
        <input
          type="date"
          value={filters.dateFrom ?? ''}
          onChange={(e) => updateFilter('dateFrom', e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
        <span className="text-gray-400">to</span>
        <input
          type="date"
          value={filters.dateTo ?? ''}
          onChange={(e) => updateFilter('dateTo', e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />

        <span className="text-gray-300">|</span>

        <div className="flex items-center gap-1 text-sm text-gray-500">
          <span>Amount:</span>
        </div>
        <input
          type="number"
          value={filters.amountMin ?? ''}
          onChange={(e) => updateFilter('amountMin', e.target.value ? Number(e.target.value) : undefined)}
          placeholder="Min"
          className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
        <span className="text-gray-400">-</span>
        <input
          type="number"
          value={filters.amountMax ?? ''}
          onChange={(e) => updateFilter('amountMax', e.target.value ? Number(e.target.value) : undefined)}
          placeholder="Max"
          className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />

        <label className="flex items-center gap-1 text-sm text-gray-600 ml-2">
          <input
            type="checkbox"
            checked={filters.isRecurring ?? false}
            onChange={(e) => updateFilter('isRecurring', e.target.checked || undefined)}
            className="rounded"
          />
          Recurring only
        </label>
      </div>
    </div>
  );
}
