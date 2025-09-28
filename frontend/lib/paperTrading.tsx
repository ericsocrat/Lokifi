import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { FLAGS } from './featureFlags';

// Paper Trading Types
export interface PaperAccount {
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
  
  // Account Balance
  balance: AccountBalance;
  
  // Account Settings
  settings: AccountSettings;
  
  // Performance Tracking
  performance: AccountPerformance;
  
  // Status
  isActive: boolean;
  isDefault: boolean;
}

export interface AccountBalance {
  cash: number;
  totalValue: number;
  availableMargin: number;
  usedMargin: number;
  dayPnL: number;
  totalPnL: number;
  
  // Historical balance tracking
  balanceHistory: BalanceHistoryEntry[];
}

export interface BalanceHistoryEntry {
  timestamp: Date;
  cash: number;
  totalValue: number;
  dayPnL: number;
  totalPnL: number;
}

export interface AccountSettings {
  initialBalance: number;
  
  // Risk Management
  maxLossPerDay: number;
  maxLossPerTrade: number;
  maxPositions: number;
  maxLeverage: number;
  
  // Trading Costs
  commissionRate: number;
  slippageRate: number;
  
  // Reset Settings
  autoResetDaily: boolean;
  autoResetWeekly: boolean;
  autoResetMonthly: boolean;
}

export interface AccountPerformance {
  // Returns
  totalReturn: number;
  dailyReturn: number;
  weeklyReturn: number;
  monthlyReturn: number;
  
  // Risk Metrics
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  
  // Trade Statistics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  
  // Time Metrics
  avgHoldingTime: number; // hours
  tradingDays: number;
  
  // Streaks
  currentStreak: number;
  longestWinStreak: number;
  longestLossStreak: number;
}

export interface PaperPosition {
  id: string;
  accountId: string;
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  
  // Position Details
  entryTime: Date;
  entryReason?: string;
  stopLoss?: number;
  takeProfit?: number;
  
  // Risk Metrics
  riskAmount: number;
  maxFavorableExcursion: number;
  maxAdverseExcursion: number;
  
  // Dividends (for long positions)
  dividendsReceived: number;
  
  // Margin (for leveraged positions)
  marginUsed: number;
  leverage: number;
}

export interface PaperTrade {
  id: string;
  accountId: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  quantity: number;
  
  // Price Information
  requestedPrice?: number; // For limit orders
  executedPrice: number;
  
  // Timing
  placedAt: Date;
  executedAt: Date;
  
  // Trade Result
  pnl?: number; // Only for closing trades
  pnlPercent?: number;
  commission: number;
  slippage: number;
  
  // Context
  reason?: string;
  strategyId?: string;
  
  // Status
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  
  // Related Orders
  parentOrderId?: string; // For bracket orders
  childOrderIds?: string[]; // Stop loss, take profit orders
  
  // Order Details
  timeInForce: 'day' | 'gtc' | 'ioc' | 'fok';
  fillOrKill?: boolean;
}

export interface PaperOrder {
  id: string;
  accountId: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  quantity: number;
  
  // Price Information
  limitPrice?: number;
  stopPrice?: number;
  
  // Timing
  placedAt: Date;
  expiresAt?: Date;
  
  // Status
  status: 'pending' | 'partially_filled' | 'filled' | 'cancelled' | 'rejected';
  filledQuantity: number;
  avgFillPrice: number;
  
  // Execution Details
  fills: OrderFill[];
  
  // Context
  reason?: string;
  strategyId?: string;
  
  // Advanced Order Types
  timeInForce: 'day' | 'gtc' | 'ioc' | 'fok';
  trailAmount?: number; // For trailing stops
  trailPercent?: number;
  
  // Risk Management
  maxSlippage?: number;
  
  // Related Orders (bracket orders)
  parentOrderId?: string;
  childOrderIds?: string[];
}

export interface OrderFill {
  id: string;
  timestamp: Date;
  quantity: number;
  price: number;
  commission: number;
  slippage: number;
}

export interface TradingChallenge {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  
  // Challenge Parameters
  rules: {
    initialBalance: number;
    maxDrawdown: number;
    targetReturn: number;
    maxTrades?: number;
    allowedSymbols?: string[];
    forbiddenSymbols?: string[];
    maxLeverage: number;
  };
  
  // Participant Tracking
  participants: string[]; // Account IDs
  leaderboard: ChallengeEntry[];
  
