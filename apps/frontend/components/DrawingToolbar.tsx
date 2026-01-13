'use client';
import type { DrawingTool } from '@/lib/stores/drawingStore';
import {
  useDrawingActions,
  useDrawingActiveTool,
  useDrawingIsDrawing,
  useDrawingMagnetMode,
} from '@/lib/stores/drawingStore';
import {
  Activity,
  ArrowRight,
  ChevronDown,
  Circle,
  Magnet,
  Minus,
  MousePointer,
  Square,
  TrendingUp,
  Type,
} from 'lucide-react';
import React, { useState, memo } from 'react';

type DrawingToolConfig = {
  id: DrawingTool;
  name: string;
  icon: React.ReactNode;
  shortcut: string;
};

// Core drawing tools - TradingView style (minimal, essential tools only)
const DRAWING_TOOLS: DrawingToolConfig[] = [
  {
    id: 'cursor',
    name: 'Cursor',
    icon: <MousePointer className="w-4 h-4" />,
    shortcut: 'V',
  },
  {
    id: 'trendline',
    name: 'Trend Line',
    icon: <TrendingUp className="w-4 h-4" />,
    shortcut: 'T',
  },
  {
    id: 'hline',
    name: 'Horizontal Line',
    icon: <Minus className="w-4 h-4" />,
    shortcut: 'H',
  },
  {
    id: 'rectangle',
    name: 'Rectangle',
    icon: <Square className="w-4 h-4" />,
    shortcut: 'R',
  },
  {
    id: 'circle',
    name: 'Circle',
    icon: <Circle className="w-4 h-4" />,
    shortcut: 'C',
  },
  {
    id: 'fibonacciRetracement',
    name: 'Fib Retracement',
    icon: <Activity className="w-4 h-4" />,
    shortcut: 'F',
  },
  {
    id: 'arrow',
    name: 'Arrow',
    icon: <ArrowRight className="w-4 h-4" />,
    shortcut: 'A',
  },
  {
    id: 'textNote',
    name: 'Text',
    icon: <Type className="w-4 h-4" />,
    shortcut: 'N',
  },
];

interface DrawingToolbarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const DrawingToolbar = memo(function DrawingToolbarComponent() {
  const activeTool = useDrawingActiveTool();
  const isDrawing = useDrawingIsDrawing();
  const magnetMode = useDrawingMagnetMode();
  const { setActiveTool, toggleMagnetMode } = useDrawingActions();

  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const [showMoreTools, setShowMoreTools] = useState(false);

  const handleToolSelect = (tool: DrawingTool) => {
    if (isDrawing) return;
    setActiveTool(tool);
  };

  return (
    <div className="w-12 bg-[#1e222d] border-r border-[#2a2e39] flex flex-col items-center py-2">
      {/* Main Tools */}
      <div className="flex flex-col items-center gap-0.5">
        {DRAWING_TOOLS.map((tool) => (
          <div key={tool.id} className="relative">
            <button
              onClick={() => handleToolSelect(tool.id)}
              onMouseEnter={() => setHoveredTool(tool.id)}
              onMouseLeave={() => setHoveredTool(null)}
              className={`w-9 h-9 rounded flex items-center justify-center transition-all ${
                activeTool === tool.id
                  ? 'bg-[#2962ff] text-white'
                  : 'text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
              } ${isDrawing && activeTool !== tool.id ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isDrawing && activeTool !== tool.id}
            >
              {tool.icon}
            </button>

            {/* Tooltip */}
            {hoveredTool === tool.id && (
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap">
                <div className="bg-[#363a45] text-white text-xs px-2 py-1.5 rounded shadow-lg border border-[#434651]">
                  <span>{tool.name}</span>
                  <span className="ml-2 text-[#787b86]">{tool.shortcut}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="w-6 h-px bg-[#2a2e39] my-2" />

      {/* More Tools Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowMoreTools(!showMoreTools)}
          onMouseEnter={() => setHoveredTool('more')}
          onMouseLeave={() => setHoveredTool(null)}
          className={`w-9 h-9 rounded flex items-center justify-center transition-all ${
            showMoreTools
              ? 'bg-[#2a2e39] text-white'
              : 'text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
          }`}
        >
          <ChevronDown className="w-4 h-4" />
        </button>

        {hoveredTool === 'more' && !showMoreTools && (
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap">
            <div className="bg-[#363a45] text-white text-xs px-2 py-1.5 rounded shadow-lg border border-[#434651]">
              More Tools
            </div>
          </div>
        )}

        {/* Dropdown Menu */}
        {showMoreTools && (
          <div className="absolute left-full ml-2 top-0 z-50 bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-xl py-1 min-w-40">
            <MoreToolItem
              label="Vertical Line"
              shortcut="Shift+H"
              onClick={() => {
                handleToolSelect('vline');
                setShowMoreTools(false);
              }}
              active={activeTool === 'vline'}
            />
            <MoreToolItem
              label="Fib Extension"
              shortcut="Shift+F"
              onClick={() => {
                handleToolSelect('fibonacciExtension');
                setShowMoreTools(false);
              }}
              active={activeTool === 'fibonacciExtension'}
            />
            <MoreToolItem
              label="Parallel Channel"
              shortcut="P"
              onClick={() => {
                handleToolSelect('parallelChannel');
                setShowMoreTools(false);
              }}
              active={activeTool === 'parallelChannel'}
            />
            <MoreToolItem
              label="Pitchfork"
              shortcut="Shift+P"
              onClick={() => {
                handleToolSelect('pitchfork');
                setShowMoreTools(false);
              }}
              active={activeTool === 'pitchfork'}
            />
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Divider */}
      <div className="w-6 h-px bg-[#2a2e39] my-2" />

      {/* Magnet Mode Toggle */}
      <div className="relative">
        <button
          onClick={toggleMagnetMode}
          onMouseEnter={() => setHoveredTool('magnet')}
          onMouseLeave={() => setHoveredTool(null)}
          className={`w-9 h-9 rounded flex items-center justify-center transition-all ${
            magnetMode
              ? 'bg-[#2962ff] text-white'
              : 'text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
          }`}
        >
          <Magnet className="w-4 h-4" />
        </button>

        {hoveredTool === 'magnet' && (
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap">
            <div className="bg-[#363a45] text-white text-xs px-2 py-1.5 rounded shadow-lg border border-[#434651]">
              <span>Magnet Mode</span>
              <span className="ml-2 text-[#787b86]">{magnetMode ? 'On' : 'Off'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Drawing Status Indicator */}
      {isDrawing && (
        <div className="mt-2">
          <div className="w-2 h-2 rounded-full bg-[#2962ff] animate-pulse" />
        </div>
      )}
    </div>
  );
});

// Helper component for dropdown items
const MoreToolItem: React.FC<{
  label: string;
  shortcut: string;
  onClick: () => void;
  active: boolean;
}> = ({ label, shortcut, onClick, active }) => (
  <button
    onClick={onClick}
    className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors ${
      active ? 'bg-[#2962ff]/10 text-[#2962ff]' : 'text-[#d1d4dc] hover:bg-[#2a2e39]'
    }`}
  >
    <span>{label}</span>
    <span className="text-xs text-[#787b86]">{shortcut}</span>
  </button>
);
