import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { GoalProgressWidget } from '../goal-progress-widget.js';
import { MemoryRouter } from 'react-router-dom';

vi.mock('lucide-react', () => ({
  Target: () => <span>Target</span>,
}));

vi.mock('../../../../shared/utils/format-currency.js', () => ({
  formatCurrency: (val: number) => `$${val.toFixed(2)}`,
}));

const mockGoals = [
  { id: 'g-1', name: 'Emergency Fund', targetAmount: 10000, currentAmount: 7500 },
  { id: 'g-2', name: 'Vacation', targetAmount: 5000, currentAmount: 1000 },
  { id: 'g-3', name: 'New Car', targetAmount: 30000, currentAmount: 15000 },
  { id: 'g-4', name: 'Laptop', targetAmount: 2000, currentAmount: 2000 },
];

let mockGoalsReturn: { data: typeof mockGoals | undefined } = { data: mockGoals };

vi.mock('../../hooks.js', () => ({
  useActiveGoals: () => mockGoalsReturn,
}));

function renderWidget(currency = 'AUD') {
  return render(
    <MemoryRouter>
      <GoalProgressWidget currency={currency} />
    </MemoryRouter>,
  );
}

describe('GoalProgressWidget', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockGoalsReturn = { data: mockGoals };
  });

  it('renders Goals heading', () => {
    renderWidget();
    expect(screen.getByText('Goals')).toBeInTheDocument();
  });

  it('renders View All link', () => {
    renderWidget();
    expect(screen.getByText('View All')).toBeInTheDocument();
  });

  it('renders top 3 goals sorted by progress (highest first)', () => {
    renderWidget();
    // Laptop: 100%, Emergency Fund: 75%, New Car: 50%, Vacation: 20%
    // Top 3: Laptop, Emergency Fund, New Car
    expect(screen.getByText('Laptop')).toBeInTheDocument();
    expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
    expect(screen.getByText('New Car')).toBeInTheDocument();
    expect(screen.queryByText('Vacation')).not.toBeInTheDocument();
  });

  it('renders progress percentages', () => {
    renderWidget();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders current and target amounts', () => {
    renderWidget();
    expect(screen.getByText('$7500.00')).toBeInTheDocument();
    expect(screen.getByText('$10000.00')).toBeInTheDocument();
  });

  it('renders nothing when no goals', () => {
    mockGoalsReturn = { data: [] };
    const { container } = renderWidget();
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when data is undefined', () => {
    mockGoalsReturn = { data: undefined };
    const { container } = renderWidget();
    expect(container.innerHTML).toBe('');
  });
});
