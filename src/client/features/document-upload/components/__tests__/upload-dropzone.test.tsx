import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { UploadDropzone } from '../upload-dropzone.js';

const mockMutate = vi.fn();

vi.mock('../../hooks.js', () => ({
  useUploadDocument: vi.fn(() => ({
    mutate: mockMutate,
    isPending: false,
    isError: false,
    error: null,
  })),
}));

vi.mock('../../logger.js', () => ({
  log: { error: vi.fn(), info: vi.fn() },
}));

vi.mock('react-dropzone', () => ({
  useDropzone: vi.fn(({ onDrop }: any) => ({
    getRootProps: () => ({
      onClick: () => {
        // Simulate file selection via onDrop
        const file = new File(['pdf content'], 'statement.pdf', { type: 'application/pdf' });
        onDrop([file]);
      },
    }),
    getInputProps: () => ({ 'data-testid': 'file-input' }),
    isDragActive: false,
    fileRejections: [],
  })),
}));

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    Upload: (props: any) => <span data-testid="upload-icon" {...props} />,
    X: (props: any) => <span data-testid="x-icon" {...props} />,
  };
});

describe('UploadDropzone', () => {
  afterEach(cleanup);

  it('renders the dropzone area with instructions', () => {
    render(<UploadDropzone />);
    expect(screen.getByText('Upload Document')).toBeDefined();
    expect(screen.getByText(/drag & drop a pdf file/i)).toBeDefined();
  });

  it('shows document type select after file is selected', () => {
    render(<UploadDropzone />);
    // Click the dropzone to simulate file selection
    fireEvent.click(screen.getByText(/drag & drop a pdf file/i));

    expect(screen.getByText('Document Type *')).toBeDefined();
    expect(screen.getByText('Bank Statement')).toBeDefined();
  });

  it('shows institution and period fields after file selection', () => {
    render(<UploadDropzone />);
    fireEvent.click(screen.getByText(/drag & drop a pdf file/i));

    expect(screen.getByText('Institution')).toBeDefined();
    expect(screen.getByPlaceholderText('e.g., Commonwealth Bank')).toBeDefined();
    expect(screen.getByText('Period')).toBeDefined();
    expect(screen.getByPlaceholderText('e.g., Jan 2024')).toBeDefined();
  });

  it('shows the selected filename', () => {
    render(<UploadDropzone />);
    fireEvent.click(screen.getByText(/drag & drop a pdf file/i));
    expect(screen.getByText('statement.pdf')).toBeDefined();
  });

  it('shows upload button after file selection', () => {
    render(<UploadDropzone />);
    fireEvent.click(screen.getByText(/drag & drop a pdf file/i));
    expect(screen.getByText('Upload & Process')).toBeDefined();
  });

  it('clears file when X button is clicked', () => {
    render(<UploadDropzone />);
    fireEvent.click(screen.getByText(/drag & drop a pdf file/i));
    expect(screen.getByText('statement.pdf')).toBeDefined();

    // Click the clear button
    const clearButton = screen.getByText('statement.pdf').parentElement!.querySelector('button')!;
    fireEvent.click(clearButton);

    // Should return to dropzone state
    expect(screen.queryByText('statement.pdf')).toBeNull();
  });

  it('renders all document type options', () => {
    render(<UploadDropzone />);
    fireEvent.click(screen.getByText(/drag & drop a pdf file/i));

    const select = screen.getByRole('combobox');
    expect(select).toBeDefined();
    // Check option values exist
    const options = select.querySelectorAll('option');
    expect(options.length).toBe(5);
  });

  it('changes document type selection', () => {
    render(<UploadDropzone />);
    fireEvent.click(screen.getByText(/drag & drop a pdf file/i));

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'payslip' } });
    expect((select as HTMLSelectElement).value).toBe('payslip');
  });

  it('fills in institution field', () => {
    render(<UploadDropzone />);
    fireEvent.click(screen.getByText(/drag & drop a pdf file/i));

    const institutionInput = screen.getByPlaceholderText('e.g., Commonwealth Bank');
    fireEvent.change(institutionInput, { target: { value: 'NAB' } });
    expect((institutionInput as HTMLInputElement).value).toBe('NAB');
  });

  it('fills in period field', () => {
    render(<UploadDropzone />);
    fireEvent.click(screen.getByText(/drag & drop a pdf file/i));

    const periodInput = screen.getByPlaceholderText('e.g., Jan 2024');
    fireEvent.change(periodInput, { target: { value: 'Feb 2026' } });
    expect((periodInput as HTMLInputElement).value).toBe('Feb 2026');
  });

  it('calls mutate when form is submitted', () => {
    render(<UploadDropzone />);
    fireEvent.click(screen.getByText(/drag & drop a pdf file/i));

    // Fill institution and period
    const institutionInput = screen.getByPlaceholderText('e.g., Commonwealth Bank');
    fireEvent.change(institutionInput, { target: { value: 'CBA' } });

    const periodInput = screen.getByPlaceholderText('e.g., Jan 2024');
    fireEvent.change(periodInput, { target: { value: 'Jan 2026' } });

    // Submit form
    fireEvent.click(screen.getByText('Upload & Process'));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        file: expect.any(File),
        docType: 'bank_statement',
        institution: 'CBA',
        period: 'Jan 2026',
      }),
      expect.any(Object),
    );
  });

  it('shows uploading text when mutation is pending', async () => {
    const { useUploadDocument } = await import('../../hooks.js');
    (useUploadDocument as any).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
      isError: false,
      error: null,
    });

    render(<UploadDropzone />);
    // Select a file first so the form renders (Uploading... is on the submit button)
    fireEvent.click(screen.getByText(/drag & drop a pdf file/i));
    expect(screen.getByText('Uploading...')).toBeDefined();
  });

  it('shows error message when upload fails', async () => {
    const { useUploadDocument } = await import('../../hooks.js');
    (useUploadDocument as any).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: true,
      error: new Error('Server error'),
    });

    render(<UploadDropzone />);
    // Need to select a file first to see the form with error
    fireEvent.click(screen.getByText(/drag & drop a pdf file/i));
    expect(screen.getByText('Server error')).toBeDefined();
  });
});
