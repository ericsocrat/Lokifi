'use client';
import { DollarSign, Globe, Search, TrendingUp, Zap } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { symbolStore } from '../lib/symbolStore';
import { getAssetTypeColor } from '../lib/theme';

interface Symbol {
  symbol: string;
  name: string;
  asset_type: 'stock' | 'crypto' | 'forex' | 'commodity' | 'index';
  exchange: string;
  currency: string;
  logo_url?: string | null;
  sector?: string;
  industry?: string;
}

const ASSET_TYPE_ICONS = {
  stock: <TrendingUp className="w-4 h-4" />,
  crypto: <Zap className="w-4 h-4" />,
  forex: <Globe className="w-4 h-4" />,
  commodity: <DollarSign className="w-4 h-4" />,
  index: <TrendingUp className="w-4 h-4" />,
};

export const EnhancedSymbolPicker: React.FC = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [symbols, setSymbols] = useState<Symbol[]>([]);
  const [popularSymbols, setPopularSymbols] = useState<Symbol[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [activeTab, setActiveTab] = useState<'search' | 'popular' | 'recent'>('popular');

  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    setSelectedSymbol(symbolStore.get());

    // Load popular symbols on mount
    loadPopularSymbols();

    // Subscribe to symbol changes
    const unsubscribe = symbolStore.subscribe((newSymbol) => {
      setSelectedSymbol(newSymbol);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const debounceTimer = setTimeout(() => {
        searchSymbols(searchQuery);
      }, 300);

      return () => clearTimeout(debounceTimer);
    } else {
      setSymbols([]);
      return () => {}; // Always return cleanup function
    }
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {}; // Always return cleanup function
  }, [isOpen]);

  const loadPopularSymbols = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/symbols/popular?limit=20');
      if (response.ok) {
        const data = await response.json();
        setPopularSymbols(data);
      }
    } catch (error) {
      console.error('Failed to load popular symbols:', error);
      // Fallback to mock data
      setPopularSymbols([
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          asset_type: 'stock',
          exchange: 'NASDAQ',
          currency: 'USD',
          sector: 'Technology',
        },
        {
          symbol: 'MSFT',
          name: 'Microsoft Corporation',
          asset_type: 'stock',
          exchange: 'NASDAQ',
          currency: 'USD',
          sector: 'Technology',
        },
        {
          symbol: 'BTCUSD',
          name: 'Bitcoin',
          asset_type: 'crypto',
          exchange: 'CRYPTO',
          currency: 'USD',
        },
        {
          symbol: 'EURUSD',
          name: 'Euro / US Dollar',
          asset_type: 'forex',
          exchange: 'FOREX',
          currency: 'USD',
        },
        {
          symbol: 'SPY',
          name: 'SPDR S&P 500 ETF',
          asset_type: 'index',
          exchange: 'NYSE',
          currency: 'USD',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const searchSymbols = async (query: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/v1/symbols/search?q=${encodeURIComponent(query)}&limit=20`
      );
      if (response.ok) {
        const data = await response.json();
        setSymbols(data.symbols);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSymbols([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSymbolSelect = (symbol: string) => {
    symbolStore.set(symbol);
    setSelectedSymbol(symbol);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleOpen = () => {
    setIsOpen(true);
    setTimeout(() => {
      searchRef.current?.focus();
    }, 100);
  };

  const renderSymbolList = (symbolList: Symbol[]) => (
    <div className="max-h-80 overflow-y-auto">
      {symbolList.length === 0 ? (
        <div className="px-4 py-8 text-center text-text-muted">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">
            {activeTab === 'search' ? 'No symbols found' : 'Loading symbols...'}
          </p>
        </div>
      ) : (
        symbolList.map((symbol) => (
          <button
            key={symbol.symbol}
            onClick={() => handleSymbolSelect(symbol.symbol)}
            className="w-full px-4 py-3 text-left hover:bg-bg-elevated transition-smooth border-b border-border-subtle last:border-b-0"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="flex-shrink-0"
                  style={{ color: getAssetTypeColor(symbol.asset_type) }}
                >
                  {symbol.logo_url ? (
                    <img
                      src={symbol.logo_url}
                      alt={`${symbol.name} logo`}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    ASSET_TYPE_ICONS[symbol.asset_type]
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-primary">{symbol.symbol}</span>
                    <span className="text-xs bg-bg-elevated text-text-secondary px-2 py-0.5 rounded uppercase">
                      {symbol.asset_type}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary truncate">{symbol.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-text-tertiary">{symbol.exchange}</span>
                    {symbol.sector && (
                      <>
                        <span className="text-xs text-border-default">•</span>
                        <span className="text-xs text-text-tertiary">{symbol.sector}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-xs text-text-tertiary font-mono">{symbol.currency}</div>
            </div>
          </button>
        ))
      )}
    </div>
  );

  // Prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-bg-secondary border border-border-default rounded-lg min-w-[200px]">
        <div className="w-4 h-4 text-primary"></div>
        <span className="font-semibold text-text-primary">Loading...</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2 bg-bg-secondary hover:bg-bg-elevated border border-border-default rounded-lg transition-smooth min-w-[200px]"
      >
        <div className="flex items-center gap-2 flex-1">
          <div className="w-4 h-4 text-primary">
            {selectedSymbol &&
              ASSET_TYPE_ICONS[
                popularSymbols.find((s) => s.symbol === selectedSymbol)?.asset_type || 'stock'
              ]}
          </div>
          <span className="font-semibold text-text-primary">
            {selectedSymbol || 'Select Symbol'}
          </span>
        </div>
        <Search className="w-4 h-4 text-text-secondary" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-bg-secondary border border-border-default rounded-lg shadow-xl z-50">
          {/* Search Header */}
          <div className="p-4 border-b border-border-default">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search symbols..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input w-full pl-10"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border-default">
            <button
              onClick={() => setActiveTab('popular')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-smooth ${
                activeTab === 'popular'
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
              }`}
            >
              Popular
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-smooth ${
                activeTab === 'search'
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
              }`}
            >
              Search Results
            </button>
          </div>

          {/* Symbol Lists */}
          {loading && (
            <div className="px-4 py-8 text-center">
              <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {!loading && (
            <>
              {activeTab === 'popular' && renderSymbolList(popularSymbols)}
              {activeTab === 'search' && renderSymbolList(symbols)}
            </>
          )}
        </div>
      )}
    </div>
  );
};
