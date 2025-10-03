'use client';
import { usePreferences } from './PreferencesContext';

const localeMap: Record<string, string> = {
  system: undefined as unknown as string, // will fall back to default
  us: 'en-US',
  europe: 'de-DE',
  nordic: 'fr-FR', // space thousands, comma decimal
  swiss: 'de-CH',
};

export function useCurrencyFormatter(currency: string = 'EUR') {
  const { numberFormat } = usePreferences();
  return (value: number) => {
    const locale = localeMap[numberFormat] || undefined;
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      return value.toLocaleString() + ' ' + currency;
    }
  };
}
