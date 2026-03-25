import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('../../../features/import/index.js', () => ({
  ImportWizard: () => <div data-testid="import-wizard">ImportWizard</div>,
  ImportHistory: () => <div data-testid="import-history">ImportHistory</div>,
}));

import { ImportPage } from '../import.js';

afterEach(cleanup);

describe('ImportPage', () => {
  it('renders Import Data heading', () => {
    render(<ImportPage />);
    expect(screen.getByText('Import Data')).toBeInTheDocument();
  });

  it('renders ImportWizard component', () => {
    render(<ImportPage />);
    expect(screen.getByTestId('import-wizard')).toBeInTheDocument();
  });

  it('renders ImportHistory component', () => {
    render(<ImportPage />);
    expect(screen.getByTestId('import-history')).toBeInTheDocument();
  });
});
