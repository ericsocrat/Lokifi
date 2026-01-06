import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock useCurrencyFormatter
const mockFormatCurrency = vi.fn((value: number) => `$${value.toLocaleString()}`);

vi.mock('@/components/dashboard/useCurrencyFormatter', () => ({
  useCurrencyFormatter: () => ({ formatCurrency: mockFormatCurrency }),
}));

import { MarketStats } from '@/components/markets/MarketStats';

describe('MarketStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCryptoAssets = [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      current_price: 50000,
      price_change_percentage_24h: 5.5,
      market_cap: 1000000000000,
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      current_price: 3000,
      price_change_percentage_24h: -2.3,
      market_cap: 400000000000,
    },
  ];

  const mockStockAssets = [
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      current_price: 180,
      price_change_percentage_24h: 1.2,
      market_cap: 3000000000000,
    },
  ];

  const mockForexAssets = [
    {
      symbol: 'EUR/USD',
      name: 'Euro/US Dollar',
      current_price: 1.08,
      price_change_percentage_24h: 0.15,
    },
  ];

  const mockIndicesAssets = [
    {
      symbol: 'SPX',
      name: 'S&P 500',
      current_price: 5000,
      price_change_percentage_24h: -0.5,
    },
  ];

  describe('Rendering', () => {
    it('should render Market Overview heading', () => {
      render(<MarketStats data={{ crypto: mockCryptoAssets }} />);
      expect(screen.getByText('Market Overview')).toBeInTheDocument();
    });

    it('should render Real-time Statistics subtitle', () => {
      render(<MarketStats data={{ crypto: mockCryptoAssets }} />);
      expect(screen.getByText(/Real-time Statistics/)).toBeInTheDocument();
    });

    it('should render nothing when data is empty', () => {
      const { container } = render(<MarketStats data={{}} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render nothing when all arrays are empty', () => {
      const { container } = render(
        <MarketStats data={{ crypto: [], stocks: [], indices: [], forex: [] }} />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Total Market Cap', () => {
    it('should display total market cap from crypto and stocks', () => {
      render(
        <MarketStats
          data={{
            crypto: mockCryptoAssets,
            stocks: mockStockAssets,
          }}
        />
      );

      expect(screen.getByText('Total Market Cap')).toBeInTheDocument();
      // Market cap: 1T + 400B + 3T = 4.4T
      expect(mockFormatCurrency).toHaveBeenCalledWith(4400000000000);
    });

    it('should show asset counts in market cap subtitle', () => {
      render(
        <MarketStats
          data={{
            crypto: mockCryptoAssets,
            stocks: mockStockAssets,
          }}
        />
      );

      expect(screen.getByText('2 crypto + 1 stocks')).toBeInTheDocument();
    });

    it('should not show market cap if total is 0', () => {
      render(
        <MarketStats
          data={{
            forex: mockForexAssets, // Forex doesn't have market_cap
          }}
        />
      );

      expect(screen.queryByText('Total Market Cap')).not.toBeInTheDocument();
    });
  });

  describe('Average 24h Change', () => {
    it('should display average 24h change', () => {
      render(<MarketStats data={{ crypto: mockCryptoAssets }} />);

      expect(screen.getByText('Average 24h Change')).toBeInTheDocument();
      // (5.5 + -2.3) / 2 = 1.6%
      expect(screen.getByText('+1.60%')).toBeInTheDocument();
    });

    it('should show + prefix for positive average change', () => {
      render(
        <MarketStats
          data={{
            crypto: [
              { symbol: 'BTC', price_change_percentage_24h: 10 },
              { symbol: 'ETH', price_change_percentage_24h: 8 },
            ],
          }}
        />
      );

      // Average is +9.00%
      expect(screen.getByText('+9.00%')).toBeInTheDocument();
    });

    it('should not show + prefix for negative average change', () => {
      render(
        <MarketStats
          data={{
            crypto: [
              { symbol: 'BTC', price_change_percentage_24h: -5 },
              { symbol: 'ETH', price_change_percentage_24h: -3 },
            ],
          }}
        />
      );

      // Average is -4.00%
      expect(screen.getByText('-4.00%')).toBeInTheDocument();
    });

    it('should show total asset count in subtitle', () => {
      render(
        <MarketStats
          data={{
            crypto: mockCryptoAssets,
            stocks: mockStockAssets,
            forex: mockForexAssets,
          }}
        />
      );

      expect(screen.getByText('Across 4 assets')).toBeInTheDocument();
    });

    it('should handle assets with null price change', () => {
      render(
        <MarketStats
          data={{
            crypto: [
              { symbol: 'BTC', price_change_percentage_24h: 10 },
              { symbol: 'ETH', price_change_percentage_24h: null },
              { symbol: 'SOL', price_change_percentage_24h: 8 },
            ],
          }}
        />
      );

      // Should only include BTC and SOL in calculation (10 + 8) / 2 = 9
      expect(screen.getByText('+9.00%')).toBeInTheDocument();
    });
  });

  describe('Top Gainer', () => {
    it('should display the top gainer', () => {
      render(<MarketStats data={{ crypto: mockCryptoAssets }} />);

      expect(screen.getByText('Top Gainer')).toBeInTheDocument();
      expect(screen.getByText('BTC')).toBeInTheDocument();
      expect(screen.getByText('+5.50%')).toBeInTheDocument();
    });

    it('should not show top gainer if symbol is missing', () => {
      render(
        <MarketStats
          data={{
            crypto: [{ price_change_percentage_24h: 5 }], // No symbol
          }}
        />
      );

      expect(screen.queryByText('Top Gainer')).not.toBeInTheDocument();
    });

    it('should not show top gainer if price change is null', () => {
      render(
        <MarketStats
          data={{
            crypto: [{ symbol: 'BTC', price_change_percentage_24h: null }],
          }}
        />
      );

      expect(screen.queryByText('Top Gainer')).not.toBeInTheDocument();
    });

    it('should find top gainer across all asset types', () => {
      render(
        <MarketStats
          data={{
            crypto: mockCryptoAssets,
            stocks: [{ symbol: 'TSLA', price_change_percentage_24h: 15 }],
          }}
        />
      );

      // TSLA is the top gainer at 15%
      expect(screen.getByText('TSLA')).toBeInTheDocument();
      expect(screen.getByText('+15.00%')).toBeInTheDocument();
    });
  });

  describe('Top Loser', () => {
    it('should display the top loser', () => {
      render(<MarketStats data={{ crypto: mockCryptoAssets }} />);

      expect(screen.getByText('Top Loser')).toBeInTheDocument();
      expect(screen.getByText('ETH')).toBeInTheDocument();
      expect(screen.getByText('-2.30%')).toBeInTheDocument();
    });

    it('should not show top loser if symbol is missing', () => {
      render(
        <MarketStats
          data={{
            crypto: [{ price_change_percentage_24h: -5 }], // No symbol
          }}
        />
      );

      expect(screen.queryByText('Top Loser')).not.toBeInTheDocument();
    });

    it('should find top loser across all asset types', () => {
      render(
        <MarketStats
          data={{
            crypto: mockCryptoAssets,
            stocks: [{ symbol: 'META', price_change_percentage_24h: -10 }],
          }}
        />
      );

      // META is the top loser at -10%
      expect(screen.getByText('META')).toBeInTheDocument();
      expect(screen.getByText('-10.00%')).toBeInTheDocument();
    });
  });

  describe('Asset Type Combinations', () => {
    it('should handle crypto only', () => {
      render(<MarketStats data={{ crypto: mockCryptoAssets }} />);

      expect(screen.getByText('Market Overview')).toBeInTheDocument();
      expect(screen.getByText('Across 2 assets')).toBeInTheDocument();
    });

    it('should handle stocks only', () => {
      render(<MarketStats data={{ stocks: mockStockAssets }} />);

      expect(screen.getByText('Market Overview')).toBeInTheDocument();
      expect(screen.getByText('Across 1 assets')).toBeInTheDocument();
    });

    it('should handle forex only', () => {
      render(<MarketStats data={{ forex: mockForexAssets }} />);

      expect(screen.getByText('Market Overview')).toBeInTheDocument();
    });

    it('should handle indices only', () => {
      render(<MarketStats data={{ indices: mockIndicesAssets }} />);

      expect(screen.getByText('Market Overview')).toBeInTheDocument();
    });

    it('should handle all asset types', () => {
      render(
        <MarketStats
          data={{
            crypto: mockCryptoAssets,
            stocks: mockStockAssets,
            forex: mockForexAssets,
            indices: mockIndicesAssets,
          }}
        />
      );

      expect(screen.getByText('Across 5 assets')).toBeInTheDocument();
      expect(screen.getByText('2 crypto + 1 stocks')).toBeInTheDocument();
    });
  });

  describe('StatCard Component', () => {
    it('should render stat cards with proper titles', () => {
      render(<MarketStats data={{ crypto: mockCryptoAssets }} />);

      expect(screen.getByText('Total Market Cap')).toBeInTheDocument();
      expect(screen.getByText('Average 24h Change')).toBeInTheDocument();
      expect(screen.getByText('Top Gainer')).toBeInTheDocument();
      expect(screen.getByText('Top Loser')).toBeInTheDocument();
    });

    it('should apply correct color classes based on change direction', () => {
      const { container } = render(
        <MarketStats
          data={{
            crypto: [{ symbol: 'BTC', price_change_percentage_24h: 5, market_cap: 1000 }],
          }}
        />
      );

      // Should have green classes for positive changes
      expect(container.querySelector('.bg-green-500\\/10')).toBeInTheDocument();
      // Should have red classes for top loser
      expect(container.querySelector('.bg-red-500\\/10')).toBeInTheDocument();
    });

    it('should show subtitle when provided', () => {
      render(<MarketStats data={{ crypto: mockCryptoAssets }} />);

      // Subtitles include asset counts
      expect(screen.getByText('2 crypto + 0 stocks')).toBeInTheDocument();
      expect(screen.getByText('Across 2 assets')).toBeInTheDocument();
    });
  });

  describe('Memoization', () => {
    it('should recalculate stats when data changes', () => {
      const { rerender } = render(
        <MarketStats
          data={{
            crypto: [
              { symbol: 'BTC', price_change_percentage_24h: 5 },
              { symbol: 'ETH', price_change_percentage_24h: 3 },
            ],
          }}
        />
      );

      // Average: (5 + 3) / 2 = 4
      expect(screen.getByText('+4.00%')).toBeInTheDocument();

      rerender(
        <MarketStats
          data={{
            crypto: [
              { symbol: 'BTC', price_change_percentage_24h: -3 },
              { symbol: 'ETH', price_change_percentage_24h: -5 },
            ],
          }}
        />
      );

      // Average: (-3 + -5) / 2 = -4
      expect(screen.getByText('-4.00%')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined price_change_percentage_24h', () => {
      render(
        <MarketStats
          data={{
            crypto: [{ symbol: 'BTC' }], // No price change
          }}
        />
      );

      // Should still render but with 0 average change
      expect(screen.getByText('Average 24h Change')).toBeInTheDocument();
    });

    it('should handle zero price change', () => {
      render(
        <MarketStats
          data={{
            crypto: [
              { symbol: 'BTC', price_change_percentage_24h: 0 },
              { symbol: 'ETH', price_change_percentage_24h: 0 },
            ],
          }}
        />
      );

      // Average change should show +0.00%
      expect(screen.getByText('Average 24h Change')).toBeInTheDocument();
      // +0.00% appears in both average and top gainer
      expect(screen.getAllByText('+0.00%').length).toBeGreaterThanOrEqual(1);
    });

    it('should handle very large market caps', () => {
      render(
        <MarketStats
          data={{
            crypto: [{ symbol: 'BTC', market_cap: 1e15, price_change_percentage_24h: 1 }],
          }}
        />
      );

      expect(mockFormatCurrency).toHaveBeenCalledWith(1e15);
    });

    it('should handle missing optional properties', () => {
      render(
        <MarketStats
          data={{
            crypto: [
              {
                symbol: 'BTC',
                price_change_percentage_24h: 5,
                // No name, current_price, or market_cap
              },
              {
                symbol: 'ETH',
                price_change_percentage_24h: 3,
              },
            ],
          }}
        />
      );

      // Both BTC and ETH should be rendered as gainer/loser
      expect(screen.getByText('Top Gainer')).toBeInTheDocument();
      expect(screen.getByText('Top Loser')).toBeInTheDocument();
    });
  });

  describe('Visual Elements', () => {
    it('should render Sparkles icon', () => {
      const { container } = render(<MarketStats data={{ crypto: mockCryptoAssets }} />);
      expect(container.querySelector('.lucide-sparkles')).toBeInTheDocument();
    });

    it('should render TrendingUp icon for gainers', () => {
      const { container } = render(<MarketStats data={{ crypto: mockCryptoAssets }} />);
      expect(container.querySelectorAll('.lucide-trending-up').length).toBeGreaterThan(0);
    });

    it('should render TrendingDown icon for losers', () => {
      const { container } = render(<MarketStats data={{ crypto: mockCryptoAssets }} />);
      expect(container.querySelector('.lucide-trending-down')).toBeInTheDocument();
    });

    it('should render DollarSign icon for market cap', () => {
      const { container } = render(<MarketStats data={{ crypto: mockCryptoAssets }} />);
      expect(container.querySelector('.lucide-dollar-sign')).toBeInTheDocument();
    });

    it('should apply animation class to container', () => {
      const { container } = render(<MarketStats data={{ crypto: mockCryptoAssets }} />);
      expect(container.querySelector('.animate-fade-in')).toBeInTheDocument();
    });

    it('should apply pulse animation to Sparkles icon', () => {
      const { container } = render(<MarketStats data={{ crypto: mockCryptoAssets }} />);
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('Responsive Grid', () => {
    it('should render a responsive grid', () => {
      const { container } = render(<MarketStats data={{ crypto: mockCryptoAssets }} />);
      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4');
    });
  });
});
