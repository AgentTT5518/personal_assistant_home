import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X } from 'lucide-react';
import type { DocumentType } from '../../../../shared/types/index.js';
import { useUploadDocument } from '../hooks.js';
import { log } from '../logger.js';

const DOC_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'credit_card', label: 'Credit Card Statement' },
  { value: 'payslip', label: 'Payslip' },
  { value: 'tax_return', label: 'Tax Return' },
  { value: 'investment_report', label: 'Investment Report' },
];

export function UploadDropzone() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocumentType>('bank_statement');
  const [institution, setInstitution] = useState('');
  const [period, setPeriod] = useState('');
  const uploadMutation = useUploadDocument();

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) {
      setSelectedFile(accepted[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;

    uploadMutation.mutate(
      {
        file: selectedFile,
        docType,
        institution: institution || undefined,
        period: period || undefined,
      },
      {
        onSuccess: () => {
          setSelectedFile(null);
          setInstitution('');
          setPeriod('');
          log.info('Document uploaded successfully');
        },
        onError: (error) => {
          log.error('Upload failed', error instanceof Error ? error : new Error(String(error)));
        },
      },
    );
  }

  function clearFile() {
    setSelectedFile(null);
  }

  const rejectionMessage = fileRejections.length > 0
    ? fileRejections[0].errors.map((e) => e.message).join(', ')
    : null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Document</h3>

      {!selectedFile ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto mb-3 text-gray-400" size={32} />
          <p className="text-sm text-gray-600">
            {isDragActive
              ? 'Drop your PDF here...'
              : 'Drag & drop a PDF file, or click to browse'}
          </p>
          <p className="text-xs text-gray-400 mt-1">PDF only, max 10MB</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <span className="text-sm text-gray-700 truncate">{selectedFile.name}</span>
            <button
              type="button"
              onClick={clearFile}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Type *
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentType)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {DOC_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Institution
            </label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g., Commonwealth Bank"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Period
            </label>
            <input
              type="text"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="e.g., Jan 2024"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={uploadMutation.isPending}
            className="w-full bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Upload & Process'}
          </button>

          {uploadMutation.isError && (
            <p className="text-sm text-red-600">
              {uploadMutation.error instanceof Error
                ? uploadMutation.error.message
                : 'Upload failed'}
            </p>
          )}
        </form>
      )}

      {rejectionMessage && (
        <p className="text-sm text-red-600 mt-2">{rejectionMessage}</p>
      )}
    </div>
  );
}
