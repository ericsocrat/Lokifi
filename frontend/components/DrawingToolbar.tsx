'use client';
import {
  Activity,
  ArrowRight,
  Circle,
  Divide,
  GitBranch,
  Minus,
  MousePointer,
  Square,
  TrendingUp,
  Triangle,
  Type,
} from 'lucide-react';
import React from 'react';
import { DrawingTool, useDrawingStore } from '../lib/drawingStore';

const DRAWING_TOOLS: Array<{
  id: DrawingTool;
  name: string;
  icon: React.ReactNode;
  shortcut: string;
  category: 'Basic' | 'Fibonacci' | 'Gann' | 'Advanced';
}> = [
  // Basic tools
  {
    id: 'cursor',
    name: 'Cursor',
    icon: <MousePointer className="w-4 h-4" />,
    shortcut: 'V',
    category: 'Basic',
  },
  {
    id: 'trendline',
    name: 'Trend Line',
    icon: <TrendingUp className="w-4 h-4" />,
    shortcut: 'T',
    category: 'Basic',
  },
  {
    id: 'hline',
    name: 'Horizontal Line',
    icon: <Minus className="w-4 h-4" />,
    shortcut: 'H',
    category: 'Basic',
  },
  {
    id: 'vline',
    name: 'Vertical Line',
    icon: <Divide className="w-4 h-4 rotate-90" />,
    shortcut: 'Shift+H',
    category: 'Basic',
  },
  {
    id: 'rectangle',
    name: 'Rectangle',
    icon: <Square className="w-4 h-4" />,
    shortcut: 'R',
    category: 'Basic',
  },
  {
    id: 'circle',
    name: 'Circle',
    icon: <Circle className="w-4 h-4" />,
    shortcut: 'C',
    category: 'Basic',
  },
  {
    id: 'arrow',
    name: 'Arrow',
    icon: <ArrowRight className="w-4 h-4" />,
    shortcut: 'A',
    category: 'Basic',
  },
  {
    id: 'textNote',
    name: 'Text Note',
    icon: <Type className="w-4 h-4" />,
    shortcut: 'N',
    category: 'Basic',
  },

  // Fibonacci tools
  {
    id: 'fibonacciRetracement',
    name: 'Fibonacci Retracement',
    icon: <Activity className="w-4 h-4" />,
    shortcut: 'F',
    category: 'Fibonacci',
  },
  {
    id: 'fibonacciExtension',
    name: 'Fibonacci Extension',
    icon: <Activity className="w-4 h-4" />,
    shortcut: 'Shift+F',
    category: 'Fibonacci',
  },

  // Advanced tools
  {
    id: 'parallelChannel',
    name: 'Parallel Channel',
    icon: <GitBranch className="w-4 h-4 rotate-90" />,
    shortcut: 'P',
    category: 'Advanced',
  },
  {
    id: 'pitchfork',
    name: 'Pitchfork',
    icon: <Triangle className="w-4 h-4" />,
    shortcut: 'Shift+P',
    category: 'Advanced',
  },
  {
    id: 'gannFan',
    name: 'Gann Fan',
    icon: <Triangle className="w-4 h-4" />,
    shortcut: 'G',
    category: 'Advanced',
  },
  {
    id: 'elliottWave',
    name: 'Elliott Wave',
    icon: <Activity className="w-4 h-4" />,
    shortcut: 'E',
    category: 'Advanced',
  },
];

const CATEGORY_COLORS = {
  Basic: 'bg-primary',
  Fibonacci: 'bg-secondary',
  Gann: 'bg-secondary',
  Advanced: 'bg-trading-gain',
};

