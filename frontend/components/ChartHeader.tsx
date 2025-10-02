'use client';
import { BarChart3, Layers, Settings } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { indicatorStore } from '../lib/indicatorStore';
import { timeframeStore } from '../lib/timeframeStore';
import { EnhancedSymbolPicker } from './EnhancedSymbolPicker';
import { IndicatorModal } from './IndicatorModalV2';

interface ChartHeaderProps {
  onOpenObjectTree?: () => void;
}

export default function ChartHeader({ onOpenObjectTree }: ChartHeaderProps) {
  const [timeframe] = useState(timeframeStore.get());
  const [isIndicatorModalOpen, setIsIndicatorModalOpen] = useState(false);
  const [indicators] = useState(indicatorStore.get());

  const activeIndicatorCount = Object.values(indicators.flags).filter(Boolean).length;

  return (
    <>
      <div className="chart-header">
        {/* Left: Symbol Picker and Timeframe */}
        <div className="flex items-center gap-4 relative">
          <div className="relative z-50">
            <EnhancedSymbolPicker />
          </div>
          <div className="flex items-center gap-2">
            <span className="badge-primary">{timeframe}</span>
          </div>
        </div>

        {/* Center: Lokifi Brand Logo */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center">
          <Image
            src="/logo.svg"
            alt="Lokifi - Professional Trading Terminal"
            width={600}
            height={180}
            className="h-36 w-auto opacity-95 hover:opacity-100 transition-opacity"
            priority
          />
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Indicators Button */}
          <button onClick={() => setIsIndicatorModalOpen(true)} className="btn-secondary relative">
            <BarChart3 size={18} />
            <span>Indicators</span>
            {activeIndicatorCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {activeIndicatorCount}
              </span>
            )}
          </button>

          {/* Objects Button */}
          <button
            onClick={onOpenObjectTree}
            className="flex items-center gap-2 px-4 py-2 bg-bg-elevated hover:bg-bg-elevated-hover border border-border-default hover:border-border-hover rounded-xl text-white transition-smooth"
          >
            <Layers size={18} />
            <span>Objects</span>
          </button>

          {/* Settings Button */}
          <button className="flex items-center gap-2 px-4 py-2 bg-bg-elevated hover:bg-bg-elevated-hover border border-border-default hover:border-border-hover rounded-xl text-white transition-smooth">
            <Settings size={18} />
            <span>Settings</span>
          </button>

          {/* Quick Toggle Buttons */}
          <div className="flex items-center gap-1 pl-2 border-l border-border-default">
            <button
              title="Toggle Grid"
              className="p-2 hover:bg-bg-elevated rounded-lg transition-smooth text-text-tertiary hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M0 0h16v1H0V0zm0 7h16v1H0V7zm0 8h16v1H0v-1z" />
                <path d="M0 0h1v16H0V0zm7 0h1v16H7V0zm8 0h1v16h-1V0z" />
              </svg>
            </button>

            <button
              title="Toggle Volume"
              className="p-2 hover:bg-bg-elevated rounded-lg transition-smooth text-text-tertiary hover:text-white"
            >
              <BarChart3 size={16} />
            </button>

            <button
              title="Toggle Crosshair"
              className="p-2 hover:bg-bg-elevated rounded-lg transition-smooth text-text-tertiary hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0v6H7V0h1zM8 10v6H7v-6h1zM0 8h6V7H0v1zm10 0h6V7h-6v1z" />
                <circle cx="8" cy="8" r="1.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Indicator Modal */}
      <IndicatorModal
        isOpen={isIndicatorModalOpen}
        onClose={() => setIsIndicatorModalOpen(false)}
      />
    </>
  );
}
