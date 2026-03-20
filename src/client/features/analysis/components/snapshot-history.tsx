import { Clock, Trash2 } from 'lucide-react';
import type { SnapshotMeta } from '../../../../shared/types/index.js';

interface SnapshotHistoryProps {
  snapshots: SnapshotMeta[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export function SnapshotHistory({ snapshots, activeId, onSelect, onDelete, isDeleting }: SnapshotHistoryProps) {
  if (snapshots.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-gray-500" />
        <h3 className="text-sm font-medium text-gray-700">History ({snapshots.length})</h3>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {snapshots.map((snapshot) => (
          <div
            key={snapshot.id}
            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              activeId === snapshot.id
                ? 'bg-blue-50 border border-blue-200'
                : 'hover:bg-gray-50 border border-transparent'
            }`}
            onClick={() => onSelect(snapshot.id)}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {snapshot.period.from} to {snapshot.period.to}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(snapshot.generatedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(snapshot.id);
              }}
              disabled={isDeleting}
              className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Delete snapshot"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
