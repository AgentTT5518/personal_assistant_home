import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Eye, RefreshCw, Loader2 } from 'lucide-react';
import type { DocumentType, ProcessingStatus } from '../../../../shared/types/index.js';
import { useDocuments, useDeleteDocument, useReprocessVision } from '../hooks.js';

const STATUS_STYLES: Record<ProcessingStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  processing: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  bank_statement: 'Bank Statement',
  credit_card: 'Credit Card',
  payslip: 'Payslip',
  tax_return: 'Tax Return',
  investment_report: 'Investment Report',
};

export function DocumentList() {
  const [statusFilter, setStatusFilter] = useState<ProcessingStatus | ''>('');
  const [docTypeFilter, setDocTypeFilter] = useState<DocumentType | ''>('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: documents, isLoading, error } = useDocuments({
    status: statusFilter || undefined,
    docType: docTypeFilter || undefined,
  });

  const deleteMutation = useDeleteDocument();
  const visionMutation = useReprocessVision();

  function handleDelete(id: string) {
    if (confirmDelete === id) {
      deleteMutation.mutate(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Loader2 className="mx-auto animate-spin text-gray-400" size={24} />
        <p className="text-sm text-gray-500 mt-2">Loading documents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <p className="text-sm text-red-600">
          Failed to load documents: {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProcessingStatus | '')}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={docTypeFilter}
          onChange={(e) => setDocTypeFilter(e.target.value as DocumentType | '')}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm"
        >
          <option value="">All types</option>
          {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {!documents || documents.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm text-gray-500">No documents yet — upload your first PDF above.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3">Filename</th>
              <th className="px-4 py-3">Type</th>
              <th className="hidden sm:table-cell px-4 py-3">Institution</th>
              <th className="px-4 py-3">Status</th>
              <th className="hidden sm:table-cell px-4 py-3">Transactions</th>
              <th className="hidden sm:table-cell px-4 py-3">Date</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    to={`/documents/${doc.id}`}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {doc.filename}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {DOC_TYPE_LABELS[doc.docType] ?? doc.docType}
                </td>
                <td className="hidden sm:table-cell px-4 py-3 text-sm text-gray-600">
                  {doc.institution ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[doc.processingStatus]}`}
                  >
                    {doc.processingStatus === 'processing' && (
                      <Loader2 className="animate-spin" size={12} />
                    )}
                    {doc.processingStatus}
                  </span>
                </td>
                <td className="hidden sm:table-cell px-4 py-3 text-sm text-gray-600">
                  {doc.transactionCount ?? 0}
                </td>
                <td className="hidden sm:table-cell px-4 py-3 text-sm text-gray-500">
                  {new Date(doc.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/documents/${doc.id}`}
                      className="text-gray-400 hover:text-gray-600"
                      title="View details"
                    >
                      <Eye size={16} />
                    </Link>
                    {doc.hasFile &&
                      (doc.processingStatus === 'completed' || doc.processingStatus === 'failed') && (
                        <button
                          onClick={() => visionMutation.mutate(doc.id)}
                          disabled={visionMutation.isPending}
                          className="text-gray-400 hover:text-blue-600"
                          title="Re-process with Vision"
                        >
                          <RefreshCw size={16} />
                        </button>
                      )}
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className={`text-gray-400 hover:text-red-600 ${
                        confirmDelete === doc.id ? 'text-red-600' : ''
                      }`}
                      title={confirmDelete === doc.id ? 'Click again to confirm' : 'Delete'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
