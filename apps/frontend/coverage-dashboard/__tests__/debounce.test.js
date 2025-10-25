/**
 * Tests for debounce functionality
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDebounce } from './utils';

describe('createDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Debounce Behavior', () => {
    it('should delay function execution', () => {
      const callback = vi.fn();
      const debounced = createDebounce(callback, 300);

      debounced();

      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300);

      expect(callback).toHaveBeenCalledOnce();
    });

    it('should use default delay of 300ms', () => {
      const callback = vi.fn();
      const debounced = createDebounce(callback);

      debounced();

      vi.advanceTimersByTime(299);
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(callback).toHaveBeenCalledOnce();
    });

    it('should use custom delay', () => {
      const callback = vi.fn();
      const debounced = createDebounce(callback, 500);

      debounced();

      vi.advanceTimersByTime(499);
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(callback).toHaveBeenCalledOnce();
    });
  });

  describe('Multiple Calls', () => {
    it('should cancel previous call when invoked again', () => {
      const callback = vi.fn();
      const debounced = createDebounce(callback, 300);

      debounced();
      vi.advanceTimersByTime(100);

      debounced();
      vi.advanceTimersByTime(100);

      debounced();
      vi.advanceTimersByTime(300);

      expect(callback).toHaveBeenCalledOnce();
    });

    it('should execute only once for rapid calls', () => {
      const callback = vi.fn();
      const debounced = createDebounce(callback, 300);

      for (let i = 0; i < 10; i++) {
        debounced();
        vi.advanceTimersByTime(50);
      }

      vi.advanceTimersByTime(300);

      expect(callback).toHaveBeenCalledOnce();
    });

    it('should execute multiple times if calls are spaced out', () => {
      const callback = vi.fn();
      const debounced = createDebounce(callback, 300);

      debounced();
      vi.advanceTimersByTime(300);

      debounced();
      vi.advanceTimersByTime(300);

      debounced();
      vi.advanceTimersByTime(300);

      expect(callback).toHaveBeenCalledTimes(3);
    });
  });

  describe('Argument Passing', () => {
    it('should pass single argument to callback', () => {
      const callback = vi.fn();
      const debounced = createDebounce(callback, 300);

      debounced('test-value');
      vi.advanceTimersByTime(300);

      expect(callback).toHaveBeenCalledWith('test-value');
    });

    it('should pass multiple arguments to callback', () => {
      const callback = vi.fn();
      const debounced = createDebounce(callback, 300);

      debounced('arg1', 'arg2', 'arg3');
      vi.advanceTimersByTime(300);

      expect(callback).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
    });

    it('should use most recent arguments after multiple calls', () => {
      const callback = vi.fn();
      const debounced = createDebounce(callback, 300);

      debounced('first');
      vi.advanceTimersByTime(100);

      debounced('second');
      vi.advanceTimersByTime(100);

      debounced('third');
      vi.advanceTimersByTime(300);

      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith('third');
    });

    it('should handle no arguments', () => {
      const callback = vi.fn();
      const debounced = createDebounce(callback, 300);

      debounced();
      vi.advanceTimersByTime(300);

      expect(callback).toHaveBeenCalledWith();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero delay', () => {
      const callback = vi.fn();
      const debounced = createDebounce(callback, 0);

      debounced();
      vi.advanceTimersByTime(0);

      expect(callback).toHaveBeenCalledOnce();
    });

    it('should handle very long delay', () => {
      const callback = vi.fn();
      const debounced = createDebounce(callback, 10000);

      debounced();
      vi.advanceTimersByTime(9999);
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(callback).toHaveBeenCalledOnce();
    });

    it('should be reusable after execution', () => {
      const callback = vi.fn();
      const debounced = createDebounce(callback, 300);

      debounced();
      vi.advanceTimersByTime(300);
      expect(callback).toHaveBeenCalledOnce();

      debounced();
      vi.advanceTimersByTime(300);
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should handle callback that throws error', () => {
      const callback = vi.fn(() => {
        throw new Error('Test error');
      });
      const debounced = createDebounce(callback, 300);

      debounced();

      expect(() => {
        vi.advanceTimersByTime(300);
      }).toThrow('Test error');
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should simulate search input debouncing', () => {
      const search = vi.fn();
      const debouncedSearch = createDebounce(search, 300);

      // User types "hello" quickly
      debouncedSearch('h');
      vi.advanceTimersByTime(50);
      debouncedSearch('he');
      vi.advanceTimersByTime(50);
      debouncedSearch('hel');
      vi.advanceTimersByTime(50);
      debouncedSearch('hell');
      vi.advanceTimersByTime(50);
      debouncedSearch('hello');

      // Search hasn't executed yet
      expect(search).not.toHaveBeenCalled();

      // User stops typing
      vi.advanceTimersByTime(300);

      // Search executes once with final value
      expect(search).toHaveBeenCalledOnce();
      expect(search).toHaveBeenCalledWith('hello');
    });

    it('should simulate window resize debouncing', () => {
      const handleResize = vi.fn();
      const debouncedResize = createDebounce(handleResize, 200);

      // Simulate rapid resize events
      for (let i = 0; i < 20; i++) {
        debouncedResize();
        vi.advanceTimersByTime(10);
      }

      // Handler hasn't executed during resize
      expect(handleResize).not.toHaveBeenCalled();

      // User stops resizing
      vi.advanceTimersByTime(200);

      // Handler executes once
      expect(handleResize).toHaveBeenCalledOnce();
    });
  });
});
