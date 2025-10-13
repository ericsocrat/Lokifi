"use client";
import React from 'react';
import { FLAGS } from '@/lib/utils/featureFlags';
import { useMultiChart, LayoutSelector, LinkingControls } from '@/lib/stores/multiChartStore';

interface MultiChartLayoutProps {
  children: React.ReactNode;
}

export const MultiChartLayout: React.FC<MultiChartLayoutProps> = ({ children }) => {
  const { isMultiChartEnabled, currentLayout, charts } = useMultiChart();

  // If multi-chart is disabled, render single chart
  if (!isMultiChartEnabled || !FLAGS.multiChart) {
    return <>{children}</>;
  }

  const getGridClass = () => {
    switch (currentLayout) {
      case '1x1':
        return 'grid-cols-1 grid-rows-1';
      case '1x2':
        return 'grid-cols-1 grid-rows-2';
      case '2x2':
        return 'grid-cols-2 grid-rows-2';
      default:
        return 'grid-cols-1 grid-rows-1';
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Multi-chart controls */}
      <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700">
        <LayoutSelector />
        <LinkingControls />
      </div>

      {/* Chart grid */}
      <div className={`flex-1 grid ${getGridClass()} gap-1 p-1`}>
        {charts.map((chart: any) => (
          <div
            key={chart.id}
            className="bg-gray-900 border border-gray-700 rounded relative"
            style={{
              gridRow: chart.position.row + 1,
              gridColumn: chart.position.col + 1,
            }}
          >
            <div className="absolute top-2 left-2 z-10 bg-black/50 px-2 py-1 rounded text-xs text-white">
              {chart.symbol} • {chart.timeframe}
            </div>
            {children}
          </div>
        ))}
      </div>
    </div>
  );
};

// Multi-chart controls component for header
export const MultiChartControls: React.FC = () => {
  if (!FLAGS.multiChart) {
    return null;
  }

  return (
    <div className="flex items-center space-x-4">
      <LayoutSelector />
      <LinkingControls />
    </div>
  );
};
