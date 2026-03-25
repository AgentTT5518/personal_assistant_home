import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AccountSelector } from '../account-selector.js';

const mockAccounts = [
  { id: 'acc-1', name: 'Checking', type: 'checking' },
  { id: 'acc-2', name: 'Savings', type: 'savings' },
];

vi.mock('../../hooks.js', () => ({
  useAccounts: () => ({ data: mockAccounts }),
}));

describe('AccountSelector', () => {
  afterEach(cleanup);

  it('renders dropdown with All Accounts option when includeAll is true', () => {
    render(<AccountSelector value={null} onChange={vi.fn()} includeAll={true} />);
    expect(screen.getByText('All Accounts')).toBeInTheDocument();
    expect(screen.getByText('Checking (checking)')).toBeInTheDocument();
    expect(screen.getByText('Savings (savings)')).toBeInTheDocument();
  });

  it('renders No Account option when includeAll is false', () => {
    render(<AccountSelector value={null} onChange={vi.fn()} includeAll={false} />);
    expect(screen.getByText('No Account')).toBeInTheDocument();
    expect(screen.queryByText('All Accounts')).not.toBeInTheDocument();
  });

  it('calls onChange with account id when selected', () => {
    const onChange = vi.fn();
    render(<AccountSelector value={null} onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'acc-1' } });
    expect(onChange).toHaveBeenCalledWith('acc-1');
  });

  it('calls onChange with null when empty option selected', () => {
    const onChange = vi.fn();
    render(<AccountSelector value="acc-1" onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('reflects current value in select', () => {
    render(<AccountSelector value="acc-2" onChange={vi.fn()} />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('acc-2');
  });
});
