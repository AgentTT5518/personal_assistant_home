import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SnapshotHistory } from '../components/snapshot-history.js';
import type { SnapshotMeta } from '../../../../shared/types/index.js';

afterEach(cleanup);

const MOCK_SNAPSHOTS: SnapshotMeta[] = [
  { id: 'snap-1', snapshotType: 'analysis_insights', period: { from: '2026-01-01', to: '2026-01-31' }, generatedAt: '2026-01-31T10:00:00Z' },
  { id: 'snap-2', snapshotType: 'analysis_insights', period: { from: '2025-12-01', to: '2025-12-31' }, generatedAt: '2026-01-15T09:00:00Z' },
];

describe('SnapshotHistory', () => {
  it('renders nothing when no snapshots', () => {
    const { container } = render(
      <SnapshotHistory snapshots={[]} activeId={null} onSelect={vi.fn()} onDelete={vi.fn()} isDeleting={false} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders snapshot list with count', () => {
    render(
      <SnapshotHistory snapshots={MOCK_SNAPSHOTS} activeId={null} onSelect={vi.fn()} onDelete={vi.fn()} isDeleting={false} />,
    );
    expect(screen.getByText('History (2)')).toBeInTheDocument();
    expect(screen.getByText('2026-01-01 to 2026-01-31')).toBeInTheDocument();
  });

  it('calls onSelect when snapshot clicked', () => {
    const onSelect = vi.fn();
    render(
      <SnapshotHistory snapshots={MOCK_SNAPSHOTS} activeId={null} onSelect={onSelect} onDelete={vi.fn()} isDeleting={false} />,
    );
    fireEvent.click(screen.getByText('2026-01-01 to 2026-01-31'));
    expect(onSelect).toHaveBeenCalledWith('snap-1');
  });

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn();
    render(
      <SnapshotHistory snapshots={MOCK_SNAPSHOTS} activeId={null} onSelect={vi.fn()} onDelete={onDelete} isDeleting={false} />,
    );
    const deleteButtons = screen.getAllByLabelText('Delete snapshot');
    fireEvent.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith('snap-1');
  });

  it('highlights active snapshot', () => {
    render(
      <SnapshotHistory snapshots={MOCK_SNAPSHOTS} activeId="snap-1" onSelect={vi.fn()} onDelete={vi.fn()} isDeleting={false} />,
    );
    const activeItem = screen.getByText('2026-01-01 to 2026-01-31').closest('[class*="bg-blue-50"]');
    expect(activeItem).toBeInTheDocument();
  });
});
