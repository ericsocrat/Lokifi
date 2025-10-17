import { describe, expect, it } from 'vitest';
import { normalizeTf, SYMBOL_SUGGESTIONS, TF_PRESETS } from '../../../src/lib/utils/timeframes';

describe('timeframes', () => {
  describe('TF_PRESETS', () => {
    it('should have 7 standard timeframe presets', () => {
      expect(TF_PRESETS).toEqual(['1m', '5m', '15m', '1h', '4h', '1d', '1w']);
    });

    it('should be a readonly tuple', () => {
      expect(Array.isArray(TF_PRESETS)).toBe(true);
      expect(TF_PRESETS.length).toBe(7);
    });
  });

  describe('SYMBOL_SUGGESTIONS', () => {
    it('should include crypto pairs', () => {
      expect(SYMBOL_SUGGESTIONS).toContain('BTCUSDT');
      expect(SYMBOL_SUGGESTIONS).toContain('ETHUSDT');
      expect(SYMBOL_SUGGESTIONS).toContain('SOLUSDT');
    });

    it('should include stock symbols', () => {
      expect(SYMBOL_SUGGESTIONS).toContain('AAPL');
      expect(SYMBOL_SUGGESTIONS).toContain('MSFT');
      expect(SYMBOL_SUGGESTIONS).toContain('NVDA');
    });

    it('should include forex pairs', () => {
      expect(SYMBOL_SUGGESTIONS).toContain('EURUSD');
      expect(SYMBOL_SUGGESTIONS).toContain('GBPUSD');
      expect(SYMBOL_SUGGESTIONS).toContain('USDJPY');
    });

    it('should include commodities', () => {
      expect(SYMBOL_SUGGESTIONS).toContain('XAUUSD'); // Gold
    });
  });

  describe('normalizeTf', () => {
    // Basic timeframe formats
    it('should return lowercase trimmed timeframe as-is for standard formats', () => {
      expect(normalizeTf('1m')).toBe('1m');
      expect(normalizeTf('5m')).toBe('5m');
      expect(normalizeTf('1h')).toBe('1h');
      expect(normalizeTf('1d')).toBe('1d');
      expect(normalizeTf('1w')).toBe('1w');
    });

    it('should handle uppercase inputs', () => {
      expect(normalizeTf('1M')).toBe('1m');
      expect(normalizeTf('1H')).toBe('1h');
      expect(normalizeTf('1D')).toBe('1d');
      expect(normalizeTf('1W')).toBe('1w');
    });

    it('should handle whitespace', () => {
      expect(normalizeTf(' 1m ')).toBe('1m');
      expect(normalizeTf('  5m  ')).toBe('5m');
    });

    // Minute-only formats (no unit suffix)
    it('should convert minute values to appropriate units when no suffix', () => {
      // Minutes
      expect(normalizeTf('15')).toBe('15m');
      expect(normalizeTf('30')).toBe('30m');

      // 60m -> 1h
      expect(normalizeTf('60')).toBe('1h');
      expect(normalizeTf('120')).toBe('2h');
      expect(normalizeTf('240')).toBe('4h');

      // 1440m -> 1d (24 hours)
      expect(normalizeTf('1440')).toBe('1d');
      expect(normalizeTf('2880')).toBe('2d');

      // 10080m -> 1w (7 days)
      expect(normalizeTf('10080')).toBe('1w');
      expect(normalizeTf('20160')).toBe('2w');
    });

    // Note: Function only normalizes bare numbers, not values with units
    // So "60m" stays "60m", but "60" becomes "1h"
    it('should preserve values that already have units', () => {
      expect(normalizeTf('60m')).toBe('60m'); // Not normalized when unit present
      expect(normalizeTf('120m')).toBe('120m');
      expect(normalizeTf('1440m')).toBe('1440m');
      expect(normalizeTf('10080m')).toBe('10080m');
    });

    // Minutes that don't convert
    it('should keep minute format for non-convertible values', () => {
      expect(normalizeTf('7m')).toBe('7m');
      expect(normalizeTf('13m')).toBe('13m');
      expect(normalizeTf('45m')).toBe('45m');
    });

    // Hours
    it('should preserve hour format', () => {
      expect(normalizeTf('2h')).toBe('2h');
      expect(normalizeTf('6h')).toBe('6h');
      expect(normalizeTf('12h')).toBe('12h');
    });

    // Days
    it('should preserve day format', () => {
      expect(normalizeTf('2d')).toBe('2d');
      expect(normalizeTf('3d')).toBe('3d');
    });

    // Weeks
    it('should preserve week format', () => {
      expect(normalizeTf('2w')).toBe('2w');
      expect(normalizeTf('4w')).toBe('4w');
    });

    // Edge cases
    it('should handle zero values', () => {
      expect(normalizeTf('0')).toBe('0w'); // 0 % 10080 === 0, so converts to weeks
      expect(normalizeTf('0m')).toBe('0m'); // Unit present, not normalized
    });

    it('should handle large numbers', () => {
      expect(normalizeTf('100800')).toBe('10w'); // 100800 minutes = 10 weeks
      expect(normalizeTf('43200')).toBe('30d'); // 43200 minutes = 30 days
    });

    it('should handle invalid formats gracefully', () => {
      // Non-matching patterns should return lowercase trimmed value
      expect(normalizeTf('invalid')).toBe('invalid');
      expect(normalizeTf('1x')).toBe('1x');
      expect(normalizeTf('abc')).toBe('abc');
    });

    it('should handle mixed case units', () => {
      expect(normalizeTf('5M')).toBe('5m');
      expect(normalizeTf('1H')).toBe('1h');
      expect(normalizeTf('7D')).toBe('7d');
      expect(normalizeTf('2W')).toBe('2w');
    });
  });
});
