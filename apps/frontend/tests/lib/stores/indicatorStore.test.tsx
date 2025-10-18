/**
 * Comprehensive tests for Indicator Store
 * Tests indicator flags, parameters, styles, and symbol-specific persistence
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_INDICATOR_FLAGS,
  DEFAULT_INDICATOR_PARAMS,
  DEFAULT_INDICATOR_STYLE,
  indicatorStore,
} from '../../../src/lib/stores/indicatorStore';

describe('IndicatorStore', () => {
  // Mock localStorage
  const mockStorage = new Map<string, string>();

  beforeEach(() => {
    // Reset store to defaults
    indicatorStore.reset();

    // Clear mock storage
    mockStorage.clear();

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn((key: string) => mockStorage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        mockStorage.delete(key);
      }),
      clear: vi.fn(() => mockStorage.clear()),
      key: vi.fn((index: number) => Array.from(mockStorage.keys())[index] ?? null),
      get length() {
        return mockStorage.size;
      },
    };

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  describe('Initial State', () => {
    it('should initialize with default flags', () => {
      const state = indicatorStore.get();

      expect(state.ema20).toBe(DEFAULT_INDICATOR_FLAGS.ema20);
      expect(state.ema50).toBe(DEFAULT_INDICATOR_FLAGS.ema50);
      expect(state.bband).toBe(DEFAULT_INDICATOR_FLAGS.bband);
      expect(state.bbFill).toBe(DEFAULT_INDICATOR_FLAGS.bbFill);
      expect(state.vwap).toBe(DEFAULT_INDICATOR_FLAGS.vwap);
      expect(state.vwma).toBe(DEFAULT_INDICATOR_FLAGS.vwma);
      expect(state.rsi).toBe(DEFAULT_INDICATOR_FLAGS.rsi);
      expect(state.macd).toBe(DEFAULT_INDICATOR_FLAGS.macd);
      expect(state.stddev).toBe(DEFAULT_INDICATOR_FLAGS.stddev);
    });

    it('should initialize with default parameters', () => {
      const state = indicatorStore.get();

      expect(state.params.bbPeriod).toBe(DEFAULT_INDICATOR_PARAMS.bbPeriod);
      expect(state.params.bbMult).toBe(DEFAULT_INDICATOR_PARAMS.bbMult);
      expect(state.params.vwmaPeriod).toBe(DEFAULT_INDICATOR_PARAMS.vwmaPeriod);
      expect(state.params.stddevPeriod).toBe(DEFAULT_INDICATOR_PARAMS.stddevPeriod);
      expect(state.params.stddevMult).toBe(DEFAULT_INDICATOR_PARAMS.stddevMult);
    });

    it('should initialize with default styles', () => {
      const state = indicatorStore.get();

      expect(state.style.bbFillColor).toBe(DEFAULT_INDICATOR_STYLE.bbFillColor);
      expect(state.style.bbFillOpacity).toBe(DEFAULT_INDICATOR_STYLE.bbFillOpacity);
    });

    it('should have flattened flags at top level', () => {
      const state = indicatorStore.get();

      // Flags should be both in flags object and at top level
      expect(state.ema20).toBe(state.flags.ema20);
      expect(state.bband).toBe(state.flags.bband);
      expect(state.rsi).toBe(state.flags.rsi);
    });
  });

  describe('Toggle Flags', () => {
    it('should toggle flag from false to true', () => {
      expect(indicatorStore.get().ema50).toBe(false);

      indicatorStore.toggle('ema50');

      expect(indicatorStore.get().ema50).toBe(true);
      expect(indicatorStore.get().flags.ema50).toBe(true);
    });

    it('should toggle flag from true to false', () => {
      expect(indicatorStore.get().ema20).toBe(true);

      indicatorStore.toggle('ema20');

      expect(indicatorStore.get().ema20).toBe(false);
      expect(indicatorStore.get().flags.ema20).toBe(false);
    });

    it('should set flag to specific value true', () => {
      indicatorStore.toggle('bband', true);

      expect(indicatorStore.get().bband).toBe(true);
    });

    it('should set flag to specific value false', () => {
      indicatorStore.toggle('ema20', false);

      expect(indicatorStore.get().ema20).toBe(false);
    });

    it('should toggle multiple different flags', () => {
      indicatorStore.toggle('rsi', true);
      indicatorStore.toggle('macd', true);
      indicatorStore.toggle('vwap', true);

      const state = indicatorStore.get();
      expect(state.rsi).toBe(true);
      expect(state.macd).toBe(true);
      expect(state.vwap).toBe(true);
    });

    it('should preserve other flags when toggling one', () => {
      indicatorStore.toggle('ema20', false);
      indicatorStore.toggle('rsi', true);

      const state = indicatorStore.get();
      expect(state.ema20).toBe(false);
      expect(state.rsi).toBe(true);
      expect(state.ema50).toBe(DEFAULT_INDICATOR_FLAGS.ema50);
      expect(state.bband).toBe(DEFAULT_INDICATOR_FLAGS.bband);
    });
  });

  describe('Parameter Management', () => {
    it('should set bbPeriod parameter', () => {
      indicatorStore.setParam('bbPeriod', 30);

      expect(indicatorStore.get().params.bbPeriod).toBe(30);
    });

    it('should set bbMult parameter', () => {
      indicatorStore.setParam('bbMult', 3);

      expect(indicatorStore.get().params.bbMult).toBe(3);
    });

    it('should set vwmaPeriod parameter', () => {
      indicatorStore.setParam('vwmaPeriod', 50);

      expect(indicatorStore.get().params.vwmaPeriod).toBe(50);
    });

    it('should set stddevPeriod parameter', () => {
      indicatorStore.setParam('stddevPeriod', 25);

      expect(indicatorStore.get().params.stddevPeriod).toBe(25);
    });

    it('should set stddevMult parameter', () => {
      indicatorStore.setParam('stddevMult', 2.5);

      expect(indicatorStore.get().params.stddevMult).toBe(2.5);
    });

    it('should preserve other params when setting one', () => {
      indicatorStore.setParam('bbPeriod', 25);

      const state = indicatorStore.get();
      expect(state.params.bbPeriod).toBe(25);
      expect(state.params.bbMult).toBe(DEFAULT_INDICATOR_PARAMS.bbMult);
      expect(state.params.vwmaPeriod).toBe(DEFAULT_INDICATOR_PARAMS.vwmaPeriod);
    });

    it('should update multiple parameters independently', () => {
      indicatorStore.setParam('bbPeriod', 30);
      indicatorStore.setParam('bbMult', 2.5);
      indicatorStore.setParam('vwmaPeriod', 40);

      const state = indicatorStore.get();
      expect(state.params.bbPeriod).toBe(30);
      expect(state.params.bbMult).toBe(2.5);
      expect(state.params.vwmaPeriod).toBe(40);
    });
  });

  describe('Style Management', () => {
    it('should set bbFillColor style', () => {
      indicatorStore.setStyle('bbFillColor', '#ff0000');

      expect(indicatorStore.get().style.bbFillColor).toBe('#ff0000');
    });

    it('should set bbFillOpacity style', () => {
      indicatorStore.setStyle('bbFillOpacity', 0.5);

      expect(indicatorStore.get().style.bbFillOpacity).toBe(0.5);
    });

    it('should preserve other styles when setting one', () => {
      indicatorStore.setStyle('bbFillColor', '#00ff00');

      const state = indicatorStore.get();
      expect(state.style.bbFillColor).toBe('#00ff00');
      expect(state.style.bbFillOpacity).toBe(DEFAULT_INDICATOR_STYLE.bbFillOpacity);
    });

    it('should update multiple styles', () => {
      indicatorStore.setStyle('bbFillColor', '#0000ff');
      indicatorStore.setStyle('bbFillOpacity', 0.25);

      const state = indicatorStore.get();
      expect(state.style.bbFillColor).toBe('#0000ff');
      expect(state.style.bbFillOpacity).toBe(0.25);
    });
  });

  describe('Bulk Set Operations', () => {
    it('should set multiple flags at once', () => {
      indicatorStore.set({
        flags: {
          ema20: false,
          ema50: true,
          bband: true,
          bbFill: false,
          vwap: true,
          vwma: false,
          rsi: true,
          macd: false,
          stddev: true,
        },
      });

      const state = indicatorStore.get();
      expect(state.ema20).toBe(false);
      expect(state.ema50).toBe(true);
      expect(state.bband).toBe(true);
      expect(state.rsi).toBe(true);
      expect(state.stddev).toBe(true);
    });

    it('should set multiple params at once', () => {
      indicatorStore.set({
        params: {
          bbPeriod: 15,
          bbMult: 1.5,
          vwmaPeriod: 30,
          stddevPeriod: 18,
          stddevMult: 1.8,
        },
      });

      const state = indicatorStore.get();
      expect(state.params.bbPeriod).toBe(15);
      expect(state.params.bbMult).toBe(1.5);
      expect(state.params.vwmaPeriod).toBe(30);
      expect(state.params.stddevPeriod).toBe(18);
      expect(state.params.stddevMult).toBe(1.8);
    });

    it('should set multiple styles at once', () => {
      indicatorStore.set({
        style: {
          bbFillColor: '#ffffff',
          bbFillOpacity: 0.75,
        },
      });

      const state = indicatorStore.get();
      expect(state.style.bbFillColor).toBe('#ffffff');
      expect(state.style.bbFillOpacity).toBe(0.75);
    });

    it('should set flags, params, and styles together', () => {
      indicatorStore.set({
        flags: { bband: true, rsi: true },
        params: { bbPeriod: 25, bbMult: 2.2 },
        style: { bbFillColor: '#aabbcc', bbFillOpacity: 0.3 },
      });

      const state = indicatorStore.get();
      expect(state.bband).toBe(true);
      expect(state.rsi).toBe(true);
      expect(state.params.bbPeriod).toBe(25);
      expect(state.params.bbMult).toBe(2.2);
      expect(state.style.bbFillColor).toBe('#aabbcc');
      expect(state.style.bbFillOpacity).toBe(0.3);
    });

    it('should partially update flags without affecting others', () => {
      indicatorStore.set({
        flags: { rsi: true, macd: true },
      });

      const state = indicatorStore.get();
      expect(state.rsi).toBe(true);
      expect(state.macd).toBe(true);
      expect(state.ema20).toBe(DEFAULT_INDICATOR_FLAGS.ema20);
      expect(state.bband).toBe(DEFAULT_INDICATOR_FLAGS.bband);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset flags to defaults', () => {
      indicatorStore.toggle('rsi', true);
      indicatorStore.toggle('macd', true);
      indicatorStore.toggle('ema20', false);

      indicatorStore.reset();

      const state = indicatorStore.get();
      expect(state.ema20).toBe(DEFAULT_INDICATOR_FLAGS.ema20);
      expect(state.rsi).toBe(DEFAULT_INDICATOR_FLAGS.rsi);
      expect(state.macd).toBe(DEFAULT_INDICATOR_FLAGS.macd);
    });

    it('should reset params to defaults', () => {
      indicatorStore.setParam('bbPeriod', 50);
      indicatorStore.setParam('bbMult', 5);

      indicatorStore.reset();

      const state = indicatorStore.get();
      expect(state.params.bbPeriod).toBe(DEFAULT_INDICATOR_PARAMS.bbPeriod);
      expect(state.params.bbMult).toBe(DEFAULT_INDICATOR_PARAMS.bbMult);
    });

    it('should reset styles to defaults', () => {
      indicatorStore.setStyle('bbFillColor', '#123456');
      indicatorStore.setStyle('bbFillOpacity', 0.99);

      indicatorStore.reset();

      const state = indicatorStore.get();
      expect(state.style.bbFillColor).toBe(DEFAULT_INDICATOR_STYLE.bbFillColor);
      expect(state.style.bbFillOpacity).toBe(DEFAULT_INDICATOR_STYLE.bbFillOpacity);
    });

    it('should reset all state together', () => {
      indicatorStore.set({
        flags: { rsi: true, macd: true },
        params: { bbPeriod: 100 },
        style: { bbFillOpacity: 0.88 },
      });

      indicatorStore.reset();

      const state = indicatorStore.get();
      expect(state.rsi).toBe(DEFAULT_INDICATOR_FLAGS.rsi);
      expect(state.params.bbPeriod).toBe(DEFAULT_INDICATOR_PARAMS.bbPeriod);
      expect(state.style.bbFillOpacity).toBe(DEFAULT_INDICATOR_STYLE.bbFillOpacity);
    });
  });

  describe('Symbol-Specific Persistence', () => {
    it('should save state for specific symbol', () => {
      indicatorStore.toggle('rsi', true);
      indicatorStore.setParam('bbPeriod', 25);

      indicatorStore.saveForSymbol('AAPL');

      expect(localStorage.setItem).toHaveBeenCalled();
      const key = 'lokifi:inds:AAPL';
      expect(mockStorage.has(key)).toBe(true);
    });

    it('should save state for symbol with timeframe', () => {
      indicatorStore.toggle('macd', true);

      indicatorStore.saveForSymbol('TSLA', '1D');

      const key = 'lokifi:inds:TSLA:1D';
      expect(mockStorage.has(key)).toBe(true);
    });

    it('should load saved state for symbol', () => {
      // Setup: Save state for AAPL
      indicatorStore.set({
        flags: { rsi: true, macd: true },
        params: { bbPeriod: 30 },
      });
      indicatorStore.saveForSymbol('AAPL');

      // Reset to defaults
      indicatorStore.reset();
      expect(indicatorStore.get().rsi).toBe(false);

      // Load AAPL state
      indicatorStore.loadForSymbol('AAPL');

      const state = indicatorStore.get();
      expect(state.rsi).toBe(true);
      expect(state.macd).toBe(true);
      expect(state.params.bbPeriod).toBe(30);
    });

    it('should load saved state for symbol with timeframe', () => {
      // Setup
      indicatorStore.toggle('vwap', true);
      indicatorStore.setParam('vwmaPeriod', 50);
      indicatorStore.saveForSymbol('MSFT', '4H');

      // Reset
      indicatorStore.reset();

      // Load
      indicatorStore.loadForSymbol('MSFT', '4H');

      const state = indicatorStore.get();
      expect(state.vwap).toBe(true);
      expect(state.params.vwmaPeriod).toBe(50);
    });

    it('should reset to defaults when loading non-existent symbol', () => {
      indicatorStore.toggle('rsi', true);

      indicatorStore.loadForSymbol('NONEXISTENT');

      expect(indicatorStore.get().rsi).toBe(DEFAULT_INDICATOR_FLAGS.rsi);
    });

    it('should clear saved state for symbol', () => {
      // Setup
      indicatorStore.toggle('bband', true);
      indicatorStore.saveForSymbol('GOOG');
      expect(mockStorage.has('lokifi:inds:GOOG')).toBe(true);

      // Clear
      indicatorStore.clearForSymbol('GOOG');

      expect(mockStorage.has('lokifi:inds:GOOG')).toBe(false);
      expect(localStorage.removeItem).toHaveBeenCalledWith('lokifi:inds:GOOG');
    });

    it('should reset state after clearing symbol', () => {
      indicatorStore.toggle('rsi', true);
      indicatorStore.saveForSymbol('FB');

      indicatorStore.clearForSymbol('FB');

      expect(indicatorStore.get().rsi).toBe(DEFAULT_INDICATOR_FLAGS.rsi);
    });

    it('should maintain separate state per symbol', () => {
      // Configure for AAPL
      indicatorStore.set({ flags: { rsi: true } });
      indicatorStore.saveForSymbol('AAPL');

      // Configure for TSLA
      indicatorStore.set({ flags: { rsi: false, macd: true } });
      indicatorStore.saveForSymbol('TSLA');

      // Load AAPL - should have rsi but not macd
      indicatorStore.loadForSymbol('AAPL');
      let state = indicatorStore.get();
      expect(state.rsi).toBe(true);
      expect(state.macd).toBe(false);

      // Load TSLA - should have macd but not rsi
      indicatorStore.loadForSymbol('TSLA');
      state = indicatorStore.get();
      expect(state.rsi).toBe(false);
      expect(state.macd).toBe(true);
    });

    it('should maintain separate state per symbol+timeframe combination', () => {
      // AAPL 1D
      indicatorStore.set({ flags: { ema20: true, ema50: false } });
      indicatorStore.saveForSymbol('AAPL', '1D');

      // AAPL 4H
      indicatorStore.set({ flags: { ema20: false, ema50: true } });
      indicatorStore.saveForSymbol('AAPL', '4H');

      // Load AAPL 1D
      indicatorStore.loadForSymbol('AAPL', '1D');
      let state = indicatorStore.get();
      expect(state.ema20).toBe(true);
      expect(state.ema50).toBe(false);

      // Load AAPL 4H
      indicatorStore.loadForSymbol('AAPL', '4H');
      state = indicatorStore.get();
      expect(state.ema20).toBe(false);
      expect(state.ema50).toBe(true);
    });

    it('should use cache on subsequent loads', () => {
      // First save
      indicatorStore.toggle('vwma', true);
      indicatorStore.saveForSymbol('CACHED');

      // Clear localStorage but keep cache (mock still tracks calls)
      const getItemSpy = vi.mocked(localStorage.getItem);
      mockStorage.clear();
      getItemSpy.mockClear(); // Clear call history but keep implementation

      // Should load from cache (won't call localStorage)
      indicatorStore.reset();
      indicatorStore.loadForSymbol('CACHED');

      // Cache hit means no localStorage access needed
      expect(indicatorStore.get().vwma).toBe(true);
      expect(getItemSpy).not.toHaveBeenCalled();
    });
  });

  describe('Subscription & Notifications', () => {
    it('should notify subscribers on toggle', () => {
      const subscriber = vi.fn();

      indicatorStore.subscribe(subscriber);
      subscriber.mockClear(); // Clear initial call

      indicatorStore.toggle('rsi', true);

      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenCalledWith(expect.objectContaining({ rsi: true }));
    });

    it('should notify subscribers on param change', () => {
      const subscriber = vi.fn();

      indicatorStore.subscribe(subscriber);
      subscriber.mockClear();

      indicatorStore.setParam('bbPeriod', 35);

      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ bbPeriod: 35 }),
        })
      );
    });

    it('should notify subscribers on style change', () => {
      const subscriber = vi.fn();

      indicatorStore.subscribe(subscriber);
      subscriber.mockClear();

      indicatorStore.setStyle('bbFillOpacity', 0.6);

      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenCalledWith(
        expect.objectContaining({
          style: expect.objectContaining({ bbFillOpacity: 0.6 }),
        })
      );
    });

    it('should notify subscribers on reset', () => {
      const subscriber = vi.fn();

      indicatorStore.toggle('rsi', true);
      indicatorStore.subscribe(subscriber);
      subscriber.mockClear();

      indicatorStore.reset();

      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenCalledWith(
        expect.objectContaining({ rsi: DEFAULT_INDICATOR_FLAGS.rsi })
      );
    });

    it('should call subscriber immediately on subscribe', () => {
      const subscriber = vi.fn();

      indicatorStore.toggle('macd', true);
      indicatorStore.subscribe(subscriber);

      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenCalledWith(expect.objectContaining({ macd: true }));
    });

    it('should support multiple subscribers', () => {
      const sub1 = vi.fn();
      const sub2 = vi.fn();

      indicatorStore.subscribe(sub1);
      indicatorStore.subscribe(sub2);
      sub1.mockClear();
      sub2.mockClear();

      indicatorStore.toggle('bband', true);

      expect(sub1).toHaveBeenCalledTimes(1);
      expect(sub2).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe when calling returned function', () => {
      const subscriber = vi.fn();

      const unsubscribe = indicatorStore.subscribe(subscriber);
      subscriber.mockClear();

      unsubscribe();
      indicatorStore.toggle('vwap', true);

      expect(subscriber).not.toHaveBeenCalled();
    });

    it('should not throw if subscriber throws error', () => {
      const badSubscriber = vi.fn(() => {
        throw new Error('Subscriber error');
      });
      const goodSubscriber = vi.fn();

      indicatorStore.subscribe(badSubscriber);
      indicatorStore.subscribe(goodSubscriber);
      badSubscriber.mockClear();
      goodSubscriber.mockClear();

      expect(() => {
        indicatorStore.toggle('stddev', true);
      }).not.toThrow();

      expect(goodSubscriber).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid flag toggles', () => {
      for (let i = 0; i < 100; i++) {
        indicatorStore.toggle('rsi');
      }

      // Should end up false (started true, toggled 100 times = even)
      expect(indicatorStore.get().rsi).toBe(false);
    });

    it('should handle setting same param multiple times', () => {
      indicatorStore.setParam('bbPeriod', 10);
      indicatorStore.setParam('bbPeriod', 20);
      indicatorStore.setParam('bbPeriod', 30);

      expect(indicatorStore.get().params.bbPeriod).toBe(30);
    });

    it('should handle extreme parameter values', () => {
      indicatorStore.setParam('bbMult', 0);
      expect(indicatorStore.get().params.bbMult).toBe(0);

      indicatorStore.setParam('bbMult', 999);
      expect(indicatorStore.get().params.bbMult).toBe(999);

      indicatorStore.setParam('bbMult', -5);
      expect(indicatorStore.get().params.bbMult).toBe(-5);
    });

    it('should handle extreme opacity values', () => {
      indicatorStore.setStyle('bbFillOpacity', 0);
      expect(indicatorStore.get().style.bbFillOpacity).toBe(0);

      indicatorStore.setStyle('bbFillOpacity', 1);
      expect(indicatorStore.get().style.bbFillOpacity).toBe(1);

      indicatorStore.setStyle('bbFillOpacity', 2); // Over 100%
      expect(indicatorStore.get().style.bbFillOpacity).toBe(2);
    });

    it('should handle invalid JSON in localStorage gracefully', () => {
      mockStorage.set('lokifi:inds:CORRUPT', 'invalid{json}');

      expect(() => {
        indicatorStore.loadForSymbol('CORRUPT');
      }).not.toThrow();

      // Should reset to defaults when JSON parse fails
      expect(indicatorStore.get().rsi).toBe(DEFAULT_INDICATOR_FLAGS.rsi);
    });

    it('should handle symbols with special characters', () => {
      indicatorStore.toggle('macd', true);
      indicatorStore.saveForSymbol('BTC-USD');

      indicatorStore.reset();
      indicatorStore.loadForSymbol('BTC-USD');

      expect(indicatorStore.get().macd).toBe(true);
    });

    it('should handle empty timeframe string', () => {
      indicatorStore.toggle('vwap', true);
      indicatorStore.saveForSymbol('AAPL', '');

      const key = 'lokifi:inds:AAPL';
      expect(mockStorage.has(key)).toBe(true);
    });

    it('should handle whitespace-only timeframe', () => {
      indicatorStore.toggle('ema50', true);
      indicatorStore.saveForSymbol('TSLA', '   ');

      const key = 'lokifi:inds:TSLA';
      expect(mockStorage.has(key)).toBe(true);
    });

    it('should maintain state consistency across operations', () => {
      // Complex sequence
      indicatorStore.toggle('rsi', true);
      indicatorStore.setParam('bbPeriod', 25);
      indicatorStore.saveForSymbol('TEST', '1H');
      indicatorStore.toggle('macd', true);
      indicatorStore.setStyle('bbFillColor', '#ff00ff');
      indicatorStore.saveForSymbol('TEST', '1D');
      indicatorStore.reset();
      indicatorStore.loadForSymbol('TEST', '1H');

      const state = indicatorStore.get();
      expect(state.rsi).toBe(true);
      expect(state.macd).toBe(false); // Not saved in 1H
      expect(state.params.bbPeriod).toBe(25);
      expect(state.style.bbFillColor).toBe(DEFAULT_INDICATOR_STYLE.bbFillColor); // Not saved in 1H
    });

    it('should return frozen snapshot from get()', () => {
      const snapshot = indicatorStore.get();

      expect(Object.isFrozen(snapshot)).toBe(true);
    });
  });
});
