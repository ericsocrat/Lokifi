import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { FLAGS } from './featureFlags';

// Watchlist Types
export interface WatchlistItem {
  symbol: string;
  addedAt: Date;
  notes?: string;
  alerts?: AlertRule[];
}

export interface Watchlist {
  id: string;
  name: string;
  items: WatchlistItem[];
  createdAt: Date;
  updatedAt: Date;
  isDefault?: boolean;
}

export interface AlertRule {
  id: string;
  condition: 'above' | 'below' | 'cross_above' | 'cross_below';
  value: number;
  field: 'price' | 'volume' | 'change_percent';
  isActive: boolean;
}

// Screener Types
export interface ScreenerFilter {
  id: string;
  field: keyof SymbolMetrics;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'between';
  value: number | [number, number];
  label: string;
}

export interface SymbolMetrics {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  peRatio?: number;
  dividend?: number;
  beta?: number;
  avgVolume?: number;
  high52w?: number;
  low52w?: number;
  sector?: string;
  industry?: string;
}

export interface ScreenerQuery {
  filters: ScreenerFilter[];
  sortBy: keyof SymbolMetrics;
  sortOrder: 'asc' | 'desc';
  limit: number;
}

// Store State
interface WatchlistState {
  watchlists: Watchlist[];
  activeWatchlistId: string | null;
  screenerResults: SymbolMetrics[];
  screenerQuery: ScreenerQuery;
  isLoading: boolean;
  error: string | null;
  symbolDirectory: Map<string, SymbolMetrics>;
  lastUpdated: Date | null;
}

// Store Actions
interface WatchlistActions {
  // Watchlist Management
  createWatchlist: (name: string) => string;
  deleteWatchlist: (id: string) => void;
  renameWatchlist: (id: string, name: string) => void;
  setActiveWatchlist: (id: string) => void;
  
  // Item Management
  addToWatchlist: (watchlistId: string, symbol: string, notes?: string) => void;
  removeFromWatchlist: (watchlistId: string, symbol: string) => void;
  updateWatchlistItem: (watchlistId: string, symbol: string, updates: Partial<WatchlistItem>) => void;
  
  // Alert Management
  addAlert: (watchlistId: string, symbol: string, rule: Omit<AlertRule, 'id'>) => void;
  removeAlert: (watchlistId: string, symbol: string, alertId: string) => void;
  toggleAlert: (watchlistId: string, symbol: string, alertId: string) => void;
  
  // Screener
  updateScreenerQuery: (query: Partial<ScreenerQuery>) => void;
  runScreener: () => Promise<void>;
  addScreenerFilter: (filter: Omit<ScreenerFilter, 'id'>) => void;
  removeScreenerFilter: (filterId: string) => void;
  
  // Data Management
  refreshSymbolDirectory: () => Promise<void>;
  getSymbolMetrics: (symbol: string) => SymbolMetrics | undefined;
  
  // Bulk Operations
  importWatchlist: (items: string[]) => string;
  exportWatchlist: (watchlistId: string) => string[];
}

const defaultScreenerQuery: ScreenerQuery = {
  filters: [],
  sortBy: 'changePercent',
  sortOrder: 'desc',
  limit: 50
};

