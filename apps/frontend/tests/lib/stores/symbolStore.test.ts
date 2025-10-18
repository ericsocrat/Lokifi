import { beforeEach, describe, expect, it, vi } from 'vitest';

// Import the store - this will give us a fresh module
import { symbolStore } from '@/lib/stores/symbolStore';

describe('symbolStore', () => {
  // Clean up listeners before each test to prevent contamination
  beforeEach(() => {
    // Reset to default state
    symbolStore.set('BTCUSD');
    // Clear any lingering listeners by getting a fresh state
    const unsubscribe = symbolStore.subscribe(() => {});
    unsubscribe();
  });

  describe('get()', () => {
    it('should return default symbol', () => {
      expect(symbolStore.get()).toBe('BTCUSD');
    });

    it('should return current symbol after set', () => {
      symbolStore.set('ETHUSD');
      expect(symbolStore.get()).toBe('ETHUSD');
    });

    it('should return uppercase symbol', () => {
      symbolStore.set('btcusd');
      expect(symbolStore.get()).toBe('BTCUSD');
    });
  });

  describe('set()', () => {
    it('should set symbol to uppercase', () => {
      symbolStore.set('ethusd');
      expect(symbolStore.get()).toBe('ETHUSD');
    });

    it('should handle already uppercase symbol', () => {
      symbolStore.set('XRPUSD');
      expect(symbolStore.get()).toBe('XRPUSD');
    });

    it('should handle mixed case symbol', () => {
      symbolStore.set('AdAuSd');
      expect(symbolStore.get()).toBe('ADAUSD');
    });

    it('should notify listeners on change', () => {
      const listener = vi.fn();
      symbolStore.subscribe(listener);

      symbolStore.set('ETHUSD');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith('ETHUSD');
    });

    it('should notify listeners with uppercase symbol', () => {
      const listener = vi.fn();
      symbolStore.subscribe(listener);

      symbolStore.set('ethusd');

      expect(listener).toHaveBeenCalledWith('ETHUSD');
    });

    it('should notify all listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      symbolStore.subscribe(listener1);
      symbolStore.subscribe(listener2);
      symbolStore.subscribe(listener3);

      symbolStore.set('XRPUSD');

      expect(listener1).toHaveBeenCalledWith('XRPUSD');
      expect(listener2).toHaveBeenCalledWith('XRPUSD');
      expect(listener3).toHaveBeenCalledWith('XRPUSD');
    });

    it('should handle empty string', () => {
      symbolStore.set('');
      expect(symbolStore.get()).toBe('');
    });

    it('should handle special characters', () => {
      symbolStore.set('BTC-USD');
      expect(symbolStore.get()).toBe('BTC-USD');
    });

    it('should handle numbers in symbol', () => {
      symbolStore.set('btc2usd');
      expect(symbolStore.get()).toBe('BTC2USD');
    });
  });

  describe('subscribe()', () => {
    it('should add listener', () => {
      const listener = vi.fn();
      symbolStore.subscribe(listener);

      symbolStore.set('ETHUSD');

      expect(listener).toHaveBeenCalled();
    });

    it('should return unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = symbolStore.subscribe(listener);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should remove listener when unsubscribe is called', () => {
      const listener = vi.fn();
      const unsubscribe = symbolStore.subscribe(listener);

      unsubscribe();
      symbolStore.set('ETHUSD');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle multiple subscribe/unsubscribe cycles', () => {
      const listener = vi.fn();

      // Subscribe and unsubscribe multiple times
      const unsub1 = symbolStore.subscribe(listener);
      unsub1();

      const unsub2 = symbolStore.subscribe(listener);
      symbolStore.set('ETHUSD');
      expect(listener).toHaveBeenCalledTimes(1);

      unsub2();
      symbolStore.set('XRPUSD');
      expect(listener).toHaveBeenCalledTimes(1); // Should not increase
    });

    it('should allow same listener to be added multiple times', () => {
      const listener = vi.fn();

      // Subscribe same listener twice (Set will dedupe)
      symbolStore.subscribe(listener);
      symbolStore.subscribe(listener);

      symbolStore.set('ETHUSD');

      // Set automatically deduplicates, so listener called once
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should handle unsubscribe called multiple times safely', () => {
      const listener = vi.fn();
      const unsubscribe = symbolStore.subscribe(listener);

      // Call unsubscribe multiple times
      expect(() => {
        unsubscribe();
        unsubscribe();
        unsubscribe();
      }).not.toThrow();
    });

    it('should not notify unsubscribed listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsub1 = symbolStore.subscribe(listener1);
      symbolStore.subscribe(listener2);

      unsub1();
      symbolStore.set('ETHUSD');

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledWith('ETHUSD');
    });
  });

  describe('Integration', () => {
    it('should handle complete workflow', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      // Initial state
      expect(symbolStore.get()).toBe('BTCUSD');

      // Subscribe listeners
      const unsub1 = symbolStore.subscribe(listener1);
      const unsub2 = symbolStore.subscribe(listener2);

      // Change symbol
      symbolStore.set('ethusd');
      expect(symbolStore.get()).toBe('ETHUSD');
      expect(listener1).toHaveBeenCalledWith('ETHUSD');
      expect(listener2).toHaveBeenCalledWith('ETHUSD');

      // Unsubscribe one
      unsub1();

      // Change again
      symbolStore.set('xrpusd');
      expect(symbolStore.get()).toBe('XRPUSD');
      expect(listener1).toHaveBeenCalledTimes(1); // Not called again
      expect(listener2).toHaveBeenCalledTimes(2);
      expect(listener2).toHaveBeenLastCalledWith('XRPUSD');

      // Unsubscribe remaining
      unsub2();
    });

    it('should handle rapid symbol changes', () => {
      const listener = vi.fn();
      symbolStore.subscribe(listener);

      const symbols = ['BTCUSD', 'ETHUSD', 'XRPUSD', 'ADAUSD', 'DOTUSD'];
      symbols.forEach((sym) => symbolStore.set(sym));

      expect(listener).toHaveBeenCalledTimes(5);
      expect(symbolStore.get()).toBe('DOTUSD');
    });

    it('should maintain state across multiple operations', () => {
      symbolStore.set('BTCUSD');
      const val1 = symbolStore.get();

      symbolStore.set('ETHUSD');
      const val2 = symbolStore.get();

      symbolStore.set('xrpusd');
      const val3 = symbolStore.get();

      expect(val1).toBe('BTCUSD');
      expect(val2).toBe('ETHUSD');
      expect(val3).toBe('XRPUSD');
      expect(symbolStore.get()).toBe('XRPUSD'); // Final state
    });
  });

  describe('Edge Cases', () => {
    it('should handle setting same symbol multiple times', () => {
      const listener = vi.fn();
      symbolStore.subscribe(listener);

      symbolStore.set('BTCUSD');
      symbolStore.set('BTCUSD');
      symbolStore.set('BTCUSD');

      // Listener called each time even though value is same
      expect(listener).toHaveBeenCalledTimes(3);
      expect(symbolStore.get()).toBe('BTCUSD');
    });

    it('should handle symbols with spaces', () => {
      symbolStore.set('BTC USD');
      expect(symbolStore.get()).toBe('BTC USD');
    });

    it('should handle very long symbol names', () => {
      const longSymbol = 'A'.repeat(100);
      symbolStore.set(longSymbol);
      expect(symbolStore.get()).toBe(longSymbol);
    });

    it('should handle unicode characters', () => {
      symbolStore.set('btc€usd');
      expect(symbolStore.get()).toBe('BTC€USD');
    });

    it('should handle symbols with numbers and special chars', () => {
      symbolStore.set('btc-usd_v2.0');
      expect(symbolStore.get()).toBe('BTC-USD_V2.0');
    });
  });
});
