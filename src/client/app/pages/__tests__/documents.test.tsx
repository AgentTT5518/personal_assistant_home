import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('../../../features/document-upload/index.js', () => ({
  DocumentUploadPage: () => <div data-testid="document-upload-page">DocumentUploadPage</div>,
}));

import { DocumentsPage } from '../documents.js';

afterEach(cleanup);

describe('DocumentsPage', () => {
  it('renders DocumentUploadPage component', () => {
    render(<DocumentsPage />);
    expect(screen.getByTestId('document-upload-page')).toBeInTheDocument();
  });
});
