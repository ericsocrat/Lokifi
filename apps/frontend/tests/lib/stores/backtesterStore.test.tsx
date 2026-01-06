import { enableMapSet } from 'immer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Enable immer MapSet plugin BEFORE any store imports
enableMapSet();

import type {
  Backtest,
  BacktestTrade,
  StrategyCondition,
  TradingStrategy,
} from '../../../src/lib/stores/backtesterStore';
import {
  calculatePerformanceMetrics,
  useBacktesterStore,
} from '../../../src/lib/stores/backtesterStore';
import { setDevFlag } from '../../../src/lib/stores/featureFlags';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Helper to create default strategy config for tests
const createDefaultConfig = () => ({
  entryConditions: [] as StrategyCondition[],
  entryLogic: 'AND' as const,
  exitConditions: [] as StrategyCondition[],
  exitLogic: 'AND' as const,
  positionSizing: { type: 'percentage' as const, value: 2 },
  timeframe: '1d',
});

// Helper to create a complete strategy for testing
const createTestStrategy = (
  name: string,
  overrides: Partial<Omit<TradingStrategy, 'id' | 'createdAt' | 'updatedAt'>> = {}
): Omit<TradingStrategy, 'id' | 'createdAt' | 'updatedAt'> => ({
  name,
  createdBy: 'test-user',
  tags: [],
  isPublic: false,
  config: createDefaultConfig(),
  ...overrides,
});

// Helper to create mock trade
const createMockTrade = (overrides: Partial<BacktestTrade> = {}): BacktestTrade => ({
  id: 'trade-1',
  symbol: 'AAPL',
  side: 'buy',
  entryPrice: 150,
  entryTime: new Date('2023-06-01'),
  exitPrice: 160,
  exitTime: new Date('2023-06-15'),
  quantity: 10,
  pnl: 100,
  pnlPercent: 6.67,
  commission: 0.5,
  slippage: 0.1,
  entryReason: ['Price crossed above SMA'],
  exitReason: ['Take profit hit'],
  holdingPeriod: 14,
  ...overrides,
});

// Helper to create mock backtest
const createMockBacktest = (overrides: Partial<Backtest> = {}): Backtest => ({
  id: 'backtest-1',
  strategyId: 'strategy-1',
  name: 'Test Backtest',
  symbols: ['AAPL', 'GOOGL'],
  startDate: new Date('2023-01-01'),
  endDate: new Date('2023-12-31'),
  config: {
    initialCapital: 100000,
    commission: 0.001,
    slippage: 0.001,
    marginRequirement: 0.5,
    maxDrawdown: 0.2,
    maxLeverage: 1,
    maxPositions: 10,
  },
  status: 'completed',
  progress: 100,
  createdAt: new Date('2024-01-01'),
  results: undefined,
  ...overrides,
});

