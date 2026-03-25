import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('../../../features/accounts/index.js', () => ({
  AccountList: () => <div data-testid="account-list">AccountList</div>,
}));

import { AccountsPage } from '../accounts.js';

afterEach(cleanup);

describe('AccountsPage', () => {
  it('renders Accounts heading', () => {
    render(<AccountsPage />);
    expect(screen.getByText('Accounts')).toBeInTheDocument();
  });

  it('renders AccountList component', () => {
    render(<AccountsPage />);
    expect(screen.getByTestId('account-list')).toBeInTheDocument();
  });
});
