/**
 * @vitest-environment jsdom
 */
import { QuickStats } from '@/components/markets/QuickStats';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock the PreferencesContext that useCurrencyFormatter depends on
vi.mock('@/components/dashboard/PreferencesContext', () => ({
  usePreferences: () => ({
    currency: 'USD',
  }),
}));

// Mock the currency formatter hook
vi.mock('@/components/dashboard/useCurrencyFormatter', () => ({
  useCurrencyFormatter: () => ({
    formatCurrency: (value: number) => `$${(value / 1e9).toFixed(2)}B`,
  }),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  TrendingDown: () => <div data-testid="trending-down-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  DollarSign: () => <div data-testid="dollar-sign-icon" />,
}));

describe('QuickStats', () => {
  const mockAssets = [
    {
      symbol: 'BTC',
      price_change_percentage_24h: 5.5,
      total_volume: 1000000000,
      market_cap: 50000000000,
    },
    {
      symbol: 'ETH',
      price_change_percentage_24h: -2.3,
      total_volume: 500000000,
      market_cap: 25000000000,
    },
    {
      symbol: 'ADA',
      price_change_percentage_24h: 3.1,
      total_volume: 300000000,
      market_cap: 10000000000,
    },
  ];

  describe('Rendering', () => {
    it('should render all stat cards', () => {
      render(<QuickStats data={mockAssets} />);

      expect(screen.getByText('Total Assets')).toBeInTheDocument();
      expect(screen.getByText('Avg 24h Change')).toBeInTheDocument();
    });

    it('should not render when data is empty', () => {
      const { container } = render(<QuickStats data={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('should display correct total asset count', () => {
      render(<QuickStats data={mockAssets} />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should display gainer and loser counts', () => {
      render(<QuickStats data={mockAssets} />);
      // 2 gainers (BTC, ADA) and 1 loser (ETH)
      expect(screen.getByText('2 up · 1 down')).toBeInTheDocument();
    });
  });

  describe('Average Change Calculation', () => {
    it('should calculate positive average change correctly', () => {
      const positiveAssets = [
        { price_change_percentage_24h: 5.0 },
        { price_change_percentage_24h: 3.0 },
        { price_change_percentage_24h: 4.0 },
      ];
      render(<QuickStats data={positiveAssets} />);

      // Average: (5 + 3 + 4) / 3 = 4.00
      expect(screen.getByText('+4.00%')).toBeInTheDocument();
    });

    it('should calculate negative average change correctly', () => {
      const negativeAssets = [
        { price_change_percentage_24h: -5.0 },
        { price_change_percentage_24h: -3.0 },
        { price_change_percentage_24h: -4.0 },
      ];
      render(<QuickStats data={negativeAssets} />);

      // Average: (-5 -3 -4) / 3 = -4.00
      expect(screen.getByText('-4.00%')).toBeInTheDocument();
    });

    it('should calculate mixed average change correctly', () => {
      render(<QuickStats data={mockAssets} />);

      // Average: (5.5 - 2.3 + 3.1) / 3 = 2.10
      expect(screen.getByText('+2.10%')).toBeInTheDocument();
    });

    it('should show correct icon for positive average', () => {
      const positiveAssets = [{ price_change_percentage_24h: 5.0 }];
      render(<QuickStats data={positiveAssets} />);

      expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument();
    });

    it('should show correct icon for negative average', () => {
      const negativeAssets = [{ price_change_percentage_24h: -5.0 }];
      render(<QuickStats data={negativeAssets} />);

      expect(screen.getByTestId('trending-down-icon')).toBeInTheDocument();
    });
  });

  describe('Market Cap Display', () => {
    it('should not show market cap by default', () => {
      render(<QuickStats data={mockAssets} />);
      expect(screen.queryByText('Total Market Cap')).not.toBeInTheDocument();
    });

    it('should show market cap when showMarketCap is true', () => {
      render(<QuickStats data={mockAssets} showMarketCap={true} />);
      expect(screen.getByText('Total Market Cap')).toBeInTheDocument();
    });

    it('should not show market cap when total is 0', () => {
      const assetsWithoutMarketCap = [{ price_change_percentage_24h: 5.0, total_volume: 1000000 }];
      render(<QuickStats data={assetsWithoutMarketCap} showMarketCap={true} />);
      expect(screen.queryByText('Total Market Cap')).not.toBeInTheDocument();
    });

    it('should display market cap in billions', () => {
      render(<QuickStats data={mockAssets} showMarketCap={true} />);
      // Total: 50B + 25B + 10B = 85B
      expect(screen.getByText('$85.00B')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle assets without price_change_percentage_24h', () => {
      const assetsWithoutChange = [{ symbol: 'BTC', total_volume: 1000000000 }, { symbol: 'ETH' }];
      render(<QuickStats data={assetsWithoutChange} />);

      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('0 up · 0 down')).toBeInTheDocument();
      expect(screen.getByText('+0.00%')).toBeInTheDocument();
    });

    it('should handle single asset', () => {
      const singleAsset = [{ price_change_percentage_24h: 5.5 }];
      render(<QuickStats data={singleAsset} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('1 up · 0 down')).toBeInTheDocument();
    });

    it('should handle assets with null/undefined values', () => {
      const assetsWithNulls = [
        { price_change_percentage_24h: 5.0, total_volume: null, market_cap: undefined },
        { price_change_percentage_24h: null, total_volume: 1000000, market_cap: 5000000 },
      ];
      render(<QuickStats data={assetsWithNulls} />);

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should handle zero values correctly', () => {
      const assetsWithZeros = [{ price_change_percentage_24h: 0, total_volume: 0, market_cap: 0 }];
      render(<QuickStats data={assetsWithZeros} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('+0.00%')).toBeInTheDocument();
    });

    it('should handle large numbers correctly', () => {
      const largeAssets = [
        {
          price_change_percentage_24h: 999.99,
          total_volume: 999999999999,
          market_cap: 999999999999,
        },
      ];
      render(<QuickStats data={largeAssets} showMarketCap={true} />);

      expect(screen.getByText('+999.99%')).toBeInTheDocument();
      // $1000.00B appears in both Market Cap and 24h Volume cards
      const moneyElements = screen.getAllByText('$1000.00B');
      expect(moneyElements.length).toBeGreaterThan(0);
    });

    it('should handle negative market cap gracefully', () => {
      const negativeMarketCap = [{ market_cap: -1000000000 }];
      render(<QuickStats data={negativeMarketCap} showMarketCap={true} />);

      // Should not show market cap for negative values
      expect(screen.queryByText('Total Market Cap')).not.toBeInTheDocument();
    });
  });

  describe('Styling and Icons', () => {
    it('should render Activity icon for Total Assets', () => {
      render(<QuickStats data={mockAssets} />);
      const activityIcons = screen.getAllByTestId('activity-icon');
      expect(activityIcons.length).toBeGreaterThan(0);
    });

    it('should render DollarSign icon for Market Cap', () => {
      render(<QuickStats data={mockAssets} showMarketCap={true} />);
      expect(screen.getByTestId('dollar-sign-icon')).toBeInTheDocument();
    });

    it('should apply green color class for positive change', () => {
      const positiveAssets = [{ price_change_percentage_24h: 5.0 }];
      const { container } = render(<QuickStats data={positiveAssets} />);

      const percentageElement = screen.getByText('+5.00%');
      expect(percentageElement.className).toContain('text-green-500');
    });

    it('should apply red color class for negative change', () => {
      const negativeAssets = [{ price_change_percentage_24h: -5.0 }];
      const { container } = render(<QuickStats data={negativeAssets} />);

      const percentageElement = screen.getByText('-5.00%');
      expect(percentageElement.className).toContain('text-red-500');
    });
  });
});
