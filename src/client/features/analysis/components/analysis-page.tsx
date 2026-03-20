import { useState, useEffect } from 'react';
import { useGenerateAnalysis, useSnapshots, useSnapshot, useDeleteSnapshot } from '../hooks.js';
import { GeneratePanel } from './generate-panel.js';
import { InsightsDisplay } from './insights-display.js';
import { SnapshotHistory } from './snapshot-history.js';
import { EmptyState } from './empty-state.js';

export function AnalysisPage() {
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateMutation = useGenerateAnalysis();
  const deleteMutation = useDeleteSnapshot();
  const { data: snapshots = [] } = useSnapshots();
  const { data: activeSnapshot } = useSnapshot(activeSnapshotId);

  // Auto-select most recent snapshot on load
  useEffect(() => {
    if (!activeSnapshotId && snapshots.length > 0) {
      setActiveSnapshotId(snapshots[0].id);
    }
  }, [snapshots, activeSnapshotId]);

  function handleGenerate(dateFrom?: string, dateTo?: string) {
    setError(null);
    generateMutation.mutate(
      { dateFrom, dateTo },
      {
        onSuccess: (data) => {
          setActiveSnapshotId(data.id);
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Failed to generate analysis');
        },
      },
    );
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        if (activeSnapshotId === id) {
          setActiveSnapshotId(null);
        }
      },
    });
  }

  const hasInsights = activeSnapshot?.data;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Analysis</h2>

      <GeneratePanel
        onGenerate={handleGenerate}
        isGenerating={generateMutation.isPending}
        error={error}
      />

      <SnapshotHistory
        snapshots={snapshots}
        activeId={activeSnapshotId}
        onSelect={setActiveSnapshotId}
        onDelete={handleDelete}
        isDeleting={deleteMutation.isPending}
      />

      {hasInsights ? (
        <InsightsDisplay insights={activeSnapshot.data} />
      ) : (
        !generateMutation.isPending && <EmptyState />
      )}
    </div>
  );
}
