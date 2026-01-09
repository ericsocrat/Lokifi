/**
 * Multi-chart layout system with linking capabilities
 * Feature-flagged and OFF by default
 */
'use client';
import type { Draft } from 'immer';
import React, { createContext, useCallback, useContext } from 'react';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { FLAGS } from '../utils/featureFlags';
import { type VersionedState } from '../utils/migrations';

export type LayoutType = '1x1' | '1x2' | '2x2';

export interface ChartInstance {
  id: string;
  symbol: string;
  timeframe: string;
  paneId: string;
  position: { row: number; col: number };
}

export interface LinkingDimensions {
  symbol: boolean;
  timeframe: boolean;
  cursor: boolean;
}

export interface MultiChartState extends VersionedState {
  data: {
    layout: LayoutType;
    charts: ChartInstance[];
    linking: LinkingDimensions;
    activeChart: string | null;
  };
}

interface MultiChartStore {
  layout: LayoutType;
  charts: ChartInstance[];
  linking: LinkingDimensions;
  activeChart: string | null;

  // Actions
  setLayout: (layout: LayoutType) => void;
  addChart: (chart: Omit<ChartInstance, 'id'>) => void;
  removeChart: (chartId: string) => void;
  updateChart: (chartId: string, updates: Partial<ChartInstance>) => void;
  setActiveChart: (chartId: string | null) => void;
  updateLinking: (dimension: keyof LinkingDimensions, enabled: boolean) => void;

  // Linked actions
  changeSymbolLinked: (symbol: string) => void;
  changeTimeframeLinked: (timeframe: string) => void;
  updateCursorLinked: (position: { time: number; price: number }) => void;
}

