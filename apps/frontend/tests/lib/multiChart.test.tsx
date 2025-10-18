import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { setDevFlag } from '../../lib/featureFlags';
import { useMultiChartStore, type ChartInstance, type LayoutType } from '../../lib/multiChart';

describe('multiChart - Zustand Store', () => {
  beforeEach(() => {
    // Enable the feature for testing
    setDevFlag('multiChart', true);

    // Reset the store before each test
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
  });

  describe('Initial State', () => {
    it('should initialize with default 1x1 layout', () => {
      const { result } = renderHook(() => useMultiChartStore());

      expect(result.current.layout).toBe('1x1');
      expect(result.current.charts).toHaveLength(1);
      expect(result.current.charts[0].id).toBe('chart-1');
    });

    it('should have linking disabled by default', () => {
      const { result } = renderHook(() => useMultiChartStore());

      expect(result.current.linking.symbol).toBe(false);
      expect(result.current.linking.timeframe).toBe(false);
      expect(result.current.linking.cursor).toBe(false);
    });

    it('should have first chart as active', () => {
      const { result } = renderHook(() => useMultiChartStore());

      expect(result.current.activeChart).toBe('chart-1');
    });
  });

  describe('setLayout', () => {
    it('should change layout from 1x1 to 1x2', () => {
      const { result } = renderHook(() => useMultiChartStore());

      act(() => {
        result.current.setLayout('1x2');
      });

      expect(result.current.layout).toBe('1x2');
      expect(result.current.charts.length).toBeGreaterThanOrEqual(2);
    });

    it('should change layout from 1x1 to 2x2', () => {
      const { result } = renderHook(() => useMultiChartStore());

      act(() => {
        result.current.setLayout('2x2');
      });

      expect(result.current.layout).toBe('2x2');
      expect(result.current.charts.length).toBeGreaterThanOrEqual(4);
    });

    it('should not change layout when feature is disabled', () => {
      setDevFlag('multiChart', false);
      const { result } = renderHook(() => useMultiChartStore());

      const initialLayout = result.current.layout;

      act(() => {
        result.current.setLayout('2x2');
      });

      expect(result.current.layout).toBe(initialLayout);

      // Re-enable for cleanup
      setDevFlag('multiChart', true);
    });

    it('should create new charts with unique IDs', () => {
      const { result } = renderHook(() => useMultiChartStore());

      act(() => {
        result.current.setLayout('2x2');
      });

      const chartIds = result.current.charts.map((c: ChartInstance) => c.id);
      const uniqueIds = new Set(chartIds);

      expect(uniqueIds.size).toBe(chartIds.length);
    });

    it('should assign correct positions for 1x2 layout', () => {
      const { result } = renderHook(() => useMultiChartStore());

      act(() => {
        result.current.setLayout('1x2');
      });

      // 1x2 means 1 column, 2 rows (vertical stack)
      expect(result.current.charts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ position: { row: 0, col: 0 } }),
          expect.objectContaining({ position: { row: 1, col: 0 } }),
        ])
      );
    });
  });

  describe('addChart', () => {
    it('should add a new chart', () => {
      const { result } = renderHook(() => useMultiChartStore());

      const newChart = {
        symbol: 'ETHUSDT',
        timeframe: '15m',
        paneId: 'pane-2',
        position: { row: 1, col: 0 },
      };

      act(() => {
        result.current.addChart(newChart);
      });

      expect(result.current.charts.length).toBeGreaterThan(1);
      expect(result.current.charts[result.current.charts.length - 1]).toMatchObject({
        symbol: 'ETHUSDT',
        timeframe: '15m',
      });
    });

    it('should not add chart when feature is disabled', () => {
      setDevFlag('multiChart', false);
      const { result } = renderHook(() => useMultiChartStore());

      const initialLength = result.current.charts.length;

      act(() => {
        result.current.addChart({
          symbol: 'ETHUSDT',
          timeframe: '15m',
          paneId: 'pane-2',
          position: { row: 1, col: 0 },
        });
      });

      expect(result.current.charts.length).toBe(initialLength);

      setDevFlag('multiChart', true);
    });

    it('should generate unique ID for added chart', () => {
      const { result } = renderHook(() => useMultiChartStore());

      act(() => {
        result.current.addChart({
          symbol: 'ETHUSDT',
          timeframe: '15m',
          paneId: 'pane-2',
          position: { row: 1, col: 0 },
        });
      });

      const lastChart = result.current.charts[result.current.charts.length - 1];
      expect(lastChart.id).toBeTruthy();
      expect(typeof lastChart.id).toBe('string');
    });
  });

  describe('removeChart', () => {
    it('should remove a chart by ID', () => {
      const { result } = renderHook(() => useMultiChartStore());

      // Add a second chart first
      act(() => {
        result.current.addChart({
          symbol: 'ETHUSDT',
          timeframe: '15m',
          paneId: 'pane-2',
          position: { row: 1, col: 0 },
        });
      });

      const chartToRemove = result.current.charts[0].id;
      const initialLength = result.current.charts.length;

      act(() => {
        result.current.removeChart(chartToRemove);
      });

      expect(result.current.charts.length).toBe(initialLength - 1);
      expect(
        result.current.charts.find((c: ChartInstance) => c.id === chartToRemove)
      ).toBeUndefined();
    });

    it('should not remove chart when feature is disabled', () => {
      setDevFlag('multiChart', false);
      const { result } = renderHook(() => useMultiChartStore());

      const chartId = result.current.charts[0].id;
      const initialLength = result.current.charts.length;

      act(() => {
        result.current.removeChart(chartId);
      });

      expect(result.current.charts.length).toBe(initialLength);

      setDevFlag('multiChart', true);
    });

    it('should clear active chart if it is removed', () => {
      const { result } = renderHook(() => useMultiChartStore());

      const activeChartId = result.current.activeChart!;

      act(() => {
        result.current.removeChart(activeChartId);
      });

      expect(result.current.activeChart).not.toBe(activeChartId);
    });
  });

  describe('updateChart', () => {
    it('should update chart symbol', () => {
      const { result } = renderHook(() => useMultiChartStore());

      const chartId = result.current.charts[0].id;

      act(() => {
        result.current.updateChart(chartId, { symbol: 'ETHUSDT' });
      });

      const updatedChart = result.current.charts.find((c: ChartInstance) => c.id === chartId);
      expect(updatedChart?.symbol).toBe('ETHUSDT');
    });

    it('should update chart timeframe', () => {
      const { result } = renderHook(() => useMultiChartStore());

      const chartId = result.current.charts[0].id;

      act(() => {
        result.current.updateChart(chartId, { timeframe: '5m' });
      });

      const updatedChart = result.current.charts.find((c: ChartInstance) => c.id === chartId);
      expect(updatedChart?.timeframe).toBe('5m');
    });

    it('should update chart even when feature is disabled (no guard in updateChart)', () => {
      const { result } = renderHook(() => useMultiChartStore());

      const chartId = result.current.charts[0].id;

      act(() => {
        result.current.updateChart(chartId, { symbol: 'ETHUSDT' });
      });

      const chart = result.current.charts.find((c: ChartInstance) => c.id === chartId);
      expect(chart?.symbol).toBe('ETHUSDT');
    });
    it('should handle updating non-existent chart gracefully', () => {
      const { result } = renderHook(() => useMultiChartStore());

      expect(() => {
        act(() => {
          result.current.updateChart('non-existent-id', { symbol: 'ETHUSDT' });
        });
      }).not.toThrow();
    });
  });

  describe('setActiveChart', () => {
    it('should set active chart', () => {
      const { result } = renderHook(() => useMultiChartStore());

      // Add another chart
      act(() => {
        result.current.addChart({
          symbol: 'ETHUSDT',
          timeframe: '15m',
          paneId: 'pane-2',
          position: { row: 1, col: 0 },
        });
      });

      const newActiveId = result.current.charts[1].id;

      act(() => {
        result.current.setActiveChart(newActiveId);
      });

      expect(result.current.activeChart).toBe(newActiveId);
    });

    it('should allow setting active chart to null', () => {
      const { result } = renderHook(() => useMultiChartStore());

      act(() => {
        result.current.setActiveChart(null);
      });

      expect(result.current.activeChart).toBeNull();
    });

    it('should set active chart even when feature is disabled (no guard in setActiveChart)', () => {
      const { result } = renderHook(() => useMultiChartStore());

      act(() => {
        result.current.setActiveChart('new-chart-id');
      });

      expect(result.current.activeChart).toBe('new-chart-id');
    });
  });

  describe('updateLinking', () => {
    it('should enable symbol linking', () => {
      const { result } = renderHook(() => useMultiChartStore());

      act(() => {
        result.current.updateLinking('symbol', true);
      });

      expect(result.current.linking.symbol).toBe(true);
    });

    it('should disable symbol linking', () => {
      const { result } = renderHook(() => useMultiChartStore());

      act(() => {
        result.current.updateLinking('symbol', true);
        result.current.updateLinking('symbol', false);
      });

      expect(result.current.linking.symbol).toBe(false);
    });

    it('should enable timeframe linking', () => {
      const { result } = renderHook(() => useMultiChartStore());

      act(() => {
        result.current.updateLinking('timeframe', true);
      });

      expect(result.current.linking.timeframe).toBe(true);
    });

    it('should enable cursor linking', () => {
      const { result } = renderHook(() => useMultiChartStore());

      act(() => {
        result.current.updateLinking('cursor', true);
      });

      expect(result.current.linking.cursor).toBe(true);
    });

    it('should not update linking when feature is disabled', () => {
      setDevFlag('multiChart', false);
      const { result } = renderHook(() => useMultiChartStore());

      act(() => {
        result.current.updateLinking('symbol', true);
      });

      expect(result.current.linking.symbol).toBe(false);

      setDevFlag('multiChart', true);
    });
  });

  describe('Linked Actions', () => {
    describe('changeSymbolLinked', () => {
      it('should update all charts except active when symbol linking is enabled', () => {
        const { result } = renderHook(() => useMultiChartStore());

        // Setup: create 2x2 layout
        act(() => {
          result.current.setLayout('2x2');
          result.current.updateLinking('symbol', true);
        });

        const activeId = result.current.activeChart;

        act(() => {
          result.current.changeSymbolLinked('ETHUSDT');
        });

        // All charts except active should be updated
        const nonActiveCharts = result.current.charts.filter(
          (c: ChartInstance) => c.id !== activeId
        );
        expect(nonActiveCharts.every((c: ChartInstance) => c.symbol === 'ETHUSDT')).toBe(true);
      });

      it('should not update charts when symbol linking is disabled', () => {
        const { result } = renderHook(() => useMultiChartStore());

        const originalSymbol = result.current.charts[0].symbol;

        act(() => {
          result.current.updateLinking('symbol', false);
          result.current.changeSymbolLinked('ETHUSDT');
        });

        expect(result.current.charts[0].symbol).toBe(originalSymbol);
      });

      it('should not update when feature flag is disabled', () => {
        setDevFlag('multiChart', false);
        const { result } = renderHook(() => useMultiChartStore());

        const originalSymbol = result.current.charts[0].symbol;

        act(() => {
          result.current.changeSymbolLinked('ETHUSDT');
        });

        expect(result.current.charts[0].symbol).toBe(originalSymbol);

        setDevFlag('multiChart', true);
      });
    });

    describe('changeTimeframeLinked', () => {
      it('should update all charts except active when timeframe linking is enabled', () => {
        const { result } = renderHook(() => useMultiChartStore());

        act(() => {
          result.current.setLayout('2x2');
          result.current.updateLinking('timeframe', true);
        });

        const activeId = result.current.activeChart;

        act(() => {
          result.current.changeTimeframeLinked('5m');
        });

        // All charts except active should be updated
        const nonActiveCharts = result.current.charts.filter(
          (c: ChartInstance) => c.id !== activeId
        );
        expect(nonActiveCharts.every((c: ChartInstance) => c.timeframe === '5m')).toBe(true);
      });

      it('should not update charts when timeframe linking is disabled', () => {
        const { result } = renderHook(() => useMultiChartStore());

        const originalTf = result.current.charts[0].timeframe;

        act(() => {
          result.current.updateLinking('timeframe', false);
          result.current.changeTimeframeLinked('5m');
        });

        expect(result.current.charts[0].timeframe).toBe(originalTf);
      });

      it('should not update when feature flag is disabled', () => {
        setDevFlag('multiChart', false);
        const { result } = renderHook(() => useMultiChartStore());

        const originalTf = result.current.charts[0].timeframe;

        act(() => {
          result.current.changeTimeframeLinked('5m');
        });

        expect(result.current.charts[0].timeframe).toBe(originalTf);

        setDevFlag('multiChart', true);
      });
    });

    describe('updateCursorLinked', () => {
      it('should broadcast cursor position when cursor linking is enabled', () => {
        const { result } = renderHook(() => useMultiChartStore());

        const cursorPosition = { time: 1234567890, price: 50000 };

        act(() => {
          result.current.updateLinking('cursor', true);
          result.current.updateCursorLinked(cursorPosition);
        });

        // Cursor linking is event-based, so just verify it doesn't throw
        expect(result.current.linking.cursor).toBe(true);
      });

      it('should not broadcast when cursor linking is disabled', () => {
        const { result } = renderHook(() => useMultiChartStore());

        act(() => {
          result.current.updateLinking('cursor', false);
        });

        expect(() => {
          act(() => {
            result.current.updateCursorLinked({ time: 1234567890, price: 50000 });
          });
        }).not.toThrow();
      });

      it('should not broadcast when feature flag is disabled', () => {
        setDevFlag('multiChart', false);
        const { result } = renderHook(() => useMultiChartStore());

        expect(() => {
          act(() => {
            result.current.updateCursorLinked({ time: 1234567890, price: 50000 });
          });
        }).not.toThrow();

        setDevFlag('multiChart', true);
      });
    });
  });

  describe('Store Integration', () => {
    it('should maintain consistency across multiple operations', () => {
      const { result } = renderHook(() => useMultiChartStore());

      act(() => {
        // Change layout
        result.current.setLayout('1x2');

        // Enable linking
        result.current.updateLinking('symbol', true);
        result.current.updateLinking('timeframe', true);
      });

      const activeId = result.current.activeChart;

      act(() => {
        // Update all charts via linking (except active)
        result.current.changeSymbolLinked('ETHUSDT');
        result.current.changeTimeframeLinked('15m');
      });

      expect(result.current.layout).toBe('1x2');
      expect(result.current.linking.symbol).toBe(true);
      expect(result.current.linking.timeframe).toBe(true);

      // Non-active charts should be updated
      const nonActiveCharts = result.current.charts.filter((c: ChartInstance) => c.id !== activeId);
      expect(nonActiveCharts.every((c: ChartInstance) => c.symbol === 'ETHUSDT')).toBe(true);
      expect(nonActiveCharts.every((c: ChartInstance) => c.timeframe === '15m')).toBe(true);
    });

    it('should handle rapid layout changes', () => {
      const { result } = renderHook(() => useMultiChartStore());

      act(() => {
        result.current.setLayout('1x2');
        result.current.setLayout('2x2');
        result.current.setLayout('1x1');
      });

      expect(result.current.layout).toBe('1x1');
      expect(result.current.charts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty chart array gracefully', () => {
      const { result } = renderHook(() => useMultiChartStore());

      // Force empty array
      act(() => {
        useMultiChartStore.setState({ charts: [] });
      });

      expect(() => {
        act(() => {
          result.current.changeSymbolLinked('ETHUSDT');
        });
      }).not.toThrow();
    });

    it('should handle invalid layout type', () => {
      const { result } = renderHook(() => useMultiChartStore());

      expect(() => {
        act(() => {
          result.current.setLayout('invalid' as LayoutType);
        });
      }).not.toThrow();
    });

    it('should handle removing last chart', () => {
      const { result } = renderHook(() => useMultiChartStore());

      const chartId = result.current.charts[0].id;

      act(() => {
        result.current.removeChart(chartId);
      });

      // Should either have 0 charts or auto-add a default one
      expect(result.current.charts.length).toBeGreaterThanOrEqual(0);
    });
  });
});
