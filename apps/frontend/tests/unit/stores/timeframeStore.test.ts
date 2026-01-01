/**
 * @fileoverview Comprehensive tests for timeframeStore
 * Session 106: Small store tests for quick coverage wins
 *
 * Store: Simple vanilla JS store for timeframe selection
 * Pattern: Module-level state with get/set/subscribe
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { timeframeStore, type TF } from '@/lib/stores/timeframeStore';

describe('timeframeStore', () => {
  // Reset the store state before each test
  beforeEach(() => {
    // Reset to default value
    timeframeStore.set('1h');
  });

  describe('Initial State', () => {
    it('should have default timeframe of 1h', () => {
      expect(timeframeStore.get()).toBe('1h');
    });

    it('should be a valid TF type', () => {
      const validTimeframes: TF[] = [
        '1m',
        '5m',
        '15m',
        '30m',
        '1h',
        '4h',
        '1d',
        '1w',
        '1M',
      ];
      expect(validTimeframes).toContain(timeframeStore.get());
    });
  });

  describe('get()', () => {
    it('should return current timeframe', () => {
      const result = timeframeStore.get();
      expect(typeof result).toBe('string');
      expect(result).toBe('1h');
    });

    it('should return updated value after set', () => {
      timeframeStore.set('5m');
      expect(timeframeStore.get()).toBe('5m');
    });
  });

  describe('set()', () => {
    it.each([
      ['1m'],
      ['5m'],
      ['15m'],
      ['30m'],
      ['1h'],
      ['4h'],
      ['1d'],
      ['1w'],
      ['1M'],
    ] as [TF][])('should set timeframe to %s', (tf) => {
      timeframeStore.set(tf);
      expect(timeframeStore.get()).toBe(tf);
    });

    it('should notify all subscribers when set', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      timeframeStore.subscribe(listener1);
      timeframeStore.subscribe(listener2);

      timeframeStore.set('15m');

      expect(listener1).toHaveBeenCalledWith('15m');
      expect(listener2).toHaveBeenCalledWith('15m');
    });

    it('should call listeners with correct value on multiple sets', () => {
      const listener = vi.fn();
      timeframeStore.subscribe(listener);

      timeframeStore.set('1m');
      timeframeStore.set('1d');
      timeframeStore.set('1w');

      expect(listener).toHaveBeenCalledTimes(3);
      expect(listener).toHaveBeenNthCalledWith(1, '1m');
      expect(listener).toHaveBeenNthCalledWith(2, '1d');
      expect(listener).toHaveBeenNthCalledWith(3, '1w');
    });
  });

  describe('subscribe()', () => {
    it('should add a listener', () => {
      const listener = vi.fn();
      timeframeStore.subscribe(listener);

      timeframeStore.set('4h');

      expect(listener).toHaveBeenCalledWith('4h');
    });

    it('should return an unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = timeframeStore.subscribe(listener);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should stop calling listener after unsubscribe', () => {
      const listener = vi.fn();
      const unsubscribe = timeframeStore.subscribe(listener);

      timeframeStore.set('30m');
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      timeframeStore.set('1h');
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should support multiple subscriptions', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      timeframeStore.subscribe(listener1);
      timeframeStore.subscribe(listener2);
      timeframeStore.subscribe(listener3);

      timeframeStore.set('1M');

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);
    });

    it('should allow partial unsubscribe', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsub1 = timeframeStore.subscribe(listener1);
      timeframeStore.subscribe(listener2);

      timeframeStore.set('5m');
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);

      unsub1();

      timeframeStore.set('15m');
      expect(listener1).toHaveBeenCalledTimes(1); // Not called again
      expect(listener2).toHaveBeenCalledTimes(2); // Called again
    });
  });

  describe('Edge Cases', () => {
    it('should handle setting same value', () => {
      const listener = vi.fn();
      timeframeStore.subscribe(listener);

      timeframeStore.set('1h');
      timeframeStore.set('1h');

      // Still notifies even if value is the same (no optimization)
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple unsubscribes safely', () => {
      const listener = vi.fn();
      const unsubscribe = timeframeStore.subscribe(listener);

      unsubscribe();
      unsubscribe(); // Second unsubscribe should not throw

      timeframeStore.set('4h');
      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle rapid set calls', () => {
      const listener = vi.fn();
      timeframeStore.subscribe(listener);

      const timeframes: TF[] = [
        '1m',
        '5m',
        '15m',
        '30m',
        '1h',
        '4h',
        '1d',
        '1w',
        '1M',
      ];
      timeframes.forEach((tf) => timeframeStore.set(tf));

      expect(listener).toHaveBeenCalledTimes(9);
      expect(timeframeStore.get()).toBe('1M');
    });
  });

  describe('TypeScript Type Safety', () => {
    it('should only accept valid TF values', () => {
      // This test validates type safety at compile time
      // All these should work without TypeScript errors
      const validTFs: TF[] = [
        '1m',
        '5m',
        '15m',
        '30m',
        '1h',
        '4h',
        '1d',
        '1w',
        '1M',
      ];

      validTFs.forEach((tf) => {
        timeframeStore.set(tf);
        expect(timeframeStore.get()).toBe(tf);
      });
    });
  });
});
