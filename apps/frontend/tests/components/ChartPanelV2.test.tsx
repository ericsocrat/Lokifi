import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

// Minimal ResizeObserver for JSDOM
class RO {
  private cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
  }
  observe() {
    // Trigger once to simulate initial resize
    this.cb([], this as unknown as ResizeObserver);
  }
  disconnect() {}
}
(globalThis as any).ResizeObserver = RO as unknown as typeof ResizeObserver;

// Capture series data and options
const captured: {
  candleSetData?: Array<{ time: number; open: number; high: number; low: number; close: number }>;
  areaOptions?: { topColor?: string; bottomColor?: string };
} = {};

// Lightweight-charts stub
vi.mock('lightweight-charts', () => {
  const chartObj = () => ({
    applyOptions: vi.fn(),
    remove: vi.fn(),
    addSeries: vi.fn((type: any, opts: any) => {
      if (type === 'CandlestickSeries') {
        return {
          setData: (d: any[]) => {
            captured.candleSetData = d as any;
          },
        };
      }
      if (type === 'AreaSeries') {
        captured.areaOptions = opts;
        return { setData: vi.fn() };
      }
      // Generic line/histogram series
      return { setData: vi.fn() };
    }),
    timeScale: () => ({
      subscribeVisibleTimeRangeChange: vi.fn(),
      setVisibleRange: vi.fn(),
    }),
  });

  return {
    ColorType: { Solid: 'Solid' },
    CandlestickSeries: 'CandlestickSeries',
    LineSeries: 'LineSeries',
    AreaSeries: 'AreaSeries',
    HistogramSeries: 'HistogramSeries',
    createChart: vi.fn(() => chartObj()),
  };
});

// Simplify boundary/loading/sidebar components
vi.mock('@/components/ChartErrorBoundary', () => ({
  ChartErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/ChartLoadingState', () => ({
  ChartLoadingState: ({ message }: { message?: string }) => <div data-testid="loading">{message ?? 'loading'}</div>,
}));
vi.mock('@/components/ChartSidebar', () => ({ default: () => <div data-testid="sidebar" /> }));

// Plugin manager (define inside factory to avoid hoist issues)
vi.mock('plugins/registry', () => {
  const pluginManager = {
    setEnv: vi.fn(),
    hasActiveTool: vi.fn(() => false),
  };
  (globalThis as any).__mockPluginManager = pluginManager;
  return { pluginManager };
});

// Stores
const drawStoreState = { tool: 'cursor' };
vi.mock('@/stores/drawStore', () => ({
  drawStore: {
    get: () => drawStoreState,
    subscribe: () => vi.fn(),
    loadCurrent: vi.fn(),
  },
}));

const indicatorState = {
  params: { bbPeriod: 20, bbMult: 2, vwmaPeriod: 20, stddevPeriod: 20, stddevMult: 2 },
  style: { bbFillColor: '#336699', bbFillOpacity: 0.25 },
  ema20: false,
  ema50: false,
  bband: false,
  bbFill: false,
  vwap: false,
  vwma: false,
  stddev: false,
  rsi: false,
  macd: false,
};
vi.mock('@/stores/indicatorStore', () => ({
  indicatorStore: {
    get: () => indicatorState,
    subscribe: (cb: any) => { cb(indicatorState); return vi.fn(); },
    loadForSymbol: vi.fn(),
  },
}));

vi.mock('@/stores/symbolStore', () => ({ symbolStore: { get: () => 'BTC', subscribe: (cb: any) => { cb('BTC'); return vi.fn(); } } }));
vi.mock('@/stores/timeframeStore', () => ({ timeframeStore: { get: () => '5m', subscribe: (cb: any) => { cb('5m'); return vi.fn(); } } }));

// SWR controlled mock
type SWRData = { data?: any; error?: any; isLoading?: boolean; mutate?: () => void };
let swrMock: SWRData = { data: undefined, error: undefined, isLoading: false, mutate: vi.fn() };
vi.mock('swr', () => ({ default: (key: any) => swrMock }));

// Import component under test
import ChartPanel from '@/components/ChartPanelV2';

