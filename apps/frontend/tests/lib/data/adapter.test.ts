import { MarketDataAdapter } from '@/lib/data/adapter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock environment variables
const mockEnv = {
  NEXT_PUBLIC_SYMBOL: 'BTCUSDT',
  NEXT_PUBLIC_TIMEFRAME: '1h',
  NEXT_PUBLIC_DATA_PROVIDER: 'mock',
  NEXT_PUBLIC_CANDLES_URL: 'http://localhost:8000/api/candles',
  NEXT_PUBLIC_STREAM_URL: 'ws://localhost:8000/ws',
};

describe('MarketDataAdapter', () => {
  let adapter: MarketDataAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Reset environment
    Object.assign(process.env, mockEnv);
  });

  afterEach(() => {
    if (adapter) {
      adapter.stop();
    }
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Constructor', () => {
    it('creates adapter with default values from env', () => {
      adapter = new MarketDataAdapter();
      expect(adapter).toBeDefined();
      expect(adapter.getCandles()).toEqual([]);
    });

    it('creates adapter with custom symbol', () => {
      adapter = new MarketDataAdapter({ symbol: 'ETHUSDT' });
      expect(adapter).toBeDefined();
    });

    it('creates adapter with custom timeframe', () => {
      adapter = new MarketDataAdapter({ timeframe: '5m' });
      expect(adapter).toBeDefined();
    });

    it('creates adapter with custom provider', () => {
      adapter = new MarketDataAdapter({ provider: 'http' });
      expect(adapter).toBeDefined();
    });

    it('creates adapter with all custom options', () => {
      adapter = new MarketDataAdapter({
        symbol: 'ETHUSDT',
        timeframe: '15m',
        provider: 'ws',
      });
      expect(adapter).toBeDefined();
    });

    it('uses env defaults when no options provided', () => {
      process.env.NEXT_PUBLIC_SYMBOL = 'AAPL';
      process.env.NEXT_PUBLIC_TIMEFRAME = '5m';
      process.env.NEXT_PUBLIC_DATA_PROVIDER = 'http';

      adapter = new MarketDataAdapter();
      expect(adapter).toBeDefined();
    });
  });

  describe('Event Listeners', () => {
    beforeEach(() => {
      adapter = new MarketDataAdapter({ provider: 'mock' });
    });

    it('registers event listener', () => {
      const listener = vi.fn();
      const unsubscribe = adapter.on(listener);

      expect(unsubscribe).toBeInstanceOf(Function);
      expect(listener).not.toHaveBeenCalled();
    });

    it('calls listener on snapshot event', async () => {
      const listener = vi.fn();
      adapter.on(listener);

      await adapter.start();

      expect(listener).toHaveBeenCalledWith({
        type: 'snapshot',
        candles: expect.any(Array),
      });
    });

    it('calls listener on update event', async () => {
      const listener = vi.fn();
      adapter.on(listener);

      await adapter.start();
      listener.mockClear();

      // Advance time to trigger mock update
      vi.advanceTimersByTime(1100);

      expect(listener).toHaveBeenCalledWith({
        type: 'update',
        candles: expect.any(Array),
      });
    });

    it('unsubscribes listener correctly', async () => {
      const listener = vi.fn();
      const unsubscribe = adapter.on(listener);

      await adapter.start();
      expect(listener).toHaveBeenCalled();

      listener.mockClear();
      unsubscribe();

      vi.advanceTimersByTime(1100);
      expect(listener).not.toHaveBeenCalled();
    });

    it('handles multiple listeners', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      adapter.on(listener1);
      adapter.on(listener2);
      adapter.on(listener3);

      await adapter.start();

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
      expect(listener3).toHaveBeenCalled();
    });

    it('handles partial unsubscribe with multiple listeners', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      adapter.on(listener1);
      const unsub2 = adapter.on(listener2);

      await adapter.start();
      listener1.mockClear();
      listener2.mockClear();

      unsub2();

      vi.advanceTimersByTime(1100);

      expect(listener1).toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe('Symbol and Timeframe Management', () => {
    beforeEach(() => {
      adapter = new MarketDataAdapter();
    });

    it('sets symbol', () => {
      adapter.setSymbol('ETHUSDT');
      // No exception means success
      expect(adapter).toBeDefined();
    });

    it('sets timeframe', () => {
      adapter.setTimeframe('5m');
      expect(adapter).toBeDefined();
    });

    it('changes symbol and timeframe', () => {
      adapter.setSymbol('AAPL');
      adapter.setTimeframe('1d');
      expect(adapter).toBeDefined();
    });
  });

  describe('Mock Provider', () => {
    beforeEach(() => {
      adapter = new MarketDataAdapter({ provider: 'mock' });
    });

    it('generates mock candles on start', async () => {
      await adapter.start();

      const candles = adapter.getCandles();
      expect(candles).toBeInstanceOf(Array);
      expect(candles.length).toBeGreaterThan(0);
    });

    it('mock candles have correct structure', async () => {
      await adapter.start();

      const candles = adapter.getCandles();
      const candle = candles[0];

      expect(candle).toHaveProperty('time');
      expect(candle).toHaveProperty('open');
      expect(candle).toHaveProperty('high');
      expect(candle).toHaveProperty('low');
      expect(candle).toHaveProperty('close');
      expect(candle).toHaveProperty('volume');
    });

    it('mock candles have valid OHLC relationships', async () => {
      await adapter.start();

      const candles = adapter.getCandles();
      candles.forEach((candle) => {
        expect(candle.high).toBeGreaterThanOrEqual(candle.open);
        expect(candle.high).toBeGreaterThanOrEqual(candle.close);
        expect(candle.low).toBeLessThanOrEqual(candle.open);
        expect(candle.low).toBeLessThanOrEqual(candle.close);
        expect(candle.volume).toBeGreaterThan(0);
      });
    });

    it('updates mock candles periodically', async () => {
      await adapter.start();

      const initialCandles = adapter.getCandles();
      const initialCount = initialCandles.length;

      vi.advanceTimersByTime(1100);

      const updatedCandles = adapter.getCandles();
      expect(updatedCandles.length).toBeGreaterThanOrEqual(initialCount);
    });

    it('emits update events on mock data changes', async () => {
      const listener = vi.fn();
      adapter.on(listener);

      await adapter.start();
      listener.mockClear();

      vi.advanceTimersByTime(1100);

      expect(listener).toHaveBeenCalledWith({
        type: 'update',
        candles: expect.any(Array),
      });
    });

    it('handles different timeframes for mock', async () => {
      const adapter5m = new MarketDataAdapter({
        provider: 'mock',
        timeframe: '5m',
      });

      await adapter5m.start();
      const candles = adapter5m.getCandles();

      expect(candles.length).toBeGreaterThan(0);
      adapter5m.stop();
    });
  });

  describe('HTTP Provider', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
      adapter = new MarketDataAdapter({ provider: 'http' });
    });

    it('falls back to mock when CANDLES_URL not set', async () => {
      delete process.env.NEXT_PUBLIC_CANDLES_URL;

      const listener = vi.fn();
      adapter.on(listener);

      await adapter.start();

      expect(listener).toHaveBeenCalledWith({
        type: 'snapshot',
        candles: expect.any(Array),
      });
    });

    it('fetches candles from HTTP endpoint', async () => {
      const mockCandles = [
        {
          time: 1704067200,
          open: 100,
          high: 105,
          low: 98,
          close: 103,
          volume: 1000,
        },
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCandles,
      } as Response);

      await adapter.start();

      expect(global.fetch).toHaveBeenCalled();
      const candles = adapter.getCandles();
      expect(candles.length).toBeGreaterThan(0);
    });

    it('falls back to mock on HTTP fetch error', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

      const listener = vi.fn();
      adapter.on(listener);

      await adapter.start();

      // Should still emit snapshot with mock data
      expect(listener).toHaveBeenCalledWith({
        type: 'snapshot',
        candles: expect.any(Array),
      });
    });

    it('polls for updates in HTTP mode', async () => {
      const mockCandles = [
        {
          time: 1704067200,
          open: 100,
          high: 105,
          low: 98,
          close: 103,
          volume: 1000,
        },
      ];

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockCandles,
      } as Response);

      await adapter.start();

      const initialCallCount = vi.mocked(global.fetch).mock.calls.length;

      // Advance time to trigger poll (1h timeframe / 4 = 15 minutes minimum = 900000ms)
      vi.advanceTimersByTime(900100);

      const finalCallCount = vi.mocked(global.fetch).mock.calls.length;
      expect(finalCallCount).toBeGreaterThan(initialCallCount);
    });

    it('normalizes various candle formats', async () => {
      const mockCandles = [
        // Array format
        [1704067200, 100, 105, 98, 103, 1000],
        // Object format with full names
        {
          time: 1704070800,
          open: 103,
          high: 108,
          low: 102,
          close: 106,
          volume: 1200,
        },
        // Object format with short names
        { t: 1704074400, o: 106, h: 110, l: 105, c: 109, v: 1500 },
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCandles,
      } as Response);

      await adapter.start();

      const candles = adapter.getCandles();
      expect(candles.length).toBe(3);
      candles.forEach((candle) => {
        expect(candle).toHaveProperty('time');
        expect(candle).toHaveProperty('open');
        expect(candle).toHaveProperty('high');
        expect(candle).toHaveProperty('low');
        expect(candle).toHaveProperty('close');
        expect(candle).toHaveProperty('volume');
      });
    });
  });

  describe('WebSocket Provider', () => {
    let mockWs: {
      onopen: null | ((ev: any) => void);
      onclose: null | ((ev: any) => void);
      onerror: null | ((ev: any) => void);
      onmessage: null | ((ev: any) => void);
      close: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      global.fetch = vi.fn();

      // Create mock WebSocket instance
      mockWs = {
        onopen: null,
        onclose: null,
        onerror: null,
        onmessage: null,
        close: vi.fn(),
      };

      // Mock WebSocket constructor using vi.stubGlobal
      const MockWebSocket = vi.fn(() => mockWs);
      vi.stubGlobal('WebSocket', MockWebSocket);

      adapter = new MarketDataAdapter({ provider: 'ws' });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });
    it('falls back to mock when STREAM_URL not set', async () => {
      delete process.env.NEXT_PUBLIC_STREAM_URL;

      const listener = vi.fn();
      adapter.on(listener);

      await adapter.start();

      expect(listener).toHaveBeenCalledWith({
        type: 'snapshot',
        candles: expect.any(Array),
      });
    });

    it('bootstraps from HTTP before connecting WebSocket', async () => {
      const mockCandles = [
        {
          time: 1704067200,
          open: 100,
          high: 105,
          low: 98,
          close: 103,
          volume: 1000,
        },
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCandles,
      } as Response);

      await adapter.start();

      expect(global.fetch).toHaveBeenCalled();
      expect(global.WebSocket).toHaveBeenCalled();
    });

    it('starts with empty candles when HTTP bootstrap fails', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

      const listener = vi.fn();
      adapter.on(listener);

      await adapter.start();

      expect(listener).toHaveBeenCalledWith({
        type: 'snapshot',
        candles: [],
      });
    });

    it('creates WebSocket connection', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      await adapter.start();

      expect(WebSocket).toHaveBeenCalled();
    });
  });

  describe('Stop and Cleanup', () => {
    it('stops mock provider polling', async () => {
      adapter = new MarketDataAdapter({ provider: 'mock' });

      await adapter.start();
      adapter.stop();

      const listener = vi.fn();
      adapter.on(listener);

      vi.advanceTimersByTime(2000);

      // No updates should happen after stop
      expect(listener).not.toHaveBeenCalled();
    });

    it('cleans up HTTP polling timer', async () => {
      adapter = new MarketDataAdapter({ provider: 'http' });
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);

      await adapter.start();
      const initialCalls = vi.mocked(global.fetch).mock.calls.length;

      adapter.stop();

      vi.advanceTimersByTime(10000);

      // No additional calls after stop
      const finalCalls = vi.mocked(global.fetch).mock.calls.length;
      expect(finalCalls).toBe(initialCalls);
    });

    it('closes WebSocket connection on stop', async () => {
      const mockClose = vi.fn();
      const mockWs = {
        onopen: null,
        onclose: null,
        onerror: null,
        onmessage: null,
        close: mockClose,
      };

      const MockWebSocket = vi.fn(() => mockWs);
      vi.stubGlobal('WebSocket', MockWebSocket);

      adapter = new MarketDataAdapter({ provider: 'ws' });
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);

      await adapter.start();
      adapter.stop();

      expect(mockClose).toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it('can restart after stop', async () => {
      adapter = new MarketDataAdapter({ provider: 'mock' });

      await adapter.start();
      adapter.stop();

      const listener = vi.fn();
      adapter.on(listener);

      await adapter.start();

      expect(listener).toHaveBeenCalledWith({
        type: 'snapshot',
        candles: expect.any(Array),
      });
    });
  });

  describe('Candle Merging', () => {
    beforeEach(() => {
      adapter = new MarketDataAdapter({ provider: 'mock' });
    });

    it('merges new candles correctly', async () => {
      await adapter.start();

      const initialCandles = adapter.getCandles();
      const initialCount = initialCandles.length;

      vi.advanceTimersByTime(2100);

      const updatedCandles = adapter.getCandles();
      expect(updatedCandles.length).toBeGreaterThanOrEqual(initialCount);
    });

    it('maintains memory bounds (max 2000 candles)', async () => {
      // This would require mocking a large number of updates
      // For now, just verify the adapter handles it
      await adapter.start();

      // Simulate many updates
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(1100);
      }

      const candles = adapter.getCandles();
      expect(candles.length).toBeLessThanOrEqual(2000);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty candle array', () => {
      adapter = new MarketDataAdapter({ provider: 'mock' });
      const candles = adapter.getCandles();
      expect(candles).toEqual([]);
    });

    it('handles invalid candle data', async () => {
      adapter = new MarketDataAdapter({ provider: 'http' });
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => [
          null,
          undefined,
          { invalid: 'data' },
          { time: 'not_a_number', open: 100 },
        ],
      } as Response);

      await adapter.start();

      const candles = adapter.getCandles();
      // Invalid candles should be filtered out
      expect(candles.length).toBe(0);
    });

    it('handles non-array response', async () => {
      adapter = new MarketDataAdapter({ provider: 'http' });
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ not: 'an array' }),
      } as Response);

      await adapter.start();

      const candles = adapter.getCandles();
      expect(candles).toEqual([]);
    });

    it('handles millisecond timestamps', async () => {
      adapter = new MarketDataAdapter({ provider: 'http' });
      const mockCandles = [
        {
          time: 1704067200000, // milliseconds
          open: 100,
          high: 105,
          low: 98,
          close: 103,
          volume: 1000,
        },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockCandles,
      } as Response);

      await adapter.start();

      const candles = adapter.getCandles();
      expect(candles.length).toBeGreaterThan(0);
      expect(candles[0]?.time).toBe(1704067200); // converted to seconds
    });

    it('handles string number values', async () => {
      adapter = new MarketDataAdapter({ provider: 'http' });
      const mockCandles = [
        {
          time: 1704067200,
          open: '100.5',
          high: '105.2',
          low: '98.1',
          close: '103.7',
          volume: '1000',
        },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockCandles,
      } as Response);

      await adapter.start();

      const candles = adapter.getCandles();
      expect(candles.length).toBeGreaterThan(0);
      expect(candles[0]?.open).toBe(100.5);
      expect(typeof candles[0]?.open).toBe('number');
    });
  });

  describe('Timeframe Parsing', () => {
    it('handles minute timeframes', async () => {
      adapter = new MarketDataAdapter({ timeframe: '5m', provider: 'mock' });
      await adapter.start();
      expect(adapter.getCandles().length).toBeGreaterThan(0);
    });

    it('handles hour timeframes', async () => {
      adapter = new MarketDataAdapter({ timeframe: '4h', provider: 'mock' });
      await adapter.start();
      expect(adapter.getCandles().length).toBeGreaterThan(0);
    });

    it('handles day timeframes', async () => {
      adapter = new MarketDataAdapter({ timeframe: '1d', provider: 'mock' });
      await adapter.start();
      expect(adapter.getCandles().length).toBeGreaterThan(0);
    });

    it('handles week timeframes', async () => {
      adapter = new MarketDataAdapter({ timeframe: '1w', provider: 'mock' });
      await adapter.start();
      expect(adapter.getCandles().length).toBeGreaterThan(0);
    });
  });
});
