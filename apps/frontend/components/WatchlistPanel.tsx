import {
  useActiveWatchlist,
  useWatchlistItems,
  useWatchlistStore,
  type ScreenerFilter,
  type SymbolMetrics,
  type WatchlistItem,
} from '@/lib/stores/watchlistStore';
import { FLAGS } from '@/lib/utils/featureFlags';
import React, { useMemo, useState } from 'react';

// Watchlist Panel Component
export const WatchlistPanel: React.FC = () => {
  const [isAddingSymbol, setIsAddingSymbol] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');

  const activeWatchlist = useActiveWatchlist();
  const items = useWatchlistItems();
  const { addToWatchlist, removeFromWatchlist, getSymbolMetrics, refreshSymbolDirectory } =
    useWatchlistStore();

  if (!FLAGS.watchlist) return null;

  const handleAddSymbol = () => {
    if (newSymbol.trim() && activeWatchlist) {
      addToWatchlist(activeWatchlist.id, newSymbol.trim().toUpperCase());
      setNewSymbol('');
      setIsAddingSymbol(false);
    }
  };

  const handleRemoveSymbol = (symbol: string) => {
    if (activeWatchlist) {
      removeFromWatchlist(activeWatchlist.id, symbol);
    }
  };

  return (
    <div className="bg-surface-0 border-r border-surface-300 w-80 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-surface-300">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            {activeWatchlist?.name || 'Watchlist'}
          </h2>
          <button
            onClick={() => refreshSymbolDirectory()}
            className="p-1 text-surface-300 hover:text-white"
            title="Refresh data"
          >
            <RefreshIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Add Symbol */}
        {isAddingSymbol ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newSymbol}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSymbol(e.target.value)}
              placeholder="Enter symbol..."
              className="flex-1 px-3 py-2 text-sm border border-surface-300
                       rounded-md bg-surface-100 text-white"
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                e.key === 'Enter' && handleAddSymbol()
              }
              autoFocus
            />
            <button
              onClick={handleAddSymbol}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add
            </button>
            <button
              onClick={() => setIsAddingSymbol(false)}
              className="px-3 py-2 text-sm border border-surface-300
                       text-surface-200 rounded-md hover:bg-surface-200"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingSymbol(true)}
            className="w-full px-3 py-2 text-sm border-2 border-dashed border-surface-300
                     text-surface-300 rounded-md hover:border-lokifi/50
                     hover:text-white transition-colors"
          >
            + Add Symbol
          </button>
        )}
      </div>

      {/* Watchlist Items */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="p-4 text-center text-surface-300">
            No symbols in watchlist
          </div>
        ) : (
          <div className="divide-y divide-surface-300">
            {items.map((item: WatchlistItem) => (
              <WatchlistItem
                key={item.symbol}
                item={item}
                onRemove={() => handleRemoveSymbol(item.symbol)}
                metrics={getSymbolMetrics(item.symbol)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Individual Watchlist Item
interface WatchlistItemProps {
  item: {
    symbol: string;
    addedAt: Date;
    notes?: string;
  };
  onRemove: () => void;
  metrics?: SymbolMetrics;
}

const WatchlistItem: React.FC<WatchlistItemProps> = ({ item, onRemove, metrics }) => {
  const [showActions, setShowActions] = useState(false);

  const changeColor = useMemo(() => {
    if (!metrics) return 'text-surface-300';
    return metrics.change >= 0 ? 'text-green-600' : 'text-red-600';
  }, [metrics]);

  return (
    <div
      className="p-3 hover:bg-surface-200 cursor-pointer group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{item.symbol}</span>
            {showActions && (
              <button
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="text-surface-300 hover:text-red-600 transition-colors"
                title="Remove from watchlist"
              >
                <XIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {metrics && (
            <div className="mt-1 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white font-medium">
                  ${metrics.price.toFixed(2)}
                </span>
                <span className={`${changeColor} font-medium`}>
                  {metrics.change >= 0 ? '+' : ''}
                  {metrics.change.toFixed(2)}({metrics.changePercent >= 0 ? '+' : ''}
                  {metrics.changePercent.toFixed(2)}%)
                </span>
              </div>

              <div className="text-xs text-surface-300">
                Vol: {(metrics.volume / 1000000).toFixed(1)}M
                {metrics.marketCap && (
                  <span className="ml-2">Cap: {formatMarketCap(metrics.marketCap)}</span>
                )}
              </div>
            </div>
          )}

          {item.notes && (
            <div className="mt-1 text-xs text-surface-300 truncate">
              {item.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Screener Panel Component
export const ScreenerPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [newFilterField, setNewFilterField] = useState<keyof SymbolMetrics>('changePercent');
  const [newFilterOperator, setNewFilterOperator] = useState<'gt' | 'lt' | 'between'>('gt');
  const [newFilterValue, setNewFilterValue] = useState<string>('');

  const {
    screenerResults,
    screenerQuery,
    updateScreenerQuery,
    addScreenerFilter,
    removeScreenerFilter,
    runScreener,
    isLoading,
  } = useWatchlistStore();

  if (!FLAGS.watchlist) return null;

  const handleAddFilter = () => {
    if (newFilterValue.trim()) {
      const value =
        newFilterOperator === 'between'
          ? newFilterValue.split(',').map((v: string) => parseFloat(v.trim()))
          : parseFloat(newFilterValue);

      addScreenerFilter({
        field: newFilterField,
        operator: newFilterOperator,
        value: value as number | [number, number],
        label: `${newFilterField} ${newFilterOperator} ${newFilterValue}`,
      });

      setNewFilterValue('');
    }
  };

  const fieldLabels: Record<keyof SymbolMetrics, string> = {
    symbol: 'Symbol',
    price: 'Price',
    change: 'Change ($)',
    changePercent: 'Change (%)',
    volume: 'Volume',
    marketCap: 'Market Cap',
    peRatio: 'P/E Ratio',
    dividend: 'Dividend',
    beta: 'Beta',
    avgVolume: 'Avg Volume',
    high52w: '52W High',
    low52w: '52W Low',
    sector: 'Sector',
    industry: 'Industry',
  };

  return (
    <div className="bg-surface-0 border border-surface-300 rounded-lg shadow-sm">
      <div className="p-4 border-b border-surface-300">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">Stock Screener</h3>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-surface-300 hover:text-white"
          >
            {isOpen ? (
              <ChevronUpIcon className="w-5 h-5" />
            ) : (
              <ChevronDownIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 space-y-4">
          {/* Add Filter */}
          <div className="grid grid-cols-4 gap-2">
            <select
              value={newFilterField}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setNewFilterField(e.target.value as keyof SymbolMetrics)
              }
              className="px-3 py-2 text-sm border border-surface-300 rounded-md
                       bg-surface-100 text-white"
            >
              {Object.entries(fieldLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={newFilterOperator}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setNewFilterOperator(e.target.value as 'gt' | 'lt' | 'between')
              }
              className="px-3 py-2 text-sm border border-surface-300 rounded-md
                       bg-surface-100 text-white"
            >
              <option value="gt">Greater than</option>
              <option value="gte">Greater than or equal</option>
              <option value="lt">Less than</option>
              <option value="lte">Less than or equal</option>
              <option value="eq">Equal to</option>
              <option value="between">Between</option>
            </select>

            <input
              type="text"
              value={newFilterValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewFilterValue(e.target.value)
              }
              placeholder={newFilterOperator === 'between' ? '1,100' : '10'}
              className="px-3 py-2 text-sm border border-surface-300 rounded-md
                       bg-surface-100 text-white"
            />

            <button
              onClick={handleAddFilter}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add
            </button>
          </div>

          {/* Active Filters */}
          {screenerQuery.filters.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-white">Active Filters:</h4>
              <div className="flex flex-wrap gap-2">
                {screenerQuery.filters.map((filter: ScreenerFilter) => (
                  <span
                    key={filter.id}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900
                             text-blue-800 dark:text-blue-200 rounded-md"
                  >
                    {filter.label}
                    <button
                      onClick={() => removeScreenerFilter(filter.id)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sort Options */}
          <div className="grid grid-cols-2 gap-2">
            <select
              value={screenerQuery.sortBy}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                updateScreenerQuery({ sortBy: e.target.value as keyof SymbolMetrics })
              }
              className="px-3 py-2 text-sm border border-surface-300 rounded-md
                       bg-surface-100 text-white"
            >
              {Object.entries(fieldLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  Sort by {label}
                </option>
              ))}
            </select>

            <select
              value={screenerQuery.sortOrder}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                updateScreenerQuery({ sortOrder: e.target.value as 'asc' | 'desc' })
              }
              className="px-3 py-2 text-sm border border-surface-300 rounded-md
                       bg-surface-100 text-white"
            >
              <option value="desc">Highest first</option>
              <option value="asc">Lowest first</option>
            </select>
          </div>

          {/* Run Screener Button */}
          <button
            onClick={runScreener}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Running...' : 'Run Screener'}
          </button>

          {/* Results */}
          {screenerResults.length > 0 && (
            <div className="mt-4 max-h-96 overflow-y-auto border border-surface-300 rounded-md">
              <div className="divide-y divide-surface-300">
                {screenerResults.map((result: SymbolMetrics) => (
                  <div
                    key={result.symbol}
                    className="p-3 flex items-center justify-between hover:bg-surface-200"
                  >
                    <div>
                      <div className="font-medium text-white">
                        {result.symbol}
                      </div>
                      <div className="text-sm text-surface-300">
                        ${result.price.toFixed(2)} ({result.changePercent >= 0 ? '+' : ''}
                        {result.changePercent.toFixed(2)}%)
                      </div>
                    </div>
                    <div className="text-sm text-surface-300">
                      Vol: {(result.volume / 1000000).toFixed(1)}M
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Utility functions
const formatMarketCap = (marketCap: number): string => {
  if (marketCap >= 1000000000000) return `${(marketCap / 1000000000000).toFixed(1)}T`;
  if (marketCap >= 1000000000) return `${(marketCap / 1000000000).toFixed(1)}B`;
  if (marketCap >= 1000000) return `${(marketCap / 1000000).toFixed(1)}M`;
  return `${marketCap.toFixed(0)}`;
};

// Icons (simple implementations)
const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChevronUpIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

