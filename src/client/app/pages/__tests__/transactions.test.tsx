import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('../../../features/transactions/index.js', () => ({
  TransactionsPage: () => (
    <div data-testid="transactions-page">
      <h2>Transactions</h2>
    </div>
  ),
}));

import { TransactionsPage } from '../transactions.js';

afterEach(cleanup);

describe('TransactionsPage (app page)', () => {
  it('renders the TransactionsPage component', () => {
    render(<TransactionsPage />);
    expect(screen.getByTestId('transactions-page')).toBeInTheDocument();
  });

  it('renders Transactions heading', () => {
    render(<TransactionsPage />);
    expect(screen.getByText('Transactions')).toBeInTheDocument();
  });
});
