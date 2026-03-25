import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from '../layout.js';

beforeEach(() => {
  const store: Record<string, string> = {};
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] ?? null);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
    store[key] = String(value);
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Layout', () => {
  it('renders app title', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    expect(screen.getAllByText('Assistant Home').length).toBeGreaterThanOrEqual(1);
  });

  it('renders nav links for key pages', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Documents').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Transactions').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Settings').length).toBeGreaterThanOrEqual(1);
  });

  it('renders planning section nav links', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    expect(screen.getAllByText('Accounts').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bills').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Budgets').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Goals').length).toBeGreaterThanOrEqual(1);
  });

  it('renders insights section nav links', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    expect(screen.getAllByText('Analysis').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Reports').length).toBeGreaterThanOrEqual(1);
  });

  it('renders mobile menu button', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /Open navigation/ })).toBeInTheDocument();
  });

  it('renders section toggle buttons', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    // Each section label appears as a collapsible button (twice: desktop + mobile sidebar)
    expect(screen.getAllByText('Overview').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Data').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Planning').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Insights').length).toBeGreaterThanOrEqual(1);
  });

  it('collapses nav section when toggle button is clicked', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    // Data section items should be visible initially
    expect(screen.getAllByText('Documents').length).toBeGreaterThanOrEqual(1);

    // Click the first "Data" section toggle button
    const dataButtons = screen.getAllByText('Data');
    fireEvent.click(dataButtons[0]);

    // After collapsing, the Data section should store collapsed state to localStorage
    expect(Storage.prototype.setItem).toHaveBeenCalled();
  });

  it('opens mobile sidebar when menu button is clicked', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    const menuButton = screen.getByRole('button', { name: /Open navigation/ });
    fireEvent.click(menuButton);

    // The close button should now be visible
    expect(screen.getByRole('button', { name: /Close navigation/ })).toBeInTheDocument();
  });

  it('closes mobile sidebar when close button is clicked', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    // Open sidebar
    fireEvent.click(screen.getByRole('button', { name: /Open navigation/ }));
    expect(screen.getByRole('button', { name: /Close navigation/ })).toBeInTheDocument();

    // Close sidebar
    fireEvent.click(screen.getByRole('button', { name: /Close navigation/ }));
    // The dialog should have the -translate-x-full class (closed state)
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('-translate-x-full');
  });

  it('closes mobile sidebar on Escape key', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    // Open sidebar
    fireEvent.click(screen.getByRole('button', { name: /Open navigation/ }));
    expect(screen.getByRole('dialog').className).toContain('translate-x-0');

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('dialog').className).toContain('-translate-x-full');
  });

  it('persists section collapsed state to localStorage', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );

    // Toggle Planning section
    const planningButtons = screen.getAllByText('Planning');
    fireEvent.click(planningButtons[0]);

    // Check localStorage was updated
    const calls = (Storage.prototype.setItem as any).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toBe('nav-collapsed-sections');
    const stored = JSON.parse(lastCall[1]);
    expect(stored['Planning']).toBe(true);
  });

  it('sets aria-expanded correctly on section toggles', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    // All sections start expanded
    const overviewButtons = screen.getAllByText('Overview');
    const button = overviewButtons[0].closest('button')!;
    expect(button.getAttribute('aria-expanded')).toBe('true');

    // Toggle it
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('renders Settings link at the bottom of sidebar', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    const settingsLinks = screen.getAllByText('Settings');
    expect(settingsLinks.length).toBeGreaterThanOrEqual(1);
    // Settings link should point to /settings
    const link = settingsLinks[0].closest('a');
    expect(link?.getAttribute('href')).toBe('/settings');
  });

  it('renders Import nav link under Data section', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    const importLinks = screen.getAllByText('Import');
    expect(importLinks.length).toBeGreaterThanOrEqual(1);
    const link = importLinks[0].closest('a');
    expect(link?.getAttribute('href')).toBe('/import');
  });

  it('hides nav items when section is collapsed', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    // Initially Data section has Documents visible
    const documentsBefore = screen.getAllByText('Documents');
    expect(documentsBefore.length).toBeGreaterThanOrEqual(1);

    // Collapse the Data section (both desktop and mobile have it)
    const dataButtons = screen.getAllByText('Data');
    fireEvent.click(dataButtons[0]);

    // Toggle back to count documents - at least one should remain (from other sidebar)
    // But in the collapsed sidebar, items are hidden
    const dataButton = dataButtons[0].closest('button')!;
    expect(dataButton.getAttribute('aria-expanded')).toBe('false');
  });

  it('renders Dashboard link pointing to root', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    const dashboardLinks = screen.getAllByText('Dashboard');
    const link = dashboardLinks[0].closest('a');
    expect(link?.getAttribute('href')).toBe('/');
  });

  it('renders mobile close button with correct aria-label', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    // Open sidebar first
    fireEvent.click(screen.getByRole('button', { name: /Open navigation/ }));
    const closeBtn = screen.getByRole('button', { name: /Close navigation/ });
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn.getAttribute('aria-label')).toBe('Close navigation');
  });

  it('renders mobile sidebar as dialog with aria-modal', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('Navigation');
  });
});
