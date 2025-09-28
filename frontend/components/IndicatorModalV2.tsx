"use client";
import React, { useState, useMemo } from 'react';
import { Search, X, TrendingUp, BarChart3, Activity, Volume } from 'lucide-react';
import { indicatorStore } from '../lib/indicatorStore';
import { usePaneStore } from '../lib/paneStore';

interface Indicator {
  id: string;
  name: string;
  category: 'Trend' | 'Momentum' | 'Volatility' | 'Volume';
  description: string;
  paneType: 'overlay' | 'separate';
}

const INDICATORS: Indicator[] = [
  {
    id: 'sma',
    name: 'Simple Moving Average',
    category: 'Trend',
    description: 'Average price over a specified period',
    paneType: 'overlay'
  },
  {
    id: 'ema',
    name: 'Exponential Moving Average', 
    category: 'Trend',
    description: 'Weighted moving average giving more weight to recent prices',
    paneType: 'overlay'
  },
  {
    id: 'bb',
    name: 'Bollinger Bands',
    category: 'Volatility',
    description: 'Price channel based on standard deviation',
    paneType: 'overlay'
  },
  {
    id: 'vwap',
    name: 'Volume Weighted Average Price',
    category: 'Volume',
    description: 'Average price weighted by volume',
    paneType: 'overlay'
  },
  {
    id: 'rsi',
    name: 'Relative Strength Index',
    category: 'Momentum',
    description: 'Momentum oscillator measuring speed and change',
    paneType: 'separate'
  },
  {
    id: 'macd',
    name: 'MACD',
    category: 'Momentum', 
    description: 'Moving Average Convergence Divergence',
    paneType: 'separate'
  },
  {
    id: 'vwma',
    name: 'Volume Weighted Moving Average',
    category: 'Volume',
    description: 'Moving average weighted by volume',
    paneType: 'overlay'
  },
  {
    id: 'stddev',
    name: 'Standard Deviation',
    category: 'Volatility',
    description: 'Statistical measure of price volatility',
    paneType: 'separate'
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

export const IndicatorModal: React.FC<IndicatorModalProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const { panes, addPane, addIndicatorToPane } = usePaneStore();

  const categories = ['All', 'Trend', 'Momentum', 'Volatility', 'Volume'];

  const filteredIndicators = useMemo(() => {
    return INDICATORS.filter(indicator => {
      const matchesSearch = indicator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          indicator.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || indicator.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  const isIndicatorActive = (indicatorId: string) => {
    return panes.some(pane => pane.indicators.includes(indicatorId));
  };

  const handleAddIndicator = (indicator: Indicator) => {
    if (indicator.paneType === 'overlay') {
      // Find the price pane and add the indicator to it
      const pricePane = panes.find(pane => pane.type === 'price');
      if (pricePane) {
        addIndicatorToPane(pricePane.id, indicator.id);
      }
    } else {
      // Create a new pane for separate indicators
      const newPaneId = addPane('indicator', [indicator.id]);
      console.log(`Added indicator ${indicator.name} to new pane ${newPaneId}`);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg w-96 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Add Indicator</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search indicators..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
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
        <div className="flex-1 overflow-y-auto p-4">
          {filteredIndicators.map(indicator => {
            const IconComponent = CATEGORY_ICONS[indicator.category];
            const isActive = isIndicatorActive(indicator.id);
            
            return (
              <div
                key={indicator.id}
                onClick={() => !isActive && handleAddIndicator(indicator)}
                className={`p-3 rounded-lg border cursor-pointer transition-all mb-2 ${
                  isActive
                    ? 'border-green-500 bg-green-500/10 cursor-not-allowed'
                    : 'border-gray-700 hover:border-blue-500 hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <IconComponent className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-white">{indicator.name}</h3>
                      {isActive && (
                        <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">Active</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{indicator.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                        {indicator.category}
                      </span>
                      <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                        {indicator.paneType === 'overlay' ? 'Overlay' : 'Separate Pane'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {filteredIndicators.length === 0 && (
            <div className="text-center text-gray-400 mt-8">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No indicators found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};