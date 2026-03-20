import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { GeneratePanel } from '../components/generate-panel.js';

afterEach(cleanup);

describe('GeneratePanel', () => {
  it('renders generate button', () => {
    render(<GeneratePanel onGenerate={vi.fn()} isGenerating={false} error={null} />);
    expect(screen.getByText('Generate Insights')).toBeInTheDocument();
  });

  it('calls onGenerate when button clicked', () => {
    const onGenerate = vi.fn();
    render(<GeneratePanel onGenerate={onGenerate} isGenerating={false} error={null} />);
    fireEvent.click(screen.getByText('Generate Insights'));
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when generating', () => {
    render(<GeneratePanel onGenerate={vi.fn()} isGenerating={true} error={null} />);
    expect(screen.getByText('Analysing your spending...')).toBeInTheDocument();
  });

  it('disables button when generating', () => {
    render(<GeneratePanel onGenerate={vi.fn()} isGenerating={true} error={null} />);
    const button = screen.getByRole('button', { name: /analysing/i });
    expect(button).toBeDisabled();
  });

  it('renders date range picker presets', () => {
    render(<GeneratePanel onGenerate={vi.fn()} isGenerating={false} error={null} />);
    expect(screen.getByText('Last 3 Months')).toBeInTheDocument();
    expect(screen.getByText('All Time')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(<GeneratePanel onGenerate={vi.fn()} isGenerating={false} error="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
