'use client';
import { Activity, BarChart3, Search, TrendingUp, Volume, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
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
    paneType: 'overlay',
  },
  {
    id: 'ema',
    name: 'Exponential Moving Average',
    category: 'Trend',
    description: 'Weighted moving average giving more weight to recent prices',
    paneType: 'overlay',
  },
  {
    id: 'bb',
    name: 'Bollinger Bands',
    category: 'Volatility',
    description: 'Price channel based on standard deviation',
    paneType: 'overlay',
  },
  {
    id: 'vwap',
    name: 'Volume Weighted Average Price',
    category: 'Volume',
    description: 'Average price weighted by volume',
    paneType: 'overlay',
  },
  {
    id: 'rsi',
    name: 'Relative Strength Index',
    category: 'Momentum',
    description: 'Momentum oscillator measuring speed and change',
    paneType: 'separate',
  },
  {
    id: 'macd',
    name: 'MACD',
    category: 'Momentum',
    description: 'Moving Average Convergence Divergence',
    paneType: 'separate',
  },
  {
    id: 'vwma',
    name: 'Volume Weighted Moving Average',
    category: 'Volume',
    description: 'Moving average weighted by volume',
    paneType: 'overlay',
  },
  {
    id: 'stddev',
    name: 'Standard Deviation',
    category: 'Volatility',
    description: 'Statistical measure of price volatility',
    paneType: 'separate',
  },
];

const CATEGORY_ICONS = {
  Trend: TrendingUp,
  Momentum: Activity,
  Volatility: BarChart3,
  Volume: Volume,
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
    return INDICATORS.filter((indicator) => {
      const matchesSearch =
        indicator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        indicator.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || indicator.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  const isIndicatorActive = (indicatorId: string) => {
    return panes.some((pane) => pane.indicators.includes(indicatorId));
  };

  const handleAddIndicator = (indicator: Indicator) => {
    if (indicator.paneType === 'overlay') {
      // Find the price pane and add the indicator to it
      const pricePane = panes.find((pane) => pane.type === 'price');
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
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-bg-secondary rounded-lg w-96 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-default">
          <h2 className="text-lg font-semibold text-text-primary">Add Indicator</h2>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-white transition-smooth"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border-default">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-4 h-4" />
            <input
              type="text"
              placeholder="Search indicators..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full pl-10"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="p-4 border-b border-border-default">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-full text-sm transition-smooth ${
                  selectedCategory === category
                    ? 'bg-primary text-white'
                    : 'bg-bg-elevated text-text-secondary hover:bg-bg-elevated-hover'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Indicators List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredIndicators.map((indicator) => {
            const IconComponent = CATEGORY_ICONS[indicator.category];
            const isActive = isIndicatorActive(indicator.id);

            return (
              <div
                key={indicator.id}
                onClick={() => !isActive && handleAddIndicator(indicator)}
                className={`p-3 rounded-lg border cursor-pointer transition-smooth mb-2 ${
                  isActive
                    ? 'border-trading-gain bg-trading-gain/10 cursor-not-allowed'
                    : 'border-border-default hover:border-primary hover:bg-bg-elevated'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <IconComponent className="w-5 h-5 text-primary-light" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-text-primary">{indicator.name}</h3>
                      {isActive && <span className="badge-success">Active</span>}
                    </div>
                    <p className="text-sm text-text-tertiary mt-1">{indicator.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs bg-bg-elevated text-text-secondary px-2 py-1 rounded">
                        {indicator.category}
                      </span>
                      <span className="text-xs bg-bg-elevated text-text-secondary px-2 py-1 rounded">
                        {indicator.paneType === 'overlay' ? 'Overlay' : 'Separate Pane'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredIndicators.length === 0 && (
            <div className="text-center text-text-muted mt-8">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No indicators found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