  // Status
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  
  // Rewards
  prizes: ChallengePrize[];
}

export interface ChallengeEntry {
  accountId: string;
  userId: string;
  username: string;
  
  // Performance
  currentReturn: number;
  currentBalance: number;
  maxDrawdown: number;
  sharpeRatio: number;
  
  // Ranking
  rank: number;
  previousRank?: number;
  
  // Disqualification
  isDisqualified: boolean;
  disqualificationReason?: string;
}

export interface ChallengePrize {
  rank: number;
  type: 'cash' | 'credits' | 'subscription' | 'badge';
  value: number;
  description: string;
}

// Store State
interface PaperTradingState {
  // Accounts
  accounts: PaperAccount[];
  activeAccountId: string | null;
  
  // Positions & Orders
  positions: PaperPosition[];
  orders: PaperOrder[];
  trades: PaperTrade[];
  
  // Market Data (simulated)
  marketPrices: Map<string, number>;
  lastPriceUpdate: Date | null;
  
  // Challenges
  activeChallenges: TradingChallenge[];
  participatingChallenges: string[];
  
  // UI State
  selectedSymbol: string | null;
  selectedPosition: PaperPosition | null;
  orderFormVisible: boolean;
  
  // Settings
  globalSettings: {
    enableRealTimeData: boolean;
    enableNotifications: boolean;
    autoExecuteOrders: boolean;
    soundEffects: boolean;
  };
  
  // Loading States
  isLoading: boolean;
  isExecutingOrder: boolean;
  error: string | null;
}

// Store Actions
interface PaperTradingActions {
  // Account Management
  createAccount: (name: string, settings: AccountSettings) => string;
  updateAccount: (accountId: string, updates: Partial<PaperAccount>) => void;
  deleteAccount: (accountId: string) => void;
  setActiveAccount: (accountId: string) => void;
  resetAccount: (accountId: string) => void;
  
  // Trading Operations
  placeOrder: (order: Omit<PaperOrder, 'id' | 'placedAt' | 'status' | 'filledQuantity' | 'avgFillPrice' | 'fills'>) => Promise<string>;
  cancelOrder: (orderId: string) => Promise<void>;
  modifyOrder: (orderId: string, updates: Partial<PaperOrder>) => Promise<void>;
  
  // Position Management
  closePosition: (positionId: string, reason?: string) => Promise<void>;
  updateStopLoss: (positionId: string, stopLoss: number) => void;
  updateTakeProfit: (positionId: string, takeProfit: number) => void;
  
  // Market Data
  updateMarketPrice: (symbol: string, price: number) => void;
  subscribeToSymbol: (symbol: string) => void;
  unsubscribeFromSymbol: (symbol: string) => void;
  
  // Portfolio Analysis
  calculatePerformance: (accountId: string) => AccountPerformance;
  getPositionsBySymbol: (symbol: string) => PaperPosition[];
  getTradeHistory: (accountId: string, limit?: number) => PaperTrade[];
  
  // Challenges
  joinChallenge: (challengeId: string) => Promise<void>;
  leaveChallenge: (challengeId: string) => Promise<void>;
  loadActiveChallenges: () => Promise<void>;
  
  // Copy Trading Integration
  followTrader: (traderId: string, copySettings: any) => Promise<void>;
  unfollowTrader: (traderId: string) => Promise<void>;
  
  // Risk Management
  checkRiskLimits: (accountId: string, order: Partial<PaperOrder>) => boolean;
  liquidateAccount: (accountId: string, reason: string) => Promise<void>;
  
  // Data Management
  loadAccountData: (accountId: string) => Promise<void>;
  exportTrades: (accountId: string, format: 'csv' | 'json') => Promise<Blob>;
  
  // UI State
  setSelectedSymbol: (symbol: string | null) => void;
  setSelectedPosition: (position: PaperPosition | null) => void;
  setOrderFormVisible: (visible: boolean) => void;
  
  // Settings
  updateGlobalSettings: (settings: Partial<PaperTradingState['globalSettings']>) => void;
  
  // Helper Methods
  updatePositionFromOrder: (order: PaperOrder, fill: OrderFill) => void;
}

