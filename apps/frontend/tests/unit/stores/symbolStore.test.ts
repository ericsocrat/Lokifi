/**
 * @fileoverview Comprehensive tests for symbolStore
 * Session 106: Small store tests for quick coverage wins
 *
 * Store: Simple vanilla JS store for symbol selection
 * Pattern: Module-level state with get/set/subscribe
 * Note: set() automatically converts to uppercase
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { symbolStore } from '@/lib/stores/symbolStore';

describe('symbolStore', () => {
  // Reset the store state before each test
  beforeEach(() => {
    // Reset to default value
    symbolStore.set('BTCUSD');
  });

  describe('Initial State', () => {
    it('should have default symbol of BTCUSD', () => {
      expect(symbolStore.get()).toBe('BTCUSD');
    });

    it('should be an uppercase string', () => {
      const symbol = symbolStore.get();
      expect(symbol).toBe(symbol.toUpperCase());
    });
  });

  describe('get()', () => {
    it('should return current symbol', () => {
      const result = symbolStore.get();
      expect(typeof result).toBe('string');
      expect(result).toBe('BTCUSD');
    });

    it('should return updated value after set', () => {
      symbolStore.set('ETHUSD');
      expect(symbolStore.get()).toBe('ETHUSD');
    });
  });

  describe('set()', () => {
    it('should set symbol value', () => {
      symbolStore.set('SOLUSD');
      expect(symbolStore.get()).toBe('SOLUSD');
    });

    it('should convert lowercase to uppercase', () => {
      symbolStore.set('btcusd');
      expect(symbolStore.get()).toBe('BTCUSD');
    });

    it('should convert mixed case to uppercase', () => {
      symbolStore.set('EthUsd');
      expect(symbolStore.get()).toBe('ETHUSD');
    });

    it('should notify all subscribers when set', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      symbolStore.subscribe(listener1);
      symbolStore.subscribe(listener2);

      symbolStore.set('ADAUSD');

      expect(listener1).toHaveBeenCalledWith('ADAUSD');
      expect(listener2).toHaveBeenCalledWith('ADAUSD');
    });

    it('should call listeners with uppercase value', () => {
      const listener = vi.fn();
      symbolStore.subscribe(listener);

      symbolStore.set('dotusd');

      expect(listener).toHaveBeenCalledWith('DOTUSD');
    });

    it('should handle common crypto symbols', () => {
      const symbols = [
        'BTCUSD',
        'ETHUSD',
        'SOLUSD',
        'ADAUSD',
        'XRPUSD',
        'DOTUSD',
        'AVAXUSD',
        'MATICUSD',
        'LINKUSD',
        'ATOMUSD',
      ];

      symbols.forEach((symbol) => {
        symbolStore.set(symbol);
        expect(symbolStore.get()).toBe(symbol);
      });
    });

    it('should handle forex pairs', () => {
      const pairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'];

      pairs.forEach((pair) => {
        symbolStore.set(pair);
        expect(symbolStore.get()).toBe(pair);
      });
    });

    it('should handle stock symbols', () => {
      const stocks = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];

      stocks.forEach((stock) => {
        symbolStore.set(stock);
        expect(symbolStore.get()).toBe(stock);
      });
    });
  });

  describe('setSymbol()', () => {
    it('should be an alias for set()', () => {
      symbolStore.setSymbol('LINKUSD');
      expect(symbolStore.get()).toBe('LINKUSD');
    });

    it('should also convert to uppercase', () => {
      symbolStore.setSymbol('avaxusd');
      expect(symbolStore.get()).toBe('AVAXUSD');
    });

    it('should notify subscribers', () => {
      const listener = vi.fn();
      symbolStore.subscribe(listener);

      symbolStore.setSymbol('NEARUSD');

      expect(listener).toHaveBeenCalledWith('NEARUSD');
    });
  });

  describe('subscribe()', () => {
    it('should add a listener', () => {
      const listener = vi.fn();
      symbolStore.subscribe(listener);

      symbolStore.set('ARBUSD');

      expect(listener).toHaveBeenCalledWith('ARBUSD');
    });

    it('should return an unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = symbolStore.subscribe(listener);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should stop calling listener after unsubscribe', () => {
      const listener = vi.fn();
      const unsubscribe = symbolStore.subscribe(listener);

      symbolStore.set('OPUSD');
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      symbolStore.set('APTUSD');
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should support multiple subscriptions', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      symbolStore.subscribe(listener1);
      symbolStore.subscribe(listener2);
      symbolStore.subscribe(listener3);

      symbolStore.set('INJUSD');

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);
    });

    it('should allow partial unsubscribe', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsub1 = symbolStore.subscribe(listener1);
      symbolStore.subscribe(listener2);

      symbolStore.set('TIAUSD');
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);

      unsub1();

      symbolStore.set('SUIUSD');
      expect(listener1).toHaveBeenCalledTimes(1); // Not called again
      expect(listener2).toHaveBeenCalledTimes(2); // Called again
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      symbolStore.set('');
      expect(symbolStore.get()).toBe('');
    });

    it('should handle symbols with numbers', () => {
      symbolStore.set('BTCUSD1');
      expect(symbolStore.get()).toBe('BTCUSD1');
    });

    it('should handle setting same value', () => {
      const listener = vi.fn();
      symbolStore.subscribe(listener);

      symbolStore.set('BTCUSD');
      symbolStore.set('BTCUSD');

      // Still notifies even if value is the same (no optimization)
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple unsubscribes safely', () => {
      const listener = vi.fn();
      const unsubscribe = symbolStore.subscribe(listener);

      unsubscribe();
      unsubscribe(); // Second unsubscribe should not throw

      symbolStore.set('PENDUSD');
      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle rapid set calls', () => {
      const listener = vi.fn();
      symbolStore.subscribe(listener);

      const symbols = [
        'BTCUSD',
        'ETHUSD',
        'SOLUSD',
        'ADAUSD',
        'XRPUSD',
        'DOTUSD',
        'AVAXUSD',
        'MATICUSD',
        'LINKUSD',
        'ATOMUSD',
      ];
      symbols.forEach((s) => symbolStore.set(s));

      expect(listener).toHaveBeenCalledTimes(10);
      expect(symbolStore.get()).toBe('ATOMUSD');
    });

    it('should handle special characters in uppercase conversion', () => {
      // Only uppercase letters are affected, numbers and special chars stay same
      symbolStore.set('btc/usd');
      expect(symbolStore.get()).toBe('BTC/USD');
    });

    it('should handle long symbol names', () => {
      const longSymbol = 'VERYLONGSYMBOLNAMEUSD';
      symbolStore.set(longSymbol);
      expect(symbolStore.get()).toBe(longSymbol);
    });
  });

  describe('Interaction between set() and setSymbol()', () => {
    it('should produce same result from both methods', () => {
      symbolStore.set('btcusd');
      const result1 = symbolStore.get();

      symbolStore.setSymbol('ethusd');
      symbolStore.setSymbol('btcusd');
      const result2 = symbolStore.get();

      expect(result1).toBe(result2);
    });

    it('should both notify the same subscribers', () => {
      const listener = vi.fn();
      symbolStore.subscribe(listener);

      symbolStore.set('BTCUSD');
      symbolStore.setSymbol('ETHUSD');

      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenNthCalledWith(1, 'BTCUSD');
      expect(listener).toHaveBeenNthCalledWith(2, 'ETHUSD');
    });
  });
});
