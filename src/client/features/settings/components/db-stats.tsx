import { useQuery } from '@tanstack/react-query';
import { Loader2, Database, FileText, Tag, HardDrive, Info } from 'lucide-react';
import { fetchDbStats } from '../api.js';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DbStats() {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['db-stats'],
    queryFn: fetchDbStats,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <p className="text-sm text-red-600">Failed to load database stats</p>
      </div>
    );
  }

  const items = [
    { icon: FileText, label: 'Documents', value: stats.documentCount },
    { icon: Database, label: 'Transactions', value: stats.transactionCount },
    { icon: Tag, label: 'Categories', value: stats.categoryCount },
    { icon: HardDrive, label: 'Database Size', value: formatBytes(stats.dbSizeBytes) },
    { icon: Info, label: 'App Version', value: `v${stats.appVersion}` },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Database & About</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {items.map(({ icon: Icon, label, value }) => (
          <div key={label} className="text-center">
            <Icon className="h-5 w-5 mx-auto mb-1 text-gray-400" />
            <div className="text-lg font-semibold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