// Create Store
export const usePaperTradingStore = create<PaperTradingState & PaperTradingActions>()(
  persist(
    immer<PaperTradingState & PaperTradingActions>((set, get) => ({
      // Initial State
      accounts: [],
      activeAccountId: null,
      positions: [],
      orders: [],
      trades: [],
      marketPrices: new Map(),
      lastPriceUpdate: null,
      activeChallenges: [],
      participatingChallenges: [],
      selectedSymbol: null,
      selectedPosition: null,
      orderFormVisible: false,
      globalSettings: {
        enableRealTimeData: true,
        enableNotifications: true,
        autoExecuteOrders: true,
        soundEffects: false
      },
      isLoading: false,
      isExecutingOrder: false,
      error: null,
      
      // Account Management
      createAccount: (name, settings) => {
        if (!FLAGS.paperTrading) return '';
        
        const accountId = `paper_account_${Date.now()}`;
        const now = new Date();
        
        const initialBalance: AccountBalance = {
          cash: settings.initialBalance,
          totalValue: settings.initialBalance,
          availableMargin: settings.initialBalance * settings.maxLeverage,
          usedMargin: 0,
          dayPnL: 0,
          totalPnL: 0,
          balanceHistory: [{
            timestamp: now,
            cash: settings.initialBalance,
            totalValue: settings.initialBalance,
            dayPnL: 0,
            totalPnL: 0
          }]
        };
        
        const initialPerformance: AccountPerformance = {
          totalReturn: 0,
          dailyReturn: 0,
          weeklyReturn: 0,      
          monthlyReturn: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          volatility: 0,
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          avgWin: 0,
          avgLoss: 0,
          profitFactor: 0,
          avgHoldingTime: 0,
          tradingDays: 1,
          currentStreak: 0,
          longestWinStreak: 0,
          longestLossStreak: 0
        };
        
        const account: PaperAccount = {
          id: accountId,
          name,
          userId: 'current_user', // TODO: Get from auth context
          createdAt: now,
          balance: initialBalance,
          settings,
          performance: initialPerformance,
          isActive: true,
          isDefault: get().accounts.length === 0
        };
        
        set((state) => {
          state.accounts.push(account);
          
          if (!state.activeAccountId) {
            state.activeAccountId = accountId;
          }
        });
        
        return accountId;
      },
      
      updateAccount: (accountId, updates) => {
        if (!FLAGS.paperTrading) return;
        
        set((state) => {
          const account = state.accounts.find(a => a.id === accountId);
          if (account) {
            Object.assign(account, updates);
          }
        });
      },
      
      deleteAccount: (accountId) => {
        if (!FLAGS.paperTrading) return;
        
        set((state) => {
          const index = state.accounts.findIndex(a => a.id === accountId);
          if (index !== -1) {
            state.accounts.splice(index, 1);
          }
          
          // Remove related data
          state.positions = state.positions.filter(p => p.accountId !== accountId);
          state.orders = state.orders.filter(o => o.accountId !== accountId);
          state.trades = state.trades.filter(t => t.accountId !== accountId);
          
          // Set new active account
          if (state.activeAccountId === accountId) {
            state.activeAccountId = state.accounts[0]?.id || null;
          }
        });
      },
      
      setActiveAccount: (accountId) => {
        if (!FLAGS.paperTrading) return;
        
        set((state) => {
          if (state.accounts.find(a => a.id === accountId)) {
            state.activeAccountId = accountId;
          }
        });
      },
      
      resetAccount: (accountId) => {
        if (!FLAGS.paperTrading) return;
        
        set((state) => {
          const account = state.accounts.find(a => a.id === accountId);
          if (account) {
            // Reset balance
            account.balance.cash = account.settings.initialBalance;
            account.balance.totalValue = account.settings.initialBalance;
            account.balance.availableMargin = account.settings.initialBalance * account.settings.maxLeverage;
            account.balance.usedMargin = 0;
            account.balance.dayPnL = 0;
            account.balance.totalPnL = 0;
            
            // Reset performance
            account.performance = {
              totalReturn: 0,
              dailyReturn: 0,
              weeklyReturn: 0,
              monthlyReturn: 0,
              sharpeRatio: 0,
              maxDrawdown: 0,
              volatility: 0,
              totalTrades: 0,
              winningTrades: 0,
              losingTrades: 0,
              winRate: 0,
              avgWin: 0,
              avgLoss: 0,
              profitFactor: 0,
              avgHoldingTime: 0,
              tradingDays: 1,
              currentStreak: 0,
              longestWinStreak: 0,
              longestLossStreak: 0
            };
            
            // Clear positions, orders, trades
            state.positions = state.positions.filter(p => p.accountId !== accountId);
            state.orders = state.orders.filter(o => o.accountId !== accountId);
            state.trades = state.trades.filter(t => t.accountId !== accountId);
          }
        });
      },
      
      // Trading Operations
      placeOrder: async (orderData) => {
        if (!FLAGS.paperTrading || !get().activeAccountId) {
          throw new Error('Paper trading not available');
        }
        
        const orderId = `order_${Date.now()}`;
        const now = new Date();
        const { activeAccountId } = get();
        
        const order: PaperOrder = {
          ...orderData,
          id: orderId,
          accountId: activeAccountId!,
          placedAt: now,
          status: 'pending',
          filledQuantity: 0,
          avgFillPrice: 0,
          fills: []
        };
        
        // Risk check
        if (!get().checkRiskLimits(activeAccountId!, order)) {
          throw new Error('Order violates risk limits');
        }
        
        set((state) => {
          state.orders.push(order);
          state.isExecutingOrder = true;
          state.error = null;
        });
        
        try {
          // Simulate order execution
          await simulateOrderExecution(order);
          
          set((state) => {
            const orderToUpdate = state.orders.find(o => o.id === orderId);
            if (orderToUpdate) {
              orderToUpdate.status = 'filled';
              orderToUpdate.filledQuantity = orderToUpdate.quantity;
              
              // Get current market price
              const currentPrice = state.marketPrices.get(orderToUpdate.symbol) || orderToUpdate.limitPrice || 100;
              
              // Add slippage for market orders
              let executionPrice = currentPrice;
              if (orderToUpdate.type === 'market') {
                const slippage = currentPrice * 0.001; // 0.1% slippage
                executionPrice = orderToUpdate.side === 'buy' 
                  ? currentPrice + slippage 
                  : currentPrice - slippage;
              } else {
                executionPrice = orderToUpdate.limitPrice || currentPrice;
              }
              
              orderToUpdate.avgFillPrice = executionPrice;
              
              // Create fill
              const fill: OrderFill = {
                id: `fill_${Date.now()}`,
                timestamp: new Date(),
                quantity: orderToUpdate.quantity,
                price: executionPrice,
                commission: orderToUpdate.quantity * executionPrice * 0.001, // 0.1% commission
                slippage: Math.abs(executionPrice - currentPrice)
              };
              
              orderToUpdate.fills = [fill];
              
              // Update position or create new one
              get().updatePositionFromOrder(orderToUpdate, fill);
            }
            
            state.isExecutingOrder = false;
          });
          
          return orderId;
          
        } catch (error) {
          set((state) => {
            const orderToUpdate = state.orders.find(o => o.id === orderId);
            if (orderToUpdate) {
              orderToUpdate.status = 'rejected';
            }
            
            state.error = error instanceof Error ? error.message : 'Order execution failed';
            state.isExecutingOrder = false;
          });
          
          throw error;
        }
      },
      
      cancelOrder: async (orderId) => {
        if (!FLAGS.paperTrading) return;
        
        set((state) => {
          const order = state.orders.find(o => o.id === orderId);
          if (order && order.status === 'pending') {
            order.status = 'cancelled';
          }
        });
      },
      
      modifyOrder: async (orderId, updates) => {
        if (!FLAGS.paperTrading) return;
        
        set((state) => {
          const order = state.orders.find(o => o.id === orderId);
          if (order && order.status === 'pending') {
            Object.assign(order, updates);
          }
        });
      },
      
      // Position Management
      closePosition: async (positionId, reason) => {
        if (!FLAGS.paperTrading) return;
        
        const position = get().positions.find(p => p.id === positionId);
        if (!position) return;
        
        // Create closing order
        const closingOrder: Omit<PaperOrder, 'id' | 'placedAt' | 'status' | 'filledQuantity' | 'avgFillPrice' | 'fills'> = {
          accountId: position.accountId,
          symbol: position.symbol,
          side: position.side === 'long' ? 'sell' : 'buy',
          type: 'market',
          quantity: position.quantity,
          reason: reason || 'Manual close',
          timeInForce: 'day'
        };
        
        await get().placeOrder(closingOrder);
      },
      
      updateStopLoss: (positionId, stopLoss) => {
        if (!FLAGS.paperTrading) return;
        
        set((state) => {
          const position = state.positions.find(p => p.id === positionId);
          if (position) {
            position.stopLoss = stopLoss;
          }
        });
      },
      
      updateTakeProfit: (positionId, takeProfit) => {
        if (!FLAGS.paperTrading) return;
        
        set((state) => {
          const position = state.positions.find(p => p.id === positionId);
          if (position) {
            position.takeProfit = takeProfit;
          }
        });
      },
      
      // Market Data
      updateMarketPrice: (symbol, price) => {
        if (!FLAGS.paperTrading) return;
        
        set((state) => {
          state.marketPrices.set(symbol, price);
          state.lastPriceUpdate = new Date();
          
          // Update position values
          state.positions.forEach(position => {
            if (position.symbol === symbol) {
              position.currentPrice = price;
              position.marketValue = position.quantity * price;
              
              if (position.side === 'long') {
                position.unrealizedPnL = (price - position.avgEntryPrice) * position.quantity;
              } else {
                position.unrealizedPnL = (position.avgEntryPrice - price) * position.quantity;
              }
              
              position.unrealizedPnLPercent = position.avgEntryPrice > 0 
                ? (position.unrealizedPnL / (position.avgEntryPrice * position.quantity)) * 100 
                : 0;
              
              // Update max favorable/adverse excursion
              if (position.unrealizedPnL > position.maxFavorableExcursion) {
                position.maxFavorableExcursion = position.unrealizedPnL;
              }
              if (position.unrealizedPnL < -Math.abs(position.maxAdverseExcursion)) {
                position.maxAdverseExcursion = Math.abs(position.unrealizedPnL);
              }
            }
          });
          
          // Update account values
          state.accounts.forEach(account => {
            const accountPositions = state.positions.filter(p => p.accountId === account.id);
            const positionsValue = accountPositions.reduce((sum, p) => sum + p.marketValue, 0);
            const unrealizedPnL = accountPositions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
            
            account.balance.totalValue = account.balance.cash + positionsValue;
            // Note: dayPnL would need to be calculated differently with proper time tracking
          });
        });
      },
      
      subscribeToSymbol: (symbol) => {
        if (!FLAGS.paperTrading) return;
        
        // In a real implementation, this would subscribe to real-time data
        // For paper trading, we might generate random price movements
        console.log(`Subscribing to ${symbol} price updates`);
      },
      
      unsubscribeFromSymbol: (symbol) => {
        if (!FLAGS.paperTrading) return;
        
        console.log(`Unsubscribing from ${symbol} price updates`);
      },
      
      // Portfolio Analysis
      calculatePerformance: (accountId) => {
        const { accounts, trades } = get();
        const account = accounts.find(a => a.id === accountId);
        
        if (!account) {
          throw new Error('Account not found');
        }
        
        const accountTrades = trades.filter(t => t.accountId === accountId && t.pnl !== undefined);
        
        const totalPnL = accountTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalReturn = account.settings.initialBalance > 0 
          ? (totalPnL / account.settings.initialBalance) * 100 
          : 0;
        
        const winningTrades = accountTrades.filter(t => (t.pnl || 0) > 0);
        const losingTrades = accountTrades.filter(t => (t.pnl || 0) < 0);
        
        const performance: AccountPerformance = {
          totalReturn,
          dailyReturn: 0, // Would need proper time-series calculation
          weeklyReturn: 0,
          monthlyReturn: 0,
          sharpeRatio: 0, // Would need return volatility calculation
          maxDrawdown: 0, // Would need equity curve analysis
          volatility: 0,
          totalTrades: accountTrades.length,
          winningTrades: winningTrades.length,
          losingTrades: losingTrades.length,
          winRate: accountTrades.length > 0 ? winningTrades.length / accountTrades.length : 0,
          avgWin: winningTrades.length > 0 
            ? winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades.length 
            : 0,
          avgLoss: losingTrades.length > 0 
            ? Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)) / losingTrades.length 
            : 0,
          profitFactor: 0, // Would need proper calculation
          avgHoldingTime: 0, // Would need trade duration analysis
          tradingDays: Math.max(1, Math.floor((Date.now() - account.createdAt.getTime()) / (1000 * 60 * 60 * 24))),
          currentStreak: 0, // Would need streak calculation
          longestWinStreak: 0,
          longestLossStreak: 0
        };
        
        // Update account performance
        set((state) => {
          const accountToUpdate = state.accounts.find(a => a.id === accountId);
          if (accountToUpdate) {
            accountToUpdate.performance = performance;
          }
        });
        
        return performance;
      },
      
      getPositionsBySymbol: (symbol) => {
        const { positions } = get();
        return positions.filter(p => p.symbol === symbol);
      },
      
      getTradeHistory: (accountId, limit = 100) => {
        const { trades } = get();
        return trades
          .filter(t => t.accountId === accountId)
          .sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime())
          .slice(0, limit);
      },
      
      // Challenges
      joinChallenge: async (challengeId) => {
        if (!FLAGS.paperTrading) return;
        
        try {
          const response = await fetch(`/api/paper-trading/challenges/${challengeId}/join`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
          });
          
          if (!response.ok) throw new Error('Failed to join challenge');
          
          set((state) => {
            if (!state.participatingChallenges.includes(challengeId)) {
              state.participatingChallenges.push(challengeId);
            }
          });
          
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to join challenge';
          });
        }
      },
      
      leaveChallenge: async (challengeId) => {
        if (!FLAGS.paperTrading) return;
        
        try {
          const response = await fetch(`/api/paper-trading/challenges/${challengeId}/leave`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
          });
          
          if (!response.ok) throw new Error('Failed to leave challenge');
          
          set((state) => {
            state.participatingChallenges = state.participatingChallenges.filter(id => id !== challengeId);
          });
          
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to leave challenge';
          });
        }
      },
      
      loadActiveChallenges: async () => {
        if (!FLAGS.paperTrading) return;
        
        try {
          const response = await fetch('/api/paper-trading/challenges/active');
          if (!response.ok) throw new Error('Failed to load challenges');
          
          const challenges: TradingChallenge[] = await response.json();
          
          set((state) => {
            state.activeChallenges = challenges;
          });
          
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to load challenges';
          });
        }
      },
      
      // Copy Trading Integration
      followTrader: async (traderId, copySettings) => {
        if (!FLAGS.paperTrading) return;
        
        // This would integrate with the social trading system
        console.log(`Following trader ${traderId} with settings:`, copySettings);
      },
      
      unfollowTrader: async (traderId) => {
        if (!FLAGS.paperTrading) return;
        
        console.log(`Unfollowing trader ${traderId}`);
      },
      
      // Risk Management
      checkRiskLimits: (accountId, order) => {
        const { accounts, positions } = get();
        const account = accounts.find(a => a.id === accountId);
        
        if (!account) return false;
        
        // Check position count limit
        const currentPositions = positions.filter(p => p.accountId === accountId);
        if (currentPositions.length >= account.settings.maxPositions) {
          return false;
        }
        
        // Check available cash
        const orderValue = (order.quantity || 0) * (order.limitPrice || 0);
        if (orderValue > account.balance.cash) {
          return false;
        }
        
        // Check max loss per trade
        if (account.settings.maxLossPerTrade > 0) {
          const riskAmount = orderValue * 0.02; // Assume 2% risk per trade
          if (riskAmount > account.settings.maxLossPerTrade) {
            return false;
          }
        }
        
        return true;
      },
      
      liquidateAccount: async (accountId, reason) => {
        if (!FLAGS.paperTrading) return;
        
        const { positions } = get();
        const accountPositions = positions.filter(p => p.accountId === accountId);
        
        // Close all positions
        for (const position of accountPositions) {
          await get().closePosition(position.id, `Liquidation: ${reason}`);
        }
        
        // Cancel all pending orders
        const { orders } = get();
        const pendingOrders = orders.filter(o => o.accountId === accountId && o.status === 'pending');
        
        for (const order of pendingOrders) {
          await get().cancelOrder(order.id);
        }
      },
      
      // Data Management
      loadAccountData: async (accountId) => {
        if (!FLAGS.paperTrading) return;
        
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });
        
        try {
          // Load account data from API
          const response = await fetch(`/api/paper-trading/accounts/${accountId}`);
          if (!response.ok) throw new Error('Failed to load account data');
          
          const accountData = await response.json();
          
          set((state) => {
            const accountIndex = state.accounts.findIndex(a => a.id === accountId);
            if (accountIndex !== -1) {
              state.accounts[accountIndex] = accountData.account;
            }
            
            // Update positions, orders, trades
            state.positions = [...state.positions.filter(p => p.accountId !== accountId), ...accountData.positions];
            state.orders = [...state.orders.filter(o => o.accountId !== accountId), ...accountData.orders];
            state.trades = [...state.trades.filter(t => t.accountId !== accountId), ...accountData.trades];
            
            state.isLoading = false;
          });
          
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to load account data';
            state.isLoading = false;
          });
        }
      },
      
      exportTrades: async (accountId, format) => {
        if (!FLAGS.paperTrading) throw new Error('Paper trading not enabled');
        
        const response = await fetch(`/api/paper-trading/accounts/${accountId}/export?format=${format}`);
        if (!response.ok) throw new Error('Export failed');
        
        return await response.blob();
      },
      
      // UI State
      setSelectedSymbol: (symbol) => {
        if (!FLAGS.paperTrading) return;
        
        set((state) => {
          state.selectedSymbol = symbol;
        });
      },
      
      setSelectedPosition: (position) => {
        if (!FLAGS.paperTrading) return;
        
        set((state) => {
          state.selectedPosition = position;
        });
      },
      
      setOrderFormVisible: (visible) => {
        if (!FLAGS.paperTrading) return;
        
        set((state) => {
          state.orderFormVisible = visible;
        });
      },
      
      // Settings
      updateGlobalSettings: (settings) => {
        if (!FLAGS.paperTrading) return;
        
        set((state) => {
          Object.assign(state.globalSettings, settings);
        });
      },
      
      // Helper method to update positions from order fills
      updatePositionFromOrder: (order: PaperOrder, fill: OrderFill) => {
        set((state) => {
          const existingPosition = state.positions.find(p => 
            p.accountId === order.accountId && 
            p.symbol === order.symbol
          );
          
          if (existingPosition) {
            // Update existing position
            if ((order.side === 'buy' && existingPosition.side === 'long') ||
                (order.side === 'sell' && existingPosition.side === 'short')) {
              // Adding to position
              const totalQuantity = existingPosition.quantity + fill.quantity;
              const totalCost = (existingPosition.avgEntryPrice * existingPosition.quantity) + 
                              (fill.price * fill.quantity);
              
              existingPosition.quantity = totalQuantity;
              existingPosition.avgEntryPrice = totalCost / totalQuantity;
              existingPosition.marketValue = totalQuantity * fill.price;
            } else {
              // Reducing or closing position
              if (fill.quantity >= existingPosition.quantity) {
                // Position closed or reversed
                const remainingQuantity = fill.quantity - existingPosition.quantity;
                
                // Create trade record for closed portion
                const closedTrade: PaperTrade = {
                  id: `trade_${Date.now()}`,
                  accountId: order.accountId,
                  symbol: order.symbol,
                  side: order.side,
                  type: order.type,
                  quantity: existingPosition.quantity,
                  requestedPrice: order.limitPrice,
                  executedPrice: fill.price,
                  placedAt: order.placedAt,
                  executedAt: fill.timestamp,
                  pnl: existingPosition.side === 'long' 
                    ? (fill.price - existingPosition.avgEntryPrice) * existingPosition.quantity
                    : (existingPosition.avgEntryPrice - fill.price) * existingPosition.quantity,
                  pnlPercent: 0, // Calculate based on pnl
                  commission: fill.commission,
                  slippage: fill.slippage,
                  reason: order.reason,
                  strategyId: order.strategyId,
                  status: 'filled',
                  timeInForce: order.timeInForce
                };
                
                closedTrade.pnlPercent = closedTrade.pnl && existingPosition.avgEntryPrice > 0
                  ? (closedTrade.pnl / (existingPosition.avgEntryPrice * existingPosition.quantity)) * 100
                  : 0;
                
                state.trades.push(closedTrade);
                
                if (remainingQuantity > 0) {
                  // Reverse position
                  existingPosition.side = existingPosition.side === 'long' ? 'short' : 'long';
                  existingPosition.quantity = remainingQuantity;
                  existingPosition.avgEntryPrice = fill.price;
                  existingPosition.entryTime = fill.timestamp;
                } else {
                  // Remove position
                  const positionIndex = state.positions.findIndex(p => p.id === existingPosition.id);
                  if (positionIndex !== -1) {
                    state.positions.splice(positionIndex, 1);
                  }
                }
              } else {
                // Partial close
                existingPosition.quantity -= fill.quantity;
                
                // Create trade record for closed portion
                const partialTrade: PaperTrade = {
                  id: `trade_${Date.now()}`,
                  accountId: order.accountId,
                  symbol: order.symbol,
                  side: order.side,
                  type: order.type,
                  quantity: fill.quantity,
                  requestedPrice: order.limitPrice,
                  executedPrice: fill.price,
                  placedAt: order.placedAt,
                  executedAt: fill.timestamp,
                  pnl: existingPosition.side === 'long' 
                    ? (fill.price - existingPosition.avgEntryPrice) * fill.quantity
                    : (existingPosition.avgEntryPrice - fill.price) * fill.quantity,
                  pnlPercent: 0,
                  commission: fill.commission,
                  slippage: fill.slippage,
                  reason: order.reason,
                  strategyId: order.strategyId,
                  status: 'filled',
                  timeInForce: order.timeInForce
                };
                
                partialTrade.pnlPercent = partialTrade.pnl && existingPosition.avgEntryPrice > 0
                  ? (partialTrade.pnl / (existingPosition.avgEntryPrice * fill.quantity)) * 100
                  : 0;
                
                state.trades.push(partialTrade);
              }
            }
          } else {
            // Create new position
            const positionId = `position_${Date.now()}`;
            const side = order.side === 'buy' ? 'long' : 'short';
            
            const newPosition: PaperPosition = {
              id: positionId,
              accountId: order.accountId,
              symbol: order.symbol,
              side,
              quantity: fill.quantity,
              avgEntryPrice: fill.price,
              currentPrice: fill.price,
              marketValue: fill.quantity * fill.price,
              unrealizedPnL: 0,
              unrealizedPnLPercent: 0,
              entryTime: fill.timestamp,
              entryReason: order.reason,
              riskAmount: 0, // Would calculate based on stop loss
              maxFavorableExcursion: 0,
              maxAdverseExcursion: 0,
              dividendsReceived: 0,
              marginUsed: 0,
              leverage: 1
            };
            
            state.positions.push(newPosition);
          }
          
          // Update account cash balance
          const account = state.accounts.find(a => a.id === order.accountId);
          if (account) {
            const orderValue = fill.quantity * fill.price;
            const totalCost = orderValue + fill.commission;
            
            if (order.side === 'buy') {
              account.balance.cash -= totalCost;
            } else {
              account.balance.cash += orderValue - fill.commission;
            }
          }
        });
      }
    })),
    {
      name: 'fynix-paper-trading-storage',
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          return {
            ...persistedState,
            marketPrices: new Map(),
            activeChallenges: [],
            participatingChallenges: []
          };
        }
        return persistedState as PaperTradingState & PaperTradingActions;
      }
    }
  )
);

