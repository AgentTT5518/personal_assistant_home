import { UploadDropzone } from './components/upload-dropzone.js';
import { DocumentList } from './components/document-list.js';

export function DocumentUploadPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
      <UploadDropzone />
      <DocumentList />
    </div>
  );
}
