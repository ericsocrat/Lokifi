import { describe, expect, it } from 'vitest';

const API_URL = process.env.API_URL || 'http://localhost:8000';

describe('OHLC API Contract', () => {
  describe('GET /api/ohlc', () => {
    it('returns valid OHLC data structure', async () => {
      const response = await fetch(`${API_URL}/api/ohlc?symbol=BTCUSDT&timeframe=1h&limit=10`);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Contract assertions
      expect(data).toHaveProperty('candles');
      expect(Array.isArray(data.candles)).toBe(true);

      if (data.candles.length > 0) {
        const candle = data.candles[0];
        expect(candle).toHaveProperty('timestamp');
        expect(candle).toHaveProperty('open');
        expect(candle).toHaveProperty('high');
        expect(candle).toHaveProperty('low');
        expect(candle).toHaveProperty('close');
        expect(candle).toHaveProperty('volume');

        // Type checks
        expect(typeof candle.timestamp).toBe('number');
        expect(typeof candle.open).toBe('number');
        expect(typeof candle.high).toBe('number');
        expect(typeof candle.low).toBe('number');
        expect(typeof candle.close).toBe('number');
        expect(typeof candle.volume).toBe('number');

        // Data integrity
        expect(candle.high).toBeGreaterThanOrEqual(candle.low);
        expect(candle.high).toBeGreaterThanOrEqual(candle.open);
        expect(candle.high).toBeGreaterThanOrEqual(candle.close);
      }
    });

    it('validates symbol parameter', async () => {
      const response = await fetch(
        `${API_URL}/api/ohlc?symbol=INVALID_SYMBOL&timeframe=1h&limit=10`
      );

      // Should return 404 or 422 for invalid symbol
      expect([404, 422]).toContain(response.status);
    });

    it('validates timeframe parameter', async () => {
      const response = await fetch(
        `${API_URL}/api/ohlc?symbol=BTCUSDT&timeframe=invalid_timeframe&limit=10`
      );

      // Should return 422 for invalid timeframe
      expect(response.status).toBe(422);
    });

    it('respects limit parameter', async () => {
      const limit = 5;
      const response = await fetch(
        `${API_URL}/api/ohlc?symbol=BTCUSDT&timeframe=1h&limit=${limit}`
      );

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.candles.length).toBeLessThanOrEqual(limit);
    });

    it('returns data in correct time order', async () => {
      const response = await fetch(`${API_URL}/api/ohlc?symbol=BTCUSDT&timeframe=1h&limit=10`);

      expect(response.status).toBe(200);
      const data = await response.json();

      if (data.candles.length > 1) {
        for (let i = 1; i < data.candles.length; i++) {
          expect(data.candles[i].timestamp).toBeGreaterThanOrEqual(data.candles[i - 1].timestamp);
        }
      }
    });
  });

  describe('Performance', () => {
    it('responds within 500ms for small dataset', async () => {
      const startTime = Date.now();
      const response = await fetch(`${API_URL}/api/ohlc?symbol=BTCUSDT&timeframe=1h&limit=100`);
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
    });

    it('handles concurrent requests', async () => {
      const requests = Array(5)
        .fill(null)
        .map(() => fetch(`${API_URL}/api/ohlc?symbol=BTCUSDT&timeframe=1h&limit=10`));

      const responses = await Promise.all(requests);

      responses.forEach((response: any) => {
        expect(response.status).toBe(200);
      });
    });
  });
});
