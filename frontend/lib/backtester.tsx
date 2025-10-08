import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { FLAGS } from './featureFlags';

// Strategy Types
export interface TradingStrategy {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tags: string[];
  isPublic: boolean;
  
  // Strategy Configuration
  config: {
    // Entry Conditions
    entryConditions: StrategyCondition[];
    entryLogic: 'AND' | 'OR';
    
    // Exit Conditions
    exitConditions: StrategyCondition[];
    exitLogic: 'AND' | 'OR';
    
    // Risk Management
    stopLoss?: {
      type: 'percentage' | 'fixed' | 'atr' | 'support_resistance';
      value: number;
      trail?: boolean;
    };
    
    takeProfit?: {
      type: 'percentage' | 'fixed' | 'ratio' | 'target';
      value: number;
      partial?: boolean;
    };
    
    // Position Sizing
    positionSizing: {
      type: 'fixed' | 'percentage' | 'kelly' | 'risk_based';
      value: number;
      maxPositionSize?: number;
    };
    
    // Time Constraints
    timeframe: string;
    holdingPeriod?: {
      min?: number; // minutes
      max?: number; // minutes
    };
    
    // Trading Hours
    tradingHours?: {
      start: string; // HH:mm
      end: string;   // HH:mm
      timezone: string;
    };
  };
  
  // Performance Metrics (from backtests)
  performance?: StrategyPerformance;
}

export interface StrategyCondition {
  id: string;
  type: 'price' | 'indicator' | 'volume' | 'pattern' | 'custom';
  
  // Price conditions
  priceType?: 'open' | 'high' | 'low' | 'close';
  priceOperator?: 'above' | 'below' | 'crosses_above' | 'crosses_below';
  priceReference?: 'value' | 'sma' | 'ema' | 'previous_close' | 'support' | 'resistance';
  priceValue?: number;
  
  // Indicator conditions
  indicatorType?: 'sma' | 'ema' | 'rsi' | 'macd' | 'bb' | 'stoch' | 'custom';
  indicatorPeriod?: number;
  indicatorOperator?: 'above' | 'below' | 'crosses_above' | 'crosses_below' | 'between';
  indicatorValue?: number | [number, number];
  
  // Volume conditions
  volumeOperator?: 'above' | 'below' | 'spike';
  volumeReference?: 'average' | 'previous' | 'value';
  volumePeriod?: number;
  volumeValue?: number;
  
  // Pattern conditions
  patternType?: 'hammer' | 'doji' | 'engulfing' | 'breakout' | 'reversal';
  patternStrength?: number;
  
  // Custom script
  customScript?: string;
}

export interface StrategyPerformance {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  calmarRatio: number;
  
  // Trade Statistics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  
  // Risk Metrics
  var95: number; // Value at Risk
  expectedShortfall: number;
  beta: number;
  correlation: number;
  
  // Time-based Metrics
  avgHoldingPeriod: number; // hours
  tradingFrequency: number; // trades per month
  
  // Monthly/Yearly Returns
  monthlyReturns: number[];
  yearlyReturns: number[];
}

// Backtest Types
export interface Backtest {
  id: string;
  strategyId: string;
  name: string;
  symbols: string[];
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  
  // Configuration
  config: BacktestConfig;
  
  // Status
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  
  // Results
  results?: BacktestResults;
  
  // Error information
  error?: string;
  logs: BacktestLog[];
}

export interface BacktestConfig {
  initialCapital: number;
  commissionRate: number; // per trade
  slippageRate: number;   // percentage
  
  // Market Simulation
  marketImpact: boolean;
  latencyMs: number;
  
  // Data Configuration
  dataQuality: 'basic' | 'adjusted' | 'premium';
  includeDividends: boolean;
  includeAfterHours: boolean;
  
  // Risk Limits
  maxDrawdown: number;     // percentage
  maxLeverage: number;
  maxPositions: number;
  
  // Benchmark
  benchmark?: string; // symbol to compare against
}

export interface BacktestResults {
  // Portfolio Performance
  finalValue: number;
  totalReturn: number;
  annualizedReturn: number;
  
