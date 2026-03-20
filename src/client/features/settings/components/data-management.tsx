import { useState } from 'react';
import { Trash2, RefreshCw, Zap, Loader2 } from 'lucide-react';
import { useDeleteAllData, useReSeedCategories, useAutoCategorise } from '../hooks.js';

type ConfirmingAction = 'delete-all' | 're-seed' | null;

export function DataManagement() {
  const [confirming, setConfirming] = useState<ConfirmingAction>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const deleteAll = useDeleteAllData();
  const reSeed = useReSeedCategories();
  const autoCategorise = useAutoCategorise();

  const isLoading = deleteAll.isPending || reSeed.isPending || autoCategorise.isPending;

  function clearMessages() {
    setSuccess(null);
    deleteAll.reset();
    reSeed.reset();
    autoCategorise.reset();
  }

  function handleDeleteAll() {
    clearMessages();
    setConfirming(null);
    deleteAll.mutate(undefined, {
      onSuccess: (result) => {
        setSuccess(
          `Deleted ${result.deletedTransactions} transactions, ${result.deletedAccountSummaries} account summaries, ${result.deletedDocuments} documents`,
        );
      },
    });
  }

  function handleReSeed() {
    clearMessages();
    setConfirming(null);
    reSeed.mutate(undefined, {
      onSuccess: () => {
        setSuccess('Default categories re-seeded. Consider re-running categorisation to re-assign transactions.');
      },
    });
  }

  function handleAutoCategorise() {
    clearMessages();
    autoCategorise.mutate(undefined, {
      onSuccess: (result) => {
        setSuccess(`Categorised ${result.categorised} of ${result.total} transactions`);
      },
    });
  }

  const errorMessage =
    deleteAll.error?.message ??
    reSeed.error?.message ??
    autoCategorise.error?.message ??
    null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Data Management</h3>
      <p className="text-sm text-gray-500 mb-4">
        Manage your data and categories. Destructive actions cannot be undone.
      </p>

      <div className="space-y-3">
        {/* Delete All Data */}
        <div className="flex items-center gap-3">
          {confirming === 'delete-all' ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600 font-medium">Are you sure? This deletes all transactions, documents, and uploaded files.</span>
              <button
                onClick={handleDeleteAll}
                disabled={isLoading}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteAll.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
              </button>
              <button
                onClick={() => setConfirming(null)}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => { clearMessages(); setConfirming('delete-all'); }}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete All Data
            </button>
          )}
        </div>

        {/* Re-seed Default Categories */}
        <div className="flex items-center gap-3">
          {confirming === 're-seed' ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-amber-600 font-medium">Are you sure? This replaces all categories with defaults.</span>
              <button
                onClick={handleReSeed}
                disabled={isLoading}
                className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {reSeed.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
              </button>
              <button
                onClick={() => setConfirming(null)}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => { clearMessages(); setConfirming('re-seed'); }}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Re-seed Default Categories
            </button>
          )}
        </div>

        {/* Re-run Categorisation */}
        <button
          onClick={handleAutoCategorise}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
        >
          {autoCategorise.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          Re-run Categorisation
        </button>
      </div>

      {success && (
        <p className="mt-3 text-sm text-green-600">{success}</p>
      )}
      {errorMessage && (
        <p className="mt-3 text-sm text-red-600">{errorMessage}</p>
      )}
    </div>
  );
}
