/**
 * @vitest-environment jsdom
 */
import type {
  BacktestTrade,
  StrategyCondition,
  TradingStrategy,
} from '@/lib/stores/backtesterStore';
import { calculatePerformanceMetrics, useBacktesterStore } from '@/lib/stores/backtesterStore';
import { enableMapSet } from 'immer';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '../../mocks/server';

// Enable Immer's MapSet plugin for Set operations (runningBacktests)
enableMapSet();

// Mock feature flags with backtester enabled
vi.mock('@/lib/utils/featureFlags', () => ({
  FLAGS: {
    backtester: true,
    monitoring: false,
  },
}));

// Mock global fetch for API calls using vi.stubGlobal for proper interception
const mockFetch = vi.fn();

// Disable MSW for this test file to use direct fetch mocking
beforeAll(() => {
  server.close(); // Close MSW server to allow direct fetch mocking
  vi.stubGlobal('fetch', mockFetch);
});

afterAll(() => {
  // Restore MSW server for other tests (if needed)
  server.listen({ onUnhandledRequest: 'warn' });
});

describe('BacktesterStore', () => {
  beforeEach(() => {
    // Reset fetch mock with comprehensive default response
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
      blob: async () => new Blob([''], { type: 'text/plain' }),
    });

    // Reset store before each test
    const store = useBacktesterStore.getState();
    // Clear strategies
    for (const strategy of [...store.strategies]) {
      store.deleteStrategy(strategy.id);
    }
    // Reset other state
    store.setActiveStrategy(null);
    store.setSelectedSymbols(['SPY']);
    store.setSelectedTab('strategy');

    // Clear any error state from initialization
    useBacktesterStore.setState({ error: null });
  });

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const state = useBacktesterStore.getState();

      expect(state.strategies).toEqual([]);
      expect(state.activeStrategy).toBeNull();
      expect(state.backtests).toEqual([]);
      expect(state.selectedTab).toBe('strategy');
      expect(state.selectedSymbols).toEqual(['SPY']);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should have default config values', () => {
      const { defaultConfig } = useBacktesterStore.getState();

      expect(defaultConfig.initialCapital).toBe(100000);
      expect(defaultConfig.commissionRate).toBe(0.001);
      expect(defaultConfig.slippageRate).toBe(0.0005);
      expect(defaultConfig.marketImpact).toBe(false);
      expect(defaultConfig.latencyMs).toBe(100);
      expect(defaultConfig.maxDrawdown).toBe(20);
      expect(defaultConfig.maxLeverage).toBe(1);
      expect(defaultConfig.maxPositions).toBe(10);
    });

    it('should have date range defaulting to 1 year ago to now', () => {
      const { dateRange } = useBacktesterStore.getState();
      const now = new Date();
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

      // Check within a day tolerance
      expect(dateRange.end.getFullYear()).toBe(now.getFullYear());
      expect(dateRange.start.getFullYear()).toBe(oneYearAgo.getFullYear());
    });
  });

  describe('Strategy Management', () => {
    const createTestStrategy = () => ({
      name: 'Test Strategy',
      description: 'A test trading strategy',
      createdBy: 'test-user',
      tags: ['test', 'momentum'],
      isPublic: false,
      config: {
        entryConditions: [],
        entryLogic: 'AND' as const,
        exitConditions: [],
        exitLogic: 'AND' as const,
        positionSizing: { type: 'percentage' as const, value: 2 },
        timeframe: '1d',
      },
    });

    it('should create a new strategy', () => {
      const { createStrategy } = useBacktesterStore.getState();
      const strategyData = createTestStrategy();

      const id = createStrategy(strategyData);

      const { strategies, activeStrategy } = useBacktesterStore.getState();

      expect(id).toMatch(/^strategy_\d+$/);
      expect(strategies).toHaveLength(1);
      expect(strategies[0].name).toBe('Test Strategy');
      expect(strategies[0].description).toBe('A test trading strategy');
      expect(strategies[0].tags).toEqual(['test', 'momentum']);
      expect(strategies[0].config.positionSizing.type).toBe('percentage');
      expect(activeStrategy).not.toBeNull();
      expect(activeStrategy?.id).toBe(id);
    });

    it('should set createdAt and updatedAt on create', () => {
      const { createStrategy } = useBacktesterStore.getState();
      const beforeCreate = new Date();

      const id = createStrategy(createTestStrategy());

      const { strategies } = useBacktesterStore.getState();
      const strategy = strategies.find((s: TradingStrategy) => s.id === id);

      expect(strategy?.createdAt).toBeInstanceOf(Date);
      expect(strategy?.updatedAt).toBeInstanceOf(Date);
      expect(strategy?.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    });

    it('should update an existing strategy', () => {
      const { createStrategy, updateStrategy } = useBacktesterStore.getState();
      const id = createStrategy(createTestStrategy());

      // Wait a bit to ensure updatedAt changes
      const beforeUpdate = new Date();

      updateStrategy(id, {
        name: 'Updated Strategy',
        description: 'Updated description',
        tags: ['updated', 'test'],
      });

      const { strategies } = useBacktesterStore.getState();
      const strategy = strategies.find((s: TradingStrategy) => s.id === id);

      expect(strategy?.name).toBe('Updated Strategy');
      expect(strategy?.description).toBe('Updated description');
      expect(strategy?.tags).toEqual(['updated', 'test']);
      expect(strategy?.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });

    it('should update active strategy when editing current active', () => {
      const { createStrategy, updateStrategy } = useBacktesterStore.getState();
      const id = createStrategy(createTestStrategy());

      updateStrategy(id, { name: 'Updated Active Strategy' });

      const { activeStrategy } = useBacktesterStore.getState();
      expect(activeStrategy?.name).toBe('Updated Active Strategy');
    });

    it('should delete a strategy', () => {
      const { createStrategy, deleteStrategy } = useBacktesterStore.getState();
      const id = createStrategy(createTestStrategy());

      expect(useBacktesterStore.getState().strategies).toHaveLength(1);

      deleteStrategy(id);

      const { strategies, activeStrategy } = useBacktesterStore.getState();
      expect(strategies).toHaveLength(0);
      expect(activeStrategy).toBeNull();
    });

    it('should duplicate a strategy with new name', async () => {
      const { createStrategy, duplicateStrategy } = useBacktesterStore.getState();
      const originalId = createStrategy(createTestStrategy());

      // Small delay to ensure different timestamp for ID
      await new Promise((resolve) => setTimeout(resolve, 10));

      const duplicateId = duplicateStrategy(originalId, 'Duplicate Strategy');

      const { strategies } = useBacktesterStore.getState();
      expect(strategies).toHaveLength(2);

      const original = strategies.find((s: TradingStrategy) => s.id === originalId);
      const duplicate = strategies.find((s: TradingStrategy) => s.id === duplicateId);

      expect(original?.name).toBe('Test Strategy');
      // Duplicate should have a different ID
      expect(duplicateId).not.toBe(originalId);
      // Duplicate should have the new name
      expect(duplicate?.name).toBe('Duplicate Strategy');
      // Config should be the same
      expect(duplicate?.config.positionSizing).toEqual(original?.config.positionSizing);
      expect(duplicate?.performance).toBeUndefined();
    });

    it('should return empty string when duplicating non-existent strategy', () => {
      const { duplicateStrategy } = useBacktesterStore.getState();

      const result = duplicateStrategy('non-existent-id', 'New Name');

      expect(result).toBe('');
    });

    it('should set active strategy', () => {
      const { createStrategy, setActiveStrategy } = useBacktesterStore.getState();
      const id = createStrategy(createTestStrategy());

      // Create another strategy
      const id2 = createStrategy({
        ...createTestStrategy(),
        name: 'Second Strategy',
      });

      const { strategies } = useBacktesterStore.getState();
      const firstStrategy = strategies.find((s: TradingStrategy) => s.id === id);
      const secondStrategy = strategies.find((s: TradingStrategy) => s.id === id2);

      // Manually set to first
      setActiveStrategy(firstStrategy!);
      expect(useBacktesterStore.getState().activeStrategy?.id).toBe(id);

      // Switch to second
      setActiveStrategy(secondStrategy!);
      expect(useBacktesterStore.getState().activeStrategy?.id).toBe(id2);

      // Clear active
      setActiveStrategy(null);
      expect(useBacktesterStore.getState().activeStrategy).toBeNull();
    });
  });

  describe('Strategy Conditions', () => {
    const createTestStrategy = () => ({
      name: 'Condition Test Strategy',
      description: 'Strategy for testing conditions',
      createdBy: 'test-user',
      tags: [],
      isPublic: false,
      config: {
        entryConditions: [] as StrategyCondition[],
        entryLogic: 'AND' as const,
        exitConditions: [] as StrategyCondition[],
        exitLogic: 'AND' as const,
        positionSizing: { type: 'percentage' as const, value: 2 },
        timeframe: '1d',
      },
    });

    it('should add entry condition to strategy', () => {
      const { createStrategy, addCondition } = useBacktesterStore.getState();
      const strategyId = createStrategy(createTestStrategy());

      const condition: Omit<StrategyCondition, 'id'> = {
        type: 'indicator',
        indicatorType: 'rsi',
        indicatorPeriod: 14,
        indicatorOperator: 'below',
        indicatorValue: 30,
      };

      addCondition(strategyId, 'entry', condition);

      const { strategies } = useBacktesterStore.getState();
      const strategy = strategies.find((s: TradingStrategy) => s.id === strategyId);

      expect(strategy?.config.entryConditions).toHaveLength(1);
      expect(strategy?.config.entryConditions[0].type).toBe('indicator');
      expect(strategy?.config.entryConditions[0].indicatorType).toBe('rsi');
      expect(strategy?.config.entryConditions[0].id).toMatch(/^condition_\d+$/);
    });

    it('should add exit condition to strategy', () => {
      const { createStrategy, addCondition } = useBacktesterStore.getState();
      const strategyId = createStrategy(createTestStrategy());

      const condition: Omit<StrategyCondition, 'id'> = {
        type: 'price',
        priceType: 'close',
        priceOperator: 'crosses_above',
        priceReference: 'ema',
        priceValue: 50,
      };

      addCondition(strategyId, 'exit', condition);

      const { strategies } = useBacktesterStore.getState();
      const strategy = strategies.find((s: TradingStrategy) => s.id === strategyId);

      expect(strategy?.config.exitConditions).toHaveLength(1);
      expect(strategy?.config.exitConditions[0].type).toBe('price');
      expect(strategy?.config.exitConditions[0].priceOperator).toBe('crosses_above');
    });

    it('should update an existing condition', () => {
      const { createStrategy, addCondition, updateCondition } = useBacktesterStore.getState();
      const strategyId = createStrategy(createTestStrategy());

      addCondition(strategyId, 'entry', {
        type: 'indicator',
        indicatorType: 'rsi',
        indicatorPeriod: 14,
        indicatorOperator: 'below',
        indicatorValue: 30,
      });

      const { strategies } = useBacktesterStore.getState();
      const conditionId = strategies.find((s: TradingStrategy) => s.id === strategyId)?.config
        .entryConditions[0].id;

      updateCondition(strategyId, 'entry', conditionId!, {
        indicatorValue: 25,
        indicatorPeriod: 21,
      });

      const updatedStrategy = useBacktesterStore
        .getState()
        .strategies.find((s: TradingStrategy) => s.id === strategyId);
      expect(updatedStrategy?.config.entryConditions[0].indicatorValue).toBe(25);
      expect(updatedStrategy?.config.entryConditions[0].indicatorPeriod).toBe(21);
    });

    it('should remove a condition from strategy', () => {
      const { createStrategy, addCondition, removeCondition } = useBacktesterStore.getState();
      const strategyId = createStrategy(createTestStrategy());

      // Add two conditions
      addCondition(strategyId, 'entry', { type: 'indicator', indicatorType: 'rsi' });
      addCondition(strategyId, 'entry', { type: 'volume', volumeOperator: 'spike' });

      let strategy = useBacktesterStore
        .getState()
        .strategies.find((s: TradingStrategy) => s.id === strategyId);
      expect(strategy?.config.entryConditions).toHaveLength(2);

      const conditionToRemove = strategy?.config.entryConditions[0].id;
      removeCondition(strategyId, 'entry', conditionToRemove!);

      strategy = useBacktesterStore
        .getState()
        .strategies.find((s: TradingStrategy) => s.id === strategyId);
      expect(strategy?.config.entryConditions).toHaveLength(1);
      expect(strategy?.config.entryConditions[0].type).toBe('volume');
    });

    it('should add volume condition type', () => {
      const { createStrategy, addCondition } = useBacktesterStore.getState();
      const strategyId = createStrategy(createTestStrategy());

      addCondition(strategyId, 'entry', {
        type: 'volume',
        volumeOperator: 'spike',
        volumeValue: 200,
      });

      const { strategies } = useBacktesterStore.getState();
      const strategy = strategies.find((s: TradingStrategy) => s.id === strategyId);
      expect(strategy?.config.entryConditions[0].type).toBe('volume');
      expect(strategy?.config.entryConditions[0].volumeOperator).toBe('spike');
    });

    it('should add pattern condition type', () => {
      const { createStrategy, addCondition } = useBacktesterStore.getState();
      const strategyId = createStrategy(createTestStrategy());

      addCondition(strategyId, 'entry', {
        type: 'pattern',
        patternType: 'double_bottom',
      });

      const { strategies } = useBacktesterStore.getState();
      const strategy = strategies.find((s: TradingStrategy) => s.id === strategyId);
      expect(strategy?.config.entryConditions[0].type).toBe('pattern');
      expect(strategy?.config.entryConditions[0].patternType).toBe('double_bottom');
    });

    it('should handle addCondition to non-existent strategy', () => {
      const { addCondition } = useBacktesterStore.getState();

      // Should not throw
      expect(() => addCondition('non-existent', 'entry', { type: 'indicator' })).not.toThrow();
    });

    it('should handle updateCondition on non-existent strategy', () => {
      const { updateCondition } = useBacktesterStore.getState();

      // Should not throw
      expect(() =>
        updateCondition('non-existent', 'entry', 'cond_1', { indicatorValue: 50 })
      ).not.toThrow();
    });

    it('should handle removeCondition from non-existent strategy', () => {
      const { removeCondition } = useBacktesterStore.getState();

      // Should not throw
      expect(() => removeCondition('non-existent', 'entry', 'cond_1')).not.toThrow();
    });
  });

  describe('UI State Management', () => {
    it('should set selected symbols', () => {
      const { setSelectedSymbols } = useBacktesterStore.getState();

      setSelectedSymbols(['AAPL', 'GOOGL', 'MSFT']);

      expect(useBacktesterStore.getState().selectedSymbols).toEqual(['AAPL', 'GOOGL', 'MSFT']);
    });

    it('should set selected tab', () => {
      const { setSelectedTab } = useBacktesterStore.getState();

      setSelectedTab('results');
      expect(useBacktesterStore.getState().selectedTab).toBe('results');

      setSelectedTab('comparison');
      expect(useBacktesterStore.getState().selectedTab).toBe('comparison');

      setSelectedTab('strategy');
      expect(useBacktesterStore.getState().selectedTab).toBe('strategy');
    });

    it('should handle all tab values', () => {
      const { setSelectedTab } = useBacktesterStore.getState();
      const tabs = ['strategy', 'results', 'comparison', 'library'] as const;

      for (const tab of tabs) {
        setSelectedTab(tab);
        expect(useBacktesterStore.getState().selectedTab).toBe(tab);
      }
    });

    it('should set date range', () => {
      const { setDateRange } = useBacktesterStore.getState();
      const start = new Date('2023-01-01');
      const end = new Date('2023-12-31');

      setDateRange(start, end);

      const { dateRange } = useBacktesterStore.getState();
      expect(dateRange.start).toEqual(start);
      expect(dateRange.end).toEqual(end);
    });

    it('should handle date range at boundaries', () => {
      const { setDateRange } = useBacktesterStore.getState();
      const farPast = new Date('2000-01-01');
      const farFuture = new Date('2050-12-31');

      setDateRange(farPast, farFuture);

      const { dateRange } = useBacktesterStore.getState();
      expect(dateRange.start).toEqual(farPast);
      expect(dateRange.end).toEqual(farFuture);
    });

    it('should update default config', () => {
      const { updateDefaultConfig } = useBacktesterStore.getState();

      updateDefaultConfig({
        initialCapital: 50000,
        commissionRate: 0.002,
        maxPositions: 5,
      });

      const { defaultConfig } = useBacktesterStore.getState();
      expect(defaultConfig.initialCapital).toBe(50000);
      expect(defaultConfig.commissionRate).toBe(0.002);
      expect(defaultConfig.maxPositions).toBe(5);
      // Others should remain default
      expect(defaultConfig.slippageRate).toBe(0.0005);
    });

    it('should preserve other config values when updating partial config', () => {
      const { updateDefaultConfig, defaultConfig: initialConfig } = useBacktesterStore.getState();

      updateDefaultConfig({ initialCapital: 25000 });

      const { defaultConfig } = useBacktesterStore.getState();
      expect(defaultConfig.initialCapital).toBe(25000);
      expect(defaultConfig.commissionRate).toBe(initialConfig.commissionRate);
      expect(defaultConfig.slippageRate).toBe(initialConfig.slippageRate);
      expect(defaultConfig.maxDrawdown).toBe(initialConfig.maxDrawdown);
    });

    it('should handle empty symbols array', () => {
      const { setSelectedSymbols } = useBacktesterStore.getState();

      setSelectedSymbols([]);

      const { selectedSymbols } = useBacktesterStore.getState();
      expect(selectedSymbols).toEqual([]);
    });

    it('should handle many symbols', () => {
      const { setSelectedSymbols } = useBacktesterStore.getState();
      const manySymbols = [
        'AAPL',
        'GOOGL',
        'MSFT',
        'AMZN',
        'META',
        'NVDA',
        'TSLA',
        'BRK.B',
        'JPM',
        'JNJ',
      ];

      setSelectedSymbols(manySymbols);

      const { selectedSymbols } = useBacktesterStore.getState();
      expect(selectedSymbols).toEqual(manySymbols);
      expect(selectedSymbols.length).toBe(10);
    });
  });

  describe('Backtest Management', () => {
    it('should have stopBacktest as a function', () => {
      const { stopBacktest } = useBacktesterStore.getState();
      expect(typeof stopBacktest).toBe('function');
    });

    it('should have deleteBacktest as a function', () => {
      const { deleteBacktest } = useBacktesterStore.getState();
      expect(typeof deleteBacktest).toBe('function');
    });

    it('should have runBacktest as a function', () => {
      const { runBacktest } = useBacktesterStore.getState();
      expect(typeof runBacktest).toBe('function');
    });

    it('should create backtest even for non-existent strategy (strategyId is just a reference)', async () => {
      // The store doesn't validate if a strategy exists - it just uses the strategyId as a reference
      const { runBacktest } = useBacktesterStore.getState();

      const result = await runBacktest('non-existent-strategy', ['AAPL']);

      // Should return a backtest ID (the store creates the backtest regardless)
      expect(result).toMatch(/^backtest_\d+$/);

      // Verify backtest was created
      const { backtests } = useBacktesterStore.getState();
      expect(backtests.some((b) => b.id === result)).toBe(true);
    });

    it('should not throw when stopping non-existent backtest', () => {
      const { stopBacktest } = useBacktesterStore.getState();

      expect(() => stopBacktest('non-existent-backtest')).not.toThrow();
    });

    it('should not throw when deleting non-existent backtest', () => {
      const { deleteBacktest } = useBacktesterStore.getState();

      expect(() => deleteBacktest('non-existent-backtest')).not.toThrow();
    });
  });

  describe('Comparison Features', () => {
    it('should compare backtests', () => {
      const { compareBacktests } = useBacktesterStore.getState();

      compareBacktests(['backtest_1', 'backtest_2', 'backtest_3']);

      const { comparison, selectedTab } = useBacktesterStore.getState();
      expect(comparison.backtestIds).toEqual(['backtest_1', 'backtest_2', 'backtest_3']);
      expect(selectedTab).toBe('comparison');
    });
  });

  describe('Results Analysis', () => {
    it('should have loadBacktestResults as a function', () => {
      const { loadBacktestResults } = useBacktesterStore.getState();
      expect(typeof loadBacktestResults).toBe('function');
    });

    it('should set error state on load failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const { loadBacktestResults } = useBacktesterStore.getState();
      await loadBacktestResults('non-existent-backtest');

      const { error, isLoading } = useBacktesterStore.getState();
      expect(error).toBe('Failed to load results');
      expect(isLoading).toBe(false);
    });
  });

  describe('Export Results', () => {
    it('should have exportResults as a function', () => {
      const { exportResults } = useBacktesterStore.getState();
      expect(typeof exportResults).toBe('function');
    });

    it('should throw error when export fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { exportResults } = useBacktesterStore.getState();

      await expect(exportResults('backtest_123', 'csv')).rejects.toThrow('Export failed');
    });

    it('should return blob when export succeeds', async () => {
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const { exportResults } = useBacktesterStore.getState();
      const result = await exportResults('backtest_123', 'csv');

      expect(result).toBeInstanceOf(Blob);
    });

    it('should call correct URL for JSON format', async () => {
      const mockBlob = new Blob(['{"data": []}'], { type: 'application/json' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const { exportResults } = useBacktesterStore.getState();
      await exportResults('backtest_456', 'json');

      expect(mockFetch).toHaveBeenCalledWith('/api/backtester/export/backtest_456?format=json');
    });

    it('should call correct URL for PDF format', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const { exportResults } = useBacktesterStore.getState();
      await exportResults('backtest_789', 'pdf');

      expect(mockFetch).toHaveBeenCalledWith('/api/backtester/export/backtest_789?format=pdf');
    });
  });

  describe('Strategy Library', () => {
    const createTestStrategy = () => ({
      name: 'Library Test Strategy',
      description: 'For library tests',
      createdBy: 'test-user',
      tags: [],
      isPublic: false,
      config: {
        entryConditions: [],
        entryLogic: 'AND' as const,
        exitConditions: [],
        exitLogic: 'AND' as const,
        positionSizing: { type: 'percentage' as const, value: 2 },
        timeframe: '1d',
      },
    });

    it('should have loadPublicStrategies as a function', () => {
      const { loadPublicStrategies } = useBacktesterStore.getState();
      expect(typeof loadPublicStrategies).toBe('function');
    });

    it('should handle load public strategies failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { loadPublicStrategies } = useBacktesterStore.getState();
      await loadPublicStrategies();

      const { error } = useBacktesterStore.getState();
      expect(error).toBe('Failed to load public strategies');
    });

    it('should have saveToLibrary as a function', () => {
      const { saveToLibrary } = useBacktesterStore.getState();
      expect(typeof saveToLibrary).toBe('function');
    });

    it('should handle save to library failure', async () => {
      const { createStrategy, saveToLibrary } = useBacktesterStore.getState();
      const strategyId = createStrategy(createTestStrategy());

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await saveToLibrary(strategyId, true);

      const { error } = useBacktesterStore.getState();
      expect(error).toBe('Failed to save to library');
    });

    it('should update strategy isPublic on successful save', async () => {
      const { createStrategy, saveToLibrary } = useBacktesterStore.getState();
      const strategyId = createStrategy(createTestStrategy());

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await saveToLibrary(strategyId, true);

      const { strategies } = useBacktesterStore.getState();
      const strategy = strategies.find((s: TradingStrategy) => s.id === strategyId);
      expect(strategy?.isPublic).toBe(true);
    });

    it('should call API with correct parameters', async () => {
      const { createStrategy, saveToLibrary } = useBacktesterStore.getState();
      const strategyId = createStrategy(createTestStrategy());

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await saveToLibrary(strategyId, true);

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/backtester/strategies/${strategyId}/publish`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ isPublic: true }),
        })
      );
    });

    it('should import strategy with full data', async () => {
      const { importStrategy } = useBacktesterStore.getState();

      const importedId = await importStrategy({
        name: 'Imported RSI Strategy',
        description: 'RSI-based strategy from file',
        tags: ['imported', 'rsi'],
        isPublic: false,
        config: {
          entryConditions: [
            { id: 'cond_1', type: 'indicator', indicatorType: 'rsi', indicatorValue: 30 },
          ],
          entryLogic: 'AND',
          exitConditions: [
            { id: 'cond_2', type: 'indicator', indicatorType: 'rsi', indicatorValue: 70 },
          ],
          exitLogic: 'AND',
          positionSizing: { type: 'percentage', value: 5 },
          timeframe: '4h',
        },
      });

      expect(importedId).toMatch(/^strategy_/);

      const { strategies } = useBacktesterStore.getState();
      const imported = strategies.find((s: TradingStrategy) => s.id === importedId);
      expect(imported?.name).toBe('Imported RSI Strategy');
      expect(imported?.tags).toContain('imported');
      expect(imported?.config.timeframe).toBe('4h');
    });

    it('should import strategy with default values', async () => {
      // Clear all strategies first
      const store = useBacktesterStore.getState();
      for (const strategy of [...store.strategies]) {
        store.deleteStrategy(strategy.id);
      }

      const { importStrategy } = useBacktesterStore.getState();

      const importedId = await importStrategy({});

      expect(importedId).toMatch(/^strategy_/);

      const { strategies } = useBacktesterStore.getState();
      const imported = strategies.find((s: TradingStrategy) => s.id === importedId);
      expect(imported?.name).toBe('Imported Strategy');
      expect(imported?.createdBy).toBe('imported');
    });

    it('should import strategy with provided name', async () => {
      const { importStrategy } = useBacktesterStore.getState();

      const importedId = await importStrategy({
        name: 'Custom Named Strategy',
      });

      const { strategies } = useBacktesterStore.getState();
      const imported = strategies.find((s: TradingStrategy) => s.id === importedId);
      expect(imported?.name).toBe('Custom Named Strategy');
    });
  });

  describe('Live Trading Integration', () => {
    const createTestStrategy = () => ({
      name: 'Live Trading Test Strategy',
      description: 'For live trading tests',
      createdBy: 'test-user',
      tags: [],
      isPublic: false,
      config: {
        entryConditions: [],
        entryLogic: 'AND' as const,
        exitConditions: [],
        exitLogic: 'AND' as const,
        positionSizing: { type: 'percentage' as const, value: 2 },
        timeframe: '1d',
      },
    });

    it('should have createLiveSignals as a function', () => {
      const { createLiveSignals } = useBacktesterStore.getState();
      expect(typeof createLiveSignals).toBe('function');
    });

    it('should handle live signals creation failure', async () => {
      const { createStrategy, createLiveSignals } = useBacktesterStore.getState();
      const strategyId = createStrategy(createTestStrategy());

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await createLiveSignals(strategyId, ['AAPL']);

      const { error } = useBacktesterStore.getState();
      expect(error).toBe('Failed to create live signals');
    });

    it('should call API with correct parameters on success', async () => {
      const { createStrategy, createLiveSignals } = useBacktesterStore.getState();
      const strategyId = createStrategy(createTestStrategy());

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ signalId: 'signal_123' }),
      });

      await createLiveSignals(strategyId, ['AAPL', 'GOOGL', 'MSFT']);

      expect(mockFetch).toHaveBeenCalledWith('/api/backtester/live-signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategyId, symbols: ['AAPL', 'GOOGL', 'MSFT'] }),
      });
    });
  });

  describe('Strategy Edge Cases', () => {
    const createTestStrategy = () => ({
      name: 'Strategy Edge Case',
      description: 'Testing edge cases',
      createdBy: 'test-user',
      tags: [],
      isPublic: false,
      config: {
        entryConditions: [],
        entryLogic: 'AND' as const,
        exitConditions: [],
        exitLogic: 'AND' as const,
        positionSizing: { type: 'percentage' as const, value: 2 },
        timeframe: '1d',
      },
    });

    it('should handle updating non-existent strategy gracefully', () => {
      const { updateStrategy } = useBacktesterStore.getState();

      expect(() => updateStrategy('non-existent-id', { name: 'New Name' })).not.toThrow();
    });

    it('should handle deleting non-existent strategy gracefully', () => {
      const { deleteStrategy } = useBacktesterStore.getState();

      expect(() => deleteStrategy('non-existent-id')).not.toThrow();
    });

    it('should create strategy with OR logic', () => {
      const { createStrategy } = useBacktesterStore.getState();

      const strategyId = createStrategy({
        ...createTestStrategy(),
        config: {
          ...createTestStrategy().config,
          entryLogic: 'OR' as const,
          exitLogic: 'OR' as const,
        },
      });

      const { strategies } = useBacktesterStore.getState();
      const strategy = strategies.find((s: TradingStrategy) => s.id === strategyId);
      expect(strategy?.config.entryLogic).toBe('OR');
      expect(strategy?.config.exitLogic).toBe('OR');
    });

    it('should create strategy with fixed position sizing', () => {
      const { createStrategy } = useBacktesterStore.getState();

      const strategyId = createStrategy({
        ...createTestStrategy(),
        config: {
          ...createTestStrategy().config,
          positionSizing: { type: 'fixed' as const, value: 5000 },
        },
      });

      const { strategies } = useBacktesterStore.getState();
      const strategy = strategies.find((s: TradingStrategy) => s.id === strategyId);
      expect(strategy?.config.positionSizing.type).toBe('fixed');
      expect(strategy?.config.positionSizing.value).toBe(5000);
    });

    it('should create strategy with various timeframes', () => {
      const { createStrategy, deleteStrategy } = useBacktesterStore.getState();
      const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'] as const;

      for (const tf of timeframes) {
        const strategyId = createStrategy({
          ...createTestStrategy(),
          name: `Strategy ${tf}`,
          config: {
            ...createTestStrategy().config,
            timeframe: tf,
          },
        });

        const { strategies } = useBacktesterStore.getState();
        const strategy = strategies.find((s: TradingStrategy) => s.id === strategyId);
        expect(strategy?.config.timeframe).toBe(tf);

        // Clean up
        deleteStrategy(strategyId);
      }
    });
  });
});

describe('calculatePerformanceMetrics', () => {
  it('should return zeros for empty trades array', () => {
    const metrics = calculatePerformanceMetrics([]);

    expect(metrics.totalReturn).toBe(0);
    expect(metrics.totalTrades).toBe(0);
    expect(metrics.winRate).toBe(0);
    expect(metrics.avgWin).toBe(0);
    expect(metrics.avgLoss).toBe(0);
  });

  it('should calculate basic metrics for winning trades', () => {
    const trades: BacktestTrade[] = [
      {
        id: 'trade_1',
        symbol: 'AAPL',
        direction: 'long',
        entryPrice: 100,
        exitPrice: 110,
        quantity: 10,
        entryTime: new Date(),
        exitTime: new Date(),
        pnl: 100,
        pnlPercent: 10,
        holdingPeriod: 60,
        reason: 'take-profit',
      },
      {
        id: 'trade_2',
        symbol: 'AAPL',
        direction: 'long',
        entryPrice: 100,
        exitPrice: 105,
        quantity: 10,
        entryTime: new Date(),
        exitTime: new Date(),
        pnl: 50,
        pnlPercent: 5,
        holdingPeriod: 30,
        reason: 'take-profit',
      },
    ];

    const metrics = calculatePerformanceMetrics(trades);

    expect(metrics.totalTrades).toBe(2);
    expect(metrics.winningTrades).toBe(2);
    expect(metrics.losingTrades).toBe(0);
    expect(metrics.winRate).toBe(1);
    expect(metrics.totalReturn).toBe(15); // 10 + 5
    expect(metrics.avgWin).toBe(75); // (100 + 50) / 2
  });

  it('should calculate metrics with mixed wins and losses', () => {
    const trades: BacktestTrade[] = [
      {
        id: 'trade_1',
        symbol: 'AAPL',
        direction: 'long',
        entryPrice: 100,
        exitPrice: 120,
        quantity: 10,
        entryTime: new Date(),
        exitTime: new Date(),
        pnl: 200,
        pnlPercent: 20,
        holdingPeriod: 60,
        reason: 'take-profit',
      },
      {
        id: 'trade_2',
        symbol: 'AAPL',
        direction: 'long',
        entryPrice: 100,
        exitPrice: 90,
        quantity: 10,
        entryTime: new Date(),
        exitTime: new Date(),
        pnl: -100,
        pnlPercent: -10,
        holdingPeriod: 30,
        reason: 'stop-loss',
      },
      {
        id: 'trade_3',
        symbol: 'AAPL',
        direction: 'long',
        entryPrice: 100,
        exitPrice: 110,
        quantity: 10,
        entryTime: new Date(),
        exitTime: new Date(),
        pnl: 100,
        pnlPercent: 10,
        holdingPeriod: 45,
        reason: 'take-profit',
      },
      {
        id: 'trade_4',
        symbol: 'AAPL',
        direction: 'long',
        entryPrice: 100,
        exitPrice: 95,
        quantity: 10,
        entryTime: new Date(),
        exitTime: new Date(),
        pnl: -50,
        pnlPercent: -5,
        holdingPeriod: 20,
        reason: 'stop-loss',
      },
    ];

    const metrics = calculatePerformanceMetrics(trades);

    expect(metrics.totalTrades).toBe(4);
    expect(metrics.winningTrades).toBe(2);
    expect(metrics.losingTrades).toBe(2);
    expect(metrics.winRate).toBe(0.5);
    expect(metrics.totalReturn).toBe(15); // 20 - 10 + 10 - 5
    expect(metrics.avgWin).toBe(150); // (200 + 100) / 2
    expect(metrics.avgLoss).toBe(75); // (100 + 50) / 2
    expect(metrics.avgHoldingPeriod).toBe(38.75); // (60 + 30 + 45 + 20) / 4
  });

  it('should handle trades with undefined pnl', () => {
    const trades: BacktestTrade[] = [
      {
        id: 'trade_1',
        symbol: 'AAPL',
        direction: 'long',
        entryPrice: 100,
        quantity: 10,
        entryTime: new Date(),
        // No exitPrice, pnl, pnlPercent - still open trade
      } as BacktestTrade,
      {
        id: 'trade_2',
        symbol: 'AAPL',
        direction: 'long',
        entryPrice: 100,
        exitPrice: 110,
        quantity: 10,
        entryTime: new Date(),
        exitTime: new Date(),
        pnl: 100,
        pnlPercent: 10,
        holdingPeriod: 60,
        reason: 'take-profit',
      },
    ];

    const metrics = calculatePerformanceMetrics(trades);

    // Should only count completed trades (those with pnl defined)
    expect(metrics.totalTrades).toBe(1);
    expect(metrics.winningTrades).toBe(1);
  });

  it('should calculate volatility and sharpe ratio', () => {
    const trades: BacktestTrade[] = [
      {
        id: 'trade_1',
        symbol: 'AAPL',
        direction: 'long',
        entryPrice: 100,
        exitPrice: 110,
        quantity: 10,
        entryTime: new Date(),
        exitTime: new Date(),
        pnl: 100,
        pnlPercent: 10,
        holdingPeriod: 60,
        reason: 'take-profit',
      },
      {
        id: 'trade_2',
        symbol: 'AAPL',
        direction: 'long',
        entryPrice: 100,
        exitPrice: 95,
        quantity: 10,
        entryTime: new Date(),
        exitTime: new Date(),
        pnl: -50,
        pnlPercent: -5,
        holdingPeriod: 30,
        reason: 'stop-loss',
      },
    ];

    const metrics = calculatePerformanceMetrics(trades);

    expect(metrics.volatility).toBeGreaterThan(0);
    expect(typeof metrics.sharpeRatio).toBe('number');
  });

  it('should handle all losing trades', () => {
    const trades: BacktestTrade[] = [
      {
        id: 'trade_1',
        symbol: 'AAPL',
        direction: 'long',
        entryPrice: 100,
        exitPrice: 90,
        quantity: 10,
        entryTime: new Date(),
        exitTime: new Date(),
        pnl: -100,
        pnlPercent: -10,
        holdingPeriod: 30,
        reason: 'stop-loss',
      },
      {
        id: 'trade_2',
        symbol: 'AAPL',
        direction: 'long',
        entryPrice: 100,
        exitPrice: 95,
        quantity: 10,
        entryTime: new Date(),
        exitTime: new Date(),
        pnl: -50,
        pnlPercent: -5,
        holdingPeriod: 20,
        reason: 'stop-loss',
      },
    ];

    const metrics = calculatePerformanceMetrics(trades);

    expect(metrics.totalTrades).toBe(2);
    expect(metrics.winningTrades).toBe(0);
    expect(metrics.losingTrades).toBe(2);
    expect(metrics.winRate).toBe(0);
    expect(metrics.avgWin).toBe(0);
    expect(metrics.avgLoss).toBe(75); // (100 + 50) / 2
  });
});

describe('Store Selectors', () => {
  it('should have useRunningBacktests selector', async () => {
    const { useRunningBacktests } = await import('@/lib/stores/backtesterStore');
    expect(typeof useRunningBacktests).toBe('function');
  });

  it('should have useBacktestsByStrategy selector', async () => {
    const { useBacktestsByStrategy } = await import('@/lib/stores/backtesterStore');
    expect(typeof useBacktestsByStrategy).toBe('function');
  });

  it('should have useCompletedBacktests selector', async () => {
    const { useCompletedBacktests } = await import('@/lib/stores/backtesterStore');
    expect(typeof useCompletedBacktests).toBe('function');
  });
});