  // Risk Metrics
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  
  // Trade Analysis
  trades: BacktestTrade[];
  performance: StrategyPerformance;
  
  // Equity Curve
  equityCurve: EquityCurvePoint[];
  
  // Drawdown Analysis
  drawdownPeriods: DrawdownPeriod[];
  
  // Symbol Performance
  symbolPerformance: SymbolPerformance[];
  
  // Time-based Analysis
  monthlyReturns: MonthlyReturn[];
  yearlyReturns: YearlyReturn[];
  
  // Benchmark Comparison
  benchmarkComparison?: BenchmarkComparison;
}

export interface BacktestTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  entryPrice: number;
  entryTime: Date;
  exitPrice?: number;
  exitTime?: Date;
  
  // Trade Analytics
  pnl?: number;
  pnlPercent?: number;
  commission: number;
  slippage: number;
  
  // Strategy Context
  entryReason: string[];
  exitReason?: string[];
  holdingPeriod?: number; // minutes
  
  // Risk Management
  stopLossPrice?: number;
  takeProfitPrice?: number;
  maxFavorableExcursion?: number;
  maxAdverseExcursion?: number;
}

export interface BacktestLog {
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  message: string;
  context?: Record<string, any>;
}

export interface EquityCurvePoint {
  timestamp: Date;
  portfolioValue: number;
  cash: number;
  positions: number;
  drawdown: number;
  benchmarkValue?: number;
}

export interface DrawdownPeriod {
  startDate: Date;
  endDate: Date;
  peak: number;
  trough: number;
  drawdown: number;
  recovery?: Date;
  duration: number; // days
}

export interface SymbolPerformance {
  symbol: string;
  trades: number;
  winRate: number;
  avgReturn: number;
  totalReturn: number;
  maxDrawdown: number;
  bestTrade: number;
  worstTrade: number;
}

export interface MonthlyReturn {
  year: number;
  month: number;
  return: number;
  benchmark?: number;
}

export interface YearlyReturn {
  year: number;
  return: number;
  benchmark?: number;
}

export interface BenchmarkComparison {
  correlation: number;
  beta: number;
  alpha: number;
  trackingError: number;
  informationRatio: number;
  upCapture: number;
  downCapture: number;
}

// Store State
interface BacktesterState {
  // Strategies
  strategies: TradingStrategy[];
  activeStrategy: TradingStrategy | null;
  
  // Backtests
  backtests: Backtest[];
  runningBacktests: Set<string>;
  
  // Results & Analysis
  currentResults: BacktestResults | null;
  comparison: {
    backtestIds: string[];
    metrics: string[];
  };
  
  // UI State
  selectedTab: 'strategy' | 'backtest' | 'results' | 'comparison';
  selectedSymbols: string[];
  dateRange: {
    start: Date;
    end: Date;
  };
  
  // Settings
  defaultConfig: BacktestConfig;
  
  // Loading States
  isLoading: boolean;
  error: string | null;
}

