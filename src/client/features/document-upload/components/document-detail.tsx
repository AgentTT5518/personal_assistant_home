import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useDocument, useDocumentTransactions, useReprocessVision } from '../hooks.js';

const DOC_TYPE_LABELS: Record<string, string> = {
  bank_statement: 'Bank Statement',
  credit_card: 'Credit Card',
  payslip: 'Payslip',
  tax_return: 'Tax Return',
  investment_report: 'Investment Report',
};

export function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: doc, isLoading, error } = useDocument(id!);
  const { data: transactions } = useDocumentTransactions(
    id!,
    doc?.processingStatus === 'completed',
  );
  const visionMutation = useReprocessVision();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-sm text-red-600">
          {error instanceof Error ? error.message : 'Document not found'}
        </p>
        <Link to="/documents" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
          Back to documents
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/documents" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h2 className="text-xl font-bold text-gray-900">{doc.filename}</h2>
      </div>

      {/* Metadata */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Type</dt>
            <dd className="font-medium text-gray-900">{DOC_TYPE_LABELS[doc.docType] ?? doc.docType}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Status</dt>
            <dd className="font-medium text-gray-900 capitalize">{doc.processingStatus}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Institution</dt>
            <dd className="font-medium text-gray-900">{doc.institution ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Period</dt>
            <dd className="font-medium text-gray-900">{doc.period ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Uploaded</dt>
            <dd className="font-medium text-gray-900">{new Date(doc.createdAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Processed</dt>
            <dd className="font-medium text-gray-900">
              {doc.processedAt ? new Date(doc.processedAt).toLocaleString() : '—'}
            </dd>
          </div>
          {doc.isScanned !== undefined && (
            <div>
              <dt className="text-gray-500">Scanned PDF</dt>
              <dd className="font-medium text-gray-900">{doc.isScanned ? 'Yes' : 'No'}</dd>
            </div>
          )}
          <div>
            <dt className="text-gray-500">Transactions</dt>
            <dd className="font-medium text-gray-900">{doc.transactionCount ?? 0}</dd>
          </div>
        </dl>
      </div>

      {/* Status-specific content */}
      {(doc.processingStatus === 'pending' || doc.processingStatus === 'processing') && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 flex items-center gap-3">
          <Loader2 className="animate-spin text-yellow-600" size={20} />
          <p className="text-sm text-yellow-700">
            {doc.processingStatus === 'pending'
              ? 'Waiting to start processing...'
              : 'Extracting data from your document...'}
          </p>
        </div>
      )}

      {doc.processingStatus === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-500 mt-0.5" size={20} />
            <div>
              <p className="text-sm text-red-700 font-medium">Processing failed</p>
              <p className="text-sm text-red-600 mt-1">
                The document could not be processed. Try re-processing with Vision for scanned documents.
              </p>
              {doc.hasFile && (
                <button
                  onClick={() => visionMutation.mutate(doc.id)}
                  disabled={visionMutation.isPending}
                  className="mt-3 inline-flex items-center gap-2 bg-blue-600 text-white rounded-md px-3 py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  <RefreshCw size={14} />
                  Re-process with Vision
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transactions table */}
      {doc.processingStatus === 'completed' && transactions && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              Transactions ({transactions.length})
            </h3>
          </div>
          {transactions.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-500">No transactions extracted from this document.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Merchant</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-600">{txn.date}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{txn.description}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{txn.merchant ?? '—'}</td>
                      <td className="px-4 py-2 text-sm text-right font-mono">
                        <span className={txn.type === 'credit' ? 'text-green-600' : 'text-gray-900'}>
                          {txn.type === 'credit' ? '+' : '-'}${txn.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            txn.type === 'credit'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {txn.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Vision reprocess button for completed scanned docs */}
      {doc.processingStatus === 'completed' && doc.isScanned && doc.hasFile && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <p className="text-sm text-blue-700">
            This appears to be a scanned document. Vision processing may yield better results.
          </p>
          <button
            onClick={() => visionMutation.mutate(doc.id)}
            disabled={visionMutation.isPending}
            className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-md px-3 py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw size={14} />
            Re-process with Vision
          </button>
        </div>
      )}
    </div>
  );
}