// Create Store
export const useWatchlistStore = create<WatchlistState & WatchlistActions>()(
  persist(
      immer<any>((set, get, store) => ({
        // Initial State
        watchlists: [],
        activeWatchlistId: null,
        screenerResults: [],
        screenerQuery: defaultScreenerQuery,
        isLoading: false,
        error: null,
        symbolDirectory: new Map(),
        lastUpdated: null,
        
        // Watchlist Management
        createWatchlist: (name: string) => {
          if (!FLAGS.watchlist) return '';
          
          const id = `wl_${Date.now()}`;
          const now = new Date();
          
          set((state) => {
            state.watchlists.push({
              id,
              name,
              items: [],
              createdAt: now,
              updatedAt: now,
              isDefault: state.watchlists.length === 0
            });
            
            if (!state.activeWatchlistId) {
              state.activeWatchlistId = id;
            }
          });
          
          return id;
        },
        
        deleteWatchlist: (id: string) => {
          if (!FLAGS.watchlist) return;
          
          set((state) => {
            const index = state.watchlists.findIndex(w => w.id === id);
            if (index !== -1) {
              state.watchlists.splice(index, 1);
              
              if (state.activeWatchlistId === id) {
                state.activeWatchlistId = state.watchlists[0]?.id || null;
              }
            }
          });
        },
        
        renameWatchlist: (id: string, name: string) => {
          if (!FLAGS.watchlist) return;
          
          set((state) => {
            const watchlist = state.watchlists.find(w => w.id === id);
            if (watchlist) {
              watchlist.name = name;
              watchlist.updatedAt = new Date();
            }
          });
        },
        
        setActiveWatchlist: (id: string) => {
          if (!FLAGS.watchlist) return;
          
          set((state) => {
            if (state.watchlists.find(w => w.id === id)) {
              state.activeWatchlistId = id;
            }
          });
        },
        
        // Item Management
        addToWatchlist: (watchlistId: string, symbol: string, notes?: string) => {
          if (!FLAGS.watchlist) return;
          
          set((state) => {
            const watchlist = state.watchlists.find(w => w.id === watchlistId);
            if (watchlist && !watchlist.items.find(item => item.symbol === symbol)) {
              watchlist.items.push({
                symbol: symbol.toUpperCase(),
                addedAt: new Date(),
                notes,
                alerts: []
              });
              watchlist.updatedAt = new Date();
            }
          });
        },
        
        removeFromWatchlist: (watchlistId: string, symbol: string) => {
          if (!FLAGS.watchlist) return;
          
          set((state) => {
            const watchlist = state.watchlists.find(w => w.id === watchlistId);
            if (watchlist) {
              const index = watchlist.items.findIndex(item => item.symbol === symbol);
              if (index !== -1) {
                watchlist.items.splice(index, 1);
                watchlist.updatedAt = new Date();
              }
            }
          });
        },
        
        updateWatchlistItem: (watchlistId: string, symbol: string, updates: Partial<WatchlistItem>) => {
          if (!FLAGS.watchlist) return;
          
          set((state) => {
            const watchlist = state.watchlists.find(w => w.id === watchlistId);
            if (watchlist) {
              const item = watchlist.items.find(item => item.symbol === symbol);
              if (item) {
                Object.assign(item, updates);
                watchlist.updatedAt = new Date();
              }
            }
          });
        },
        
        // Alert Management
        addAlert: (watchlistId: string, symbol: string, rule: Omit<AlertRule, 'id'>) => {
          if (!FLAGS.watchlist) return;
          
          set((state) => {
            const watchlist = state.watchlists.find(w => w.id === watchlistId);
            if (watchlist) {
              const item = watchlist.items.find(item => item.symbol === symbol);
              if (item) {
                if (!item.alerts) item.alerts = [];
                item.alerts.push({
                  ...rule,
                  id: `alert_${Date.now()}`
                });
                watchlist.updatedAt = new Date();
              }
            }
          });
        },
        
        removeAlert: (watchlistId: string, symbol: string, alertId: string) => {
          if (!FLAGS.watchlist) return;
          
          set((state) => {
            const watchlist = state.watchlists.find(w => w.id === watchlistId);
            if (watchlist) {
              const item = watchlist.items.find(item => item.symbol === symbol);
              if (item?.alerts) {
                const index = item.alerts.findIndex(alert => alert.id === alertId);
                if (index !== -1) {
                  item.alerts.splice(index, 1);
                  watchlist.updatedAt = new Date();
                }
              }
            }
          });
        },
        
        toggleAlert: (watchlistId: string, symbol: string, alertId: string) => {
          if (!FLAGS.watchlist) return;
          
          set((state) => {
            const watchlist = state.watchlists.find(w => w.id === watchlistId);
            if (watchlist) {
              const item = watchlist.items.find(item => item.symbol === symbol);
              if (item?.alerts) {
                const alert = item.alerts.find(alert => alert.id === alertId);
                if (alert) {
                  alert.isActive = !alert.isActive;
                  watchlist.updatedAt = new Date();
                }
              }
            }
          });
        },
        
        // Screener
        updateScreenerQuery: (query: Partial<ScreenerQuery>) => {
          if (!FLAGS.watchlist) return;
          
          set((state) => {
            state.screenerQuery = { ...state.screenerQuery, ...query };
          });
        },
        
        addScreenerFilter: (filter: Omit<ScreenerFilter, 'id'>) => {
          if (!FLAGS.watchlist) return;
          
          set((state) => {
            state.screenerQuery.filters.push({
              ...filter,
              id: `filter_${Date.now()}`
            });
          });
        },
        
        removeScreenerFilter: (filterId: string) => {
          if (!FLAGS.watchlist) return;
          
          set((state) => {
            const index = state.screenerQuery.filters.findIndex(f => f.id === filterId);
            if (index !== -1) {
              state.screenerQuery.filters.splice(index, 1);
            }
          });
        },
        
        runScreener: async () => {
          if (!FLAGS.watchlist) return;
          
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });
          
          try {
            const { screenerQuery, symbolDirectory } = get();
            
            // Apply filters to symbol directory
            let results = Array.from(symbolDirectory.values());
            
            for (const filter of screenerQuery.filters) {
              results = results.filter(symbol => {
                const value = symbol[filter.field];
                if (value === undefined || value === null) return false;
                
                // Ensure we're working with numbers for numeric comparisons
                const numValue = typeof value === 'number' ? value : parseFloat(String(value));
                if (isNaN(numValue)) return false;
                
                const filterValue = Array.isArray(filter.value) ? filter.value : [filter.value];
                
                switch (filter.operator) {
                  case 'gt': return numValue > (filterValue[0] as number);
                  case 'gte': return numValue >= (filterValue[0] as number);
                  case 'lt': return numValue < (filterValue[0] as number);
                  case 'lte': return numValue <= (filterValue[0] as number);
                  case 'eq': return numValue === (filterValue[0] as number);
                  case 'between':
                    if (filterValue.length === 2) {
                      return numValue >= (filterValue[0] as number) && numValue <= (filterValue[1] as number);
                    }
                    return false;
                  default: return true;
                }
              });
            }
            
            // Sort results
            results.sort((a, b) => {
              const aVal = a[screenerQuery.sortBy];
              const bVal = b[screenerQuery.sortBy];
              
              if (aVal === undefined || bVal === undefined) return 0;
              
              const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
              return screenerQuery.sortOrder === 'desc' ? -comparison : comparison;
            });
            
            // Limit results
            results = results.slice(0, screenerQuery.limit);
            
            set((state) => {
              state.screenerResults = results;
              state.isLoading = false;
            });
            
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Screener failed';
              state.isLoading = false;
            });
          }
        },
        
        // Data Management
        refreshSymbolDirectory: async () => {
          if (!FLAGS.watchlist) return;
          
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });
          
          try {
            // Fetch symbol metrics from API
            const response = await fetch('/api/symbols/metrics');
            if (!response.ok) throw new Error('Failed to fetch symbol metrics');
            
            const metrics: SymbolMetrics[] = await response.json();
            
            set((state) => {
              state.symbolDirectory.clear();
              for (const metric of metrics) {
                state.symbolDirectory.set(metric.symbol, metric);
              }
              state.lastUpdated = new Date();
              state.isLoading = false;
            });
            
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to refresh data';
              state.isLoading = false;
            });
          }
        },
        
        getSymbolMetrics: (symbol: string) => {
          const { symbolDirectory } = get();
          return symbolDirectory.get(symbol.toUpperCase());
        },
        
        // Bulk Operations
        importWatchlist: (items: string[]) => {
          if (!FLAGS.watchlist) return '';
          
          const id = get().createWatchlist('Imported Watchlist');
          
          set((state) => {
            const watchlist = state.watchlists.find(w => w.id === id);
            if (watchlist) {
              for (const symbol of items) {
                if (!watchlist.items.find(item => item.symbol === symbol)) {
                  watchlist.items.push({
                    symbol: symbol.toUpperCase(),
                    addedAt: new Date(),
                    alerts: []
                  });
                }
              }
              watchlist.updatedAt = new Date();
            }
          });
          
          return id;
        },
        
        exportWatchlist: (watchlistId: string) => {
          const { watchlists } = get();
          const watchlist = watchlists.find(w => w.id === watchlistId);
          return watchlist ? watchlist.items.map(item => item.symbol) : [];
        }
      })),
      {
        name: 'lokifi-watchlist-storage',
        version: 1,
        migrate: (persistedState: any, version: number) => {
          if (version === 0) {
            // Migrate from legacy format
            return {
              ...persistedState,
              symbolDirectory: new Map(),
              lastUpdated: null
            };
          }
          return persistedState as WatchlistState & WatchlistActions;
        }
      }
    )
  );

// Selectors for common use cases
export const useActiveWatchlist = () => 
  useWatchlistStore((state) => 
    state.watchlists.find(w => w.id === state.activeWatchlistId)
  );

export const useWatchlistItems = () => {
  const watchlist = useActiveWatchlist();
  return watchlist?.items || [];
};

export const useScreenerResults = () => 
  useWatchlistStore((state) => state.screenerResults);

export const useScreenerQuery = () => 
  useWatchlistStore((state) => state.screenerQuery);

// Initialize default watchlist
if (typeof window !== 'undefined' && FLAGS.watchlist) {
  const store = useWatchlistStore.getState();
  if (store.watchlists.length === 0) {
    store.createWatchlist('My Watchlist');
  }
}

