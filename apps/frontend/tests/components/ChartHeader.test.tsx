import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChartHeader from '../../components/ChartHeader';

// Hoisted mocks
const { mockIndicatorStore, mockPaneStore } = vi.hoisted(() => ({
  mockIndicatorStore: {
    get: vi.fn(() => ({
      flags: {
        rsi: true,
        macd: false,
        sma: true,
        ema: false,
      },
    })),
    subscribe: vi.fn(() => vi.fn()),
  },
  mockPaneStore: {
    getState: vi.fn(() => ({
      resetPanes: vi.fn(),
    })),
  },
}));

vi.mock('@/lib/stores/indicatorStore', () => ({
  indicatorStore: mockIndicatorStore,
}));

vi.mock('@/lib/stores/paneStore', () => ({
  usePaneStore: mockPaneStore,
}));

// Mock child components
vi.mock('../../components/EnhancedSymbolPicker', () => ({
  EnhancedSymbolPicker: () => <div data-testid="enhanced-symbol-picker">SymbolPicker</div>,
}));

vi.mock('../../components/TimeframePicker', () => ({
  default: () => <div data-testid="timeframe-picker">TimeframePicker</div>,
}));

vi.mock('../../components/IndicatorModalV2', () => ({
  IndicatorModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="indicator-modal" onClick={onClose}>
        IndicatorModal
      </div>
    ) : null,
}));

vi.mock('@/src/components/AuthModal', () => ({
  AuthModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="auth-modal" onClick={onClose}>
      AuthModal
    </div>
  ),
}));

describe('ChartHeader', () => {
  const mockReload = vi.fn();
  const mockRemoveItem = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    });

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        removeItem: mockRemoveItem,
      },
      writable: true,
    });
  });

  describe('Rendering', () => {
    it('should render the header container', () => {
      const { container } = render(<ChartHeader />);
      const header = container.querySelector('.bg-neutral-900');
      expect(header).toBeInTheDocument();
    });

    it('should render EnhancedSymbolPicker', () => {
      render(<ChartHeader />);
      expect(screen.getByTestId('enhanced-symbol-picker')).toBeInTheDocument();
    });

    it('should render TimeframePicker', () => {
      render(<ChartHeader />);
      expect(screen.getByTestId('timeframe-picker')).toBeInTheDocument();
    });

    it('should render platform tagline on large screens', () => {
      render(<ChartHeader />);
      expect(screen.getByText('Professional Trading Platform')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render Indicators button', () => {
      render(<ChartHeader />);
      expect(screen.getByText('Indicators')).toBeInTheDocument();
    });

    it('should render Objects button', () => {
      render(<ChartHeader />);
      expect(screen.getByText('Objects')).toBeInTheDocument();
    });

    it('should render Settings button', () => {
      render(<ChartHeader />);
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render Reset Layout button', () => {
      render(<ChartHeader />);
      expect(screen.getByText('Reset Layout')).toBeInTheDocument();
    });
  });

  describe('Active Indicator Count', () => {
    it('should show indicator count badge when indicators are active', () => {
      render(<ChartHeader />);
      // Mock returns 2 active indicators (rsi: true, sma: true)
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should not show badge when no indicators are active', () => {
      mockIndicatorStore.get.mockReturnValueOnce({
        flags: {
          rsi: false,
          macd: false,
          sma: false,
        },
      });

      render(<ChartHeader />);
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('Indicator Modal', () => {
    it('should not show indicator modal by default', () => {
      render(<ChartHeader />);
      expect(screen.queryByTestId('indicator-modal')).not.toBeInTheDocument();
    });

    it('should open indicator modal when Indicators button is clicked', () => {
      render(<ChartHeader />);
      const indicatorsButton = screen.getByText('Indicators');

      fireEvent.click(indicatorsButton);

      expect(screen.getByTestId('indicator-modal')).toBeInTheDocument();
    });

    it('should close indicator modal when onClose is called', () => {
      render(<ChartHeader />);
      const indicatorsButton = screen.getByText('Indicators');

      fireEvent.click(indicatorsButton);
      expect(screen.getByTestId('indicator-modal')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('indicator-modal'));
      expect(screen.queryByTestId('indicator-modal')).not.toBeInTheDocument();
    });
  });

  describe('Objects Button', () => {
    it('should call onOpenObjectTree when Objects button is clicked', () => {
      const mockOpenObjectTree = vi.fn();
      render(<ChartHeader onOpenObjectTree={mockOpenObjectTree} />);

      const objectsButton = screen.getByText('Objects');
      fireEvent.click(objectsButton);

      expect(mockOpenObjectTree).toHaveBeenCalledTimes(1);
    });
  });

  describe('Reset Layout', () => {
    it('should reset panes and reload when Reset Layout is clicked', () => {
      const mockResetPanes = vi.fn();
      mockPaneStore.getState.mockReturnValue({
        resetPanes: mockResetPanes,
      });

      render(<ChartHeader />);
      const resetButton = screen.getByText('Reset Layout');

      fireEvent.click(resetButton);

      expect(mockResetPanes).toHaveBeenCalled();
      expect(mockRemoveItem).toHaveBeenCalledWith('lokifi-panes');
      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('Quick Toggle Buttons', () => {
    it('should render Toggle Grid button', () => {
      render(<ChartHeader />);
      expect(screen.getByRole('button', { name: /toggle grid/i })).toBeInTheDocument();
    });

    it('should render Toggle Volume button', () => {
      render(<ChartHeader />);
      expect(screen.getByRole('button', { name: /toggle volume/i })).toBeInTheDocument();
    });

    it('should render Toggle Crosshair button', () => {
      render(<ChartHeader />);
      expect(screen.getByRole('button', { name: /toggle crosshair/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button names', () => {
      render(<ChartHeader />);

      expect(screen.getByRole('button', { name: /toggle grid/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /toggle volume/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /toggle crosshair/i })).toBeInTheDocument();
    });

    it('should hide SVG icons from screen readers', () => {
      const { container } = render(<ChartHeader />);
      const svgs = container.querySelectorAll('svg[aria-hidden="true"]');
      // At least 3 quick toggle buttons have hidden SVGs
      expect(svgs.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Styling', () => {
    it('should have proper border styling', () => {
      const { container } = render(<ChartHeader />);
      const header = container.querySelector('.border-b.border-neutral-800');
      expect(header).toBeInTheDocument();
    });

    it('should have flex layout', () => {
      const { container } = render(<ChartHeader />);
      const header = container.querySelector('.flex.items-center.justify-between');
      expect(header).toBeInTheDocument();
    });

    it('should have reset button with danger styling', () => {
      render(<ChartHeader />);
      const resetButton = screen.getByText('Reset Layout').closest('button');
      expect(resetButton).toHaveClass('bg-red-600/20');
    });
  });
});
