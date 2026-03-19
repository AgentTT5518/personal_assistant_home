import { useState, useRef, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { useCategories } from '../hooks.js';
import type { CategoryResponse } from '../../../../shared/types/index.js';

interface CategorySelectorProps {
  value: string | null;
  onChange: (categoryId: string | null) => void;
  onClose?: () => void;
}

export function CategorySelector({ value, onChange, onClose }: CategorySelectorProps) {
  const { data: categories } = useCategories();
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose?.();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!categories) return null;

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  // Build hierarchy: parents first, then children indented
  const parents = filtered.filter((c) => !c.parentId);
  const children = filtered.filter((c) => c.parentId);

  const grouped: (CategoryResponse & { isChild: boolean })[] = [];
  for (const parent of parents) {
    grouped.push({ ...parent, isChild: false });
    const kids = children.filter((c) => c.parentId === parent.id);
    for (const kid of kids) {
      grouped.push({ ...kid, isChild: true });
    }
  }
  // Orphan children (parent not in filtered results)
  const orphans = children.filter((c) => !parents.some((p) => p.id === c.parentId));
  for (const o of orphans) {
    grouped.push({ ...o, isChild: true });
  }

  return (
    <div
      ref={ref}
      className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
    >
      <div className="p-2 border-b border-gray-100">
        <div className="relative">
          <Search size={14} className="absolute left-2 top-2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="w-full pl-7 pr-2 py-1.5 text-sm rounded border border-gray-200 focus:outline-none focus:border-blue-400"
            autoFocus
          />
        </div>
      </div>

      <div className="max-h-60 overflow-y-auto">
        <button
          onClick={() => { onChange(null); onClose?.(); }}
          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${value === null ? 'bg-blue-50 text-blue-700' : 'text-gray-600'}`}
        >
          <X size={12} />
          Remove category
        </button>

        {grouped.map((cat) => (
          <button
            key={cat.id}
            onClick={() => { onChange(cat.id); onClose?.(); }}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${cat.isChild ? 'pl-7' : ''} ${value === cat.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
          >
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: cat.color }}
            />
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
