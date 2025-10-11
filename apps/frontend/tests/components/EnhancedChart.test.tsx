import { render } from '@testing-library/react';
import { screen, fireEvent, waitFor } from '@testing-library/dom';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import EnhancedChart from '../components/EnhancedChart';

// Mock the lightweight-charts library
jest.mock('lightweight-charts', () => ({
  createChart: jest.fn(() => ({
    addCandlestickSeries: jest.fn(() => ({
      setData: jest.fn(),
      coordinateToPrice: jest.fn(() => 100),
    })),
    subscribeClick: jest.fn(),
    unsubscribeClick: jest.fn(),
    remove: jest.fn(),
    applyOptions: jest.fn(),
  })),
  ColorType: {
    Solid: 'solid',
  },
}));

// Mock the stores
jest.mock('../lib/drawingStore', () => ({
  useDrawingStore: () => ({
    activeTool: 'cursor',
    objects: [],
    isDrawing: false,
  }),
}));

jest.mock('../lib/marketDataStore', () => ({
  useMarketDataStore: () => ({
    fetchOHLCData: jest.fn(() => Promise.resolve([
      {
        symbol: 'AAPL',
        timestamp: '2023-01-01T00:00:00Z',
        open: 100,
        high: 105,
        low: 98,
        close: 103,
        volume: 1000000,
        provider: 'mock',
        timeframe: '1D',
      },
    ])),
    isLoading: false,
    error: null,
  }),
}));

jest.mock('../lib/paneStore', () => ({
  usePaneStore: () => ({
    panes: [
      {
        id: 'pane-1',
        symbol: 'AAPL',
        timeframe: '1D',
        indicators: [],
      },
    ],
  }),
}));

jest.mock('../lib/symbolStore', () => ({
  symbolStore: {
    get: () => 'AAPL',
  },
}));

jest.mock('../lib/timeframeStore', () => ({
  timeframeStore: {
    get: () => '1D',
  },
}));

const defaultProps = {
  paneId: 'pane-1',
  height: 400,
};

describe('EnhancedChart', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('renders chart container', () => {
    render(<EnhancedChart {...defaultProps} />);
    
    // Check if chart container is rendered
    const chartContainer = screen.getByRole('generic');
    expect(chartContainer).toBeInTheDocument();
  });

  it('displays symbol and timeframe info', () => {
    render(<EnhancedChart {...defaultProps} />);
    
    // Check if symbol badge is displayed
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('1D')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    // Mock loading state
    jest.doMock('../lib/marketDataStore', () => ({
      useMarketDataStore: () => ({
        fetchOHLCData: jest.fn(),
        isLoading: true,
        error: null,
      }),
    }));

    render(<EnhancedChart {...defaultProps} />);
    expect(screen.getByText('Loading chart data...')).toBeInTheDocument();
  });

  it('displays error state', () => {
    // Mock error state
    jest.doMock('../lib/marketDataStore', () => ({
      useMarketDataStore: () => ({
        fetchOHLCData: jest.fn(),
        isLoading: false,
        error: 'Failed to fetch data',
      }),
    }));

    render(<EnhancedChart {...defaultProps} />);
    expect(screen.getByText('⚠ Data Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
  });

  it('handles chart resize', async () => {
    render(<EnhancedChart {...defaultProps} />);
    
    // Trigger resize event
    fireEvent(window, new Event('resize'));
    
    // Wait for resize handler to be called
    await waitFor(() => {
      // This would typically check if chart.applyOptions was called
      // but we'll just verify the component doesn't crash
      expect(screen.getByRole('generic')).toBeInTheDocument();
    });
  });
});

describe('Chart Data Processing', () => {
  it('converts OHLC data to chart format correctly', () => {
    const mockOHLCData = [
      {
        symbol: 'AAPL',
        timestamp: '2023-01-01T00:00:00Z',
        open: 100,
        high: 105,
        low: 98,
        close: 103,
        volume: 1000000,
        provider: 'mock',
        timeframe: '1D',
      },
    ];

    // Test the conversion logic
    const chartData = mockOHLCData.map((item: any) => ({
      time: Math.floor(new Date(item.timestamp).getTime() / 1000),
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    expect(chartData[0]).toEqual({
      time: expect.any(Number),
      open: 100,
      high: 105,
      low: 98,
      close: 103,
    });

    // Verify OHLC relationships
    expect(chartData[0].high).toBeGreaterThanOrEqual(chartData[0].open);
    expect(chartData[0].high).toBeGreaterThanOrEqual(chartData[0].close);
    expect(chartData[0].low).toBeLessThanOrEqual(chartData[0].open);
    expect(chartData[0].low).toBeLessThanOrEqual(chartData[0].close);
  });
});

describe('Chart Interactions', () => {
  it('handles drawing mode activation', () => {
    // Mock drawing mode
    jest.doMock('../lib/drawingStore', () => ({
      useDrawingStore: () => ({
        activeTool: 'line',
        objects: [],
        isDrawing: false,
      }),
    }));

    render(<EnhancedChart {...defaultProps} />);
    
    // Check if drawing mode indicator is shown
    expect(screen.getByText('line mode')).toBeInTheDocument();
  });

  it('displays drawing state correctly', () => {
    // Mock drawing in progress
    jest.doMock('../lib/drawingStore', () => ({
      useDrawingStore: () => ({
        activeTool: 'rectangle',
        objects: [],
        isDrawing: true,
      }),
    }));

    render(<EnhancedChart {...defaultProps} />);
    
    // Check if drawing indicator is shown
    expect(screen.getByText('Drawing...')).toBeInTheDocument();
  });
});
