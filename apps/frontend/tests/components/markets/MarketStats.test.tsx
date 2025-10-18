/**
 * @vitest-environment jsdom
 */
import { MarketStats } from '@/components/markets/MarketStats';
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
  DollarSign: () => <div data-testid="dollar-sign-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
}));

describe('MarketStats', () => {
  const mockCrypto = [
    {
      symbol: 'BTC',
      price_change_percentage_24h: 5.5,
      market_cap: 50000000000,
    },
    {
      symbol: 'ETH',
      price_change_percentage_24h: -2.3,
      market_cap: 25000000000,
    },
  ];

  const mockStocks = [
    {
      symbol: 'AAPL',
      price_change_percentage_24h: 1.8,
      market_cap: 3000000000000,
    },
  ];

  const mockIndices = [
    {
      symbol: 'SPX',
      price_change_percentage_24h: 0.5,
    },
  ];

  const mockForex = [
    {
      symbol: 'EURUSD',
      price_change_percentage_24h: -0.2,
    },
  ];

  describe('Rendering', () => {
    it('should render Market Overview title', () => {
      render(<MarketStats data={{ crypto: mockCrypto }} />);
      expect(screen.getByText('Market Overview')).toBeInTheDocument();
    });

    it('should not render when all data arrays are empty', () => {
      const { container } = render(<MarketStats data={{}} />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when data object has empty arrays', () => {
      const { container } = render(
        <MarketStats data={{ crypto: [], stocks: [], indices: [], forex: [] }} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render with only crypto data', () => {
      render(<MarketStats data={{ crypto: mockCrypto }} />);
      expect(screen.getByText('Market Overview')).toBeInTheDocument();
    });

    it('should render with mixed data types', () => {
      render(
        <MarketStats
          data={{
            crypto: mockCrypto,
            stocks: mockStocks,
            indices: mockIndices,
            forex: mockForex,
          }}
        />
      );
      expect(screen.getByText('Market Overview')).toBeInTheDocument();
    });
  });

  describe('Total Market Cap', () => {
    it('should display total market cap from crypto', () => {
      render(<MarketStats data={{ crypto: mockCrypto }} />);
      // 50B + 25B = 75B
      expect(screen.getByText('$75.00B')).toBeInTheDocument();
    });

    it('should display total market cap from crypto and stocks', () => {
      render(<MarketStats data={{ crypto: mockCrypto, stocks: mockStocks }} />);
      // 50B + 25B + 3000B = 3075B
      expect(screen.getByText('$3075.00B')).toBeInTheDocument();
    });

    it('should not include market cap from indices and forex', () => {
      render(
        <MarketStats
          data={{
            crypto: mockCrypto,
            indices: mockIndices,
            forex: mockForex,
          }}
        />
      );
      // Only crypto: 50B + 25B = 75B
      expect(screen.getByText('$75.00B')).toBeInTheDocument();
    });

    it('should display asset counts correctly', () => {
      render(<MarketStats data={{ crypto: mockCrypto, stocks: mockStocks }} />);
      expect(screen.getByText('2 crypto + 1 stocks')).toBeInTheDocument();
    });

    it('should not render market cap card when total is 0', () => {
      render(<MarketStats data={{ indices: mockIndices }} />);
      expect(screen.queryByText('Total Market Cap')).not.toBeInTheDocument();
    });
  });

  describe('Average Change Calculation', () => {
    it('should calculate positive average change', () => {
      const positiveAssets = [
        { symbol: 'A', price_change_percentage_24h: 5.0 },
        { symbol: 'B', price_change_percentage_24h: 3.0 },
      ];
      render(<MarketStats data={{ crypto: positiveAssets }} />);
      // (5 + 3) / 2 = 4.00
      expect(screen.getByText('+4.00%')).toBeInTheDocument();
    });

    it('should calculate negative average change', () => {
      const negativeAssets = [
        { symbol: 'A', price_change_percentage_24h: -5.0 },
        { symbol: 'B', price_change_percentage_24h: -3.0 },
      ];
      render(<MarketStats data={{ crypto: negativeAssets }} />);
      // (-5 -3) / 2 = -4.00
      expect(screen.getByText('-4.00%')).toBeInTheDocument();
    });

    it('should calculate mixed average change', () => {
      render(<MarketStats data={{ crypto: mockCrypto }} />);
      // (5.5 - 2.3) / 2 = 1.60
      expect(screen.getByText('+1.60%')).toBeInTheDocument();
    });

    it('should display correct asset count in subtitle', () => {
      render(
        <MarketStats
          data={{
            crypto: mockCrypto,
            stocks: mockStocks,
            indices: mockIndices,
          }}
        />
      );
      // 2 crypto + 1 stock + 1 index = 4 assets
      expect(screen.getByText('Across 4 assets')).toBeInTheDocument();
    });

    it('should show TrendingUp icon for positive average', () => {
      const positiveAssets = [{ symbol: 'BTC', price_change_percentage_24h: 5.0 }];
      render(<MarketStats data={{ crypto: positiveAssets }} />);
      const trendingUpIcons = screen.getAllByTestId('trending-up-icon');
      expect(trendingUpIcons.length).toBeGreaterThan(0);
    });

    it('should show TrendingDown icon for negative average', () => {
      const negativeAssets = [{ symbol: 'BTC', price_change_percentage_24h: -5.0 }];
      render(<MarketStats data={{ crypto: negativeAssets }} />);
      const trendingDownIcons = screen.getAllByTestId('trending-down-icon');
      expect(trendingDownIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Top Gainer', () => {
    it('should display the top gainer', () => {
      render(<MarketStats data={{ crypto: mockCrypto }} />);
      expect(screen.getByText('Top Gainer')).toBeInTheDocument();
      expect(screen.getByText('BTC')).toBeInTheDocument();
      expect(screen.getByText('+5.50%')).toBeInTheDocument();
    });

    it('should find top gainer across all asset types', () => {
      const allData = {
        crypto: [{ symbol: 'BTC', price_change_percentage_24h: 5.0 }],
        stocks: [{ symbol: 'AAPL', price_change_percentage_24h: 10.0 }],
        indices: [{ symbol: 'SPX', price_change_percentage_24h: 2.0 }],
      };
      render(<MarketStats data={allData} />);
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('+10.00%')).toBeInTheDocument();
    });

    it('should handle single asset as top gainer', () => {
      const singleAsset = [{ symbol: 'BTC', price_change_percentage_24h: 5.0 }];
      render(<MarketStats data={{ crypto: singleAsset }} />);
      // BTC appears in both Top Gainer and Top Loser cards when there's only one asset
      const btcElements = screen.getAllByText('BTC');
      expect(btcElements.length).toBeGreaterThan(0);
    });
  });

  describe('Top Loser', () => {
    it('should display the top loser', () => {
      render(<MarketStats data={{ crypto: mockCrypto }} />);
      expect(screen.getByText('Top Loser')).toBeInTheDocument();
      expect(screen.getByText('ETH')).toBeInTheDocument();
      expect(screen.getByText('-2.30%')).toBeInTheDocument();
    });

    it('should find top loser across all asset types', () => {
      const allData = {
        crypto: [{ symbol: 'BTC', price_change_percentage_24h: -2.0 }],
        stocks: [{ symbol: 'AAPL', price_change_percentage_24h: -5.0 }],
        forex: [{ symbol: 'EURUSD', price_change_percentage_24h: -1.0 }],
      };
      render(<MarketStats data={allData} />);
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('-5.00%')).toBeInTheDocument();
    });

    it('should handle when top loser is same as top gainer (single asset)', () => {
      const singleAsset = [{ symbol: 'BTC', price_change_percentage_24h: 5.0 }];
      render(<MarketStats data={{ crypto: singleAsset }} />);
      // Both should show BTC
      const btcElements = screen.getAllByText('BTC');
      expect(btcElements).toHaveLength(2); // One for gainer, one for loser
    });
  });

  describe('Edge Cases', () => {
    it('should handle assets without price_change_percentage_24h', () => {
      const assetsWithoutChange = [
        { symbol: 'BTC', market_cap: 50000000000 },
        { symbol: 'ETH', market_cap: 25000000000, price_change_percentage_24h: 5.0 },
      ];
      render(<MarketStats data={{ crypto: assetsWithoutChange }} />);

      // Should only use ETH for average calculation
      expect(screen.getByText('Across 2 assets')).toBeInTheDocument();
    });

    it('should handle null/undefined price changes', () => {
      const assetsWithNulls = [
        { symbol: 'BTC', price_change_percentage_24h: null },
        { symbol: 'ETH', price_change_percentage_24h: undefined },
        { symbol: 'ADA', price_change_percentage_24h: 5.0 },
      ];
      render(<MarketStats data={{ crypto: assetsWithNulls as any }} />);

      // +5.00% appears in both average change and top gainer/loser cards
      const percentElements = screen.getAllByText('+5.00%');
      expect(percentElements.length).toBeGreaterThan(0);
    });

    it('should handle zero market cap', () => {
      const zeroCapAssets = [{ symbol: 'BTC', price_change_percentage_24h: 5.0, market_cap: 0 }];
      render(<MarketStats data={{ crypto: zeroCapAssets }} />);

      // Should not show market cap card
      expect(screen.queryByText('Total Market Cap')).not.toBeInTheDocument();
    });

    it('should handle negative price changes correctly', () => {
      const negativeAssets = [{ symbol: 'BTC', price_change_percentage_24h: -10.5 }];
      render(<MarketStats data={{ crypto: negativeAssets }} />);

      // -10.50% appears in both average change and top loser cards
      const percentElements = screen.getAllByText('-10.50%');
      expect(percentElements.length).toBeGreaterThan(0);
    });

    it('should handle large numbers', () => {
      const largeNumbers = [
        { symbol: 'BTC', price_change_percentage_24h: 999.99, market_cap: 999999999999 },
      ];
      render(<MarketStats data={{ crypto: largeNumbers }} />);

      // +999.99% appears in both average change and top gainer cards
      const percentElements = screen.getAllByText('+999.99%');
      expect(percentElements.length).toBeGreaterThan(0);
      expect(screen.getByText('$1000.00B')).toBeInTheDocument();
    });
    it('should memoize calculations correctly', () => {
      const { rerender } = render(<MarketStats data={{ crypto: mockCrypto }} />);
      expect(screen.getByText('+1.60%')).toBeInTheDocument();

      // Re-render with same data should show same results
      rerender(<MarketStats data={{ crypto: mockCrypto }} />);
      expect(screen.getByText('+1.60%')).toBeInTheDocument();
    });
  });

  describe('StatCard Styling', () => {
    it('should render all stat cards', () => {
      render(<MarketStats data={{ crypto: mockCrypto, stocks: mockStocks }} />);

      expect(screen.getByText('Total Market Cap')).toBeInTheDocument();
      expect(screen.getByText('Average 24h Change')).toBeInTheDocument();
      expect(screen.getByText('Top Gainer')).toBeInTheDocument();
      expect(screen.getByText('Top Loser')).toBeInTheDocument();
    });

    it('should render DollarSign icon for market cap', () => {
      render(<MarketStats data={{ crypto: mockCrypto }} />);
      expect(screen.getByTestId('dollar-sign-icon')).toBeInTheDocument();
    });

    it('should render Sparkles icon in title', () => {
      render(<MarketStats data={{ crypto: mockCrypto }} />);
      expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument();
    });
  });
});
