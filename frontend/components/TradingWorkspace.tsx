"use client";
import {
  BarChart3,
  Grid,
  Layout,
  Maximize2,
  Minimize2,
  TrendingUp
} from 'lucide-react';
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
    currentTimeframe: '1D'
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
      currentTimeframe: timeframeStore.get()
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
    const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'msfullscreenchange'];

    events.forEach(event => {
      document.addEventListener(event, handleFullscreenChange);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleFullscreenChange);
      });
    };
  }, []);

  return (
    <div className="h-screen bg-gray-900 flex overflow-hidden">
      {/* Left Navigation */}
      <Navigation />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Enhanced Chart Header with Stats */}
        <div className="bg-gray-800 border-b border-gray-700 relative z-40" style={{ overflow: 'visible' }}>
          <ChartHeader />

        {/* Workspace Stats Bar */}
        <div className="px-4 py-2 bg-gray-850 border-t border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-3 h-3 text-blue-400" />
                <span className="text-gray-400">Panes:</span>
                <span className="text-white font-mono">{workspaceStats.totalPanes}</span>
              </div>

              <div className="flex items-center gap-2">
                <TrendingUp className="w-3 h-3 text-green-400" />
                <span className="text-gray-400">Indicators:</span>
                <span className="text-white font-mono">{workspaceStats.activeIndicators}</span>
              </div>

              <div className="flex items-center gap-2">
                <Layout className="w-3 h-3 text-purple-400" />
                <span className="text-gray-400">Objects:</span>
                <span className="text-white font-mono">{workspaceStats.totalObjects}</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-gray-400">Tool:</span>
                <span className="text-blue-300 font-medium capitalize">{activeTool.replace(/([A-Z])/g, ' $1').trim()}</span>
              </div>
            </div>

            {/* Workspace Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`px-2 py-1 rounded text-xs transition-colors ${showGrid
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                title="Toggle Grid"
              >
                <Grid className="w-3 h-3" />
              </button>

              <button
                onClick={toggleFullscreen}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs transition-colors"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Drawing Tools Sidebar */}
        <div className={`flex-shrink-0 transition-all duration-300 ${isDrawingToolbarCollapsed ? 'w-12' : 'w-64'
          }`}>
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
                  linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px'
              }}
            />
          )}

          {/* Chart Component */}
          <div className="relative z-10 h-full">
            <DrawingChart />
          </div>

          {/* Chart Overlay Info */}
          <div className="absolute top-4 left-4 z-20">
            <div className="bg-black/50 backdrop-blur-sm border border-gray-700/50 rounded-lg px-3 py-2">
              <div className="text-xs text-gray-300">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="font-mono font-bold text-white">{workspaceStats.currentSymbol}</span>
                  <span className="text-gray-400">•</span>
                  <span>{workspaceStats.currentTimeframe}</span>
                </div>
                <div className="text-gray-400">Professional Trading Platform</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Object Tree Sidebar */}
        <div className={`flex-shrink-0 transition-all duration-300 ${isObjectTreeCollapsed ? 'w-12' : 'w-80'
          }`}>
          <ObjectTree
            isCollapsed={isObjectTreeCollapsed}
            onToggleCollapse={() => setIsObjectTreeCollapsed(!isObjectTreeCollapsed)}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-gray-800 border-t border-gray-700 px-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4 text-gray-400">
          <span>Ready</span>
          <span>•</span>
          <span>WebGL Accelerated</span>
          <span>•</span>
          <span className="text-green-400">Connected</span>
        </div>

        <div className="flex items-center gap-4 text-gray-400">
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