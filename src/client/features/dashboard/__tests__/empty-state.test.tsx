import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EmptyState } from '../components/empty-state.js';

afterEach(cleanup);

describe('EmptyState', () => {
  it('renders heading text', () => {
    render(
      <MemoryRouter>
        <EmptyState />
      </MemoryRouter>,
    );
    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(
      <MemoryRouter>
        <EmptyState />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(/Upload a bank statement or financial document/),
    ).toBeInTheDocument();
  });

  it('renders upload link pointing to /documents', () => {
    render(
      <MemoryRouter>
        <EmptyState />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: /Upload Documents/ });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/documents');
  });
});
