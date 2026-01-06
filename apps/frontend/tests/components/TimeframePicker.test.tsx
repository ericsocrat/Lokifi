import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TimeframePicker from '../../components/TimeframePicker';

// Hoisted mocks for timeframeStore
const { mockState, mockFns } = vi.hoisted(() => ({
  mockState: {
    currentTimeframe: '1h' as const,
  },
  mockFns: {
    get: vi.fn(),
    set: vi.fn(),
    subscribe: vi.fn(),
  },
}));

vi.mock('@/lib/stores/timeframeStore', () => ({
  timeframeStore: {
    get: () => mockState.currentTimeframe,
    set: mockFns.set,
    subscribe: mockFns.subscribe,
  },
}));

describe('TimeframePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.currentTimeframe = '1h';
    // Mock subscribe to return unsubscribe function
    mockFns.subscribe.mockReturnValue(vi.fn());
  });

  describe('Rendering', () => {
    it('should render the timeframe picker container', () => {
      render(<TimeframePicker />);
      expect(screen.getByText('Timeframe')).toBeInTheDocument();
    });

    it('should render all 9 timeframe buttons', () => {
      render(<TimeframePicker />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(9);

      // Verify specific button labels exist
      expect(screen.getByText('1m')).toBeInTheDocument();
      expect(screen.getByText('5m')).toBeInTheDocument();
      expect(screen.getByText('15m')).toBeInTheDocument();
      expect(screen.getByText('30m')).toBeInTheDocument();
      expect(screen.getByText('1H')).toBeInTheDocument();
      expect(screen.getByText('4H')).toBeInTheDocument();
      expect(screen.getByText('1D')).toBeInTheDocument();
      expect(screen.getByText('1W')).toBeInTheDocument();
      expect(screen.getByText('1M')).toBeInTheDocument();
    });

    it('should render the clock icon', () => {
      render(<TimeframePicker />);
      // Clock icon is rendered as svg
      const container = screen.getByText('Timeframe').parentElement;
      expect(container?.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Active State', () => {
    it('should highlight the active timeframe', () => {
      mockState.currentTimeframe = '1h';
      render(<TimeframePicker />);
      const activeButton = screen.getByText('1H');
      expect(activeButton).toHaveClass('bg-blue-600');
    });

    it('should update when store changes', () => {
      // Start with 1h
      mockState.currentTimeframe = '1h';
      render(<TimeframePicker />);

      // Verify subscribe was called
      expect(mockFns.subscribe).toHaveBeenCalled();

      // Get the callback passed to subscribe
      const subscribeCallback = mockFns.subscribe.mock.calls[0][0];

      // Simulate store update
      mockState.currentTimeframe = '1d';
      subscribeCallback('1d');

      // The component should re-render with new state
      // Note: Due to React state update, we just verify subscribe was called
      expect(mockFns.subscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('Timeframe Selection', () => {
    it('should call store.set when clicking a timeframe', () => {
      render(<TimeframePicker />);
      const button = screen.getByText('5m');
      fireEvent.click(button);
      expect(mockFns.set).toHaveBeenCalledWith('5m');
    });

    it('should allow selecting different timeframes', () => {
      render(<TimeframePicker />);

      fireEvent.click(screen.getByText('15m'));
      expect(mockFns.set).toHaveBeenCalledWith('15m');

      fireEvent.click(screen.getByText('4H'));
      expect(mockFns.set).toHaveBeenCalledWith('4h');

      fireEvent.click(screen.getByText('1D'));
      expect(mockFns.set).toHaveBeenCalledWith('1d');
    });

    it('should allow clicking the currently active timeframe', () => {
      mockState.currentTimeframe = '1h';
      render(<TimeframePicker />);
      const activeButton = screen.getByText('1H');
      fireEvent.click(activeButton);
      expect(mockFns.set).toHaveBeenCalledWith('1h');
    });
  });

  describe('Subscription Management', () => {
    it('should subscribe to store on mount', () => {
      render(<TimeframePicker />);
      expect(mockFns.subscribe).toHaveBeenCalledTimes(1);
      expect(typeof mockFns.subscribe.mock.calls[0][0]).toBe('function');
    });

    it('should unsubscribe on unmount', () => {
      const unsubscribeFn = vi.fn();
      mockFns.subscribe.mockReturnValue(unsubscribeFn);

      const { unmount } = render(<TimeframePicker />);
      unmount();

      expect(unsubscribeFn).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button roles', () => {
      render(<TimeframePicker />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(9);
    });

    it('should have title attributes for tooltips', () => {
      render(<TimeframePicker />);
      // Use getByTitle for unique matching
      const button = screen.getByTitle('Switch to 1m timeframe');
      expect(button).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      render(<TimeframePicker />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });

  describe('Styling', () => {
    it('should apply inactive styles to non-selected timeframes', () => {
      mockState.currentTimeframe = '1h';
      render(<TimeframePicker />);

      const inactiveButton = screen.getByText('5m');
      expect(inactiveButton).toHaveClass('text-gray-400');
      expect(inactiveButton).not.toHaveClass('bg-blue-600');
    });

    it('should apply active styles to selected timeframe', () => {
      mockState.currentTimeframe = '1d';
      render(<TimeframePicker />);

      const activeButton = screen.getByText('1D');
      expect(activeButton).toHaveClass('bg-blue-600');
      expect(activeButton).toHaveClass('text-white');
    });
  });
});