const createInitialState = () => ({
  layout: '1x1' as LayoutType,
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

export const useMultiChartStore = create<MultiChartStore>()(
  // @ts-expect-error - Zustand v5 middleware type inference issue with devtools+persist+immer stack
  devtools(
    persist(
      // @ts-expect-error - Zustand v5 middleware type inference issue
      immer((set, get, _store) => ({
        ...createInitialState(),

        setLayout: (layout: LayoutType) => {
          if (!FLAGS.multiChart) return;

          set((draft: Draft<MultiChartStore>) => {
            const positions = getPositionsForLayout(layout);

            // Update layout
            draft.layout = layout;

            // Ensure we have the right number of charts
            while (draft.charts.length < positions.length) {
              const newChart: ChartInstance = {
                id: `chart-${Date.now()}-${draft.charts.length}`,
                symbol: 'BTCUSDT',
                timeframe: '1h',
                paneId: `pane-${draft.charts.length + 1}`,
                position: positions[draft.charts.length],
              };
              draft.charts.push(newChart);
            }

            // Update positions for existing charts
            draft.charts.forEach((chart: ChartInstance, index: number) => {
              if (positions[index]) {
                chart.position = positions[index];
              }
            });

            // Remove excess charts
            if (draft.charts.length > positions.length) {
              draft.charts.splice(positions.length);
            }

            // No return - Immer will handle the mutations
          });
        },

        addChart: (chartData: Omit<ChartInstance, 'id'>) => {
          if (!FLAGS.multiChart) return;

          const newChart: ChartInstance = {
            id: `chart-${Date.now()}`,
            ...chartData,
          };
          set((draft: Draft<MultiChartStore>) => {
            draft.charts.push(newChart);
          });
        },

        removeChart: (chartId: string) => {
          if (!FLAGS.multiChart) return;

          set((draft: Draft<MultiChartStore>) => ({
            charts: draft.charts.filter((chart: ChartInstance) => chart.id !== chartId),
            activeChart: draft.activeChart === chartId ? null : draft.activeChart,
          }));
        },

        updateChart: (chartId: string, updates: Partial<ChartInstance>) => {
          set((draft: Draft<MultiChartStore>) => ({
            charts: draft.charts.map((chart: ChartInstance) =>
              chart.id === chartId ? { ...chart, ...updates } : chart
            ),
          }));
        },

        setActiveChart: (chartId: string | null) => {
          set({ activeChart: chartId });
        },

        updateLinking: (dimension: keyof LinkingDimensions, enabled: boolean) => {
          if (!FLAGS.multiChart) return;

          set((draft: Draft<MultiChartStore>) => ({
            linking: { ...draft.linking, [dimension]: enabled },
          }));
        },

        changeSymbolLinked: (symbol: string) => {
          if (!FLAGS.multiChart) return;

          const { linking, charts, activeChart } = get() as MultiChartStore;
          if (!linking.symbol || !activeChart) return;

          set({
            charts: charts.map((chart: ChartInstance) =>
              chart.id !== activeChart ? { ...chart, symbol } : chart
            ),
          });
        },

        changeTimeframeLinked: (timeframe: string) => {
          if (!FLAGS.multiChart) return;

          const { linking, charts, activeChart } = get() as MultiChartStore;
          if (!linking.timeframe || !activeChart) return;

          set({
            charts: charts.map((chart: ChartInstance) =>
              chart.id !== activeChart ? { ...chart, timeframe } : chart
            ),
          });
        },

        updateCursorLinked: (position: { time: number; price: number }) => {
          if (!FLAGS.multiChart) return;

          const { linking } = get() as MultiChartStore;
          if (!linking.cursor) return;

          // Emit cursor update event for other charts
          window.dispatchEvent(
            new CustomEvent('multiChartCursorUpdate', {
              detail: { position, source: (get() as MultiChartStore).activeChart },
            })
          );
        },
      })),
      {
        name: 'multi-chart-storage',
        partialize: (state: MultiChartStore) => ({
          schemaVersion: 1,
          data: {
            layout: state.layout,
            charts: state.charts,
            linking: state.linking,
            activeChart: state.activeChart,
          },
        }),
      }
    ),
    { name: 'MultiChartStore' }
  )
);

function getPositionsForLayout(layout: LayoutType): Array<{ row: number; col: number }> {
  switch (layout) {
    case '1x1':
      return [{ row: 0, col: 0 }];
    case '1x2':
      return [
        { row: 0, col: 0 },
        { row: 1, col: 0 },
      ];
    case '2x2':
      return [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 0 },
        { row: 1, col: 1 },
      ];
    default:
      return [{ row: 0, col: 0 }];
  }
}

// Multi-chart context for cross-component communication
interface MultiChartContextType {
  isMultiChartEnabled: boolean;
  currentLayout: LayoutType;
  charts: ChartInstance[];
  linking: LinkingDimensions;
  activeChart: string | null;

  // Actions
  setLayout: (layout: LayoutType) => void;
  updateLinking: (dimension: keyof LinkingDimensions, enabled: boolean) => void;
  setActiveChart: (chartId: string | null) => void;
  changeSymbol: (symbol: string, chartId?: string) => void;
  changeTimeframe: (timeframe: string, chartId?: string) => void;
}

const MultiChartContext = createContext<MultiChartContextType | null>(null);

export const MultiChartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    layout,
    charts,
    linking,
    activeChart,
    setLayout,
    updateChart,
    updateLinking,
    setActiveChart,
    changeSymbolLinked,
    changeTimeframeLinked,
  } = useMultiChartStore();

  const changeSymbol = useCallback(
    (symbol: string, chartId?: string) => {
      if (chartId) {
        updateChart(chartId, { symbol });
      }

      if (linking.symbol && activeChart) {
        changeSymbolLinked(symbol);
      }
    },
    [linking.symbol, activeChart, updateChart, changeSymbolLinked]
  );

  const changeTimeframe = useCallback(
    (timeframe: string, chartId?: string) => {
      if (chartId) {
        updateChart(chartId, { timeframe });
      }

      if (linking.timeframe && activeChart) {
        changeTimeframeLinked(timeframe);
      }
    },
    [linking.timeframe, activeChart, updateChart, changeTimeframeLinked]
  );

  const contextValue: MultiChartContextType = {
    isMultiChartEnabled: FLAGS.multiChart,
    currentLayout: layout,
    charts,
    linking,
    activeChart,
    setLayout,
    updateLinking,
    setActiveChart,
    changeSymbol,
    changeTimeframe,
  };

  return <MultiChartContext.Provider value={contextValue}>{children}</MultiChartContext.Provider>;
};

export const useMultiChart = () => {
  const context = useContext(MultiChartContext);
  if (!context) {
    throw new Error('useMultiChart must be used within MultiChartProvider');
  }
  return context;
};

// Layout component selector
export const LayoutSelector: React.FC = () => {
  const { isMultiChartEnabled, currentLayout, setLayout } = useMultiChart();

  if (!isMultiChartEnabled) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-surface-300">Layout:</span>
      <div className="flex space-x-1">
        {(['1x1', '1x2', '2x2'] as LayoutType[]).map((layout: LayoutType) => (
          <button
            key={layout}
            onClick={() => setLayout(layout)}
            className={`px-2 py-1 text-xs rounded border transition-colors ${
              currentLayout === layout
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-surface-200 border-surface-300 text-surface-300 hover:bg-surface-300'
            }`}
          >
            {layout}
          </button>
        ))}
      </div>
    </div>
  );
};

// Linking controls component
export const LinkingControls: React.FC = () => {
  const { isMultiChartEnabled, linking, updateLinking } = useMultiChart();

  if (!isMultiChartEnabled) {
    return null;
  }

  return (
    <div className="flex items-center space-x-4">
      <span className="text-sm text-surface-300">Link:</span>
      <div className="flex space-x-3">
        {Object.entries(linking).map(([dimension, enabled]) => (
          <label key={dimension} className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateLinking(dimension as keyof LinkingDimensions, e.target.checked)
              }
              className="w-3 h-3"
            />
            <span className="text-xs text-surface-300 capitalize">{dimension}</span>
          </label>
        ))}
      </div>
    </div>
  );
};
