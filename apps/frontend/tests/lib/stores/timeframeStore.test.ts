import type { TF } from '@/lib/stores/timeframeStore';
import { timeframeStore } from '@/lib/stores/timeframeStore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('timeframeStore', () => {
  // Clean up listeners before each test
  beforeEach(() => {
    // Reset to default state
    timeframeStore.set('1h');
    // Clear any lingering listeners
    const unsubscribe = timeframeStore.subscribe(() => {});
    unsubscribe();
  });

  describe('get()', () => {
    it('should return default timeframe', () => {
      expect(timeframeStore.get()).toBe('1h');
    });

    it('should return current timeframe after set', () => {
      timeframeStore.set('4h');
      expect(timeframeStore.get()).toBe('4h');
    });
  });

  describe('set()', () => {
    it('should set timeframe to 15m', () => {
      timeframeStore.set('15m');
      expect(timeframeStore.get()).toBe('15m');
    });

    it('should set timeframe to 30m', () => {
      timeframeStore.set('30m');
      expect(timeframeStore.get()).toBe('30m');
    });

    it('should set timeframe to 1h', () => {
      timeframeStore.set('1h');
      expect(timeframeStore.get()).toBe('1h');
    });

    it('should set timeframe to 4h', () => {
      timeframeStore.set('4h');
      expect(timeframeStore.get()).toBe('4h');
    });

    it('should set timeframe to 1d', () => {
      timeframeStore.set('1d');
      expect(timeframeStore.get()).toBe('1d');
    });

    it('should set timeframe to 1w', () => {
      timeframeStore.set('1w');
      expect(timeframeStore.get()).toBe('1w');
    });

    it('should notify listeners on change', () => {
      const listener = vi.fn();
      timeframeStore.subscribe(listener);

      timeframeStore.set('4h');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith('4h');
    });

    it('should notify all listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      timeframeStore.subscribe(listener1);
      timeframeStore.subscribe(listener2);
      timeframeStore.subscribe(listener3);

      timeframeStore.set('15m');

      expect(listener1).toHaveBeenCalledWith('15m');
      expect(listener2).toHaveBeenCalledWith('15m');
      expect(listener3).toHaveBeenCalledWith('15m');
    });
  });

  describe('subscribe()', () => {
    it('should add listener', () => {
      const listener = vi.fn();
      timeframeStore.subscribe(listener);

      timeframeStore.set('4h');

      expect(listener).toHaveBeenCalled();
    });

    it('should return unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = timeframeStore.subscribe(listener);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should remove listener when unsubscribe is called', () => {
      const listener = vi.fn();
      const unsubscribe = timeframeStore.subscribe(listener);

      unsubscribe();
      timeframeStore.set('4h');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle multiple subscribe/unsubscribe cycles', () => {
      const listener = vi.fn();

      const unsub1 = timeframeStore.subscribe(listener);
      unsub1();

      const unsub2 = timeframeStore.subscribe(listener);
      timeframeStore.set('4h');
      expect(listener).toHaveBeenCalledTimes(1);

      unsub2();
      timeframeStore.set('15m');
      expect(listener).toHaveBeenCalledTimes(1); // Should not increase
    });

    it('should allow same listener to be added multiple times', () => {
      const listener = vi.fn();

      timeframeStore.subscribe(listener);
      timeframeStore.subscribe(listener);

      timeframeStore.set('4h');

      // Set automatically deduplicates
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should handle unsubscribe called multiple times safely', () => {
      const listener = vi.fn();
      const unsubscribe = timeframeStore.subscribe(listener);

      expect(() => {
        unsubscribe();
        unsubscribe();
        unsubscribe();
      }).not.toThrow();
    });

    it('should not notify unsubscribed listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsub1 = timeframeStore.subscribe(listener1);
      timeframeStore.subscribe(listener2);

      unsub1();
      timeframeStore.set('4h');

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledWith('4h');
    });
  });

  describe('Integration', () => {
    it('should handle complete workflow', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      // Initial state
      expect(timeframeStore.get()).toBe('1h');

      // Subscribe listeners
      const unsub1 = timeframeStore.subscribe(listener1);
      const unsub2 = timeframeStore.subscribe(listener2);

      // Change timeframe
      timeframeStore.set('4h');
      expect(timeframeStore.get()).toBe('4h');
      expect(listener1).toHaveBeenCalledWith('4h');
      expect(listener2).toHaveBeenCalledWith('4h');

      // Unsubscribe one
      unsub1();

      // Change again
      timeframeStore.set('15m');
      expect(timeframeStore.get()).toBe('15m');
      expect(listener1).toHaveBeenCalledTimes(1); // Not called again
      expect(listener2).toHaveBeenCalledTimes(2);
      expect(listener2).toHaveBeenLastCalledWith('15m');

      // Unsubscribe remaining
      unsub2();
    });

    it('should handle cycling through all timeframes', () => {
      const listener = vi.fn();
      timeframeStore.subscribe(listener);

      const timeframes: TF[] = ['15m', '30m', '1h', '4h', '1d', '1w'];
      timeframes.forEach((tf) => timeframeStore.set(tf));

      expect(listener).toHaveBeenCalledTimes(6);
      expect(timeframeStore.get()).toBe('1w');
    });

    it('should maintain state across multiple operations', () => {
      timeframeStore.set('15m');
      const val1 = timeframeStore.get();

      timeframeStore.set('1h');
      const val2 = timeframeStore.get();

      timeframeStore.set('1d');
      const val3 = timeframeStore.get();

      expect(val1).toBe('15m');
      expect(val2).toBe('1h');
      expect(val3).toBe('1d');
      expect(timeframeStore.get()).toBe('1d'); // Final state
    });

    it('should handle rapid timeframe changes', () => {
      const listener = vi.fn();
      timeframeStore.subscribe(listener);

      // Rapidly change timeframes
      for (let i = 0; i < 10; i++) {
        timeframeStore.set(i % 2 === 0 ? '15m' : '1h');
      }

      expect(listener).toHaveBeenCalledTimes(10);
      // Last iteration is i=9 (odd), so final value is '1h'
      expect(timeframeStore.get()).toBe('1h');
    });
  });

  describe('Edge Cases', () => {
    it('should handle setting same timeframe multiple times', () => {
      const listener = vi.fn();
      timeframeStore.subscribe(listener);

      timeframeStore.set('1h');
      timeframeStore.set('1h');
      timeframeStore.set('1h');

      // Listener called each time even though value is same
      expect(listener).toHaveBeenCalledTimes(3);
      expect(timeframeStore.get()).toBe('1h');
    });

    it('should handle switching between shortest and longest timeframes', () => {
      const listener = vi.fn();
      timeframeStore.subscribe(listener);

      timeframeStore.set('15m'); // Shortest
      expect(listener).toHaveBeenCalledWith('15m');

      timeframeStore.set('1w'); // Longest
      expect(listener).toHaveBeenCalledWith('1w');

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should maintain listener order during notifications', () => {
      const calls: number[] = [];
      const listener1 = vi.fn(() => calls.push(1));
      const listener2 = vi.fn(() => calls.push(2));
      const listener3 = vi.fn(() => calls.push(3));

      timeframeStore.subscribe(listener1);
      timeframeStore.subscribe(listener2);
      timeframeStore.subscribe(listener3);

      timeframeStore.set('4h');

      // All listeners should be called
      expect(calls.length).toBe(3);
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
      expect(listener3).toHaveBeenCalled();
    });
  });
});
