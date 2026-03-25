import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../features/document-upload/index.js', () => ({
  AiSettingsPanel: () => <div data-testid="ai-settings">AiSettingsPanel</div>,
}));

vi.mock('../../../features/settings/index.js', () => ({
  CurrencySelector: () => <div data-testid="currency-selector">CurrencySelector</div>,
  CsvExport: () => <div data-testid="csv-export">CsvExport</div>,
  DataManagement: () => <div data-testid="data-management">DataManagement</div>,
  DbStats: () => <div data-testid="db-stats">DbStats</div>,
}));

vi.mock('../../../features/tags/index.js', () => ({
  TagManager: () => null,
}));

import { SettingsPage } from '../settings.js';

afterEach(cleanup);

describe('SettingsPage', () => {
  it('renders Settings heading', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders CurrencySelector', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('currency-selector')).toBeInTheDocument();
  });

  it('renders Manage Budget Goals link', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Manage Budget Goals')).toBeInTheDocument();
  });

  it('renders Import Data link', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Import Data/)).toBeInTheDocument();
  });

  it('renders Manage Tags button', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Manage Tags')).toBeInTheDocument();
  });

  it('renders AiSettingsPanel', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('ai-settings')).toBeInTheDocument();
  });

  it('renders CsvExport', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('csv-export')).toBeInTheDocument();
  });

  it('renders DataManagement', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('data-management')).toBeInTheDocument();
  });

  it('renders DbStats', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('db-stats')).toBeInTheDocument();
  });
});