// Store Actions
interface BacktesterActions {
  // Strategy Management
  createStrategy: (strategy: Omit<TradingStrategy, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateStrategy: (id: string, updates: Partial<TradingStrategy>) => void;
  deleteStrategy: (id: string) => void;
  duplicateStrategy: (id: string, newName: string) => string;
  setActiveStrategy: (strategy: TradingStrategy | null) => void;
  
  // Strategy Conditions
  addCondition: (strategyId: string, type: 'entry' | 'exit', condition: Omit<StrategyCondition, 'id'>) => void;
  updateCondition: (strategyId: string, type: 'entry' | 'exit', conditionId: string, updates: Partial<StrategyCondition>) => void;
  removeCondition: (strategyId: string, type: 'entry' | 'exit', conditionId: string) => void;
  
  // Backtesting
  runBacktest: (strategyId: string, symbols: string[], config?: Partial<BacktestConfig>) => Promise<string>;
  stopBacktest: (backtestId: string) => void;
  deleteBacktest: (backtestId: string) => void;
  
  // Results Analysis
  loadBacktestResults: (backtestId: string) => Promise<void>;
  compareBacktests: (backtestIds: string[]) => void;
  exportResults: (backtestId: string, format: 'csv' | 'json' | 'pdf') => Promise<Blob>;
  
  // Strategy Library
  loadPublicStrategies: () => Promise<void>;
  saveToLibrary: (strategyId: string, isPublic: boolean) => Promise<void>;
  importStrategy: (strategyData: any) => Promise<string>;
  
  // Live Trading Integration
  createLiveSignals: (strategyId: string, symbols: string[]) => Promise<void>;
  
  // Settings
  updateDefaultConfig: (config: Partial<BacktestConfig>) => void;
  setDateRange: (start: Date, end: Date) => void;
  setSelectedSymbols: (symbols: string[]) => void;
  setSelectedTab: (tab: BacktesterState['selectedTab']) => void;
}

const defaultBacktestConfig: BacktestConfig = {
  initialCapital: 100000,
  commissionRate: 0.001,
  slippageRate: 0.0005,
  marketImpact: false,
  latencyMs: 100,
  dataQuality: 'adjusted',
  includeDividends: true,
  includeAfterHours: false,
  maxDrawdown: 20,
  maxLeverage: 1,
  maxPositions: 10
};

// Create Store
export const useBacktesterStore = create<BacktesterState & BacktesterActions>()(
  persist(
    immer<any>((set: any, get: any) => ({
      // Initial State
      strategies: [],
      activeStrategy: null,
      backtests: [],
      runningBacktests: new Set(),
      currentResults: null,
      comparison: {
        backtestIds: [],
        metrics: ['totalReturn', 'sharpeRatio', 'maxDrawdown', 'winRate']
      },
      selectedTab: 'strategy',
      selectedSymbols: ['SPY'],
      dateRange: {
        start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        end: new Date()
      },
      defaultConfig: defaultBacktestConfig,
      isLoading: false,
      error: null,
      
      // Strategy Management
      createStrategy: (strategyData: any) => {
        if (!FLAGS.backtester) return '';
        
        const id = `strategy_${Date.now()}`;
        const now = new Date();
        
        const strategy: TradingStrategy = {
          ...strategyData,
          id,
          createdAt: now,
          updatedAt: now
        };
        
        set((state: any) => {
          state.strategies.push(strategy);
          state.activeStrategy = strategy;
        });
        
        return id;
      },
      
      updateStrategy: (id: any, updates: any) => {
        if (!FLAGS.backtester) return;
        
        set((state: any) => {
          const strategy = state.strategies.find((s: any) => s.id === id);
          if (strategy) {
            Object.assign(strategy, updates);
            strategy.updatedAt = new Date();
            
            if (state.activeStrategy?.id === id) {
              state.activeStrategy = strategy;
            }
          }
        });
      },
      
      deleteStrategy: (id: any) => {
        if (!FLAGS.backtester) return;
        
        set((state: any) => {
          const index = state.strategies.findIndex((s: any) => s.id === id);
          if (index !== -1) {
            state.strategies.splice(index, 1);
          }
          
          if (state.activeStrategy?.id === id) {
            state.activeStrategy = null;
          }
          
          // Delete associated backtests
          state.backtests = state.backtests.filter((b: any) => b.strategyId !== id);
        });
      },
      
      duplicateStrategy: (id: any, newName: any) => {
        if (!FLAGS.backtester) return '';
        
        const { strategies, createStrategy } = get();
        const strategy = strategies.find((s: any) => s.id === id);
        
        if (!strategy) return '';
        
        return createStrategy({
          ...strategy,
          name: newName,
          performance: undefined // Reset performance for duplicate
        });
      },
      
      setActiveStrategy: (strategy: any) => {
        if (!FLAGS.backtester) return;
        
        set((state: any) => {
          state.activeStrategy = strategy;
        });
      },
      
      // Strategy Conditions
      addCondition: (strategyId: any, type: any, condition: any) => {
        if (!FLAGS.backtester) return;
        
        set((state: any) => {
          const strategy = state.strategies.find((s: any) => s.id === strategyId);
          if (strategy) {
            const conditionWithId = {
              ...condition,
              id: `condition_${Date.now()}`
            };
            
            if (type === 'entry') {
              strategy.config.entryConditions.push(conditionWithId);
            } else {
              strategy.config.exitConditions.push(conditionWithId);
            }
            
            strategy.updatedAt = new Date();
          }
        });
      },
      
      updateCondition: (strategyId: any, type: any, conditionId: any, updates: any) => {
        if (!FLAGS.backtester) return;
        
        set((state: any) => {
          const strategy = state.strategies.find((s: any) => s.id === strategyId);
          if (strategy) {
            const conditions = type === 'entry' 
              ? strategy.config.entryConditions 
              : strategy.config.exitConditions;
            
            const condition = conditions.find((c: any) => c.id === conditionId);
            if (condition) {
              Object.assign(condition, updates);
              strategy.updatedAt = new Date();
            }
          }
        });
      },
      
      removeCondition: (strategyId: any, type: any, conditionId: any) => {
        if (!FLAGS.backtester) return;
        
        set((state: any) => {
          const strategy = state.strategies.find((s: any) => s.id === strategyId);
          if (strategy) {
            const conditions = type === 'entry' 
              ? strategy.config.entryConditions 
              : strategy.config.exitConditions;
            
            const index = conditions.findIndex((c: any) => c.id === conditionId);
            if (index !== -1) {
              conditions.splice(index, 1);
              strategy.updatedAt = new Date();
            }
          }
        });
      },
      
      // Backtesting
      runBacktest: async (strategyId: any, symbols: any, config: any) => {
        if (!FLAGS.backtester) throw new Error('Backtester not enabled');
        
        const backtestId = `backtest_${Date.now()}`;
        const { defaultConfig, dateRange } = get();
        
        const backtest: Backtest = {
          id: backtestId,
          strategyId,
          name: `Backtest ${new Date().toLocaleDateString()}`,
          symbols,
          startDate: dateRange.start,
          endDate: dateRange.end,
          createdAt: new Date(),
          config: { ...defaultConfig, ...config },
          status: 'pending',
          progress: 0,
          logs: []
        };
        
        set((state: any) => {
          state.backtests.push(backtest);
          state.runningBacktests.add(backtestId);
          state.isLoading = true;
          state.error = null;
        });
        
        try {
          // Start backtest via API
          const response = await fetch('/api/backtester/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              backtestId,
              strategyId,
              symbols,
              startDate: dateRange.start.toISOString(),
              endDate: dateRange.end.toISOString(),
              config: backtest.config
            })
          });
          
          if (!response.ok) throw new Error('Failed to start backtest');
          
          // Poll for results
          const pollResults = async () => {
            try {
              const statusResponse = await fetch(`/api/backtester/status/${backtestId}`);
              if (!statusResponse.ok) return;
              
              const status = await statusResponse.json();
              
              set((state: any) => {
                const bt = state.backtests.find((b: any) => b.id === backtestId);
                if (bt) {
                  bt.status = status.status;
                  bt.progress = status.progress;
                  bt.logs = [...bt.logs, ...status.newLogs];
                  
                  if (status.results) {
                    bt.results = status.results;
                    state.currentResults = status.results;
                  }
                  
                  if (status.error) {
                    bt.error = status.error;
                  }
                }
              });
              
              if (status.status === 'completed' || status.status === 'failed') {
                set((state: any) => {
                  state.runningBacktests.delete(backtestId);
                  state.isLoading = state.runningBacktests.size > 0;
                });
              } else {
                setTimeout(pollResults, 1000);
              }
              
            } catch (error) {
              console.error('Polling error:', error);
              setTimeout(pollResults, 5000); // Retry with longer delay
            }
          };
          
          setTimeout(pollResults, 1000);
          
        } catch (error) {
          set((state: any) => {
            const bt = state.backtests.find((b: any) => b.id === backtestId);
            if (bt) {
              bt.status = 'failed';
              bt.error = error instanceof Error ? error.message : 'Unknown error';
            }
            
            state.runningBacktests.delete(backtestId);
            state.isLoading = state.runningBacktests.size > 0;
            state.error = error instanceof Error ? error.message : 'Backtest failed';
          });
        }
        
        return backtestId;
      },
      
      stopBacktest: (backtestId: any) => {
        if (!FLAGS.backtester) return;
        
        fetch(`/api/backtester/stop/${backtestId}`, { method: 'POST' })
          .catch(console.error);
        
        set((state: any) => {
          const backtest = state.backtests.find((b: any) => b.id === backtestId);
          if (backtest) {
            backtest.status = 'cancelled';
          }
          
          state.runningBacktests.delete(backtestId);
          state.isLoading = state.runningBacktests.size > 0;
        });
      },
      
      deleteBacktest: (backtestId: any) => {
        if (!FLAGS.backtester) return;
        
        set((state: any) => {
          const index = state.backtests.findIndex((b: any) => b.id === backtestId);
          if (index !== -1) {
            state.backtests.splice(index, 1);
          }
          
          state.runningBacktests.delete(backtestId);
          
          if (state.currentResults && 
              state.backtests.find((b: any) => b.results === state.currentResults)?.id === backtestId) {
            state.currentResults = null;
          }
        });
      },
      
      // Results Analysis
      loadBacktestResults: async (backtestId: any) => {
        if (!FLAGS.backtester) return;
        
        set((state: any) => {
          state.isLoading = true;
          state.error = null;
        });
        
        try {
          const response = await fetch(`/api/backtester/results/${backtestId}`);
          if (!response.ok) throw new Error('Failed to load results');
          
          const results: BacktestResults = await response.json();
          
          set((state: any) => {
            const backtest = state.backtests.find((b: any) => b.id === backtestId);
            if (backtest) {
              backtest.results = results;
            }
            
            state.currentResults = results;
            state.isLoading = false;
          });
          
        } catch (error) {
          set((state: any) => {
            state.error = error instanceof Error ? error.message : 'Failed to load results';
            state.isLoading = false;
          });
        }
      },
      
      compareBacktests: (backtestIds: any) => {
        if (!FLAGS.backtester) return;
        
        set((state: any) => {
          state.comparison.backtestIds = backtestIds;
          state.selectedTab = 'comparison';
        });
      },
      
      exportResults: async (backtestId: any, format: any) => {
        if (!FLAGS.backtester) throw new Error('Backtester not enabled');
        
        const response = await fetch(`/api/backtester/export/${backtestId}?format=${format}`);
        if (!response.ok) throw new Error('Export failed');
        
        return await response.blob();
      },
      
      // Strategy Library
      loadPublicStrategies: async () => {
        if (!FLAGS.backtester) return;
        
        try {
          const response = await fetch('/api/backtester/strategies/public');
          if (!response.ok) throw new Error('Failed to load public strategies');
          
          const publicStrategies: TradingStrategy[] = await response.json();
          
          set((state: any) => {
            // Merge with existing strategies (avoid duplicates)
            for (const strategy of publicStrategies) {
              if (!state.strategies.find((s: any) => s.id === strategy.id)) {
                state.strategies.push(strategy);
              }
            }
          });
          
        } catch (error) {
          set((state: any) => {
            state.error = error instanceof Error ? error.message : 'Failed to load public strategies';
          });
        }
      },
      
      saveToLibrary: async (strategyId: any, isPublic: any) => {
        if (!FLAGS.backtester) return;
        
        try {
          const response = await fetch(`/api/backtester/strategies/${strategyId}/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isPublic })
          });
          
          if (!response.ok) throw new Error('Failed to save to library');
          
          set((state: any) => {
            const strategy = state.strategies.find((s: any) => s.id === strategyId);
            if (strategy) {
              strategy.isPublic = isPublic;
            }
          });
          
        } catch (error) {
          set((state: any) => {
            state.error = error instanceof Error ? error.message : 'Failed to save to library';
          });
        }
      },
      
      importStrategy: async (strategyData: any) => {
        if (!FLAGS.backtester) return '';
        
        try {
          const { createStrategy } = get();
          return createStrategy({
            ...strategyData,
            name: strategyData.name || 'Imported Strategy',
            createdBy: 'imported',
            performance: undefined
          });
          
        } catch (error) {
          set((state: any) => {
            state.error = error instanceof Error ? error.message : 'Failed to import strategy';
          });
          return '';
        }
      },
      
      // Live Trading Integration
      createLiveSignals: async (strategyId: any, symbols: any) => {
        if (!FLAGS.backtester) return;
        
        try {
          const response = await fetch('/api/backtester/live-signals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ strategyId, symbols })
          });
          
          if (!response.ok) throw new Error('Failed to create live signals');
          
        } catch (error) {
          set((state: any) => {
            state.error = error instanceof Error ? error.message : 'Failed to create live signals';
          });
        }
      },
      
      // Settings
      updateDefaultConfig: (config: any) => {
        if (!FLAGS.backtester) return;
        
        set((state: any) => {
          Object.assign(state.defaultConfig, config);
        });
      },
      
      setDateRange: (start: any, end: any) => {
        if (!FLAGS.backtester) return;
        
        set((state: any) => {
          state.dateRange = { start, end };
        });
      },
      
      setSelectedSymbols: (symbols: any) => {
        if (!FLAGS.backtester) return;
        
        set((state: any) => {
          state.selectedSymbols = symbols;
        });
      },
      
      setSelectedTab: (tab: any) => {
        if (!FLAGS.backtester) return;
        
        set((state: any) => {
          state.selectedTab = tab;
        });
      }
    })),
    {
      name: 'lokifi-backtester-storage',
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          return {
            ...persistedState,
            comparison: {
              backtestIds: [],
              metrics: ['totalReturn', 'sharpeRatio', 'maxDrawdown', 'winRate']
            }
          };
        }
        return persistedState as BacktesterState & BacktesterActions;
      }
    }
  )
);

// Selectors
export const useRunningBacktests = () =>
  useBacktesterStore((state: any) => state.runningBacktests);

export const useBacktestsByStrategy = (strategyId: string) =>
  useBacktesterStore((state: any) => 
    state.backtests.filter((b: any) => b.strategyId === strategyId)
  );

export const useCompletedBacktests = () =>
  useBacktesterStore((state: any) => 
    state.backtests.filter((b: any) => b.status === 'completed' && b.results)
  );

// Performance calculation utilities
export const calculatePerformanceMetrics = (trades: BacktestTrade[]): StrategyPerformance => {
  const completedTrades = trades.filter((t: any) => t.pnl !== undefined);
  const returns = completedTrades.map((t: any) => t.pnlPercent || 0);
  
  const totalReturn = returns.reduce((sum: any, r: any) => sum + r, 0);
  const winningTrades = completedTrades.filter((t: any) => (t.pnl || 0) > 0);
  const losingTrades = completedTrades.filter((t: any) => (t.pnl || 0) < 0);
  
  const avgReturn = returns.length > 0 ? totalReturn / returns.length : 0;
  const variance = returns.reduce((sum: any, r: any) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance);
  
  return {
    totalReturn,
    annualizedReturn: totalReturn * Math.sqrt(252), // Approximate
    volatility: volatility * Math.sqrt(252),
    sharpeRatio: volatility > 0 ? (avgReturn / volatility) * Math.sqrt(252) : 0,
    sortinoRatio: 0, // Would need downside deviation calculation
    maxDrawdown: 0, // Would need equity curve calculation
    calmarRatio: 0,
    
    totalTrades: completedTrades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: completedTrades.length > 0 ? winningTrades.length / completedTrades.length : 0,
    avgWin: winningTrades.length > 0 ? winningTrades.reduce((sum: any, t: any) => sum + (t.pnl || 0), 0) / winningTrades.length : 0,
    avgLoss: losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum: any, t: any) => sum + (t.pnl || 0), 0)) / losingTrades.length : 0,
    profitFactor: 0, // Would need proper calculation
    
    var95: 0,
    expectedShortfall: 0,
    beta: 0,
    correlation: 0,
    
    avgHoldingPeriod: completedTrades.length > 0 
      ? completedTrades.reduce((sum: any, t: any) => sum + (t.holdingPeriod || 0), 0) / completedTrades.length 
      : 0,
    tradingFrequency: 0,
    
    monthlyReturns: [],
    yearlyReturns: []
  };
};

// Initialize store
if (typeof window !== 'undefined' && FLAGS.backtester) {
  const store = useBacktesterStore.getState();
  store.loadPublicStrategies();
}

