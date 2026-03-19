import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="bg-gray-100 rounded-full p-4 mb-4">
        <FileText size={32} className="text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
      <p className="text-gray-500 mb-6 max-w-md">
        Upload a bank statement or financial document to see your spending overview here.
      </p>
      <Link
        to="/documents"
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        <FileText size={16} />
        Upload Documents
      </Link>
    </div>
  );
}
