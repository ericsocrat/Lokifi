'use client';

import { usePreferences } from './PreferencesContext';

export function useCurrencyFormatter() {
  const { currency } = usePreferences();

  const formatCurrency = (value: number): string => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    } catch (error) {
      console.error('Error formatting currency:', error);
      return `$${value.toFixed(2)}`;
    }
  };

  const formatCompactCurrency = (value: number): string => {
    try {
      if (value >= 1000000) {
        return formatCurrency(value / 1000000) + 'M';
      } else if (value >= 1000) {
        return formatCurrency(value / 1000) + 'K';
      }
      return formatCurrency(value);
    } catch (error) {
      console.error('Error formatting compact currency:', error);
      return `$${value.toFixed(2)}`;
    }
  };

  const formatPercentage = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return {
    formatCurrency,
    formatCompactCurrency,
    formatPercentage,
  };
}
