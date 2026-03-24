import { useState } from 'react';
import { CheckSquare, Square, AlertTriangle } from 'lucide-react';
import type { ImportPreviewRow } from '@shared/types/index.js';

interface ImportPreviewProps {
  rows: ImportPreviewRow[];
  onConfirm: (selectedRows: number[]) => void;
  isLoading: boolean;
}

export function ImportPreview({ rows, onConfirm, isLoading }: ImportPreviewProps) {
  const [selection, setSelection] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    rows.forEach((r) => {
      if (r.selected) initial.add(r.rowIndex);
    });
    return initial;
  });

  const toggleRow = (idx: number) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (selection.size === rows.length) {
      setSelection(new Set());
    } else {
      setSelection(new Set(rows.map((r) => r.rowIndex)));
    }
  };

  const selectedCount = selection.size;
  const duplicateCount = rows.filter((r) => r.isDuplicate).length;
  const newCount = rows.length - duplicateCount;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>{rows.length} total rows</span>
          <span className="text-green-600">{newCount} new</span>
          {duplicateCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertTriangle size={14} />
              {duplicateCount} duplicates
            </span>
          )}
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left w-10">
                  <button onClick={toggleAll} className="text-gray-500 hover:text-gray-700" aria-label="Toggle all rows">
                    {selection.size === rows.length ? (
                      <CheckSquare size={16} />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </th>
                <th className="px-3 py-2 text-left text-gray-600 font-medium">Date</th>
                <th className="px-3 py-2 text-left text-gray-600 font-medium">Description</th>
                <th className="px-3 py-2 text-right text-gray-600 font-medium">Amount</th>
                <th className="px-3 py-2 text-left text-gray-600 font-medium hidden md:table-cell">Type</th>
                <th className="px-3 py-2 text-left text-gray-600 font-medium hidden md:table-cell">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.rowIndex}
                  className={`border-t ${row.isDuplicate ? 'bg-amber-50' : ''} ${
                    !selection.has(row.rowIndex) ? 'opacity-50' : ''
                  }`}
                >
                  <td className="px-3 py-2">
                    <button
                      onClick={() => toggleRow(row.rowIndex)}
                      className="text-gray-500 hover:text-gray-700"
                      aria-label="Toggle row"
                    >
                      {selection.has(row.rowIndex) ? (
                        <CheckSquare size={16} className="text-blue-600" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.date}</td>
                  <td className="px-3 py-2 max-w-xs truncate">{row.description}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {row.amount.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        row.type === 'credit'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {row.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell">
                    {row.isDuplicate && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                        <AlertTriangle size={12} />
                        Duplicate
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {selectedCount} row{selectedCount !== 1 ? 's' : ''} selected for import
        </p>
        <button
          onClick={() => onConfirm(Array.from(selection))}
          disabled={selectedCount === 0 || isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Importing...' : `Import ${selectedCount} Transaction${selectedCount !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}
