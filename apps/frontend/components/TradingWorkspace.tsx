'use client';
import { useDrawingObjects } from '@/lib/stores/drawingStore';
import { usePaneStore } from '@/lib/stores/paneStore';
import { symbolStore } from '@/lib/stores/symbolStore';
import { timeframeStore } from '@/lib/stores/timeframeStore';
import { logger } from '@/lib/utils/logger';
import { Maximize2, Minimize2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import ChartHeader from '../components/ChartHeader';
import { DrawingChart } from '../components/DrawingChart';
import { DrawingToolbar } from '../components/DrawingToolbar';
import { ObjectTree } from '../components/ObjectTree';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

export const TradingWorkspace: React.FC = () => {
  const [isObjectTreeCollapsed, setIsObjectTreeCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [workspaceStats, setWorkspaceStats] = useState({
    totalObjects: 0,
    totalPanes: 0,
    activeIndicators: 0,
    currentSymbol: 'BTCUSD',
    currentTimeframe: '1h',
  });

  const objects = useDrawingObjects();
  const { panes } = usePaneStore();

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  // Update workspace stats
  useEffect(() => {
    setWorkspaceStats({
      totalObjects: objects.length,
      totalPanes: panes.length,
      activeIndicators: panes.reduce((sum: number, pane) => sum + pane.indicators.length, 0),
      currentSymbol: symbolStore.get(),
      currentTimeframe: timeframeStore.get(),
    });
  }, [objects.length, panes.length, panes]);

  const toggleFullscreen = async () => {
    try {
      if (!document.documentElement.requestFullscreen) {
        logger.warn('Fullscreen API not supported');
        return;
      }

      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch (error) {
      logger.error('Fullscreen toggle failed', { error });
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const events = [
      'fullscreenchange',
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'msfullscreenchange',
    ];

    events.forEach((event) => {
      document.addEventListener(event, handleFullscreenChange);
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleFullscreenChange);
      });
    };
  }, []);

  return (
    <div className="h-screen bg-[#131722] flex flex-col overflow-hidden">
      {/* Chart Header - Clean TradingView style */}
      <div className="bg-[#1e222d] border-b border-[#2a2e39] shrink-0">
        <ChartHeader />

        {/* Minimal toolbar */}
        <div className="px-3 py-1.5 flex items-center justify-end">
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-[#787b86] hover:text-white hover:bg-[#2a2e39] rounded transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Drawing Tools Sidebar - Always narrow TradingView style */}
        <div className="shrink-0 w-12">
          <DrawingToolbar />
        </div>

        {/* Center: Chart Area */}
        <div className="flex-1 relative min-w-0 bg-[#131722]">
          {/* Chart Component */}
          <div className="relative z-10 h-full">
            <DrawingChart />
          </div>

          {/* Chart Overlay Info - TradingView style */}
          <div className="absolute top-3 left-3 z-20">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-white">{workspaceStats.currentSymbol}</span>
              <span className="text-[#787b86]">•</span>
              <span className="text-[#787b86]">{workspaceStats.currentTimeframe}</span>
            </div>
          </div>
        </div>

        {/* Right: Object Tree Sidebar */}
        <div
          className={`shrink-0 transition-all duration-300 ${
            isObjectTreeCollapsed ? 'w-12' : 'w-64'
          }`}
        >
          <ObjectTree
            isCollapsed={isObjectTreeCollapsed}
            onToggleCollapse={() => setIsObjectTreeCollapsed(!isObjectTreeCollapsed)}
          />
        </div>
      </div>

      {/* Status Bar - Minimal TradingView style */}
      <div className="h-6 bg-[#1e222d] border-t border-[#2a2e39] px-3 flex items-center justify-between text-xs text-[#787b86]">
        <div className="flex items-center gap-3">
          <span className="text-[#26a69a]">● Connected</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Objects: {workspaceStats.totalObjects}</span>
        </div>
      </div>
    </div>
  );
};

