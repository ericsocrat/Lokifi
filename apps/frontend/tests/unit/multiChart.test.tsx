/**
 * Unit tests for multi-chart functionality
 */
import { useMultiChartStore } from '@/lib/stores/multiChartStore';
import { setDevFlag, setRemoteFlags } from '@/lib/utils/featureFlags';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock localStorage for zustand persist
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Multi-Chart Store', () => {
  beforeEach(() => {
    // Enable multi-chart feature for testing
    setDevFlag('multiChart', true);

    // Reset store to initial state
    const store = useMultiChartStore.getState();
    store.setLayout('1x1');
    store.setActiveChart('chart-1');
    store.updateLinking('symbol', false);
    store.updateLinking('timeframe', false);
    store.updateLinking('cursor', false);

    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up remote flags
    setRemoteFlags({});
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useMultiChartStore());

    expect(result.current.layout).toBe('1x1');
    expect(result.current.charts).toHaveLength(1);
    expect(result.current.charts[0].symbol).toBe('BTCUSDT');
    expect(result.current.linking.symbol).toBe(false);
    expect(result.current.linking.timeframe).toBe(false);
    expect(result.current.linking.cursor).toBe(false);
  });

  it('should change layout and create appropriate number of charts', () => {
    const { result } = renderHook(() => useMultiChartStore());

    act(() => {
      result.current.setLayout('2x2');
    });

    expect(result.current.layout).toBe('2x2');
    expect(result.current.charts).toHaveLength(4);

    // Check positions
    expect(result.current.charts[0].position).toEqual({ row: 0, col: 0 });
    expect(result.current.charts[1].position).toEqual({ row: 0, col: 1 });
    expect(result.current.charts[2].position).toEqual({ row: 1, col: 0 });
    expect(result.current.charts[3].position).toEqual({ row: 1, col: 1 });
  });

  it('should enable symbol linking and sync symbols', () => {
    const { result } = renderHook(() => useMultiChartStore());

    // Set up 2x2 layout first
    act(() => {
      result.current.setLayout('2x2');
    });

    // Enable symbol linking
    act(() => {
      result.current.updateLinking('symbol', true);
    });

    expect(result.current.linking.symbol).toBe(true);

    // Change symbol on linked chart
    act(() => {
      result.current.changeSymbolLinked('ETHUSDT');
    });

    // All charts except active should have new symbol
    const activeChart = result.current.activeChart;
    const otherCharts = result.current.charts.filter((c: any) => c.id !== activeChart);

    otherCharts.forEach((chart: any) => {
      expect(chart.symbol).toBe('ETHUSDT');
    });
  });

  it('should enable timeframe linking and sync timeframes', () => {
    const { result } = renderHook(() => useMultiChartStore());

    act(() => {
      result.current.setLayout('1x2');
      result.current.updateLinking('timeframe', true);
    });

    expect(result.current.linking.timeframe).toBe(true);

    act(() => {
      result.current.changeTimeframeLinked('4h');
    });

    const activeChart = result.current.activeChart;
    const otherCharts = result.current.charts.filter((c: any) => c.id !== activeChart);

    otherCharts.forEach((chart: any) => {
      expect(chart.timeframe).toBe('4h');
    });
  });

  it('should handle cursor linking with events', () => {
    const { result } = renderHook(() => useMultiChartStore());

    // Mock window.dispatchEvent
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

    act(() => {
      result.current.updateLinking('cursor', true);
    });

    const cursorPosition = { time: 1234567890, price: 50000 };

    act(() => {
      result.current.updateCursorLinked(cursorPosition);
    });

    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'multiChartCursorUpdate',
        detail: {
          position: cursorPosition,
          source: result.current.activeChart,
        },
      })
    );
  });

  it('should not perform actions when multiChart flag is disabled', () => {
    // Disable flag
    setDevFlag('multiChart', false);

    const { result } = renderHook(() => useMultiChartStore());
    const initialLayout = result.current.layout;
    const initialCharts = result.current.charts;

    act(() => {
      result.current.setLayout('2x2');
    });

    // Should remain unchanged
    expect(result.current.layout).toBe(initialLayout);
    expect(result.current.charts).toEqual(initialCharts);
  });
});
