import { FileSpreadsheet, Trash2, Undo2 } from 'lucide-react';
import { useImportSessions, useUndoImport, useDeleteImportSession } from '../hooks.js';

export function ImportHistory() {
  const { data: sessions, isLoading } = useImportSessions();
  const undoMutation = useUndoImport();
  const deleteMutation = useDeleteImportSession();

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading import history...</p>;
  }

  if (!sessions || sessions.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-4 text-center">
        No previous imports. Upload a CSV, OFX, or QIF file above.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900">Import History</h3>
      <div className="space-y-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex items-center justify-between p-3 bg-white border rounded-lg"
          >
            <div className="flex items-center gap-3">
              <FileSpreadsheet size={20} className="text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{session.filename}</p>
                <p className="text-xs text-gray-500">
                  {session.fileType.toUpperCase()} &middot;{' '}
                  {session.importedRows} imported &middot;{' '}
                  {session.duplicateRows} duplicates &middot;{' '}
                  {new Date(session.createdAt).toLocaleDateString()}
                  {session.accountName && ` \u00B7 ${session.accountName}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  session.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : session.status === 'failed'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                {session.status}
              </span>
              {session.status === 'completed' && (
                <button
                  onClick={() => undoMutation.mutate(session.id)}
                  disabled={undoMutation.isPending}
                  className="p-1.5 text-gray-400 hover:text-amber-600 rounded"
                  title="Undo import"
                >
                  <Undo2 size={16} />
                </button>
              )}
              <button
                onClick={() => deleteMutation.mutate(session.id)}
                disabled={deleteMutation.isPending}
                className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                title="Delete session"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