describe('backtesterStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();

    // Enable the feature flag
    setDevFlag('backtester', true);

    // Reset store state
    useBacktesterStore.setState({
      strategies: [],
      activeStrategy: null,
      backtests: [],
      runningBacktests: new Set<string>(),
      currentResults: null,
      comparison: {
        backtestIds: [],
        metrics: ['totalReturn', 'sharpeRatio', 'maxDrawdown', 'winRate'],
      },
      selectedSymbols: ['SPY'],
      dateRange: {
        start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
      defaultConfig: {
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.001,
        marginRequirement: 0.5,
        maxDrawdown: 0.2,
        maxLeverage: 1,
        maxPositions: 10,
      },
      isLoading: false,
      error: null,
      selectedTab: 'strategy',
    });
  });

  describe('feature flag gating', () => {
    it('should return empty string when backtester flag is disabled', () => {
      setDevFlag('backtester', false);

      const result = useBacktesterStore.getState().createStrategy(createTestStrategy('Test'));
      expect(result).toBe('');
    });

    it('should allow operations when backtester flag is enabled', () => {
      setDevFlag('backtester', true);

      const strategyId = useBacktesterStore.getState().createStrategy(createTestStrategy('Test'));
      expect(strategyId).toBeDefined();
      expect(strategyId).not.toBe('');
    });
  });

  describe('createStrategy', () => {
    it('should create a new strategy with config', () => {
      const strategyId = useBacktesterStore
        .getState()
        .createStrategy(createTestStrategy('My Strategy'));

      const state = useBacktesterStore.getState();
      expect(state.strategies).toHaveLength(1);
      expect(state.strategies[0].name).toBe('My Strategy');
      expect(state.strategies[0].id).toBe(strategyId);
      expect(state.strategies[0].config.entryConditions).toEqual([]);
      expect(state.strategies[0].config.exitConditions).toEqual([]);
      expect(state.strategies[0].config.entryLogic).toBe('AND');
      expect(state.strategies[0].config.exitLogic).toBe('AND');
    });

    it('should create strategy with custom config', () => {
      const customConfig = {
        entryConditions: [] as StrategyCondition[],
        entryLogic: 'OR' as const,
        exitConditions: [] as StrategyCondition[],
        exitLogic: 'AND' as const,
        positionSizing: { type: 'fixed' as const, value: 1000 },
        timeframe: '4h',
        stopLoss: { type: 'percentage' as const, value: 5 },
        takeProfit: { type: 'percentage' as const, value: 10 },
      };

      useBacktesterStore
        .getState()
        .createStrategy(createTestStrategy('Custom Strategy', { config: customConfig }));

      const strategy = useBacktesterStore.getState().strategies[0];
      expect(strategy.config.entryLogic).toBe('OR');
      expect(strategy.config.positionSizing.type).toBe('fixed');
      expect(strategy.config.stopLoss?.value).toBe(5);
      expect(strategy.config.takeProfit?.value).toBe(10);
    });

    it('should set strategy as active after creation', () => {
      const strategyId = useBacktesterStore
        .getState()
        .createStrategy(createTestStrategy('Active Strategy'));

      const activeStrategy = useBacktesterStore.getState().activeStrategy;
      expect(activeStrategy).not.toBeNull();
      expect(activeStrategy?.id).toBe(strategyId);
    });

    it('should create strategy with tags and description', () => {
      useBacktesterStore.getState().createStrategy(
        createTestStrategy('Tagged Strategy', {
          description: 'A strategy with tags',
          tags: ['momentum', 'swing'],
        })
      );

      const strategy = useBacktesterStore.getState().strategies[0];
      expect(strategy.description).toBe('A strategy with tags');
      expect(strategy.tags).toEqual(['momentum', 'swing']);
    });
  });

  describe('updateStrategy', () => {
    it('should update existing strategy', () => {
      const strategyId = useBacktesterStore
        .getState()
        .createStrategy(createTestStrategy('Original Name'));

      useBacktesterStore.getState().updateStrategy(strategyId, {
        name: 'Updated Name',
        description: 'New description',
      });

      const strategy = useBacktesterStore.getState().strategies[0];
      expect(strategy.name).toBe('Updated Name');
      expect(strategy.description).toBe('New description');
    });

    it('should not update non-existent strategy', () => {
      useBacktesterStore.getState().createStrategy(createTestStrategy('Test'));

      useBacktesterStore.getState().updateStrategy('non-existent', {
        name: 'Should Not Update',
      });

      const strategy = useBacktesterStore.getState().strategies[0];
      expect(strategy.name).toBe('Test');
    });
  });

  describe('deleteStrategy', () => {
    it('should delete existing strategy', () => {
      const strategyId = useBacktesterStore
        .getState()
        .createStrategy(createTestStrategy('To Delete'));

      expect(useBacktesterStore.getState().strategies).toHaveLength(1);

      useBacktesterStore.getState().deleteStrategy(strategyId);

      expect(useBacktesterStore.getState().strategies).toHaveLength(0);
    });

    it('should clear activeStrategy if deleted strategy was active', () => {
      const strategyId = useBacktesterStore.getState().createStrategy(createTestStrategy('Active'));

      expect(useBacktesterStore.getState().activeStrategy?.id).toBe(strategyId);

      useBacktesterStore.getState().deleteStrategy(strategyId);

      expect(useBacktesterStore.getState().activeStrategy).toBeNull();
    });

    it('should preserve remaining strategies when different strategy deleted', () => {
      const strategy1Id = useBacktesterStore
        .getState()
        .createStrategy(createTestStrategy('Strategy 1'));
      const strategy2Id = useBacktesterStore
        .getState()
        .createStrategy(createTestStrategy('Strategy 2'));

      // Strategy 2 is now active (most recently created)
      expect(useBacktesterStore.getState().activeStrategy?.id).toBe(strategy2Id);
      expect(useBacktesterStore.getState().strategies).toHaveLength(2);

      useBacktesterStore.getState().deleteStrategy(strategy1Id);

      // Remaining strategy should be strategy 2
      const state = useBacktesterStore.getState();
      expect(state.strategies).toHaveLength(1);
      expect(state.strategies[0].id).toBe(strategy2Id);
      expect(state.strategies[0].name).toBe('Strategy 2');
    });
  });

  describe('duplicateStrategy', () => {
    it('should duplicate existing strategy with new name', async () => {
      const originalId = useBacktesterStore.getState().createStrategy(
        createTestStrategy('Original', {
          description: 'Original description',
          tags: ['test'],
        })
      );

      // Small delay to ensure Date.now() returns different value for duplicate ID
      await new Promise((resolve) => setTimeout(resolve, 5));

      const duplicateId = useBacktesterStore.getState().duplicateStrategy(originalId, 'Copy');

      const strategies = useBacktesterStore.getState().strategies;
      expect(strategies).toHaveLength(2);

      // Verify the duplicate has different ID and correct name
      expect(duplicateId).not.toBe(originalId);
      expect(duplicateId).toBeTruthy();

      // Find strategies by checking their names
      const original = strategies.find((s) => s.name === 'Original');
      const duplicate = strategies.find((s) => s.name === 'Copy');

      expect(original).toBeDefined();
      expect(duplicate).toBeDefined();
      expect(original?.id).toBe(originalId);
      expect(duplicate?.id).toBe(duplicateId);
      expect(duplicate?.description).toBe('Original description');
      expect(duplicate?.tags).toEqual(['test']);
    });

    it('should return empty string for non-existent strategy', () => {
      const result = useBacktesterStore.getState().duplicateStrategy('non-existent', 'Copy');
      expect(result).toBe('');
    });

    it('should set duplicated strategy as active', () => {
      const originalId = useBacktesterStore
        .getState()
        .createStrategy(createTestStrategy('Original'));

      const duplicateId = useBacktesterStore.getState().duplicateStrategy(originalId, 'Copy');

      expect(useBacktesterStore.getState().activeStrategy?.id).toBe(duplicateId);
    });
  });

  describe('setActiveStrategy', () => {
    it('should set active strategy', () => {
      const strategy1Id = useBacktesterStore
        .getState()
        .createStrategy(createTestStrategy('Strategy 1'));
      useBacktesterStore.getState().createStrategy(createTestStrategy('Strategy 2'));

      const strategy1 = useBacktesterStore.getState().strategies.find((s) => s.id === strategy1Id);
      useBacktesterStore.getState().setActiveStrategy(strategy1!);

      expect(useBacktesterStore.getState().activeStrategy?.id).toBe(strategy1Id);
    });

    it('should allow setting null as active strategy', () => {
      useBacktesterStore.getState().createStrategy(createTestStrategy('Test'));

      useBacktesterStore.getState().setActiveStrategy(null);

      expect(useBacktesterStore.getState().activeStrategy).toBeNull();
    });
  });

  describe('addCondition', () => {
    it('should add entry condition to strategy', () => {
      const strategyId = useBacktesterStore.getState().createStrategy(createTestStrategy('Test'));

      // Note: addCondition expects Omit<StrategyCondition, 'id'> - id is auto-generated
      const condition = {
        type: 'price' as const,
        indicator: 'close',
        comparison: 'above' as const,
        value: 100,
      };

      useBacktesterStore.getState().addCondition(strategyId, 'entry', condition);

      const strategy = useBacktesterStore.getState().strategies[0];
      expect(strategy.config.entryConditions).toHaveLength(1);
      expect(strategy.config.entryConditions[0].type).toBe('price');
      expect(strategy.config.entryConditions[0].indicator).toBe('close');
      expect(strategy.config.entryConditions[0].comparison).toBe('above');
      expect(strategy.config.entryConditions[0].value).toBe(100);
      // ID is auto-generated
      expect(strategy.config.entryConditions[0].id).toMatch(/^condition_\d+$/);
    });

    it('should add exit condition to strategy', () => {
      const strategyId = useBacktesterStore.getState().createStrategy(createTestStrategy('Test'));

      const condition = {
        type: 'indicator' as const,
        indicator: 'RSI',
        comparison: 'above' as const,
        value: 70,
        params: { period: 14 },
      };

      useBacktesterStore.getState().addCondition(strategyId, 'exit', condition);

      const strategy = useBacktesterStore.getState().strategies[0];
      expect(strategy.config.exitConditions).toHaveLength(1);
      expect(strategy.config.exitConditions[0].type).toBe('indicator');
      expect(strategy.config.exitConditions[0].indicator).toBe('RSI');
      expect(strategy.config.exitConditions[0].params?.period).toBe(14);
    });

    it('should add multiple conditions', () => {
      const strategyId = useBacktesterStore.getState().createStrategy(createTestStrategy('Test'));

      useBacktesterStore.getState().addCondition(strategyId, 'entry', {
        type: 'price',
        indicator: 'close',
        comparison: 'above',
        value: 100,
      });

      useBacktesterStore.getState().addCondition(strategyId, 'entry', {
        type: 'indicator',
        indicator: 'SMA',
        comparison: 'crossAbove',
        value: 0,
        params: { period: 20 },
      });

      const strategy = useBacktesterStore.getState().strategies[0];
      expect(strategy.config.entryConditions).toHaveLength(2);
    });
  });

  describe('updateCondition', () => {
    it('should update entry condition by its auto-generated ID', () => {
      const strategyId = useBacktesterStore.getState().createStrategy(createTestStrategy('Test'));

      useBacktesterStore.getState().addCondition(strategyId, 'entry', {
        type: 'price',
        indicator: 'close',
        comparison: 'above',
        value: 100,
      });

      // Get the auto-generated condition ID
      const conditionId = useBacktesterStore.getState().strategies[0].config.entryConditions[0].id;

      useBacktesterStore.getState().updateCondition(strategyId, 'entry', conditionId, {
        value: 150,
        comparison: 'below',
      });

      const strategy = useBacktesterStore.getState().strategies[0];
      expect(strategy.config.entryConditions[0].value).toBe(150);
      expect(strategy.config.entryConditions[0].comparison).toBe('below');
    });

    it('should not update non-existent condition', () => {
      const strategyId = useBacktesterStore.getState().createStrategy(createTestStrategy('Test'));

      useBacktesterStore.getState().addCondition(strategyId, 'entry', {
        type: 'price',
        indicator: 'close',
        comparison: 'above',
        value: 100,
      });

      useBacktesterStore.getState().updateCondition(strategyId, 'entry', 'non-existent', {
        value: 200,
      });

      const strategy = useBacktesterStore.getState().strategies[0];
      expect(strategy.config.entryConditions[0].value).toBe(100);
    });
  });

  describe('removeCondition', () => {
    it('should remove entry condition by its auto-generated ID', () => {
      const strategyId = useBacktesterStore.getState().createStrategy(createTestStrategy('Test'));

      useBacktesterStore.getState().addCondition(strategyId, 'entry', {
        type: 'price',
        indicator: 'close',
        comparison: 'above',
        value: 100,
      });

      expect(useBacktesterStore.getState().strategies[0].config.entryConditions).toHaveLength(1);

      // Get the auto-generated condition ID
      const conditionId = useBacktesterStore.getState().strategies[0].config.entryConditions[0].id;

      useBacktesterStore.getState().removeCondition(strategyId, 'entry', conditionId);

      expect(useBacktesterStore.getState().strategies[0].config.entryConditions).toHaveLength(0);
    });

    it('should only remove specified condition', () => {
      const strategyId = useBacktesterStore.getState().createStrategy(createTestStrategy('Test'));

      useBacktesterStore.getState().addCondition(strategyId, 'entry', {
        type: 'price',
        indicator: 'close',
        comparison: 'above',
        value: 100,
      });

      useBacktesterStore.getState().addCondition(strategyId, 'entry', {
        type: 'indicator',
        indicator: 'SMA',
        comparison: 'crossAbove',
        value: 0,
      });

      // Get the first condition's ID
      const firstConditionId =
        useBacktesterStore.getState().strategies[0].config.entryConditions[0].id;

      useBacktesterStore.getState().removeCondition(strategyId, 'entry', firstConditionId);

      const conditions = useBacktesterStore.getState().strategies[0].config.entryConditions;
      expect(conditions).toHaveLength(1);
      expect(conditions[0].type).toBe('indicator');
    });
  });

  describe('stopBacktest', () => {
    it('should update backtest status to cancelled', async () => {
      useBacktesterStore.setState({
        backtests: [createMockBacktest({ id: 'backtest-123', status: 'running' })],
        runningBacktests: new Set(['backtest-123']),
      });

      mockFetch.mockResolvedValueOnce({ ok: true });

      await useBacktesterStore.getState().stopBacktest('backtest-123');

      const backtest = useBacktesterStore.getState().backtests[0];
      expect(backtest.status).toBe('cancelled');
      expect(useBacktesterStore.getState().runningBacktests.has('backtest-123')).toBe(false);
    });

    it('should remove backtest from runningBacktests set', async () => {
      useBacktesterStore.setState({
        backtests: [
          createMockBacktest({ id: 'backtest-1', status: 'running' }),
          createMockBacktest({ id: 'backtest-2', status: 'running' }),
        ],
        runningBacktests: new Set(['backtest-1', 'backtest-2']),
      });

      mockFetch.mockResolvedValueOnce({ ok: true });

      await useBacktesterStore.getState().stopBacktest('backtest-1');

      expect(useBacktesterStore.getState().runningBacktests.has('backtest-1')).toBe(false);
      expect(useBacktesterStore.getState().runningBacktests.has('backtest-2')).toBe(true);
    });
  });

  describe('deleteBacktest', () => {
    it('should remove backtest from state', () => {
      useBacktesterStore.setState({
        backtests: [
          createMockBacktest({ id: 'backtest-1' }),
          createMockBacktest({ id: 'backtest-2' }),
        ],
      });

      useBacktesterStore.getState().deleteBacktest('backtest-1');

      const backtests = useBacktesterStore.getState().backtests;
      expect(backtests).toHaveLength(1);
      expect(backtests[0].id).toBe('backtest-2');
    });

    it('should handle deleting non-existent backtest gracefully', () => {
      useBacktesterStore.setState({
        backtests: [createMockBacktest({ id: 'backtest-1' })],
      });

      // Should not throw
      useBacktesterStore.getState().deleteBacktest('non-existent');

      expect(useBacktesterStore.getState().backtests).toHaveLength(1);
    });
  });

  describe('compareBacktests', () => {
    it('should set backtestIds for comparison', () => {
      useBacktesterStore.getState().compareBacktests(['backtest-1', 'backtest-2']);

      expect(useBacktesterStore.getState().comparison.backtestIds).toEqual([
        'backtest-1',
        'backtest-2',
      ]);
    });

    it('should switch to comparison tab', () => {
      useBacktesterStore.getState().compareBacktests(['backtest-1']);

      expect(useBacktesterStore.getState().selectedTab).toBe('comparison');
    });
  });

  describe('updateDefaultConfig', () => {
    it('should update default config', () => {
      useBacktesterStore.getState().updateDefaultConfig({
        initialCapital: 50000,
        commission: 0.002,
      });

      const config = useBacktesterStore.getState().defaultConfig;
      expect(config.initialCapital).toBe(50000);
      expect(config.commission).toBe(0.002);
      // Original values preserved
      expect(config.slippage).toBe(0.001);
      expect(config.marginRequirement).toBe(0.5);
    });

    it('should do nothing when feature flag disabled', () => {
      setDevFlag('backtester', false);

      useBacktesterStore.getState().updateDefaultConfig({
        initialCapital: 50000,
      });

      // Default value should remain unchanged
      expect(useBacktesterStore.getState().defaultConfig.initialCapital).toBe(100000);
    });
  });

  describe('setDateRange', () => {
    it('should set date range', () => {
      const start = new Date('2023-01-01');
      const end = new Date('2023-12-31');

      useBacktesterStore.getState().setDateRange(start, end);

      const dateRange = useBacktesterStore.getState().dateRange;
      expect(dateRange.start).toEqual(start);
      expect(dateRange.end).toEqual(end);
    });

    it('should do nothing when feature flag disabled', () => {
      setDevFlag('backtester', false);

      const originalRange = { ...useBacktesterStore.getState().dateRange };

      useBacktesterStore.getState().setDateRange(new Date('2020-01-01'), new Date('2020-12-31'));

      expect(useBacktesterStore.getState().dateRange.start.getTime()).toBe(
        originalRange.start.getTime()
      );
    });
  });

  describe('setSelectedSymbols', () => {
    it('should set selected symbols', () => {
      useBacktesterStore.getState().setSelectedSymbols(['AAPL', 'GOOGL', 'MSFT']);

      expect(useBacktesterStore.getState().selectedSymbols).toEqual(['AAPL', 'GOOGL', 'MSFT']);
    });

    it('should replace existing symbols', () => {
      useBacktesterStore.setState({ selectedSymbols: ['OLD'] });

      useBacktesterStore.getState().setSelectedSymbols(['NEW']);

      expect(useBacktesterStore.getState().selectedSymbols).toEqual(['NEW']);
    });
  });

  describe('setSelectedTab', () => {
    it('should set selected tab', () => {
      useBacktesterStore.getState().setSelectedTab('results');

      expect(useBacktesterStore.getState().selectedTab).toBe('results');
    });

    it('should allow all valid tabs', () => {
      const tabs: Array<'strategy' | 'backtest' | 'results' | 'comparison'> = [
        'strategy',
        'backtest',
        'results',
        'comparison',
      ];

      for (const tab of tabs) {
        useBacktesterStore.getState().setSelectedTab(tab);
        expect(useBacktesterStore.getState().selectedTab).toBe(tab);
      }
    });
  });

  describe('calculatePerformanceMetrics', () => {
    it('should calculate metrics from trades', () => {
      const trades: BacktestTrade[] = [
        createMockTrade({ pnl: 100, pnlPercent: 10, holdingPeriod: 5 }),
        createMockTrade({ id: 'trade-2', pnl: -50, pnlPercent: -5, holdingPeriod: 3 }),
        createMockTrade({ id: 'trade-3', pnl: 75, pnlPercent: 7.5, holdingPeriod: 7 }),
        createMockTrade({ id: 'trade-4', pnl: 25, pnlPercent: 2.5, holdingPeriod: 2 }),
      ];

      const metrics = calculatePerformanceMetrics(trades);

      expect(metrics.totalTrades).toBe(4);
      expect(metrics.winningTrades).toBe(3);
      expect(metrics.losingTrades).toBe(1);
      expect(metrics.winRate).toBe(0.75);
      expect(metrics.totalReturn).toBe(15); // 10 - 5 + 7.5 + 2.5
      expect(metrics.avgHoldingPeriod).toBe(4.25); // (5+3+7+2)/4
    });

    it('should handle empty trades array', () => {
      const metrics = calculatePerformanceMetrics([]);

      expect(metrics.totalTrades).toBe(0);
      expect(metrics.winningTrades).toBe(0);
      expect(metrics.losingTrades).toBe(0);
      expect(metrics.winRate).toBe(0);
      expect(metrics.totalReturn).toBe(0);
    });

    it('should handle trades without pnl', () => {
      const trades: BacktestTrade[] = [
        createMockTrade({ pnl: undefined, pnlPercent: undefined }),
        createMockTrade({ id: 'trade-2', pnl: 100, pnlPercent: 10 }),
      ];

      const metrics = calculatePerformanceMetrics(trades);

      expect(metrics.totalTrades).toBe(1); // Only completed trade counted
    });

    it('should calculate average win and loss correctly', () => {
      const trades: BacktestTrade[] = [
        createMockTrade({ pnl: 100 }),
        createMockTrade({ id: 'trade-2', pnl: 200 }),
        createMockTrade({ id: 'trade-3', pnl: -50 }),
        createMockTrade({ id: 'trade-4', pnl: -100 }),
      ];

      const metrics = calculatePerformanceMetrics(trades);

      expect(metrics.avgWin).toBe(150); // (100+200)/2
      expect(metrics.avgLoss).toBe(75); // (50+100)/2 absolute
    });

    it('should calculate volatility', () => {
      const trades: BacktestTrade[] = [
        createMockTrade({ pnlPercent: 10 }),
        createMockTrade({ id: 'trade-2', pnlPercent: -5 }),
        createMockTrade({ id: 'trade-3', pnlPercent: 15 }),
        createMockTrade({ id: 'trade-4', pnlPercent: -10 }),
      ];

      const metrics = calculatePerformanceMetrics(trades);

      expect(metrics.volatility).toBeGreaterThan(0);
    });
  });

  describe('selectors', () => {
    it('should return running backtests', () => {
      useBacktesterStore.setState({
        runningBacktests: new Set(['backtest-1', 'backtest-2']),
      });

      const running = useBacktesterStore.getState().runningBacktests;
      expect(running.has('backtest-1')).toBe(true);
      expect(running.has('backtest-2')).toBe(true);
      expect(running.size).toBe(2);
    });

    it('should filter backtests by strategy', () => {
      useBacktesterStore.setState({
        backtests: [
          createMockBacktest({ id: 'bt-1', strategyId: 'strategy-1' }),
          createMockBacktest({ id: 'bt-2', strategyId: 'strategy-2' }),
          createMockBacktest({ id: 'bt-3', strategyId: 'strategy-1' }),
        ],
      });

      const backtests = useBacktesterStore
        .getState()
        .backtests.filter((b) => b.strategyId === 'strategy-1');
      expect(backtests).toHaveLength(2);
      expect(backtests.map((b) => b.id)).toEqual(['bt-1', 'bt-3']);
    });
  });

  describe('edge cases', () => {
    it('should handle concurrent strategy operations', () => {
      const id1 = useBacktesterStore.getState().createStrategy(createTestStrategy('Strategy 1'));
      const id2 = useBacktesterStore.getState().createStrategy(createTestStrategy('Strategy 2'));
      const id3 = useBacktesterStore.getState().createStrategy(createTestStrategy('Strategy 3'));

      expect(useBacktesterStore.getState().strategies).toHaveLength(3);

      useBacktesterStore.getState().deleteStrategy(id2);
      useBacktesterStore.getState().updateStrategy(id1, { name: 'Updated 1' });
      useBacktesterStore.getState().duplicateStrategy(id3, 'Duplicate');

      expect(useBacktesterStore.getState().strategies).toHaveLength(3); // 1 deleted, 1 duplicated
    });

    it('should handle empty symbols array for backtest', async () => {
      const strategyId = useBacktesterStore.getState().createStrategy(createTestStrategy('Test'));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ backtestId: 'bt-empty' }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'completed',
            progress: 100,
          }),
      });

      const backtestId = await useBacktesterStore.getState().runBacktest(strategyId, []);

      expect(backtestId).toBeDefined();
    });

    it('should preserve strategy order', () => {
      useBacktesterStore.getState().createStrategy(createTestStrategy('1'));
      useBacktesterStore.getState().createStrategy(createTestStrategy('2'));
      useBacktesterStore.getState().createStrategy(createTestStrategy('3'));

      const names = useBacktesterStore.getState().strategies.map((s) => s.name);
      expect(names).toEqual(['1', '2', '3']);
    });
  });
});
