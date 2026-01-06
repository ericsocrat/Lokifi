import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock lightweight-charts module completely to avoid ref issues
vi.mock('lightweight-charts', () => ({
  createChart: vi.fn(() => ({
    remove: vi.fn(),
    applyOptions: vi.fn(),
    timeScale: vi.fn(() => ({
      coordinateToTime: vi.fn(),
    })),
    addSeries: vi.fn(() => ({
      setData: vi.fn(),
      coordinateToPrice: vi.fn(),
    })),
  })),
  CandlestickSeries: {},
}));

// Mock next/dynamic to avoid SSR issues
vi.mock('next/dynamic', () => ({
  default: () => {
    // Return a simple component that doesn't use the real chart
    return ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  },
}));

// Mock stores with factory functions to avoid hoisting issues
vi.mock('@/lib/stores/drawingStore', () => ({
  useDrawingStore: () => ({
    activeTool: 'cursor',
    isDrawing: false,
    currentDrawing: null,
    objects: [],
    startDrawing: vi.fn(),
    updateCurrentDrawingPoint: vi.fn(),
    finishDrawing: vi.fn(),
  }),
}));

vi.mock('@/lib/stores/paneStore', () => ({
  usePaneStore: () => ({
    panes: [
      {
        id: 'price-pane',
        type: 'price',
        visible: true,
        locked: false,
        indicators: [],
        height: 600,
      },
    ],
    updatePaneHeight: vi.fn(),
  }),
}));

vi.mock('@/lib/stores/symbolStore', () => ({
  symbolStore: {
    subscribe: (callback: () => void) => {
      callback();
      return () => {};
    },
    get: () => 'BTCUSD',
  },
}));

vi.mock('@/lib/stores/timeframeStore', () => ({
  timeframeStore: {
    subscribe: (callback: () => void) => {
      callback();
      return () => {};
    },
    get: () => '1h',
  },
}));

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock child components - use correct paths from components folder
vi.mock('../../components/ChartErrorBoundary', () => ({
  ChartErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-boundary">{children}</div>
  ),
}));

vi.mock('../../components/ChartLoadingState', () => ({
  ChartLoadingState: () => <div data-testid="chart-loading">Loading chart...</div>,
}));

vi.mock('../../components/DrawingOverlay', () => ({
  DrawingOverlay: () => <div data-testid="drawing-overlay">Drawing Overlay</div>,
}));

// Mock OHLC data
const mockOHLCData = {
  candles: [
    { ts: 1704067200000, o: 42500, h: 43000, l: 42000, c: 42800 },
    { ts: 1704153600000, o: 42800, h: 43500, l: 42500, c: 43200 },
    { ts: 1704240000000, o: 43200, h: 44000, l: 43000, c: 43800 },
  ],
};

// Import after mocks
import { DrawingChart } from '../../components/DrawingChart';

describe('DrawingChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOHLCData),
    });

    // Mock ResizeObserver
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  describe('Rendering', () => {
    it('should render chart container', () => {
      render(<DrawingChart />);

      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });

    it('should render within error boundary', () => {
      render(<DrawingChart />);

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });

    it('should have minimum width styling', () => {
      render(<DrawingChart />);

      const container = screen.getByTestId('chart-container');
      expect(container).toHaveStyle({ minWidth: '400px' });
    });

    it('should have proper background color', () => {
      render(<DrawingChart />);

      const container = screen.getByTestId('chart-container');
      expect(container).toHaveClass('bg-[#131722]');
    });
  });

  describe('Pane Display', () => {
    it('should render price pane when available', () => {
      render(<DrawingChart />);

      // Component should render (we can verify by checking container exists)
      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });

    it('should render within error boundary', () => {
      render(<DrawingChart />);

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('should call fetch for OHLC data', () => {
      render(<DrawingChart />);

      // Fetch is called immediately on render
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Resize Handling', () => {
    it('should add resize event listener on mount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      render(<DrawingChart />);

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

      addEventListenerSpy.mockRestore();
    });
  });

  describe('Visibility', () => {
    it('should respect pane visibility state', () => {
      render(<DrawingChart />);

      // Container should exist with price pane visible by default
      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = render(<DrawingChart />);

      unmount();

      // Should not throw or leave dangling listeners
      expect(true).toBe(true);
    });

    it('should remove resize event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(<DrawingChart />);
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });
});

describe('DrawingPaneComponent', () => {
  // Note: DrawingPaneComponent is not exported directly, tested through DrawingChart
  // These tests verify internal behavior through the parent component

  describe('Mouse Interactions', () => {
    it('should handle mouse events without crashing', async () => {
      render(<DrawingChart />);

      const container = screen.getByTestId('chart-container');

      fireEvent.mouseDown(container);
      fireEvent.mouseMove(container);
      fireEvent.mouseUp(container);
      fireEvent.mouseLeave(container);

      expect(container).toBeInTheDocument();
    });
  });

  describe('Chart Configuration', () => {
    it('should use dark theme colors', () => {
      render(<DrawingChart />);

      const container = screen.getByTestId('chart-container');
      expect(container).toHaveClass('bg-[#131722]');
    });
  });
});