beforeEach(() => {
  // reset captured
  captured.candleSetData = undefined;
  captured.areaOptions = undefined;
  // reset indicator flags
  Object.assign(indicatorState, {
    ema20: false,
    ema50: false,
    bband: false,
    bbFill: false,
    vwap: false,
    vwma: false,
    stddev: false,
    rsi: false,
    macd: false,
  });
  drawStoreState.tool = 'cursor';
  // Reset plugin manager state
  const pm = (globalThis as any).__mockPluginManager;
  pm.hasActiveTool.mockReturnValue(false);
  swrMock = { data: undefined, error: undefined, isLoading: false, mutate: vi.fn() };
});

describe('ChartPanelV2', () => {
  it('normalizes millisecond timestamps to seconds when setting candlestick data', async () => {
    // Provide SWR data with ms timestamps
    const nowMs = Date.now();
    swrMock = {
      data: {
        symbol: 'BTC', timeframe: '5m',
        candles: Array.from({ length: 5 }).map((_, i) => ({
          ts: nowMs + i * 60_000,
          o: 100 + i, h: 101 + i, l: 99 + i, c: 100 + i, v: 1,
        })),
      },
      isLoading: false,
      mutate: vi.fn(),
    };

    render(<ChartPanel />);
    await waitFor(() => expect(captured.candleSetData).toBeTruthy());
    // Expect times to be seconds (not > 1e10)
    const times = (captured.candleSetData || []).map(d => d.time as number);
    expect(times.every(t => t < 1e10)).toBe(true);
  });

  it('renders sub chart when RSI indicator is enabled', async () => {
    indicatorState.rsi = true;
    render(<ChartPanel />);
    expect(await screen.findByTestId('chart-sub')).toBeInTheDocument();
  });

  it('uses hexToRGBA for Bollinger Band fill colors', async () => {
    indicatorState.bband = true;
    indicatorState.bbFill = true;
    indicatorState.style.bbFillColor = '#336699';
    indicatorState.style.bbFillOpacity = 0.25;

    render(<ChartPanel />);
    await waitFor(() => expect(captured.areaOptions).toBeTruthy());
    expect(captured.areaOptions?.topColor).toBe('rgba(51,102,153,0.25)');
    expect(captured.areaOptions?.bottomColor).toBe('rgba(51,102,153,0.25)');
  });

  it('disables overlay pointer events when cursor tool and no active plugin tool', async () => {
    drawStoreState.tool = 'cursor';
    const pm = (globalThis as any).__mockPluginManager;
    pm.hasActiveTool.mockReturnValue(false);
    render(<ChartPanel />);
    const canvas = await screen.findByTestId('chart-overlay');
    expect(canvas).toHaveStyle({ pointerEvents: 'none' });
  });

  it('window __lokifiApplySymbolSettings applies plugin symbol settings', async () => {
    const set = vi.fn();
    const get = vi.fn(() => ({ channelDefaultWidthPct: 25, channelWidthMode: 'fixed', fibPreset: 'default', fibCustomLevels: [0.382, 0.618] }));
    (globalThis as any).pluginSettingsStore = { get };
    (globalThis as any).pluginSymbolSettings = { set, clear: vi.fn() };

    render(<ChartPanel symbol="BTC" timeframe="5m" />);
    await waitFor(() => expect((window as any).__lokifiApplySymbolSettings).toBeTruthy());
    (window as any).__lokifiApplySymbolSettings();
    expect(set).toHaveBeenCalledWith('BTC', '5m', {
      channelDefaultWidthPct: 25,
      channelWidthMode: 'fixed',
      fibPreset: 'default',
      fibCustomLevels: [0.382, 0.618],
    });
  });

  it('window __lokifiClearSymbolSettings calls clear with current symbol/timeframe', async () => {
    const clear = vi.fn();
    (globalThis as any).pluginSettingsStore = { get: vi.fn(() => ({})) };
    (globalThis as any).pluginSymbolSettings = { set: vi.fn(), clear };

    render(<ChartPanel symbol="BTC" timeframe="15m" />);
    await waitFor(() => expect((window as any).__lokifiClearSymbolSettings).toBeTruthy());
    (window as any).__lokifiClearSymbolSettings();
    // The subscribe mock immediately sets TF to '5m'
    expect(clear).toHaveBeenCalledWith('BTC', '5m');
  });
});
