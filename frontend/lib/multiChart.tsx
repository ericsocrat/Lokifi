/**
 * Multi-chart layout system with linking capabilities
 * Feature-flagged and OFF by default
 */
"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { FLAGS } from './featureFlags';
import { createVersionedState, type VersionedState } from './migrations';

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
  persist(
    immer<any>((set: any, get: any) => ({
      ...createInitialState(),

      setLayout: (layout: any) => {
        if (!FLAGS.multiChart) return;
        
        set((state: any) => {
          const newCharts = [...state.charts];
          const positions = getPositionsForLayout(layout);
          
          // Ensure we have the right number of charts
          while (newCharts.length < positions.length) {
            const newChart: ChartInstance = {
              id: `chart-${Date.now()}-${newCharts.length}`,
              symbol: 'BTCUSDT',
              timeframe: '1h',
              paneId: `pane-${newCharts.length + 1}`,
              position: positions[newCharts.length],
            };
            newCharts.push(newChart);
          }
          
          // Update positions for existing charts
          newCharts.forEach((chart: any, index: any) => {
            if (positions[index]) {
              chart.position = positions[index];
            }
          });
          
          // Remove excess charts
          if (newCharts.length > positions.length) {
            newCharts.splice(positions.length);
          }
          
          return { layout, charts: newCharts };
        });
      },

      addChart: (chartData: any) => {
        if (!FLAGS.multiChart) return;
        
        const newChart: ChartInstance = {
          id: `chart-${Date.now()}`,
          ...chartData,
        };
        set((state: any) => ({ charts: [...state.charts, newChart] }));
      },

      removeChart: (chartId: any) => {
        if (!FLAGS.multiChart) return;
        
        set((state: any) => ({
          charts: state.charts.filter(chart => chart.id !== chartId),
          activeChart: state.activeChart === chartId ? null : state.activeChart,
        }));
      },

      updateChart: (chartId: any, updates: any) => {
        set((state: any) => ({
          charts: state.charts.map((chart: any) =>
            chart.id === chartId ? { ...chart, ...updates } : chart
          ),
        }));
      },

      setActiveChart: (chartId: any) => {
        set({ activeChart: chartId });
      },

      updateLinking: (dimension: any, enabled: any) => {
        if (!FLAGS.multiChart) return;
        
        set((state: any) => ({
          linking: { ...state.linking, [dimension]: enabled },
        }));
      },

      changeSymbolLinked: (symbol: any) => {
        if (!FLAGS.multiChart) return;
        
        const { linking, charts, activeChart } = get();
        if (!linking.symbol || !activeChart) return;
        
        set({
          charts: charts.map((chart: any) =>
            chart.id !== activeChart ? { ...chart, symbol } : chart
          ),
        });
      },

      changeTimeframeLinked: (timeframe: any) => {
        if (!FLAGS.multiChart) return;
        
        const { linking, charts, activeChart } = get();
        if (!linking.timeframe || !activeChart) return;
        
        set({
          charts: charts.map((chart: any) =>
            chart.id !== activeChart ? { ...chart, timeframe } : chart
          ),
        });
      },

      updateCursorLinked: (position: any) => {
        if (!FLAGS.multiChart) return;
        
        const { linking } = get();
        if (!linking.cursor) return;
        
        // Emit cursor update event for other charts
        window.dispatchEvent(
          new CustomEvent('multiChartCursorUpdate', {
            detail: { position, source: get().activeChart },
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

  const changeSymbol = useCallback((symbol: string, chartId?: string) => {
    if (chartId) {
      updateChart(chartId, { symbol });
    }
    
    if (linking.symbol && activeChart) {
      changeSymbolLinked(symbol);
    }
  }, [linking.symbol, activeChart, updateChart, changeSymbolLinked]);

  const changeTimeframe = useCallback((timeframe: string, chartId?: string) => {
    if (chartId) {
      updateChart(chartId, { timeframe });
    }
    
    if (linking.timeframe && activeChart) {
      changeTimeframeLinked(timeframe);
    }
  }, [linking.timeframe, activeChart, updateChart, changeTimeframeLinked]);

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

  return (
    <MultiChartContext.Provider value={contextValue}>
      {children}
    </MultiChartContext.Provider>
  );
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
      <span className="text-sm text-gray-400">Layout:</span>
      <div className="flex space-x-1">
        {(['1x1', '1x2', '2x2'] as LayoutType[]).map((layout: any) => (
          <button
            key={layout}
            onClick={() => setLayout(layout)}
            className={`px-2 py-1 text-xs rounded border transition-colors ${
              currentLayout === layout
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
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
      <span className="text-sm text-gray-400">Link:</span>
      <div className="flex space-x-3">
        {Object.entries(linking).map(([dimension, enabled]) => (
          <label key={dimension} className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e: any) => updateLinking(dimension as keyof LinkingDimensions, e.target.checked)}
              className="w-3 h-3"
            />
            <span className="text-xs text-gray-300 capitalize">{dimension}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

