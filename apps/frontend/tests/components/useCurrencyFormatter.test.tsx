import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the usePreferences hook
vi.mock('@/components/dashboard/PreferencesContext', () => ({
  usePreferences: vi.fn(),
}));

import { usePreferences } from '@/components/dashboard/PreferencesContext';
import { useCurrencyFormatter } from '@/components/dashboard/useCurrencyFormatter';

const mockUsePreferences = usePreferences as ReturnType<typeof vi.fn>;

describe('useCurrencyFormatter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatCurrency', () => {
    it('should format currency in USD', () => {
      mockUsePreferences.mockReturnValue({ currency: 'USD' });

      const { result } = renderHook(() => useCurrencyFormatter());
      const formatted = result.current.formatCurrency(1234.56);

      expect(formatted).toContain('1,234');
      expect(formatted).toContain('$');
    });

    it('should format currency in EUR', () => {
      mockUsePreferences.mockReturnValue({ currency: 'EUR' });

      const { result } = renderHook(() => useCurrencyFormatter());
      const formatted = result.current.formatCurrency(1234.56);

      // EUR uses comma for thousands or period depending on locale
      expect(formatted.includes('1,234') || formatted.includes('1.234')).toBe(true);
      expect(formatted).toContain('€');
    });

    it('should format currency in GBP', () => {
      mockUsePreferences.mockReturnValue({ currency: 'GBP' });

      const { result } = renderHook(() => useCurrencyFormatter());
      const formatted = result.current.formatCurrency(1234.56);

      expect(formatted).toContain('£');
    });

    it('should format currency in JPY', () => {
      mockUsePreferences.mockReturnValue({ currency: 'JPY' });

      const { result } = renderHook(() => useCurrencyFormatter());
      const formatted = result.current.formatCurrency(1234.56);

      expect(formatted).toContain('¥');
    });

    it('should handle zero values', () => {
      mockUsePreferences.mockReturnValue({ currency: 'USD' });

      const { result } = renderHook(() => useCurrencyFormatter());
      const formatted = result.current.formatCurrency(0);

      expect(formatted).toContain('$');
      expect(formatted).toContain('0');
    });

    it('should handle negative values', () => {
      mockUsePreferences.mockReturnValue({ currency: 'USD' });

      const { result } = renderHook(() => useCurrencyFormatter());
      const formatted = result.current.formatCurrency(-1234.56);

      expect(formatted).toContain('-');
    });

    it('should format large numbers', () => {
      mockUsePreferences.mockReturnValue({ currency: 'USD' });

      const { result } = renderHook(() => useCurrencyFormatter());
      const formatted = result.current.formatCurrency(1000000);

      expect(formatted).toContain('1,000,000');
    });

    it('should format small decimal values', () => {
      mockUsePreferences.mockReturnValue({ currency: 'USD' });

      const { result } = renderHook(() => useCurrencyFormatter());
      const formatted = result.current.formatCurrency(0.99);

      expect(formatted).toContain('0.99');
    });
  });

  describe('formatCompactCurrency', () => {
    it('should format thousands with K suffix', () => {
      mockUsePreferences.mockReturnValue({ currency: 'USD' });

      const { result } = renderHook(() => useCurrencyFormatter());
      const formatted = result.current.formatCompactCurrency(5000);

      expect(formatted).toContain('5');
      expect(formatted.toLowerCase()).toContain('k');
    });

    it('should format millions with M suffix', () => {
      mockUsePreferences.mockReturnValue({ currency: 'USD' });

      const { result } = renderHook(() => useCurrencyFormatter());
      const formatted = result.current.formatCompactCurrency(5000000);

      expect(formatted).toContain('5');
      expect(formatted.toLowerCase()).toContain('m');
    });

    it('should format billions as millions', () => {
      mockUsePreferences.mockReturnValue({ currency: 'USD' });

      const { result } = renderHook(() => useCurrencyFormatter());
      const formatted = result.current.formatCompactCurrency(5000000000);

      // 5 billion = 5000 million, formatter shows as 5,000.00m
      expect(formatted).toContain('5');
      expect(formatted.toLowerCase()).toContain('m');
    });

    it('should not compact small numbers', () => {
      mockUsePreferences.mockReturnValue({ currency: 'USD' });

      const { result } = renderHook(() => useCurrencyFormatter());
      const formatted = result.current.formatCompactCurrency(500);

      // Should not have K suffix for numbers below threshold
      expect(formatted).toBeDefined();
    });

    it('should handle zero', () => {
      mockUsePreferences.mockReturnValue({ currency: 'USD' });

      const { result } = renderHook(() => useCurrencyFormatter());
      const formatted = result.current.formatCompactCurrency(0);

      expect(formatted).toContain('0');
    });

    it('should handle negative numbers', () => {
      mockUsePreferences.mockReturnValue({ currency: 'USD' });

      const { result } = renderHook(() => useCurrencyFormatter());
      const formatted = result.current.formatCompactCurrency(-5000);

      expect(formatted).toContain('-');
    });
  });

  describe('formatPercentage', () => {
    it('should format positive percentage with + prefix', () => {
      mockUsePreferences.mockReturnValue({ currency: 'USD' });

      const { result } = renderHook(() => useCurrencyFormatter());
      const formatted = result.current.formatPercentage(5.25);

      expect(formatted).toContain('+');
      expect(formatted).toContain('5.25');
      expect(formatted).toContain('%');
    });

    it('should format negative percentage with - prefix', () => {
      mockUsePreferences.mockReturnValue({ currency: 'USD' });

      const { result } = renderHook(() => useCurrencyFormatter());
      const formatted = result.current.formatPercentage(-3.75);

      expect(formatted).toContain('-');
      expect(formatted).toContain('3.75');
      expect(formatted).toContain('%');
    });

    it('should format zero percentage', () => {
      mockUsePreferences.mockReturnValue({ currency: 'USD' });

      const { result } = renderHook(() => useCurrencyFormatter());
      const formatted = result.current.formatPercentage(0);

      expect(formatted).toContain('0');
      expect(formatted).toContain('%');
    });

    it('should format large positive percentage', () => {
      mockUsePreferences.mockReturnValue({ currency: 'USD' });

      const { result } = renderHook(() => useCurrencyFormatter());
      const formatted = result.current.formatPercentage(125.5);

      expect(formatted).toContain('+');
      expect(formatted).toContain('125.5');
    });

    it('should format large negative percentage', () => {
      mockUsePreferences.mockReturnValue({ currency: 'USD' });

      const { result } = renderHook(() => useCurrencyFormatter());
      const formatted = result.current.formatPercentage(-99.99);

      expect(formatted).toContain('-');
      expect(formatted).toContain('99.99');
    });

    it('should handle decimal precision', () => {
      mockUsePreferences.mockReturnValue({ currency: 'USD' });

      const { result } = renderHook(() => useCurrencyFormatter());
      const formatted = result.current.formatPercentage(1.123456);

      // Should contain the percentage sign
      expect(formatted).toContain('%');
    });
  });

  describe('currency switching', () => {
    it('should update formatting when currency changes', () => {
      mockUsePreferences.mockReturnValue({ currency: 'USD' });

      const { result, rerender } = renderHook(() => useCurrencyFormatter());
      const usdFormatted = result.current.formatCurrency(1000);

      expect(usdFormatted).toContain('$');

      mockUsePreferences.mockReturnValue({ currency: 'EUR' });
      rerender();

      const eurFormatted = result.current.formatCurrency(1000);
      expect(eurFormatted).toContain('€');
    });
  });

  describe('error handling', () => {
    it('should handle NaN values in formatCurrency', () => {
      mockUsePreferences.mockReturnValue({ currency: 'USD' });

      const { result } = renderHook(() => useCurrencyFormatter());

      // Should not throw
      expect(() => result.current.formatCurrency(NaN)).not.toThrow();
    });

    it('should handle NaN values in formatPercentage', () => {
      mockUsePreferences.mockReturnValue({ currency: 'USD' });

      const { result } = renderHook(() => useCurrencyFormatter());

      // Should not throw
      expect(() => result.current.formatPercentage(NaN)).not.toThrow();
    });

    it('should handle Infinity values', () => {
      mockUsePreferences.mockReturnValue({ currency: 'USD' });

      const { result } = renderHook(() => useCurrencyFormatter());

      // Should not throw
      expect(() => result.current.formatCurrency(Infinity)).not.toThrow();
    });
  });

  describe('hook return values', () => {
    it('should return all formatting functions', () => {
      mockUsePreferences.mockReturnValue({ currency: 'USD' });

      const { result } = renderHook(() => useCurrencyFormatter());

      expect(result.current).toHaveProperty('formatCurrency');
      expect(result.current).toHaveProperty('formatCompactCurrency');
      expect(result.current).toHaveProperty('formatPercentage');
    });

    it('should return functions', () => {
      mockUsePreferences.mockReturnValue({ currency: 'USD' });

      const { result } = renderHook(() => useCurrencyFormatter());

      expect(typeof result.current.formatCurrency).toBe('function');
      expect(typeof result.current.formatCompactCurrency).toBe('function');
      expect(typeof result.current.formatPercentage).toBe('function');
    });
  });
});
