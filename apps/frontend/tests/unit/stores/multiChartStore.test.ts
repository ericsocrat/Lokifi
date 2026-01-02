import * as featureFlags from '@/lib/utils/featureFlags';
import type { ChartInstance, LayoutType, LinkingDimensions } from '@/lib/stores/multiChartStore';
import { useMultiChartStore } from '@/lib/stores/multiChartStore';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock feature flags
vi.mock('@/lib/utils/featureFlags', () => ({
  FLAGS: {
    multiChart: true,
    alerts: false,
    paperTrading: false,
  },
}));

// Helper function to create mock ChartInstance
function createMockChart(overrides?: Partial<ChartInstance>): ChartInstance {
  return {
    id: `chart-${Date.now()}`,
    symbol: 'BTCUSDT',
    timeframe: '1h',
    paneId: 'pane-1',
    position: { row: 0, col: 0 },
    ...overrides,
  };
}

describe('multiChartStore', () => {
  // Reset store state before each test
  beforeEach(() => {
    // Reset to initial state
    useMultiChartStore.setState({
      layout: '1x1',
      charts: [
        {
          id: 'chart-1',
          symbol: 'BTCUSDT',
          timeframe: '1h',
          paneId: 'pane-1',
          position: { row: 0, col: 0 },
        },
      ],
      linking: {
        symbol: false,
        timeframe: false,
        cursor: false,
      },
      activeChart: 'chart-1',
    });

    // Reset mocks
    vi.clearAllMocks();

    // Ensure feature flag is enabled
    vi.mocked(featureFlags).FLAGS.multiChart = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should have default layout of 1x1', () => {
      const state = useMultiChartStore.getState();
      expect(state.layout).toBe('1x1');
    });

    it('should have one default chart', () => {
      const state = useMultiChartStore.getState();
      expect(state.charts).toHaveLength(1);
      expect(state.charts[0].symbol).toBe('BTCUSDT');
      expect(state.charts[0].timeframe).toBe('1h');
    });

    it('should have default chart at position (0,0)', () => {
      const state = useMultiChartStore.getState();
      expect(state.charts[0].position).toEqual({ row: 0, col: 0 });
    });

    it('should have all linking disabled by default', () => {
      const state = useMultiChartStore.getState();
      expect(state.linking).toEqual({
        symbol: false,
        timeframe: false,
        cursor: false,
      });
    });

    it('should have activeChart set to first chart', () => {
      const state = useMultiChartStore.getState();
      expect(state.activeChart).toBe('chart-1');
    });
  });

  describe('Layout Management', () => {
    describe('setLayout', () => {
      it('should change layout to 1x2', () => {
        const store = useMultiChartStore.getState();
        store.setLayout('1x2');

        const state = useMultiChartStore.getState();
        expect(state.layout).toBe('1x2');
      });

      it('should add charts when switching to larger layout', () => {
        const store = useMultiChartStore.getState();
        expect(useMultiChartStore.getState().charts).toHaveLength(1);

        store.setLayout('2x2');

        const state = useMultiChartStore.getState();
        expect(state.charts).toHaveLength(4);
      });

      it('should remove excess charts when switching to smaller layout', () => {
        const store = useMultiChartStore.getState();
        store.setLayout('2x2');
        expect(useMultiChartStore.getState().charts).toHaveLength(4);

        store.setLayout('1x1');

        const state = useMultiChartStore.getState();
        expect(state.charts).toHaveLength(1);
      });

      it('should update chart positions for 1x2 layout', () => {
        const store = useMultiChartStore.getState();
        store.setLayout('1x2');

        const state = useMultiChartStore.getState();
        expect(state.charts[0].position).toEqual({ row: 0, col: 0 });
        expect(state.charts[1].position).toEqual({ row: 1, col: 0 });
      });

      it('should update chart positions for 2x2 layout', () => {
        const store = useMultiChartStore.getState();
        store.setLayout('2x2');

        const state = useMultiChartStore.getState();
        expect(state.charts[0].position).toEqual({ row: 0, col: 0 });
        expect(state.charts[1].position).toEqual({ row: 0, col: 1 });
        expect(state.charts[2].position).toEqual({ row: 1, col: 0 });
        expect(state.charts[3].position).toEqual({ row: 1, col: 1 });
      });

      it('should not modify state when feature flag is disabled', () => {
        vi.mocked(featureFlags).FLAGS.multiChart = false;

        const store = useMultiChartStore.getState();
        const originalLayout = store.layout;
        store.setLayout('2x2');

        const state = useMultiChartStore.getState();
        expect(state.layout).toBe(originalLayout);
      });

      it('should preserve existing chart data when adding new charts', () => {
        const store = useMultiChartStore.getState();
        const originalChart = store.charts[0];

        store.setLayout('2x2');

        const state = useMultiChartStore.getState();
        expect(state.charts[0].symbol).toBe(originalChart.symbol);
        expect(state.charts[0].timeframe).toBe(originalChart.timeframe);
      });

      it('should assign default symbol and timeframe to new charts', () => {
        const store = useMultiChartStore.getState();
        store.setLayout('2x2');

        const state = useMultiChartStore.getState();
        // New charts should have defaults
        state.charts.slice(1).forEach((chart) => {
          expect(chart.symbol).toBe('BTCUSDT');
          expect(chart.timeframe).toBe('1h');
        });
      });
    });
  });

  describe('Chart Management', () => {
    describe('addChart', () => {
      it('should add a new chart', () => {
        const store = useMultiChartStore.getState();
        const chartData = {
          symbol: 'ETHUSDT',
          timeframe: '4h',
          paneId: 'pane-2',
          position: { row: 0, col: 1 },
        };

        store.addChart(chartData);

        const state = useMultiChartStore.getState();
        expect(state.charts).toHaveLength(2);
        expect(state.charts[1].symbol).toBe('ETHUSDT');
        expect(state.charts[1].timeframe).toBe('4h');
      });

      it('should generate unique id for new chart', () => {
        const store = useMultiChartStore.getState();
        const chartData = {
          symbol: 'ETHUSDT',
          timeframe: '4h',
          paneId: 'pane-2',
          position: { row: 0, col: 1 },
        };

        store.addChart(chartData);

        const state = useMultiChartStore.getState();
        expect(state.charts[1].id).toContain('chart-');
        expect(state.charts[1].id).not.toBe(state.charts[0].id);
      });

      it('should not add chart when feature flag is disabled', () => {
        vi.mocked(featureFlags).FLAGS.multiChart = false;

        const store = useMultiChartStore.getState();
        const originalLength = store.charts.length;

        store.addChart({
          symbol: 'ETHUSDT',
          timeframe: '4h',
          paneId: 'pane-2',
          position: { row: 0, col: 1 },
        });

        const state = useMultiChartStore.getState();
        expect(state.charts).toHaveLength(originalLength);
      });
    });

    describe('removeChart', () => {
      it('should remove chart by id', () => {
        // Setup: Add second chart first
        const store = useMultiChartStore.getState();
        store.addChart({
          symbol: 'ETHUSDT',
          timeframe: '4h',
          paneId: 'pane-2',
          position: { row: 0, col: 1 },
        });

        const stateAfterAdd = useMultiChartStore.getState();
        const chartToRemove = stateAfterAdd.charts[1];

        store.removeChart(chartToRemove.id);

        const state = useMultiChartStore.getState();
        expect(state.charts).toHaveLength(1);
        expect(state.charts.find((c) => c.id === chartToRemove.id)).toBeUndefined();
      });

      it('should clear activeChart if removed chart was active', () => {
        const store = useMultiChartStore.getState();
        // Add and make new chart active
        store.addChart({
          symbol: 'ETHUSDT',
          timeframe: '4h',
          paneId: 'pane-2',
          position: { row: 0, col: 1 },
        });

        const stateAfterAdd = useMultiChartStore.getState();
        const newChart = stateAfterAdd.charts[1];
        store.setActiveChart(newChart.id);

        // Now remove it
        store.removeChart(newChart.id);

        const state = useMultiChartStore.getState();
        expect(state.activeChart).toBeNull();
      });

      it('should preserve activeChart if different chart is removed', () => {
        const store = useMultiChartStore.getState();
        const originalActiveChart = store.activeChart;

        // Add second chart
        store.addChart({
          symbol: 'ETHUSDT',
          timeframe: '4h',
          paneId: 'pane-2',
          position: { row: 0, col: 1 },
        });

        const stateAfterAdd = useMultiChartStore.getState();
        const chartToRemove = stateAfterAdd.charts[1];

        // Remove the new chart (not the active one)
        store.removeChart(chartToRemove.id);

        const state = useMultiChartStore.getState();
        expect(state.activeChart).toBe(originalActiveChart);
      });

      it('should do nothing if chart id does not exist', () => {
        const store = useMultiChartStore.getState();
        const originalLength = store.charts.length;

        store.removeChart('non-existent-chart');

        const state = useMultiChartStore.getState();
        expect(state.charts).toHaveLength(originalLength);
      });
    });

    describe('updateChart', () => {
      it('should update chart symbol', () => {
        const store = useMultiChartStore.getState();
        const chartId = store.charts[0].id;

        store.updateChart(chartId, { symbol: 'ETHUSDT' });

        const state = useMultiChartStore.getState();
        expect(state.charts[0].symbol).toBe('ETHUSDT');
      });

      it('should update chart timeframe', () => {
        const store = useMultiChartStore.getState();
        const chartId = store.charts[0].id;

        store.updateChart(chartId, { timeframe: '4h' });

        const state = useMultiChartStore.getState();
        expect(state.charts[0].timeframe).toBe('4h');
      });

      it('should update multiple properties at once', () => {
        const store = useMultiChartStore.getState();
        const chartId = store.charts[0].id;

        store.updateChart(chartId, { symbol: 'ETHUSDT', timeframe: '4h' });

        const state = useMultiChartStore.getState();
        expect(state.charts[0].symbol).toBe('ETHUSDT');
        expect(state.charts[0].timeframe).toBe('4h');
      });

      it('should preserve other chart properties when updating', () => {
        const store = useMultiChartStore.getState();
        const chartId = store.charts[0].id;
        const originalPaneId = store.charts[0].paneId;

        store.updateChart(chartId, { symbol: 'ETHUSDT' });

        const state = useMultiChartStore.getState();
        expect(state.charts[0].paneId).toBe(originalPaneId);
      });

      it('should not update non-existent chart', () => {
        const store = useMultiChartStore.getState();
        const originalSymbol = store.charts[0].symbol;

        store.updateChart('non-existent', { symbol: 'ETHUSDT' });

        const state = useMultiChartStore.getState();
        expect(state.charts[0].symbol).toBe(originalSymbol);
      });
    });

    describe('setActiveChart', () => {
      it('should set active chart', () => {
        const store = useMultiChartStore.getState();
        // Add second chart
        store.addChart({
          symbol: 'ETHUSDT',
          timeframe: '4h',
          paneId: 'pane-2',
          position: { row: 0, col: 1 },
        });

        const stateAfterAdd = useMultiChartStore.getState();
        const newChartId = stateAfterAdd.charts[1].id;

        store.setActiveChart(newChartId);

        const state = useMultiChartStore.getState();
        expect(state.activeChart).toBe(newChartId);
      });

      it('should allow setting activeChart to null', () => {
        const store = useMultiChartStore.getState();

        store.setActiveChart(null);

        const state = useMultiChartStore.getState();
        expect(state.activeChart).toBeNull();
      });
    });
  });

  describe('Linking Management', () => {
    describe('updateLinking', () => {
      it('should enable symbol linking', () => {
        const store = useMultiChartStore.getState();

        store.updateLinking('symbol', true);

        const state = useMultiChartStore.getState();
        expect(state.linking.symbol).toBe(true);
      });

      it('should enable timeframe linking', () => {
        const store = useMultiChartStore.getState();

        store.updateLinking('timeframe', true);

        const state = useMultiChartStore.getState();
        expect(state.linking.timeframe).toBe(true);
      });

      it('should enable cursor linking', () => {
        const store = useMultiChartStore.getState();

        store.updateLinking('cursor', true);

        const state = useMultiChartStore.getState();
        expect(state.linking.cursor).toBe(true);
      });

      it('should disable symbol linking', () => {
        const store = useMultiChartStore.getState();
        store.updateLinking('symbol', true);

        store.updateLinking('symbol', false);

        const state = useMultiChartStore.getState();
        expect(state.linking.symbol).toBe(false);
      });

      it('should preserve other linking settings when updating one', () => {
        const store = useMultiChartStore.getState();
        store.updateLinking('symbol', true);
        store.updateLinking('timeframe', true);

        store.updateLinking('cursor', true);

        const state = useMultiChartStore.getState();
        expect(state.linking.symbol).toBe(true);
        expect(state.linking.timeframe).toBe(true);
        expect(state.linking.cursor).toBe(true);
      });

      it('should not update when feature flag is disabled', () => {
        vi.mocked(featureFlags).FLAGS.multiChart = false;

        const store = useMultiChartStore.getState();

        store.updateLinking('symbol', true);

        const state = useMultiChartStore.getState();
        expect(state.linking.symbol).toBe(false);
      });
    });
  });

  describe('Linked Actions', () => {
    describe('changeSymbolLinked', () => {
      beforeEach(() => {
        // Setup: Create 2x2 layout with multiple charts
        const store = useMultiChartStore.getState();
        store.setLayout('2x2');
      });

      it('should change symbol on all non-active charts when linking enabled', () => {
        const store = useMultiChartStore.getState();
        store.updateLinking('symbol', true);
        const activeChartId = store.activeChart;

        store.changeSymbolLinked('ETHUSDT');

        const state = useMultiChartStore.getState();
        state.charts.forEach((chart) => {
          if (chart.id !== activeChartId) {
            expect(chart.symbol).toBe('ETHUSDT');
          }
        });
      });

      it('should not change active chart symbol', () => {
        const store = useMultiChartStore.getState();
        store.updateLinking('symbol', true);
        const activeChartId = store.activeChart;
        const activeChartOriginalSymbol = store.charts.find((c) => c.id === activeChartId)?.symbol;

        store.changeSymbolLinked('ETHUSDT');

        const state = useMultiChartStore.getState();
        const activeChart = state.charts.find((c) => c.id === activeChartId);
        expect(activeChart?.symbol).toBe(activeChartOriginalSymbol);
      });

      it('should not change any symbols when linking is disabled', () => {
        const store = useMultiChartStore.getState();
        // Keep symbol linking disabled (default)
        const originalSymbols = store.charts.map((c) => c.symbol);

        store.changeSymbolLinked('ETHUSDT');

        const state = useMultiChartStore.getState();
        state.charts.forEach((chart, index) => {
          expect(chart.symbol).toBe(originalSymbols[index]);
        });
      });

      it('should not change symbols when no active chart', () => {
        const store = useMultiChartStore.getState();
        store.updateLinking('symbol', true);
        store.setActiveChart(null);
        const originalSymbols = store.charts.map((c) => c.symbol);

        store.changeSymbolLinked('ETHUSDT');

        const state = useMultiChartStore.getState();
        state.charts.forEach((chart, index) => {
          expect(chart.symbol).toBe(originalSymbols[index]);
        });
      });

      it('should not change symbols when feature flag is disabled', () => {
        vi.mocked(featureFlags).FLAGS.multiChart = false;

        const store = useMultiChartStore.getState();
        const originalSymbols = store.charts.map((c) => c.symbol);

        store.changeSymbolLinked('ETHUSDT');

        const state = useMultiChartStore.getState();
        state.charts.forEach((chart, index) => {
          expect(chart.symbol).toBe(originalSymbols[index]);
        });
      });
    });

    describe('changeTimeframeLinked', () => {
      beforeEach(() => {
        // Setup: Create 2x2 layout with multiple charts
        const store = useMultiChartStore.getState();
        store.setLayout('2x2');
      });

      it('should change timeframe on all non-active charts when linking enabled', () => {
        const store = useMultiChartStore.getState();
        store.updateLinking('timeframe', true);
        const activeChartId = store.activeChart;

        store.changeTimeframeLinked('4h');

        const state = useMultiChartStore.getState();
        state.charts.forEach((chart) => {
          if (chart.id !== activeChartId) {
            expect(chart.timeframe).toBe('4h');
          }
        });
      });

      it('should not change active chart timeframe', () => {
        const store = useMultiChartStore.getState();
        store.updateLinking('timeframe', true);
        const activeChartId = store.activeChart;
        const activeChartOriginalTimeframe = store.charts.find(
          (c) => c.id === activeChartId
        )?.timeframe;

        store.changeTimeframeLinked('4h');

        const state = useMultiChartStore.getState();
        const activeChart = state.charts.find((c) => c.id === activeChartId);
        expect(activeChart?.timeframe).toBe(activeChartOriginalTimeframe);
      });

      it('should not change any timeframes when linking is disabled', () => {
        const store = useMultiChartStore.getState();
        // Keep timeframe linking disabled (default)
        const originalTimeframes = store.charts.map((c) => c.timeframe);

        store.changeTimeframeLinked('4h');

        const state = useMultiChartStore.getState();
        state.charts.forEach((chart, index) => {
          expect(chart.timeframe).toBe(originalTimeframes[index]);
        });
      });

      it('should not change timeframes when no active chart', () => {
        const store = useMultiChartStore.getState();
        store.updateLinking('timeframe', true);
        store.setActiveChart(null);
        const originalTimeframes = store.charts.map((c) => c.timeframe);

        store.changeTimeframeLinked('4h');

        const state = useMultiChartStore.getState();
        state.charts.forEach((chart, index) => {
          expect(chart.timeframe).toBe(originalTimeframes[index]);
        });
      });

      it('should not change timeframes when feature flag is disabled', () => {
        vi.mocked(featureFlags).FLAGS.multiChart = false;

        const store = useMultiChartStore.getState();
        const originalTimeframes = store.charts.map((c) => c.timeframe);

        store.changeTimeframeLinked('4h');

        const state = useMultiChartStore.getState();
        state.charts.forEach((chart, index) => {
          expect(chart.timeframe).toBe(originalTimeframes[index]);
        });
      });
    });

    describe('updateCursorLinked', () => {
      it('should dispatch cursor update event when linking enabled', () => {
        const store = useMultiChartStore.getState();
        store.updateLinking('cursor', true);

        const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
        const cursorPosition = { time: 1700000000, price: 45000 };

        store.updateCursorLinked(cursorPosition);

        expect(dispatchEventSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'multiChartCursorUpdate',
          })
        );
        dispatchEventSpy.mockRestore();
      });

      it('should not dispatch event when cursor linking is disabled', () => {
        const store = useMultiChartStore.getState();
        // Keep cursor linking disabled (default)

        const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
        const cursorPosition = { time: 1700000000, price: 45000 };

        store.updateCursorLinked(cursorPosition);

        expect(dispatchEventSpy).not.toHaveBeenCalled();
        dispatchEventSpy.mockRestore();
      });

      it('should not dispatch event when feature flag is disabled', () => {
        vi.mocked(featureFlags).FLAGS.multiChart = false;

        const store = useMultiChartStore.getState();
        store.updateLinking('cursor', true);

        const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
        const cursorPosition = { time: 1700000000, price: 45000 };

        store.updateCursorLinked(cursorPosition);

        expect(dispatchEventSpy).not.toHaveBeenCalled();
        dispatchEventSpy.mockRestore();
      });
    });
  });

  describe('Layout Position Calculations', () => {
    it('should calculate correct positions for 1x1 layout', () => {
      const store = useMultiChartStore.getState();
      store.setLayout('1x1');

      const state = useMultiChartStore.getState();
      expect(state.charts).toHaveLength(1);
      expect(state.charts[0].position).toEqual({ row: 0, col: 0 });
    });

    it('should calculate correct positions for 1x2 layout', () => {
      const store = useMultiChartStore.getState();
      store.setLayout('1x2');

      const state = useMultiChartStore.getState();
      expect(state.charts).toHaveLength(2);
      expect(state.charts[0].position).toEqual({ row: 0, col: 0 });
      expect(state.charts[1].position).toEqual({ row: 1, col: 0 });
    });

    it('should calculate correct positions for 2x2 layout', () => {
      const store = useMultiChartStore.getState();
      store.setLayout('2x2');

      const state = useMultiChartStore.getState();
      expect(state.charts).toHaveLength(4);
      expect(state.charts[0].position).toEqual({ row: 0, col: 0 });
      expect(state.charts[1].position).toEqual({ row: 0, col: 1 });
      expect(state.charts[2].position).toEqual({ row: 1, col: 0 });
      expect(state.charts[3].position).toEqual({ row: 1, col: 1 });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid layout changes', () => {
      const store = useMultiChartStore.getState();

      store.setLayout('2x2');
      store.setLayout('1x2');
      store.setLayout('1x1');
      store.setLayout('2x2');

      const state = useMultiChartStore.getState();
      expect(state.layout).toBe('2x2');
      expect(state.charts).toHaveLength(4);
    });

    it('should handle multiple linking toggles', () => {
      const store = useMultiChartStore.getState();

      store.updateLinking('symbol', true);
      store.updateLinking('symbol', false);
      store.updateLinking('symbol', true);

      const state = useMultiChartStore.getState();
      expect(state.linking.symbol).toBe(true);
    });

    it('should handle adding and removing charts rapidly', () => {
      const store = useMultiChartStore.getState();

      store.addChart({
        symbol: 'ETHUSDT',
        timeframe: '4h',
        paneId: 'pane-2',
        position: { row: 0, col: 1 },
      });

      const stateAfterAdd = useMultiChartStore.getState();
      store.removeChart(stateAfterAdd.charts[1].id);

      store.addChart({
        symbol: 'ADAUSDT',
        timeframe: '1d',
        paneId: 'pane-3',
        position: { row: 1, col: 0 },
      });

      const state = useMultiChartStore.getState();
      expect(state.charts).toHaveLength(2);
      expect(state.charts[1].symbol).toBe('ADAUSDT');
    });

    it('should handle updating chart to same values', () => {
      const store = useMultiChartStore.getState();
      const chartId = store.charts[0].id;
      const originalSymbol = store.charts[0].symbol;

      store.updateChart(chartId, { symbol: originalSymbol });

      const state = useMultiChartStore.getState();
      expect(state.charts[0].symbol).toBe(originalSymbol);
    });

    it('should handle empty chart array gracefully', () => {
      // Manually set empty charts for edge case testing
      useMultiChartStore.setState({ charts: [], activeChart: null });

      const store = useMultiChartStore.getState();
      expect(store.charts).toHaveLength(0);
      expect(store.activeChart).toBeNull();

      // Adding a chart should work
      store.addChart({
        symbol: 'BTCUSDT',
        timeframe: '1h',
        paneId: 'pane-1',
        position: { row: 0, col: 0 },
      });

      const state = useMultiChartStore.getState();
      expect(state.charts).toHaveLength(1);
    });
  });

  describe('Integration Scenarios', () => {
    it('should support typical multi-chart workflow', () => {
      const store = useMultiChartStore.getState();

      // 1. Change to 2x2 layout
      store.setLayout('2x2');
      expect(useMultiChartStore.getState().charts).toHaveLength(4);

      // 2. Configure different symbols for each chart
      const chartsAfterLayout = useMultiChartStore.getState().charts;
      store.updateChart(chartsAfterLayout[0].id, { symbol: 'BTCUSDT' });
      store.updateChart(chartsAfterLayout[1].id, { symbol: 'ETHUSDT' });
      store.updateChart(chartsAfterLayout[2].id, { symbol: 'SOLUSDT' });
      store.updateChart(chartsAfterLayout[3].id, { symbol: 'ADAUSDT' });

      const state = useMultiChartStore.getState();
      expect(state.charts.map((c) => c.symbol)).toEqual([
        'BTCUSDT',
        'ETHUSDT',
        'SOLUSDT',
        'ADAUSDT',
      ]);
    });

    it('should support linked trading analysis workflow', () => {
      const store = useMultiChartStore.getState();

      // 1. Create multi-chart layout
      store.setLayout('1x2');

      // 2. Set different timeframes for analysis
      const chartsAfterLayout = useMultiChartStore.getState().charts;
      store.updateChart(chartsAfterLayout[0].id, { timeframe: '1h' });
      store.updateChart(chartsAfterLayout[1].id, { timeframe: '4h' });

      // 3. Enable symbol linking for correlated analysis
      store.updateLinking('symbol', true);

      // 4. Change symbol - both charts should follow
      store.setActiveChart(chartsAfterLayout[0].id);
      store.changeSymbolLinked('ETHUSDT');

      const state = useMultiChartStore.getState();
      expect(state.charts[1].symbol).toBe('ETHUSDT');
      // Active chart should not change
      expect(state.charts[0].symbol).toBe('BTCUSDT');
    });
  });
});
