import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { ImportWizard } from '../import-wizard.js';

vi.mock('lucide-react', () => ({
  Upload: () => <span data-testid="upload-icon">UploadIcon</span>,
  CheckCircle: () => <span>CheckCircle</span>,
  ArrowLeft: () => <span>ArrowLeft</span>,
}));

vi.mock('../../../accounts/components/account-selector.js', () => ({
  AccountSelector: ({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) => (
    <select data-testid="account-selector" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">No Account</option>
      <option value="acc-1">Checking</option>
    </select>
  ),
}));

vi.mock('../column-mapper.js', () => ({
  ColumnMapper: () => <div data-testid="column-mapper">ColumnMapper</div>,
}));

vi.mock('../import-preview.js', () => ({
  ImportPreview: () => <div data-testid="import-preview">ImportPreview</div>,
}));

vi.mock('../../logger.js', () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const mockUploadMutateAsync = vi.fn();
const mockMappingMutateAsync = vi.fn();
const mockConfirmMutateAsync = vi.fn();

vi.mock('../../hooks.js', () => ({
  useUploadImport: () => ({
    mutateAsync: mockUploadMutateAsync,
    isPending: false,
  }),
  useSaveColumnMapping: () => ({
    mutateAsync: mockMappingMutateAsync,
    isPending: false,
  }),
  useConfirmImport: () => ({
    mutateAsync: mockConfirmMutateAsync,
    isPending: false,
  }),
}));

describe('ImportWizard', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders step indicators', () => {
    render(<ImportWizard />);
    // "Upload" appears in both step indicator and the Upload icon area,
    // so use getAllByText for the step indicator check
    const uploadElements = screen.getAllByText('Upload');
    expect(uploadElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Map Columns')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('renders upload step initially', () => {
    render(<ImportWizard />);
    expect(screen.getByText(/drop a file here or click to browse/i)).toBeInTheDocument();
  });

  it('renders account selector on upload step', () => {
    render(<ImportWizard />);
    expect(screen.getByTestId('account-selector')).toBeInTheDocument();
  });

  it('renders file type support text', () => {
    render(<ImportWizard />);
    expect(screen.getByText(/supports csv, ofx, qfx, and qif/i)).toBeInTheDocument();
  });

  it('highlights Upload step as active', () => {
    render(<ImportWizard />);
    // Find the step indicator span (not the icon span)
    const uploadSteps = screen.getAllByText('Upload');
    const stepIndicator = uploadSteps.find((el) => el.className.includes('rounded-full'));
    expect(stepIndicator?.className).toContain('bg-blue-100');
  });

  it('does not show mapping, preview, or complete content initially', () => {
    render(<ImportWizard />);
    expect(screen.queryByTestId('column-mapper')).not.toBeInTheDocument();
    expect(screen.queryByTestId('import-preview')).not.toBeInTheDocument();
    expect(screen.queryByText('Import Complete')).not.toBeInTheDocument();
  });

  it('renders file input', () => {
    render(<ImportWizard />);
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput?.getAttribute('accept')).toBe('.csv,.ofx,.qfx,.qif');
  });

  it('advances to mapping step when upload needs mapping', async () => {
    mockUploadMutateAsync.mockResolvedValue({
      session: { id: 'session-1' },
      needsMapping: true,
      headers: ['Date', 'Description', 'Amount'],
      preview: [],
    });

    render(<ImportWizard />);
    const fileInput = document.querySelector('input[type="file"]')!;

    await act(async () => {
      fireEvent.change(fileInput, {
        target: { files: [new File(['csv content'], 'test.csv', { type: 'text/csv' })] },
      });
    });

    expect(screen.getByTestId('column-mapper')).toBeInTheDocument();
  });

  it('advances to preview step when upload does not need mapping', async () => {
    mockUploadMutateAsync.mockResolvedValue({
      session: { id: 'session-1' },
      needsMapping: false,
      headers: [],
      preview: [{ date: '2026-01-01', description: 'Test', amount: 100 }],
    });

    render(<ImportWizard />);
    const fileInput = document.querySelector('input[type="file"]')!;

    await act(async () => {
      fireEvent.change(fileInput, {
        target: { files: [new File(['ofx content'], 'test.ofx', { type: 'application/ofx' })] },
      });
    });

    expect(screen.getByTestId('import-preview')).toBeInTheDocument();
  });

  it('shows error message when upload fails', async () => {
    mockUploadMutateAsync.mockRejectedValue(new Error('File too large'));

    render(<ImportWizard />);
    const fileInput = document.querySelector('input[type="file"]')!;

    await act(async () => {
      fireEvent.change(fileInput, {
        target: { files: [new File(['big content'], 'big.csv', { type: 'text/csv' })] },
      });
    });

    expect(screen.getByText('File too large')).toBeInTheDocument();
  });

  it('allows changing account selection on upload step', () => {
    render(<ImportWizard />);
    const accountSelect = screen.getByTestId('account-selector');
    fireEvent.change(accountSelect, { target: { value: 'acc-1' } });
    expect((accountSelect as HTMLSelectElement).value).toBe('acc-1');
  });

  it('shows column mapper on mapping step after upload needs mapping', async () => {
    mockUploadMutateAsync.mockResolvedValue({
      session: { id: 'session-1' },
      needsMapping: true,
      headers: ['Date', 'Description', 'Amount'],
      preview: [],
    });

    render(<ImportWizard />);
    const fileInput = document.querySelector('input[type="file"]')!;

    await act(async () => {
      fireEvent.change(fileInput, {
        target: { files: [new File(['csv content'], 'test.csv', { type: 'text/csv' })] },
      });
    });

    expect(screen.getByTestId('column-mapper')).toBeInTheDocument();
    // Back button should be visible on mapping step
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('highlights Map Columns step as active when on mapping step', async () => {
    mockUploadMutateAsync.mockResolvedValue({
      session: { id: 'session-1' },
      needsMapping: true,
      headers: ['Date', 'Description', 'Amount'],
      preview: [],
    });

    render(<ImportWizard />);
    const fileInput = document.querySelector('input[type="file"]')!;

    await act(async () => {
      fireEvent.change(fileInput, {
        target: { files: [new File(['csv'], 'test.csv', { type: 'text/csv' })] },
      });
    });

    const mapColumnsStep = screen.getByText('Map Columns');
    expect(mapColumnsStep.className).toContain('bg-blue-100');
  });

  it('marks Upload step as done (green) when on mapping step', async () => {
    mockUploadMutateAsync.mockResolvedValue({
      session: { id: 'session-1' },
      needsMapping: true,
      headers: ['Date', 'Description', 'Amount'],
      preview: [],
    });

    render(<ImportWizard />);
    const fileInput = document.querySelector('input[type="file"]')!;

    await act(async () => {
      fireEvent.change(fileInput, {
        target: { files: [new File(['csv'], 'test.csv', { type: 'text/csv' })] },
      });
    });

    const uploadSteps = screen.getAllByText('Upload');
    const stepIndicator = uploadSteps.find((el) => el.className.includes('rounded-full'));
    expect(stepIndicator?.className).toContain('bg-green-100');
  });

  it('renders account selector label on upload step', () => {
    render(<ImportWizard />);
    expect(screen.getByText('Account (optional)')).toBeInTheDocument();
  });

  it('renders account selector with No Account default', () => {
    render(<ImportWizard />);
    const accountSelect = screen.getByTestId('account-selector') as HTMLSelectElement;
    expect(accountSelect.value).toBe('');
    expect(screen.getByText('No Account')).toBeInTheDocument();
  });

  it('highlights Preview step as active when on preview step', async () => {
    mockUploadMutateAsync.mockResolvedValue({
      session: { id: 'session-1' },
      needsMapping: false,
      headers: [],
      preview: [{ date: '2026-01-01', description: 'Test', amount: 100 }],
    });

    render(<ImportWizard />);
    const fileInput = document.querySelector('input[type="file"]')!;

    await act(async () => {
      fireEvent.change(fileInput, {
        target: { files: [new File(['ofx'], 'test.ofx', { type: 'application/ofx' })] },
      });
    });

    const previewStep = screen.getByText('Preview');
    // The step indicator with rounded-full class
    const stepIndicator = previewStep.className.includes('rounded-full') ? previewStep : null;
    if (stepIndicator) {
      expect(stepIndicator.className).toContain('bg-blue-100');
    } else {
      // Preview text is the step indicator itself
      expect(previewStep.className).toContain('bg-blue-100');
    }
  });
});
