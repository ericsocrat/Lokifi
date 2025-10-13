"use client";
import React, { useState, useMemo } from 'react';
import { Search, X, TrendingUp, BarChart3, Activity, Volume } from 'lucide-react';
import { indicatorStore, IndicatorFlags } from '@/lib/stores/indicatorStore';
import { usePaneStore } from '@/lib/stores/paneStore';

interface Indicator {
  id: string;
  name: string;
  category: 'Trend' | 'Momentum' | 'Volatility' | 'Volume';
  description: string;
  paneType: 'overlay' | 'separate';
  icon: React.ReactNode;
  defaultParams?: Record<string, number>;
}

const INDICATORS: Indicator[] = [
  {
    id: 'sma',
    name: 'Simple Moving Average',
    category: 'Trend',
    description: 'Average price over a specified period',
    paneType: 'overlay',
    icon: <TrendingUp size={16} />,
    defaultParams: { period: 20 }
  },
  {
    id: 'ema',
    name: 'Exponential Moving Average', 
    category: 'Trend',
    description: 'Weighted moving average giving more weight to recent prices',
    paneType: 'overlay',
    icon: <TrendingUp size={16} />,
    defaultParams: { period: 20 }
  },
  {
    id: 'bb',
    name: 'Bollinger Bands',
    category: 'Volatility',
    description: 'Price channel based on standard deviation',
    paneType: 'overlay',
    icon: <BarChart3 size={16} />,
    defaultParams: { period: 20, multiplier: 2 }
  },
  {
    id: 'vwap',
    name: 'Volume Weighted Average Price',
    category: 'Volume',
    description: 'Average price weighted by volume',
    paneType: 'overlay',
    icon: <Volume size={16} />,
    defaultParams: {}
  },
  {
    id: 'rsi',
    name: 'Relative Strength Index',
    category: 'Momentum',
    description: 'Momentum oscillator measuring speed and change',
    paneType: 'separate',
    icon: <Activity size={16} />,
    defaultParams: { period: 14 }
  },
  {
    id: 'macd',
    name: 'MACD',
    category: 'Momentum', 
    description: 'Moving Average Convergence Divergence',
    paneType: 'separate',
    icon: <Activity size={16} />,
    defaultParams: { fast: 12, slow: 26, signal: 9 }
  },
  {
    id: 'vwma',
    name: 'Volume Weighted Moving Average',
    category: 'Volume',
    description: 'Moving average weighted by volume',
    paneType: 'overlay',
    icon: <Volume size={16} />,
    defaultParams: { period: 20 }
  },
  {
    id: 'stddev',
    name: 'Standard Deviation',
    category: 'Volatility',
    description: 'Statistical measure of price volatility',
    paneType: 'separate',
    icon: <BarChart3 size={16} />,
    defaultParams: { period: 20, multiplier: 2 }
  }
];

const CATEGORY_ICONS = {
  Trend: TrendingUp,
  Momentum: Activity,
  Volatility: BarChart3,
  Volume: Volume
};

interface IndicatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function IndicatorModal({ isOpen, onClose }: IndicatorModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const { panes, addPane } = usePaneStore();

  const categories = ['All', 'Trend', 'Momentum', 'Volatility', 'Volume'];

  const filteredIndicators = useMemo(() => {
    return INDICATORS.filter((indicator: any) => {
      const matchesSearch = indicator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          indicator.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || indicator.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  const handleAddIndicator = (indicator: Indicator) => {
    // Enable indicator in the indicator store
    const indicatorKey = indicator.id as keyof IndicatorFlags;
    if (indicatorKey in indicatorStore.get().flags) {
      indicatorStore.toggle(indicatorKey, true);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-gray-900 rounded-lg border border-gray-700 w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Add Technical Indicator</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search and Filter */}
        <div className="p-4 border-b border-gray-700">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search indicators..."
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category: any) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Indicators List */}
        <div className="overflow-y-auto flex-1" style={{ maxHeight: 'calc(80vh - 200px)' }}>
          <div className="p-4 space-y-2">
            {filteredIndicators.map((indicator: any) => {
              const IconComponent = CATEGORY_ICONS[indicator.category as keyof typeof CATEGORY_ICONS];
              
              return (
                <div
                  key={indicator.id}
                  onClick={() => handleAddIndicator(indicator)}
                  className="p-3 rounded-lg border border-gray-700 hover:border-gray-600 bg-gray-800 hover:bg-gray-750 cursor-pointer transition-all"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 p-2 bg-gray-700 rounded-lg">
                      <IconComponent size={20} className="text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-white font-medium">{indicator.name}</h3>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            indicator.category === 'Trend' ? 'bg-green-900 text-green-300' :
                            indicator.category === 'Momentum' ? 'bg-blue-900 text-blue-300' :
                            indicator.category === 'Volatility' ? 'bg-purple-900 text-purple-300' :
                            'bg-orange-900 text-orange-300'
                          }`}>
                            {indicator.category}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            indicator.paneType === 'overlay' 
                              ? 'bg-gray-700 text-gray-300' 
                              : 'bg-gray-600 text-gray-200'
                          }`}>
                            {indicator.paneType}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm">{indicator.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredIndicators.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">No indicators found</div>
                <div className="text-gray-500 text-sm">
                  Try adjusting your search or category filter
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default IndicatorModal;
