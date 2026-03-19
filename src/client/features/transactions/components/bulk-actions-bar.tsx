import { useState } from 'react';
import { X, Tag } from 'lucide-react';
import { useBulkCategorise } from '../hooks.js';
import { CategorySelector } from './category-selector.js';

interface BulkActionsBarProps {
  selectedIds: Set<string>;
  onClearSelection: () => void;
}

export function BulkActionsBar({ selectedIds, onClearSelection }: BulkActionsBarProps) {
  const [showSelector, setShowSelector] = useState(false);
  const bulkCategorise = useBulkCategorise();

  if (selectedIds.size === 0) return null;

  const handleCategorise = (categoryId: string | null) => {
    bulkCategorise.mutate(
      { transactionIds: Array.from(selectedIds), categoryId },
      { onSuccess: () => { onClearSelection(); setShowSelector(false); } },
    );
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white rounded-lg shadow-2xl px-6 py-3 flex items-center gap-4">
      <span className="text-sm font-medium">{selectedIds.size} selected</span>

      <div className="relative">
        <button
          onClick={() => setShowSelector(!showSelector)}
          disabled={bulkCategorise.isPending}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-3 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          <Tag size={14} />
          Categorise as...
        </button>
        {showSelector && (
          <div className="absolute bottom-full mb-2 left-0">
            <CategorySelector
              value={null}
              onChange={handleCategorise}
              onClose={() => setShowSelector(false)}
            />
          </div>
        )}
      </div>

      <button
        onClick={onClearSelection}
        className="text-gray-400 hover:text-white"
      >
        <X size={18} />
      </button>
    </div>
  );
}
