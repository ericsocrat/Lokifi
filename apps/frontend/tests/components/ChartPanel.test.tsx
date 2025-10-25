import { render } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChartPanel from '../../components/ChartPanelV2';

// Mock the dependencies
vi.mock('lightweight-charts', () => {
  const createChart = vi.fn(() => {
    const timeScale = () => ({
      subscribeVisibleTimeRangeChange: vi.fn(),
      setVisibleRange: vi.fn(),
    });
    const candleSeries = {
      setData: vi.fn(),
      priceToCoordinate: vi.fn(() => 0),
      timeToCoordinate: vi.fn(() => 0),
    };
    const lineSeries = { setData: vi.fn() };
    const histSeries = { setData: vi.fn() };
    const areaSeries = { setData: vi.fn() };
    return {
      timeScale: timeScale,
      addCandlestickSeries: vi.fn(() => candleSeries),
      addLineSeries: vi.fn(() => lineSeries),
      addHistogramSeries: vi.fn(() => histSeries),
      addAreaSeries: vi.fn(() => areaSeries),
      applyOptions: vi.fn(),
      remove: vi.fn(),
    };
  });
  return { createChart };
});

vi.mock('@/lib/api', () => ({
  API: 'http://localhost:8000',
}));

vi.mock('swr', () => ({
  default: vi.fn(() => ({
    data: {
      candles: [
        { ts: 1000000, o: 100, h: 110, l: 90, c: 105, v: 1000 },
        { ts: 2000000, o: 105, h: 115, l: 95, c: 110, v: 1200 },
      ],
    },
  })),
}));

// Mock child components to avoid pulling in their full implementations in tests
vi.mock('@/components/DrawingToolbar', () => ({
  DrawingToolbar: () => React.createElement('div'),
}));
vi.mock('@/components/PluginSideToolbar', () => ({
  default: () => React.createElement('div'),
}));
vi.mock('@/components/LeftDock', () => ({
  default: () => React.createElement('div'),
}));

describe('ChartPanel', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    render(<ChartPanel />);
    // Basic smoke test - component should render and createChart should have been called
    const lw = await import('lightweight-charts');
    expect(lw.createChart).toHaveBeenCalled();
  });

  it('creates a chart with correct initial options', async () => {
    render(<ChartPanel />);
    const chartOptions = {
      height: expect.any(Number),
      layout: {
        background: { color: '#0a0a0a' },
        textColor: '#e5e7eb',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      rightPriceScale: { borderColor: '#374151' },
      timeScale: { timeVisible: true },
    };

    // Verify createChart was called with correct options
    const lw = await import('lightweight-charts');
    expect(lw.createChart).toHaveBeenCalledWith(
      expect.any(Element),
      expect.objectContaining(chartOptions)
    );
  });

  // Add more tests as needed for specific functionality
});
