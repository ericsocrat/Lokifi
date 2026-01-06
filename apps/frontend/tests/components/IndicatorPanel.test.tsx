import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import IndicatorPanel from '../../components/IndicatorPanel';

// Hoisted mocks
const { mockState, mockFns } = vi.hoisted(() => ({
  mockState: {
    ema20: false,
    ema50: false,
    rsi: false,
    macd: false,
    bband: false,
    vwap: false,
    bbFill: false,
    vwma: false,
    stddev: false,
  },
  mockFns: {
    get: vi.fn(),
    subscribe: vi.fn(),
    toggle: vi.fn(),
  },
}));

vi.mock('@/stores/indicatorStore', () => ({
  indicatorStore: {
    get: () => mockState,
    subscribe: mockFns.subscribe,
    toggle: mockFns.toggle,
  },
}));

describe('IndicatorPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    Object.keys(mockState).forEach((key) => {
      mockState[key as keyof typeof mockState] = false;
    });
    // Mock subscribe to return unsubscribe function
    mockFns.subscribe.mockImplementation((_callback: (state: typeof mockState) => void) => {
      // Store callback for later use
      return () => {};
    });
  });

  describe('Rendering', () => {
    it('should render the indicators heading', () => {
      render(<IndicatorPanel />);
      expect(screen.getByText('Indicators')).toBeInTheDocument();
    });

    it('should render all indicator checkboxes', () => {
      render(<IndicatorPanel />);

      expect(screen.getByText('EMA20')).toBeInTheDocument();
      expect(screen.getByText('EMA50')).toBeInTheDocument();
      expect(screen.getByText('RSI(14)')).toBeInTheDocument();
      expect(screen.getByText('MACD(12,26,9)')).toBeInTheDocument();
      // Multiple Bollinger Bands labels exist
      expect(screen.getAllByText(/Bollinger Bands/).length).toBeGreaterThan(0);
      // Multiple VWAP labels exist
      expect(screen.getAllByText(/VWAP/).length).toBeGreaterThan(0);
      expect(screen.getByText(/BB fill/)).toBeInTheDocument();
      expect(screen.getByText('VWMA')).toBeInTheDocument();
      expect(screen.getByText('StdDev Channels')).toBeInTheDocument();
    });

    it('should render proper container styling', () => {
      const { container } = render(<IndicatorPanel />);
      const panel = container.querySelector('.rounded-2xl');
      expect(panel).toBeInTheDocument();
    });
  });

  describe('Checkbox State', () => {
    it('should reflect store state in checkbox', () => {
      mockState.ema20 = true;
      mockState.rsi = true;
      render(<IndicatorPanel />);

      const checkboxes = screen.getAllByRole('checkbox');
      // Find the checkbox that is checked
      const checkedBoxes = checkboxes.filter(
        (cb) => (cb as HTMLInputElement).checked
      );
      expect(checkedBoxes.length).toBeGreaterThan(0);
    });

    it('should show unchecked state by default', () => {
      render(<IndicatorPanel />);
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((checkbox) => {
        expect(checkbox).not.toBeChecked();
      });
    });
  });

  describe('Toggle Functionality', () => {
    it('should call toggle when EMA20 checkbox is clicked', () => {
      render(<IndicatorPanel />);
      const ema20Label = screen.getByText('EMA20');
      const checkbox = ema20Label.closest('label')?.querySelector('input');
      expect(checkbox).toBeInTheDocument();

      fireEvent.click(checkbox!);
      expect(mockFns.toggle).toHaveBeenCalledWith('ema20');
    });

    it('should call toggle when EMA50 checkbox is clicked', () => {
      render(<IndicatorPanel />);
      const ema50Label = screen.getByText('EMA50');
      const checkbox = ema50Label.closest('label')?.querySelector('input');

      fireEvent.click(checkbox!);
      expect(mockFns.toggle).toHaveBeenCalledWith('ema50');
    });

    it('should call toggle when RSI checkbox is clicked', () => {
      render(<IndicatorPanel />);
      const rsiLabel = screen.getByText('RSI(14)');
      const checkbox = rsiLabel.closest('label')?.querySelector('input');

      fireEvent.click(checkbox!);
      expect(mockFns.toggle).toHaveBeenCalledWith('rsi');
    });

    it('should call toggle when MACD checkbox is clicked', () => {
      render(<IndicatorPanel />);
      const macdLabel = screen.getByText('MACD(12,26,9)');
      const checkbox = macdLabel.closest('label')?.querySelector('input');

      fireEvent.click(checkbox!);
      expect(mockFns.toggle).toHaveBeenCalledWith('macd');
    });

    it('should call toggle when VWMA checkbox is clicked', () => {
      render(<IndicatorPanel />);
      const vwmaLabel = screen.getByText('VWMA');
      const checkbox = vwmaLabel.closest('label')?.querySelector('input');

      fireEvent.click(checkbox!);
      expect(mockFns.toggle).toHaveBeenCalledWith('vwma');
    });

    it('should call toggle when StdDev checkbox is clicked', () => {
      render(<IndicatorPanel />);
      const stddevLabel = screen.getByText('StdDev Channels');
      const checkbox = stddevLabel.closest('label')?.querySelector('input');

      fireEvent.click(checkbox!);
      expect(mockFns.toggle).toHaveBeenCalledWith('stddev');
    });
  });

  describe('Store Subscription', () => {
    it('should subscribe to store on mount', () => {
      render(<IndicatorPanel />);
      expect(mockFns.subscribe).toHaveBeenCalledTimes(1);
      expect(typeof mockFns.subscribe.mock.calls[0][0]).toBe('function');
    });

    it('should unsubscribe on unmount', () => {
      const unsubscribeFn = vi.fn();
      mockFns.subscribe.mockReturnValue(unsubscribeFn);

      const { unmount } = render(<IndicatorPanel />);
      unmount();

      expect(unsubscribeFn).toHaveBeenCalled();
    });
  });

  describe('Layout', () => {
    it('should have grid layout with 2 columns', () => {
      const { container } = render(<IndicatorPanel />);
      const grid = container.querySelector('.grid-cols-2');
      expect(grid).toBeInTheDocument();
    });

    it('should have StdDev Channels spanning full width', () => {
      const { container } = render(<IndicatorPanel />);
      const colSpan = container.querySelector('.col-span-2');
      expect(colSpan).toBeInTheDocument();
      expect(colSpan?.textContent).toContain('StdDev Channels');
    });
  });

  describe('Accessibility', () => {
    it('should have all checkboxes with proper labels', () => {
      render(<IndicatorPanel />);
      const checkboxes = screen.getAllByRole('checkbox');
      // Each checkbox should be inside a label
      checkboxes.forEach((checkbox) => {
        expect(checkbox.closest('label')).toBeInTheDocument();
      });
    });

    it('should allow keyboard interaction with checkboxes', () => {
      render(<IndicatorPanel />);
      const checkboxes = screen.getAllByRole('checkbox');
      // All checkboxes should be focusable
      checkboxes.forEach((checkbox) => {
        expect(checkbox).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });
});
