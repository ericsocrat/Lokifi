import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IndicatorModal } from '../../components/IndicatorModalV2';

// Mock the pane store
const mockPaneStore = {
  panes: [
    { id: 'price-pane', type: 'price', indicators: [] as string[] },
    { id: 'indicator-pane', type: 'indicator', indicators: ['rsi'] },
  ],
  addPane: vi.fn(),
  addIndicatorToPane: vi.fn(),
};

vi.mock('@/lib/stores/paneStore', () => ({
  usePaneStore: () => mockPaneStore,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Activity: () => <span data-testid="activity-icon">📊</span>,
  BarChart3: () => <span data-testid="barchart-icon">📈</span>,
  Search: () => <span data-testid="search-icon">🔍</span>,
  TrendingUp: () => <span data-testid="trending-icon">📈</span>,
  Volume: () => <span data-testid="volume-icon">📦</span>,
  X: () => <span data-testid="x-icon">✕</span>,
}));

describe('IndicatorModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockPaneStore.panes = [
      { id: 'price-pane', type: 'price', indicators: [] },
      { id: 'indicator-pane', type: 'indicator', indicators: [] },
    ];
  });

  describe('Visibility', () => {
    it('should not render when isOpen is false', () => {
      render(<IndicatorModal isOpen={false} onClose={mockOnClose} />);

      expect(screen.queryByText('Add Indicator')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Add Indicator')).toBeInTheDocument();
    });
  });

  describe('Header', () => {
    it('should render modal title', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Add Indicator')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
    });

    it('should call onClose when close button clicked', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      fireEvent.click(screen.getByLabelText('Close modal'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when clicking overlay', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      // Click the overlay (backdrop)
      const overlay = screen.getByText('Add Indicator').closest('div[class*="fixed"]');
      if (overlay) {
        fireEvent.click(overlay);
      }

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not call onClose when clicking modal content', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      // Click on the modal content itself
      fireEvent.click(screen.getByText('Add Indicator'));

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Search', () => {
    it('should render search input', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByPlaceholderText('Search indicators...')).toBeInTheDocument();
    });

    it('should filter indicators by name', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      const searchInput = screen.getByPlaceholderText('Search indicators...');
      fireEvent.change(searchInput, { target: { value: 'Bollinger' } });

      expect(screen.getByText('Bollinger Bands')).toBeInTheDocument();
      expect(screen.queryByText('Simple Moving Average')).not.toBeInTheDocument();
    });

    it('should filter indicators by description', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      const searchInput = screen.getByPlaceholderText('Search indicators...');
      fireEvent.change(searchInput, { target: { value: 'oscillator' } });

      expect(screen.getByText('Relative Strength Index')).toBeInTheDocument();
    });

    it('should show no results message when no matches', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      const searchInput = screen.getByPlaceholderText('Search indicators...');
      fireEvent.change(searchInput, { target: { value: 'xxxxxxxxxxxxxx' } });

      expect(screen.getByText('No indicators found matching your search.')).toBeInTheDocument();
    });

    it('should be case insensitive', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      const searchInput = screen.getByPlaceholderText('Search indicators...');
      fireEvent.change(searchInput, { target: { value: 'macd' } });

      expect(screen.getByText('MACD')).toBeInTheDocument();
    });
  });

  describe('Categories', () => {
    it('should render all category buttons', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('All')).toBeInTheDocument();
      // Category names appear both as filter buttons and on indicator badges
      expect(screen.getAllByText('Trend').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Momentum').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Volatility').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Volume').length).toBeGreaterThan(0);
    });

    it('should highlight "All" category by default', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      const allButton = screen.getByText('All');
      expect(allButton).toHaveClass('bg-blue-600');
    });

    it('should filter by Trend category', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      // Get all Trend buttons/badges and click the category filter (first one)
      const trendButtons = screen.getAllByText('Trend');
      fireEvent.click(trendButtons[0]);

      expect(screen.getByText('Simple Moving Average')).toBeInTheDocument();
      expect(screen.getByText('Exponential Moving Average')).toBeInTheDocument();
      expect(screen.queryByText('Relative Strength Index')).not.toBeInTheDocument();
    });

    it('should filter by Momentum category', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      const momentumButtons = screen.getAllByText('Momentum');
      fireEvent.click(momentumButtons[0]);

      expect(screen.getByText('Relative Strength Index')).toBeInTheDocument();
      expect(screen.getByText('MACD')).toBeInTheDocument();
      expect(screen.queryByText('Simple Moving Average')).not.toBeInTheDocument();
    });

    it('should filter by Volatility category', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      const volatilityButtons = screen.getAllByText('Volatility');
      fireEvent.click(volatilityButtons[0]);

      expect(screen.getByText('Bollinger Bands')).toBeInTheDocument();
      expect(screen.getByText('Standard Deviation')).toBeInTheDocument();
    });

    it('should filter by Volume category', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      const volumeButtons = screen.getAllByText('Volume');
      fireEvent.click(volumeButtons[0]);

      expect(screen.getByText('Volume Weighted Average Price')).toBeInTheDocument();
      expect(screen.getByText('Volume Weighted Moving Average')).toBeInTheDocument();
    });

    it('should combine search with category filter', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      const trendButtons = screen.getAllByText('Trend');
      fireEvent.click(trendButtons[0]);

      const searchInput = screen.getByPlaceholderText('Search indicators...');
      fireEvent.change(searchInput, { target: { value: 'exponential' } });

      expect(screen.getByText('Exponential Moving Average')).toBeInTheDocument();
      expect(screen.queryByText('Simple Moving Average')).not.toBeInTheDocument();
    });
  });

  describe('Indicator List', () => {
    it('should display indicator names', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Simple Moving Average')).toBeInTheDocument();
      expect(screen.getByText('Exponential Moving Average')).toBeInTheDocument();
      expect(screen.getByText('Bollinger Bands')).toBeInTheDocument();
    });

    it('should display indicator descriptions', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Average price over a specified period')).toBeInTheDocument();
    });

    it('should show pane type badges', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      // Overlay indicators should show Overlay badge
      const overlayBadges = screen.getAllByText('Overlay');
      expect(overlayBadges.length).toBeGreaterThan(0);

      // Separate indicators should show Separate Pane badge
      const separateBadges = screen.getAllByText('Separate Pane');
      expect(separateBadges.length).toBeGreaterThan(0);
    });

    it('should show category badges on indicators', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      // Multiple Trend badges should exist (as category labels)
      const trendBadges = screen.getAllByText('Trend');
      expect(trendBadges.length).toBeGreaterThan(1); // At least one as category filter, one as badge
    });
  });

  describe('Active Indicators', () => {
    it('should show Active badge for active indicators', () => {
      mockPaneStore.panes = [{ id: 'price-pane', type: 'price', indicators: ['sma'] }];

      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should not allow clicking on active indicators', () => {
      mockPaneStore.panes = [{ id: 'price-pane', type: 'price', indicators: ['sma'] }];

      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      // Click on the SMA indicator
      const smaIndicator = screen
        .getByText('Simple Moving Average')
        .closest('div[class*="rounded-lg"]');
      if (smaIndicator) {
        fireEvent.click(smaIndicator);
      }

      // Should NOT call addIndicatorToPane because it's already active
      expect(mockPaneStore.addIndicatorToPane).not.toHaveBeenCalled();
    });

    it('should have different styling for active indicators', () => {
      mockPaneStore.panes = [{ id: 'price-pane', type: 'price', indicators: ['sma'] }];

      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      const smaIndicator = screen
        .getByText('Simple Moving Average')
        .closest('div[class*="rounded-lg"]');
      expect(smaIndicator).toHaveClass('cursor-not-allowed');
    });
  });

  describe('Adding Indicators', () => {
    it('should add overlay indicator to price pane', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      // Click on SMA (overlay indicator)
      const smaIndicator = screen
        .getByText('Simple Moving Average')
        .closest('div[class*="rounded-lg"]');
      if (smaIndicator) {
        fireEvent.click(smaIndicator);
      }

      expect(mockPaneStore.addIndicatorToPane).toHaveBeenCalledWith('price-pane', 'sma');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should create new pane for separate indicator', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      // Click on RSI (separate pane indicator)
      const rsiIndicator = screen
        .getByText('Relative Strength Index')
        .closest('div[class*="rounded-lg"]');
      if (rsiIndicator) {
        fireEvent.click(rsiIndicator);
      }

      expect(mockPaneStore.addPane).toHaveBeenCalledWith('indicator', ['rsi']);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close modal after adding indicator', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      const bbIndicator = screen.getByText('Bollinger Bands').closest('div[class*="rounded-lg"]');
      if (bbIndicator) {
        fireEvent.click(bbIndicator);
      }

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Indicator Types', () => {
    it('should have correct indicators in each category', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      // Verify all 8 indicators are displayed
      expect(screen.getByText('Simple Moving Average')).toBeInTheDocument();
      expect(screen.getByText('Exponential Moving Average')).toBeInTheDocument();
      expect(screen.getByText('Bollinger Bands')).toBeInTheDocument();
      expect(screen.getByText('Volume Weighted Average Price')).toBeInTheDocument();
      expect(screen.getByText('Relative Strength Index')).toBeInTheDocument();
      expect(screen.getByText('MACD')).toBeInTheDocument();
      expect(screen.getByText('Volume Weighted Moving Average')).toBeInTheDocument();
      expect(screen.getByText('Standard Deviation')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have close button with aria-label', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
    });

    it('should have search input with placeholder', () => {
      render(<IndicatorModal isOpen={true} onClose={mockOnClose} />);

      const searchInput = screen.getByPlaceholderText('Search indicators...');
      expect(searchInput).toHaveAttribute('type', 'text');
    });
  });
});
