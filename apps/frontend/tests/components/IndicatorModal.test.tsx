import { IndicatorModal } from '@/components/IndicatorModalV2';
import { usePaneStore } from '@/lib/stores/paneStore';
import { fireEvent, screen, waitFor } from '@testing-library/dom';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the pane store with correct path
vi.mock('@/lib/stores/paneStore', () => ({
  usePaneStore: vi.fn(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon" />,
  X: () => <div data-testid="x-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  Volume: () => <div data-testid="volume-icon" />,
}));

describe('IndicatorModal', () => {
  const mockPanes = [
    {
      id: 'price-pane',
      type: 'price' as const,
      height: 400,
      indicators: ['sma', 'ema'],
      visible: true,
      locked: false,
    },
  ];

  const mockAddPane = vi.fn();
  const mockAddIndicatorToPane = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePaneStore).mockReturnValue({
      panes: mockPanes,
      addPane: mockAddPane,
      addIndicatorToPane: mockAddIndicatorToPane,
    });
  });

  it('should not render when closed', () => {
    render(<IndicatorModal isOpen={false} onClose={() => {}} />);

    expect(screen.queryByText('Add Indicator')).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    render(<IndicatorModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByText('Add Indicator')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search indicators...')).toBeInTheDocument();
  });

  it('should display all indicator categories as buttons', () => {
    render(<IndicatorModal isOpen={true} onClose={() => {}} />);

    // Use getAllByRole to find category buttons
    const buttons = screen.getAllByRole('button');
    const categoryNames = buttons.map((b) => b.textContent);

    expect(categoryNames).toContain('All');
    expect(categoryNames).toContain('Trend');
    expect(categoryNames).toContain('Momentum');
    expect(categoryNames).toContain('Volatility');
    expect(categoryNames).toContain('Volume');
  });

  it('should display indicators with correct information', () => {
    render(<IndicatorModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByText('Simple Moving Average')).toBeInTheDocument();
    expect(screen.getByText('Average price over a specified period')).toBeInTheDocument();
    // Use getAllByText for elements that appear multiple times
    expect(screen.getAllByText('Overlay').length).toBeGreaterThan(0);
  });

  it('should filter indicators by search term', async () => {
    render(<IndicatorModal isOpen={true} onClose={() => {}} />);

    const searchInput = screen.getByPlaceholderText('Search indicators...');
    fireEvent.change(searchInput, { target: { value: 'moving' } });

    await waitFor(() => {
      expect(screen.getByText('Simple Moving Average')).toBeInTheDocument();
      expect(screen.getByText('Exponential Moving Average')).toBeInTheDocument();
      expect(screen.queryByText('Bollinger Bands')).not.toBeInTheDocument();
    });
  });

  it('should filter indicators by category', async () => {
    render(<IndicatorModal isOpen={true} onClose={() => {}} />);

    // Get the button specifically (not the badge) using role
    const buttons = screen.getAllByRole('button');
    const momentumButton = buttons.find((b) => b.textContent === 'Momentum');
    fireEvent.click(momentumButton!);

    await waitFor(() => {
      expect(screen.getByText('Relative Strength Index')).toBeInTheDocument();
      expect(screen.getByText('MACD')).toBeInTheDocument();
      expect(screen.queryByText('Simple Moving Average')).not.toBeInTheDocument();
    });
  });

  it('should show active indicators with Active badge', () => {
    render(<IndicatorModal isOpen={true} onClose={() => {}} />);

    // SMA should be shown as active since it's in the mock price pane
    // Use getAllByText since there may be multiple active indicators
    const activeBadges = screen.getAllByText('Active');
    expect(activeBadges.length).toBeGreaterThan(0);
  });

  it('should add overlay indicator to price pane', async () => {
    const onClose = vi.fn();
    render(<IndicatorModal isOpen={true} onClose={onClose} />);

    // Find and click on Bollinger Bands (overlay indicator)
    const bbCard = screen.getByText('Bollinger Bands').closest('div');
    fireEvent.click(bbCard!);

    await waitFor(() => {
      expect(mockAddIndicatorToPane).toHaveBeenCalledWith('price-pane', 'bb');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should create new pane for separate indicators', async () => {
    const onClose = vi.fn();
    mockAddPane.mockReturnValue('new-pane-id');

    render(<IndicatorModal isOpen={true} onClose={onClose} />);

    // Find and click on RSI (separate indicator)
    const rsiCard = screen.getByText('Relative Strength Index').closest('div');
    fireEvent.click(rsiCard!);

    await waitFor(() => {
      expect(mockAddPane).toHaveBeenCalledWith('indicator', ['rsi']);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should not allow adding already active indicators', async () => {
    render(<IndicatorModal isOpen={true} onClose={() => {}} />);

    // SMA is already active in the mock price pane
    const smaCard = screen.getByText('Simple Moving Average').closest('div');
    fireEvent.click(smaCard!);

    // Should not call add functions
    expect(mockAddIndicatorToPane).not.toHaveBeenCalled();
    expect(mockAddPane).not.toHaveBeenCalled();
  });

  it('should close modal when X button is clicked', () => {
    const onClose = vi.fn();
    render(<IndicatorModal isOpen={true} onClose={onClose} />);

    const closeButton = screen.getByTestId('x-icon').closest('button');
    fireEvent.click(closeButton!);

    expect(onClose).toHaveBeenCalled();
  });

  it('should close modal when overlay is clicked', () => {
    const onClose = vi.fn();
    render(<IndicatorModal isOpen={true} onClose={onClose} />);

    // Click on the backdrop (first child of the modal container)
    const backdrop = screen.getByText('Add Indicator').closest('.fixed');
    fireEvent.click(backdrop!);

    expect(onClose).toHaveBeenCalled();
  });

  it('should not close modal when modal content is clicked', () => {
    const onClose = vi.fn();
    render(<IndicatorModal isOpen={true} onClose={onClose} />);

    // Click on the modal content
    const modalContent = screen.getByText('Add Indicator').closest('.bg-gray-800');
    fireEvent.click(modalContent!);

    expect(onClose).not.toHaveBeenCalled();
  });
});