// Helper Functions
async function simulateOrderExecution(order: PaperOrder): Promise<void> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
  
  // Simulate occasional order rejection (5% chance)
  if (Math.random() < 0.05) {
    throw new Error('Order rejected by market');
  }
}

// Selectors
export const useActiveAccount = () =>
  usePaperTradingStore((state) => 
    state.accounts.find(a => a.id === state.activeAccountId)
  );

export const useAccountPositions = (accountId?: string) =>
  usePaperTradingStore((state) => {
    const targetAccountId = accountId || state.activeAccountId;
    return targetAccountId 
      ? state.positions.filter(p => p.accountId === targetAccountId)
      : [];
  });

export const useAccountOrders = (accountId?: string) =>
  usePaperTradingStore((state) => {
    const targetAccountId = accountId || state.activeAccountId;
    return targetAccountId 
      ? state.orders.filter(o => o.accountId === targetAccountId)
      : [];
  });

export const usePendingOrders = (accountId?: string) =>
  usePaperTradingStore((state) => {
    const targetAccountId = accountId || state.activeAccountId;
    return targetAccountId 
      ? state.orders.filter(o => o.accountId === targetAccountId && o.status === 'pending')
      : [];
  });

export const useAccountTotalValue = (accountId?: string) =>
  usePaperTradingStore((state) => {
    const targetAccountId = accountId || state.activeAccountId;
    const account = state.accounts.find(a => a.id === targetAccountId);
    return account?.balance.totalValue || 0;
  });

// Initialize store with default account
if (typeof window !== 'undefined' && FLAGS.paperTrading) {
  const store = usePaperTradingStore.getState();
  if (store.accounts.length === 0) {
    const defaultSettings: AccountSettings = {
      initialBalance: 100000,
      maxLossPerDay: 5000,
      maxLossPerTrade: 1000,
      maxPositions: 10,
      maxLeverage: 1,
      commissionRate: 0.001,
      slippageRate: 0.0005,
      autoResetDaily: false,
      autoResetWeekly: false,
      autoResetMonthly: false
    };
    
    store.createAccount('Demo Account', defaultSettings);
  }
}