interface DrawingToolbarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const {
    activeTool,
    setActiveTool,
    isDrawing,
    snapToGrid,
    snapToPrice,
    magnetMode,
    toggleSnapToGrid,
    toggleSnapToPrice,
    toggleMagnetMode,
  } = useDrawingStore();

  const handleToolSelect = (tool: DrawingTool) => {
    if (isDrawing) {
      // Don't allow tool changes while drawing
      return;
    }
    setActiveTool(tool);
  };

  if (isCollapsed) {
    return (
      <div className="w-12 bg-bg-secondary border-r border-border-default flex flex-col items-center py-4">
        <button
          onClick={onToggleCollapse}
          className="w-8 h-8 bg-bg-elevated hover:bg-bg-elevated-hover rounded flex items-center justify-center mb-4 transition-smooth"
        >
          <TrendingUp className="w-4 h-4 text-text-secondary" />
        </button>

        {/* Show only active tool when collapsed */}
        {DRAWING_TOOLS.slice(0, 3).map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolSelect(tool.id)}
            className={`w-8 h-8 rounded mb-2 flex items-center justify-center transition-smooth ${
              activeTool === tool.id
                ? 'bg-primary text-white shadow-lg'
                : 'bg-bg-elevated hover:bg-bg-elevated-hover text-text-secondary'
            } ${isDrawing ? 'cursor-not-allowed opacity-50' : ''}`}
            disabled={isDrawing}
            title={`${tool.name} (${tool.shortcut})`}
          >
            {tool.icon}
          </button>
        ))}
      </div>
    );
  }

  const groupedTools = DRAWING_TOOLS.reduce(
    (acc, tool) => {
      if (!acc[tool.category]) {
        acc[tool.category] = [];
      }
      acc[tool.category].push(tool);
      return acc;
    },
    {} as Record<string, typeof DRAWING_TOOLS>
  );

  return (
    <div className="w-64 bg-bg-secondary border-r border-border-default flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Drawing Tools</h2>
        <button
          onClick={onToggleCollapse}
          className="w-6 h-6 bg-bg-elevated hover:bg-bg-elevated-hover rounded flex items-center justify-center transition-smooth"
        >
          <Minus className="w-3 h-3 text-text-secondary" />
        </button>
      </div>

      {/* Tool Categories */}
      <div className="flex-1 overflow-y-auto p-4">
        {Object.entries(groupedTools).map(([category, tools]) => (
          <div key={category} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div
                className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]}`}
              />
              <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
                {category}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => handleToolSelect(tool.id)}
                  className={`p-3 rounded-lg border-2 transition-smooth group ${
                    activeTool === tool.id
                      ? 'border-primary bg-primary/10 shadow-lg'
                      : 'border-border-default bg-bg-elevated hover:border-border-hover hover:bg-bg-elevated-hover'
                  } ${isDrawing ? 'cursor-not-allowed opacity-50' : ''}`}
                  disabled={isDrawing}
                  title={`${tool.name} (${tool.shortcut})`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`${
                        activeTool === tool.id
                          ? 'text-primary-light'
                          : 'text-text-tertiary group-hover:text-text-secondary'
                      }`}
                    >
                      {tool.icon}
                    </div>
                    <span
                      className={`text-xs text-center leading-tight ${
                        activeTool === tool.id
                          ? 'text-primary-light'
                          : 'text-text-tertiary group-hover:text-text-secondary'
                      }`}
                    >
                      {tool.name}
                    </span>
                    <span className="text-xs text-text-muted opacity-75">{tool.shortcut}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Drawing Settings */}
      <div className="px-4 py-3 border-t border-border-default">
        <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-3">
          Settings
        </h3>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={toggleSnapToGrid}
              className="w-4 h-4 rounded border-border-default bg-bg-elevated text-primary focus:ring-primary focus:ring-2"
            />
            Snap to Grid
          </label>

          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={snapToPrice}
              onChange={toggleSnapToPrice}
              className="w-4 h-4 rounded border-border-default bg-bg-elevated text-primary focus:ring-primary focus:ring-2"
            />
            Snap to Price
          </label>

          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={magnetMode}
              onChange={toggleMagnetMode}
              className="w-4 h-4 rounded border-border-default bg-bg-elevated text-primary focus:ring-primary focus:ring-2"
            />
            Magnet Mode
          </label>
        </div>
      </div>

      {/* Status */}
      {isDrawing && (
        <div className="px-4 py-2 bg-primary text-white text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Drawing {DRAWING_TOOLS.find((t) => t.id === activeTool)?.name}...
          </div>
        </div>
      )}
    </div>
  );
};
