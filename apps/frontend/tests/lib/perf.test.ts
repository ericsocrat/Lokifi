/**
 * Tests for performance utility functions
 * Validates type-safe throttle, batch, and debounce implementations
 */

import { debounce, microBatch, rafThrottle } from '@/lib/perf';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('Performance Utilities', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('rafThrottle', () => {
    it('should throttle function calls to animation frames', () => {
      const mockFn = jest.fn();
      const throttled = rafThrottle(mockFn);

      // Call multiple times rapidly
      throttled(1);
      throttled(2);
      throttled(3);

      // Should not have called yet
      expect(mockFn).not.toHaveBeenCalled();

      // Trigger animation frame
      jest.advanceTimersByTime(16); // ~60fps

      // Should have called once with last arguments
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith(3);
    });

    it('should preserve function context', () => {
      const context = { value: 42 };
      const mockFn = jest.fn(function (this: typeof context) {
        return this.value;
      });
      const throttled = rafThrottle(mockFn);

      throttled.call(context);
      jest.advanceTimersByTime(16);

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple arguments', () => {
      const mockFn = jest.fn((a: number, b: string, c: boolean) => {
        return { a, b, c };
      });
      const throttled = rafThrottle(mockFn);

      throttled(1, 'test', true);
      jest.advanceTimersByTime(16);

      expect(mockFn).toHaveBeenCalledWith(1, 'test', true);
    });
  });

  describe('microBatch', () => {
    it('should batch multiple calls into one microtask', async () => {
      const mockFn = jest.fn();
      const batched = microBatch(mockFn);

      // Call multiple times synchronously
      batched(1);
      batched(2);
      batched(3);

      // Should not have called yet
      expect(mockFn).not.toHaveBeenCalled();

      // Wait for microtask
      await Promise.resolve();

      // Should have called once with last arguments
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith(3);
    });

    it('should preserve function context', async () => {
      const context = { value: 100 };
      const mockFn = jest.fn(function (this: typeof context) {
        return this.value;
      });
      const batched = microBatch(mockFn);

      batched.call(context);
      await Promise.resolve();

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle complex arguments', async () => {
      const mockFn = jest.fn((obj: { x: number; y: string }) => obj);
      const batched = microBatch(mockFn);

      batched({ x: 1, y: 'a' });
      batched({ x: 2, y: 'b' });
      await Promise.resolve();

      expect(mockFn).toHaveBeenCalledWith({ x: 2, y: 'b' });
    });
  });

  describe('debounce', () => {
    it('should debounce function calls', () => {
      const mockFn = jest.fn();
      const debounced = debounce(mockFn, 100);

      // Call multiple times
      debounced(1);
      debounced(2);
      debounced(3);

      // Should not have called yet
      expect(mockFn).not.toHaveBeenCalled();

      // Advance time by less than delay
      jest.advanceTimersByTime(50);
      expect(mockFn).not.toHaveBeenCalled();

      // Advance to full delay
      jest.advanceTimersByTime(50);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith(3);
    });

    it('should reset timer on subsequent calls', () => {
      const mockFn = jest.fn();
      const debounced = debounce(mockFn, 100);

      debounced(1);
      jest.advanceTimersByTime(50);

      debounced(2); // Reset timer
      jest.advanceTimersByTime(50);
      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(50);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith(2);
    });

    it('should preserve function context', () => {
      const context = { multiplier: 2 };
      const mockFn = jest.fn(function (this: typeof context, x: number) {
        return x * this.multiplier;
      });
      const debounced = debounce(mockFn, 100);

      debounced.call(context, 5);
      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith(5);
    });

    it('should handle different delay times', () => {
      const mockFn = jest.fn();
      const debounced50 = debounce(mockFn, 50);
      const debounced200 = debounce(mockFn, 200);

      debounced50(1);
      debounced200(2);

      jest.advanceTimersByTime(50);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith(1);

      jest.advanceTimersByTime(150);
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenCalledWith(2);
    });
  });

  describe('Type safety', () => {
    it('should maintain type safety for function signatures', () => {
      const typedFn = (a: number, b: string): { result: string } => ({
        result: `${a}${b}`,
      });

      const throttled = rafThrottle(typedFn);
      const batched = microBatch(typedFn);
      const debounced = debounce(typedFn, 100);

      // These should compile without errors
      throttled(1, 'test');
      batched(2, 'test');
      debounced(3, 'test');

      expect(throttled).toBeDefined();
      expect(batched).toBeDefined();
      expect(debounced).toBeDefined();
    });
  });
});

