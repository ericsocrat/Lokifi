'use client';
import { useAuth } from '@/src/components/AuthProvider';
import { BarChart3, Layers, Settings, User } from 'lucide-react';
import { useState } from 'react';
import { indicatorStore } from '../lib/indicatorStore';
import { timeframeStore } from '../lib/timeframeStore';
import { AuthModalCMC } from './AuthModalCMC';
import { EnhancedSymbolPicker } from './EnhancedSymbolPicker';
import { IndicatorModal } from './IndicatorModalV2';

interface ChartHeaderProps {
  onOpenObjectTree?: () => void;
}

export default function ChartHeader({ onOpenObjectTree }: ChartHeaderProps) {
  const [timeframe] = useState(timeframeStore.get());
  const [isIndicatorModalOpen, setIsIndicatorModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');
  const [indicators] = useState(indicatorStore.get());

  // Use actual auth state from AuthProvider
  const { user, loading } = useAuth();
  // TEMPORARY: Force show button for debugging
  const isLoggedIn = false; // !!user;

  // Debug logging
  console.log('🔍 ChartHeader Debug:', {
    user,
    loading,
    isLoggedIn,
    shouldShowButton: !isLoggedIn,
    timestamp: new Date().toISOString(),
  });

  const activeIndicatorCount = Object.values(indicators.flags).filter(Boolean).length;

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-neutral-900 border-b border-neutral-800">
        {/* Left: Symbol Picker and Timeframe */}
        <div className="flex items-center gap-4">
          <EnhancedSymbolPicker />
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-neutral-800 text-electric text-sm rounded-lg font-medium">
              {timeframe}
            </span>
          </div>
          <div className="text-sm text-neutral-400">Professional Trading Platform</div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Auth Button - Always visible for debugging */}
          <button
            onClick={() => {
              console.log('Auth button clicked!');
              setAuthModalTab('login');
              setIsAuthModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 rounded-xl text-white transition-colors"
            style={{ display: !isLoggedIn ? 'flex' : 'none' }}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <User size={18} className="text-white" />
            </div>
            <span className="text-sm font-medium">Log In / Sign Up</span>
          </button>

          {/* Indicators Button */}
          <button
            onClick={() => setIsIndicatorModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 rounded-xl text-white transition-colors relative"
          >
            <BarChart3 size={18} />
            <span>Indicators</span>
            {activeIndicatorCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-electric text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {activeIndicatorCount}
              </span>
            )}
          </button>

          {/* Objects Button */}
          <button
            onClick={onOpenObjectTree}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 rounded-xl text-white transition-colors"
          >
            <Layers size={18} />
            <span>Objects</span>
          </button>

          {/* Settings Button */}
          <button className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 rounded-xl text-white transition-colors">
            <Settings size={18} />
            <span>Settings</span>
          </button>

          {/* Quick Toggle Buttons */}
          <div className="flex items-center gap-1 pl-2 border-l border-neutral-700">
            <button
              title="Toggle Grid"
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M0 0h16v1H0V0zm0 7h16v1H0V7zm0 8h16v1H0v-1z" />
                <path d="M0 0h1v16H0V0zm7 0h1v16H7V0zm8 0h1v16h-1V0z" />
              </svg>
            </button>

            <button
              title="Toggle Volume"
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white"
            >
              <BarChart3 size={16} />
            </button>

            <button
              title="Toggle Crosshair"
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white"
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

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <AuthModalCMC defaultTab={authModalTab} onClose={() => setIsAuthModalOpen(false)} />
      )}
    </>
  );
}
