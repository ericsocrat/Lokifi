/**
 * @fileoverview Comprehensive tests for indicatorStore
 * Session 106: Small store tests for quick coverage wins
 *
 * Store: Indicator settings with class-based implementation
 * Pattern: Class singleton with state, subscribers, and localStorage persistence
 * Features: Flags, params, style + per-symbol/timeframe persistence
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  indicatorStore,
  DEFAULT_INDICATOR_FLAGS,
  DEFAULT_INDICATOR_PARAMS,
  DEFAULT_INDICATOR_STYLE,
  type IndicatorFlags,
  type IndicatorParams,
  type IndicatorStyle,
  type IndicatorSnapshot,
} from '@/lib/stores/indicatorStore';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

// Apply mock
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('indicatorStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    indicatorStore.reset();
  });

  describe('Default Values', () => {
    it('should export DEFAULT_INDICATOR_FLAGS', () => {
      expect(DEFAULT_INDICATOR_FLAGS).toEqual({
        ema20: true,
        ema50: false,
        bband: false,
        bbFill: true,
        vwap: false,
        vwma: false,
        rsi: false,
        macd: false,
        stddev: false,
      });
    });

    it('should export DEFAULT_INDICATOR_PARAMS', () => {
      expect(DEFAULT_INDICATOR_PARAMS).toEqual({
        bbPeriod: 20,
        bbMult: 2,
        vwmaPeriod: 20,
        stddevPeriod: 20,
        stddevMult: 2,
      });
    });

    it('should export DEFAULT_INDICATOR_STYLE', () => {
      expect(DEFAULT_INDICATOR_STYLE).toEqual({
        bbFillColor: '#22d3ee',
        bbFillOpacity: 0.12,
      });
    });
  });

  describe('get()', () => {
    it('should return IndicatorSnapshot with all properties', () => {
      const snapshot = indicatorStore.get();

      // Should have flags, params, style (flattened)
      expect(snapshot).toHaveProperty('flags');
      expect(snapshot).toHaveProperty('params');
      expect(snapshot).toHaveProperty('style');

      // Should also have flattened flag values at top level
      expect(snapshot).toHaveProperty('ema20');
      expect(snapshot).toHaveProperty('bband');
      expect(snapshot).toHaveProperty('rsi');
    });

    it('should return frozen object', () => {
      const snapshot = indicatorStore.get();
      expect(Object.isFrozen(snapshot)).toBe(true);
    });

    it('should have default values on initial get', () => {
      const snapshot = indicatorStore.get();

      expect(snapshot.flags).toEqual(DEFAULT_INDICATOR_FLAGS);
      expect(snapshot.params).toEqual(DEFAULT_INDICATOR_PARAMS);
      expect(snapshot.style).toEqual(DEFAULT_INDICATOR_STYLE);
    });

    it('should have flattened flag values matching flags object', () => {
      const snapshot = indicatorStore.get();

      expect(snapshot.ema20).toBe(snapshot.flags.ema20);
      expect(snapshot.bband).toBe(snapshot.flags.bband);
      expect(snapshot.rsi).toBe(snapshot.flags.rsi);
      expect(snapshot.macd).toBe(snapshot.flags.macd);
    });
  });

  describe('subscribe()', () => {
    it('should call listener immediately with current state', () => {
      const listener = vi.fn();
      indicatorStore.subscribe(listener);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(indicatorStore.get());
    });

    it('should return unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = indicatorStore.subscribe(listener);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should stop calling listener after unsubscribe', () => {
      const listener = vi.fn();
      const unsubscribe = indicatorStore.subscribe(listener);

      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      indicatorStore.toggle('ema50', true);

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should support multiple subscribers', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      indicatorStore.subscribe(listener1);
      indicatorStore.subscribe(listener2);

      indicatorStore.toggle('rsi', true);

      // 1 immediate + 1 from toggle
      expect(listener1).toHaveBeenCalledTimes(2);
      expect(listener2).toHaveBeenCalledTimes(2);
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalListener = vi.fn();

      indicatorStore.subscribe(errorListener);
      indicatorStore.subscribe(normalListener);

      // Should not throw
      expect(() => indicatorStore.toggle('ema50', true)).not.toThrow();

      // Normal listener should still be called
      expect(normalListener).toHaveBeenCalled();
    });
  });

  describe('toggle()', () => {
    it.each([
      ['ema20'],
      ['ema50'],
      ['bband'],
      ['bbFill'],
      ['vwap'],
      ['vwma'],
      ['rsi'],
      ['macd'],
      ['stddev'],
    ] as [keyof IndicatorFlags][])('should toggle %s flag', (flag) => {
      const initial = indicatorStore.get().flags[flag];

      indicatorStore.toggle(flag);

      expect(indicatorStore.get().flags[flag]).toBe(!initial);
    });

    it('should set to specific value when provided', () => {
      indicatorStore.toggle('ema50', true);
      expect(indicatorStore.get().flags.ema50).toBe(true);

      indicatorStore.toggle('ema50', false);
      expect(indicatorStore.get().flags.ema50).toBe(false);
    });

    it('should toggle when value not provided', () => {
      const initial = indicatorStore.get().flags.bband;

      indicatorStore.toggle('bband');
      expect(indicatorStore.get().flags.bband).toBe(!initial);

      indicatorStore.toggle('bband');
      expect(indicatorStore.get().flags.bband).toBe(initial);
    });

    it('should notify subscribers', () => {
      const listener = vi.fn();
      indicatorStore.subscribe(listener);

      indicatorStore.toggle('rsi', true);

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should update flattened values', () => {
      indicatorStore.toggle('macd', true);

      const snapshot = indicatorStore.get();
      expect(snapshot.macd).toBe(true);
      expect(snapshot.flags.macd).toBe(true);
    });
  });

  describe('setParam()', () => {
    it('should set bbPeriod', () => {
      indicatorStore.setParam('bbPeriod', 30);
      expect(indicatorStore.get().params.bbPeriod).toBe(30);
    });

    it('should set bbMult', () => {
      indicatorStore.setParam('bbMult', 2.5);
      expect(indicatorStore.get().params.bbMult).toBe(2.5);
    });

    it('should set vwmaPeriod', () => {
      indicatorStore.setParam('vwmaPeriod', 14);
      expect(indicatorStore.get().params.vwmaPeriod).toBe(14);
    });

    it('should set stddevPeriod', () => {
      indicatorStore.setParam('stddevPeriod', 14);
      expect(indicatorStore.get().params.stddevPeriod).toBe(14);
    });

    it('should set stddevMult', () => {
      indicatorStore.setParam('stddevMult', 1.5);
      expect(indicatorStore.get().params.stddevMult).toBe(1.5);
    });

    it('should notify subscribers', () => {
      const listener = vi.fn();
      indicatorStore.subscribe(listener);

      indicatorStore.setParam('bbPeriod', 25);

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should preserve other params when setting one', () => {
      indicatorStore.setParam('bbPeriod', 25);
      indicatorStore.setParam('bbMult', 3);

      const params = indicatorStore.get().params;
      expect(params.bbPeriod).toBe(25);
      expect(params.bbMult).toBe(3);
      expect(params.vwmaPeriod).toBe(DEFAULT_INDICATOR_PARAMS.vwmaPeriod);
    });
  });

  describe('setStyle()', () => {
    it('should set bbFillColor', () => {
      indicatorStore.setStyle('bbFillColor', '#ff0000');
      expect(indicatorStore.get().style.bbFillColor).toBe('#ff0000');
    });

    it('should set bbFillOpacity', () => {
      indicatorStore.setStyle('bbFillOpacity', 0.5);
      expect(indicatorStore.get().style.bbFillOpacity).toBe(0.5);
    });

    it('should notify subscribers', () => {
      const listener = vi.fn();
      indicatorStore.subscribe(listener);

      indicatorStore.setStyle('bbFillColor', '#00ff00');

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should preserve other styles when setting one', () => {
      indicatorStore.setStyle('bbFillColor', '#0000ff');
      indicatorStore.setStyle('bbFillOpacity', 0.8);

      const style = indicatorStore.get().style;
      expect(style.bbFillColor).toBe('#0000ff');
      expect(style.bbFillOpacity).toBe(0.8);
    });
  });

  describe('set()', () => {
    it('should set partial flags', () => {
      indicatorStore.set({ flags: { ema50: true, rsi: true } as IndicatorFlags });

      const flags = indicatorStore.get().flags;
      expect(flags.ema50).toBe(true);
      expect(flags.rsi).toBe(true);
    });

    it('should set partial params', () => {
      indicatorStore.set({ params: { bbPeriod: 50, bbMult: 3 } as IndicatorParams });

      const params = indicatorStore.get().params;
      expect(params.bbPeriod).toBe(50);
      expect(params.bbMult).toBe(3);
    });

    it('should set partial style', () => {
      indicatorStore.set({ style: { bbFillColor: '#123456' } as IndicatorStyle });

      expect(indicatorStore.get().style.bbFillColor).toBe('#123456');
    });

    it('should set multiple categories at once', () => {
      indicatorStore.set({
        flags: { vwap: true } as IndicatorFlags,
        params: { vwmaPeriod: 30 } as IndicatorParams,
        style: { bbFillOpacity: 0.3 } as IndicatorStyle,
      });

      const snapshot = indicatorStore.get();
      expect(snapshot.flags.vwap).toBe(true);
      expect(snapshot.params.vwmaPeriod).toBe(30);
      expect(snapshot.style.bbFillOpacity).toBe(0.3);
    });
  });

  describe('reset()', () => {
    it('should reset flags to defaults', () => {
      indicatorStore.toggle('ema50', true);
      indicatorStore.toggle('rsi', true);
      indicatorStore.toggle('macd', true);

      indicatorStore.reset();

      expect(indicatorStore.get().flags).toEqual(DEFAULT_INDICATOR_FLAGS);
    });

    it('should reset params to defaults', () => {
      indicatorStore.setParam('bbPeriod', 50);
      indicatorStore.setParam('bbMult', 5);

      indicatorStore.reset();

      expect(indicatorStore.get().params).toEqual(DEFAULT_INDICATOR_PARAMS);
    });

    it('should reset style to defaults', () => {
      indicatorStore.setStyle('bbFillColor', '#ff0000');
      indicatorStore.setStyle('bbFillOpacity', 1.0);

      indicatorStore.reset();

      expect(indicatorStore.get().style).toEqual(DEFAULT_INDICATOR_STYLE);
    });

    it('should notify subscribers', () => {
      const listener = vi.fn();
      indicatorStore.subscribe(listener);

      indicatorStore.reset();

      expect(listener).toHaveBeenCalledTimes(2);
    });
  });

  describe('loadForSymbol()', () => {
    it('should reset if no saved settings', () => {
      indicatorStore.toggle('ema50', true);

      indicatorStore.loadForSymbol('BTCUSD', '1h');

      // Should reset since no saved settings
      expect(indicatorStore.get().flags.ema50).toBe(DEFAULT_INDICATOR_FLAGS.ema50);
    });

    it('should load saved settings from cache', () => {
      // First, save settings
      indicatorStore.toggle('rsi', true);
      indicatorStore.saveForSymbol('BTCUSD', '1h');

      // Then reset and load
      indicatorStore.reset();
      expect(indicatorStore.get().flags.rsi).toBe(false);

      indicatorStore.loadForSymbol('BTCUSD', '1h');

      expect(indicatorStore.get().flags.rsi).toBe(true);
    });

    it('should load from localStorage if not in cache', () => {
      // Manually set localStorage
      const savedState = {
        flags: { ...DEFAULT_INDICATOR_FLAGS, macd: true },
        params: DEFAULT_INDICATOR_PARAMS,
        style: DEFAULT_INDICATOR_STYLE,
      };
      localStorageMock.setItem('lokifi:inds:ETHUSD:4h', JSON.stringify(savedState));

      indicatorStore.loadForSymbol('ETHUSD', '4h');

      expect(indicatorStore.get().flags.macd).toBe(true);
    });

    it('should handle timeframe being undefined/empty', () => {
      indicatorStore.toggle('vwap', true);
      indicatorStore.saveForSymbol('SOLUSD');

      indicatorStore.reset();
      indicatorStore.loadForSymbol('SOLUSD');

      expect(indicatorStore.get().flags.vwap).toBe(true);
    });

    it('should use symbol-specific key with timeframe', () => {
      indicatorStore.toggle('bband', true);
      indicatorStore.saveForSymbol('BTCUSD', '1d');

      indicatorStore.reset();
      indicatorStore.loadForSymbol('BTCUSD', '1h'); // Different timeframe

      // Should reset, not load the 1d settings
      expect(indicatorStore.get().flags.bband).toBe(DEFAULT_INDICATOR_FLAGS.bband);
    });
  });

  describe('saveForSymbol()', () => {
    it('should save current state to localStorage', () => {
      indicatorStore.toggle('stddev', true);
      indicatorStore.setParam('stddevMult', 3);

      indicatorStore.saveForSymbol('ADAUSD', '15m');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'lokifi:inds:ADAUSD:15m',
        expect.any(String)
      );
    });

    it('should cache the state', () => {
      indicatorStore.toggle('vwma', true);
      indicatorStore.saveForSymbol('XRPUSD', '4h');

      // Reset and load - should come from cache
      indicatorStore.reset();
      indicatorStore.loadForSymbol('XRPUSD', '4h');

      expect(indicatorStore.get().flags.vwma).toBe(true);
    });

    it('should handle empty timeframe', () => {
      indicatorStore.toggle('ema50', true);
      indicatorStore.saveForSymbol('DOTUSD');

      // Key should be without timeframe suffix
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'lokifi:inds:DOTUSD',
        expect.any(String)
      );
    });
  });

  describe('clearForSymbol()', () => {
    it('should remove from cache', () => {
      indicatorStore.toggle('rsi', true);
      indicatorStore.saveForSymbol('BTCUSD', '1h');

      indicatorStore.clearForSymbol('BTCUSD', '1h');
      indicatorStore.loadForSymbol('BTCUSD', '1h');

      // Should be default since cache was cleared
      expect(indicatorStore.get().flags.rsi).toBe(DEFAULT_INDICATOR_FLAGS.rsi);
    });

    it('should remove from localStorage', () => {
      indicatorStore.saveForSymbol('LINKUSD', '1d');

      indicatorStore.clearForSymbol('LINKUSD', '1d');

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('lokifi:inds:LINKUSD:1d');
    });

    it('should reset state after clearing', () => {
      indicatorStore.toggle('macd', true);
      indicatorStore.saveForSymbol('AVAXUSD', '4h');

      indicatorStore.clearForSymbol('AVAXUSD', '4h');

      expect(indicatorStore.get().flags.macd).toBe(DEFAULT_INDICATOR_FLAGS.macd);
    });
  });

  describe('Edge Cases', () => {
    it('should handle localStorage.getItem error', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      expect(() => indicatorStore.loadForSymbol('BTCUSD', '1h')).not.toThrow();
    });

    it('should handle localStorage.setItem error', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Quota exceeded');
      });

      expect(() => indicatorStore.saveForSymbol('BTCUSD', '1h')).not.toThrow();
    });

    it('should handle localStorage.removeItem error', () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      expect(() => indicatorStore.clearForSymbol('BTCUSD', '1h')).not.toThrow();
    });

    it('should handle corrupted JSON in localStorage', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid json {{{');

      expect(() => indicatorStore.loadForSymbol('BTCUSD', '1h')).not.toThrow();
    });

    it('should handle whitespace-only timeframe', () => {
      indicatorStore.toggle('vwap', true);
      indicatorStore.saveForSymbol('BTCUSD', '   ');

      // Should treat as empty timeframe
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'lokifi:inds:BTCUSD',
        expect.any(String)
      );
    });
  });

  describe('State Isolation', () => {
    it('should not affect other symbols when loading', () => {
      // Save settings for BTCUSD
      indicatorStore.toggle('rsi', true);
      indicatorStore.saveForSymbol('BTCUSD', '1h');

      // Save different settings for ETHUSD
      indicatorStore.reset();
      indicatorStore.toggle('macd', true);
      indicatorStore.saveForSymbol('ETHUSD', '1h');

      // Load BTCUSD - should have RSI, not MACD
      indicatorStore.loadForSymbol('BTCUSD', '1h');
      expect(indicatorStore.get().flags.rsi).toBe(true);
      expect(indicatorStore.get().flags.macd).toBe(false);

      // Load ETHUSD - should have MACD, not RSI
      indicatorStore.loadForSymbol('ETHUSD', '1h');
      expect(indicatorStore.get().flags.rsi).toBe(false);
      expect(indicatorStore.get().flags.macd).toBe(true);
    });

    it('should not affect other timeframes when loading', () => {
      // Save settings for 1h
      indicatorStore.toggle('bband', true);
      indicatorStore.saveForSymbol('BTCUSD', '1h');

      // Save different settings for 1d
      indicatorStore.reset();
      indicatorStore.toggle('stddev', true);
      indicatorStore.saveForSymbol('BTCUSD', '1d');

      // Load 1h - should have bband, not stddev
      indicatorStore.loadForSymbol('BTCUSD', '1h');
      expect(indicatorStore.get().flags.bband).toBe(true);
      expect(indicatorStore.get().flags.stddev).toBe(false);
    });
  });
});
