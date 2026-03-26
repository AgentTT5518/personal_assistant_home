import { useState, useCallback } from 'react';
import { Upload, CheckCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { AccountSelector } from '../../accounts/components/account-selector.js';
import { useUploadImport, useSaveColumnMapping, useConfirmImport } from '../hooks.js';
import { ColumnMapper } from './column-mapper.js';
import { ImportPreview } from './import-preview.js';
import type { ImportPreviewRow, ImportUploadResponse, ColumnMapping } from '@shared/types/index.js';
import { log } from '../logger.js';

type WizardStep = 'upload' | 'mapping' | 'preview' | 'complete';

export function ImportWizard() {
  const [step, setStep] = useState<WizardStep>('upload');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadMutation = useUploadImport();
  const mappingMutation = useSaveColumnMapping();
  const confirmMutation = useConfirmImport();

  const handleFileSelect = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const result: ImportUploadResponse = await uploadMutation.mutateAsync({
          file,
          accountId: accountId ?? undefined,
        });

        setSessionId(result.session.id);

        if (result.needsMapping && result.headers) {
          setHeaders(result.headers);
          setStep('mapping');
        } else {
          setPreviewRows(result.preview);
          setStep('preview');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setError(message);
        log.error('File upload failed', err instanceof Error ? err : new Error(message));
      }
    },
    [accountId, uploadMutation],
  );

  const handleMapping = useCallback(
    async (mapping: ColumnMapping) => {
      if (!sessionId) return;
      setError(null);
      try {
        const result = await mappingMutation.mutateAsync({
          sessionId,
          mapping,
        });
        setPreviewRows(result.preview);
        setStep('preview');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Mapping failed';
        setError(message);
        log.error('Column mapping failed', err instanceof Error ? err : new Error(message));
      }
    },
    [sessionId, mappingMutation],
  );

  const handleConfirm = useCallback(
    async (selectedRows: number[]) => {
      if (!sessionId) return;
      setError(null);
      try {
        const result = await confirmMutation.mutateAsync({
          sessionId,
          selectedRows,
        });
        setImportedCount(result.importedCount);
        setStep('complete');
        toast.success(`Imported ${result.importedCount} transactions`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Import failed';
        setError(message);
        toast.error(message);
        log.error('Import confirm failed', err instanceof Error ? err : new Error(message));
      }
    },
    [sessionId, confirmMutation],
  );

  const reset = () => {
    setStep('upload');
    setSessionId(null);
    setHeaders([]);
    setPreviewRows([]);
    setImportedCount(0);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {['Upload', 'Map Columns', 'Preview', 'Complete'].map((label, i) => {
          const steps: WizardStep[] = ['upload', 'mapping', 'preview', 'complete'];
          const current = steps.indexOf(step);
          const isActive = i === current;
          const isDone = i < current;

          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-px bg-gray-300" />}
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : isDone
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Upload step */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Account (optional)</label>
            <AccountSelector
              value={accountId}
              onChange={setAccountId}
              includeAll={false}
              className="flex-1"
            />
          </div>

          <FileDropzone
            onFile={handleFileSelect}
            isLoading={uploadMutation.isPending}
          />
        </div>
      )}

      {/* Mapping step (CSV only) */}
      {step === 'mapping' && (
        <div>
          <button
            onClick={() => setStep('upload')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <ColumnMapper
            headers={headers}
            onSubmit={handleMapping}
            isLoading={mappingMutation.isPending}
          />
        </div>
      )}

      {/* Preview step */}
      {step === 'preview' && (
        <div>
          <button
            onClick={() => setStep(headers.length > 0 ? 'mapping' : 'upload')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <ImportPreview
            rows={previewRows}
            onConfirm={handleConfirm}
            isLoading={confirmMutation.isPending}
          />
        </div>
      )}

      {/* Complete step */}
      {step === 'complete' && (
        <div className="text-center py-8">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Complete</h3>
          <p className="text-sm text-gray-600 mb-6">
            Successfully imported {importedCount} transaction{importedCount !== 1 ? 's' : ''}.
          </p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}

function FileDropzone({ onFile, isLoading }: { onFile: (file: File) => void; isLoading: boolean }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
        isDragOver
          ? 'border-blue-400 bg-blue-50'
          : 'border-gray-300 bg-gray-50 hover:border-gray-400'
      } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <Upload size={32} className="text-gray-400" />
      <div className="text-center">
        <p className="text-sm font-medium text-gray-700">
          {isLoading ? 'Uploading...' : 'Drop a file here or click to browse'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Supports CSV, OFX, QFX, and QIF files (max 10MB)
        </p>
      </div>
      <input
        type="file"
        accept=".csv,.ofx,.qfx,.qif"
        onChange={handleChange}
        className="hidden"
        disabled={isLoading}
      />
    </label>
  );
}
