'use client';
import { BarChart3, Grid, Layout, Maximize2, Minimize2, TrendingUp } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import ChartHeader from '../components/ChartHeader';
import { DrawingChart } from '../components/DrawingChart';
import { DrawingToolbar } from '../components/DrawingToolbar';
import { Navigation } from '../components/Navigation';
import { ObjectTree } from '../components/ObjectTree';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useDrawingStore } from '../lib/drawingStore';
import { usePaneStore } from '../lib/paneStore';
import { symbolStore } from '../lib/symbolStore';
import { colors } from '../lib/theme';
import { timeframeStore } from '../lib/timeframeStore';

export const TradingWorkspace: React.FC = () => {
  const [isDrawingToolbarCollapsed, setIsDrawingToolbarCollapsed] = useState(false);
  const [isObjectTreeCollapsed, setIsObjectTreeCollapsed] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [workspaceStats, setWorkspaceStats] = useState({
    totalObjects: 0,
    totalPanes: 0,
    activeIndicators: 0,
    currentSymbol: 'BTCUSD',
    currentTimeframe: '1D',
  });

  const { objects, activeTool } = useDrawingStore();
  const { panes } = usePaneStore();

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  // Update workspace stats
  useEffect(() => {
    setWorkspaceStats({
      totalObjects: objects.length,
      totalPanes: panes.length,
      activeIndicators: panes.reduce((sum, pane) => sum + pane.indicators.length, 0),
      currentSymbol: symbolStore.get(),
      currentTimeframe: timeframeStore.get(),
    });
  }, [objects.length, panes.length, panes]);

  const toggleFullscreen = async () => {
    try {
      // Check if fullscreen API is supported
      if (!document.documentElement.requestFullscreen) {
        console.warn('Fullscreen API not supported');
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
      console.error('Fullscreen toggle failed:', error);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    // Add event listeners for different browsers
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
    <div className="h-screen bg-bg-primary flex overflow-hidden">
      {/* Left Navigation */}
      <Navigation />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Enhanced Chart Header with Stats */}
        <div
          className="bg-bg-secondary border-b border-border-default relative z-40"
          style={{ overflow: 'visible' }}
        >
          <ChartHeader />

          {/* Workspace Stats Bar */}
          <div className="px-4 py-2 bg-bg-tertiary border-t border-border-subtle">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 text-xs">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-3 h-3 text-primary" />
                  <span className="text-text-secondary">Panes:</span>
                  <span className="text-text-primary font-mono">{workspaceStats.totalPanes}</span>
                </div>

                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 text-trading-gain" />
                  <span className="text-text-secondary">Indicators:</span>
                  <span className="text-text-primary font-mono">
                    {workspaceStats.activeIndicators}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Layout className="w-3 h-3 text-secondary" />
                  <span className="text-text-secondary">Objects:</span>
                  <span className="text-text-primary font-mono">{workspaceStats.totalObjects}</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-text-secondary">Tool:</span>
                  <span className="text-primary-light font-medium capitalize">
                    {activeTool.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
              </div>

              {/* Workspace Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`px-2 py-1 rounded text-xs transition-smooth ${
                    showGrid
                      ? 'bg-primary text-white'
                      : 'bg-bg-elevated text-text-secondary hover:bg-bg-elevated-hover'
                  }`}
                  title="Toggle Grid"
                >
                  <Grid className="w-3 h-3" />
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="px-2 py-1 bg-bg-elevated hover:bg-bg-elevated-hover text-text-secondary rounded text-xs transition-smooth"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-3 h-3" />
                  ) : (
                    <Maximize2 className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Workspace Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Drawing Tools Sidebar */}
          <div
            className={`flex-shrink-0 transition-all duration-300 ${
              isDrawingToolbarCollapsed ? 'w-12' : 'w-64'
            }`}
          >
            <DrawingToolbar
              isCollapsed={isDrawingToolbarCollapsed}
              onToggleCollapse={() => setIsDrawingToolbarCollapsed(!isDrawingToolbarCollapsed)}
            />
          </div>

          {/* Center: Chart Area */}
          <div className="flex-1 relative min-w-0">
            {/* Grid Overlay */}
            {showGrid && (
              <div
                className="absolute inset-0 pointer-events-none opacity-10 z-0"
                style={{
                  backgroundImage: `
                  linear-gradient(${colors.border.subtle} 1px, transparent 1px),
                  linear-gradient(90deg, ${colors.border.subtle} 1px, transparent 1px)
                `,
                  backgroundSize: '20px 20px',
                }}
              />
            )}

            {/* Chart Component */}
            <div className="relative z-10 h-full">
              <DrawingChart />
            </div>

            {/* Chart Overlay Info */}
            <div className="absolute top-4 left-4 z-20">
              <div className="glass rounded-lg px-3 py-2">
                <div className="text-xs text-text-secondary">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-trading-gain"></div>
                    <span className="font-mono font-bold text-text-primary">
                      {workspaceStats.currentSymbol}
                    </span>
                    <span className="text-text-tertiary">•</span>
                    <span>{workspaceStats.currentTimeframe}</span>
                  </div>
                  <div className="text-text-tertiary">Professional Trading Platform</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Object Tree Sidebar */}
          <div
            className={`flex-shrink-0 transition-all duration-300 ${
              isObjectTreeCollapsed ? 'w-12' : 'w-80'
            }`}
          >
            <ObjectTree
              isCollapsed={isObjectTreeCollapsed}
              onToggleCollapse={() => setIsObjectTreeCollapsed(!isObjectTreeCollapsed)}
            />
          </div>
        </div>

        {/* Status Bar */}
        <div className="h-6 bg-bg-secondary border-t border-border-default px-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4 text-text-secondary">
            <span>Ready</span>
            <span>•</span>
            <span>WebGL Accelerated</span>
            <span>•</span>
            <span className="text-trading-gain">Connected</span>
          </div>

          <div className="flex items-center gap-4 text-text-secondary">
            <span>FPS: 60</span>
            <span>•</span>
            <span>Latency: 12ms</span>
            <span>•</span>
            <span className="font-mono">v2.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
