import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock useCurrencyFormatter
vi.mock('@/components/dashboard/useCurrencyFormatter', () => ({
  useCurrencyFormatter: () => ({ formatCurrency: (v: number) => `$${v.toLocaleString()}` }),
}));

import { QuickStats } from '@/components/markets/QuickStats';

describe('QuickStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockData = [
    { price_change_percentage_24h: 5.5, total_volume: 1000000000, market_cap: 10000000000 },
    { price_change_percentage_24h: -2.3, total_volume: 500000000, market_cap: 5000000000 },
    { price_change_percentage_24h: 3.2, total_volume: 750000000, market_cap: 7500000000 },
  ];

  describe('Rendering', () => {
    it('should render nothing when data is empty', () => {
      const { container } = render(<QuickStats data={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render stats when data is provided', () => {
      render(<QuickStats data={mockData} />);
      expect(screen.getByText('Total Assets')).toBeInTheDocument();
      expect(screen.getByText('Avg 24h Change')).toBeInTheDocument();
    });

    it('should render in a responsive grid', () => {
      const { container } = render(<QuickStats data={mockData} />);
      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-2', 'md:grid-cols-4');
    });
  });

  describe('Total Assets', () => {
    it('should display total asset count', () => {
      render(<QuickStats data={mockData} />);
      expect(screen.getByText('Total Assets')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should display gainer and loser counts', () => {
      render(<QuickStats data={mockData} />);
      // 2 gainers (5.5, 3.2) and 1 loser (-2.3)
      expect(screen.getByText('2 up · 1 down')).toBeInTheDocument();
    });

    it('should show all as gainers when no losers', () => {
      render(
        <QuickStats
          data={[{ price_change_percentage_24h: 5 }, { price_change_percentage_24h: 3 }]}
        />
      );
      expect(screen.getByText('2 up · 0 down')).toBeInTheDocument();
    });

    it('should show all as losers when no gainers', () => {
      render(
        <QuickStats
          data={[{ price_change_percentage_24h: -5 }, { price_change_percentage_24h: -3 }]}
        />
      );
      expect(screen.getByText('0 up · 2 down')).toBeInTheDocument();
    });
  });

  describe('Average Change', () => {
    it('should display average 24h change', () => {
      render(<QuickStats data={mockData} />);
      expect(screen.getByText('Avg 24h Change')).toBeInTheDocument();
      // (5.5 + -2.3 + 3.2) / 3 = 2.13%
      expect(screen.getByText('+2.13%')).toBeInTheDocument();
    });

    it('should show green color for positive average', () => {
      render(<QuickStats data={mockData} />);
      const avgChangeValue = screen.getByText('+2.13%');
      expect(avgChangeValue).toHaveClass('text-green-500');
    });

    it('should show red color for negative average', () => {
      render(
        <QuickStats
          data={[{ price_change_percentage_24h: -5 }, { price_change_percentage_24h: -3 }]}
        />
      );
      const avgChangeValue = screen.getByText('-4.00%');
      expect(avgChangeValue).toHaveClass('text-red-500');
    });

    it('should include + prefix for positive changes', () => {
      render(
        <QuickStats
          data={[{ price_change_percentage_24h: 5 }, { price_change_percentage_24h: 3 }]}
        />
      );
      expect(screen.getByText('+4.00%')).toBeInTheDocument();
    });

    it('should not include + prefix for negative changes', () => {
      render(
        <QuickStats
          data={[{ price_change_percentage_24h: -5 }, { price_change_percentage_24h: -3 }]}
        />
      );
      expect(screen.getByText('-4.00%')).toBeInTheDocument();
    });

    it('should show TrendingUp icon for positive average', () => {
      const { container } = render(<QuickStats data={mockData} />);
      expect(container.querySelector('.lucide-trending-up')).toBeInTheDocument();
    });

    it('should show TrendingDown icon for negative average', () => {
      const { container } = render(
        <QuickStats
          data={[{ price_change_percentage_24h: -5 }, { price_change_percentage_24h: -3 }]}
        />
      );
      expect(container.querySelector('.lucide-trending-down')).toBeInTheDocument();
    });

    it('should show "Across all assets" subtitle', () => {
      render(<QuickStats data={mockData} />);
      expect(screen.getByText('Across all assets')).toBeInTheDocument();
    });
  });

  describe('Market Cap', () => {
    it('should not show market cap by default', () => {
      render(<QuickStats data={mockData} />);
      expect(screen.queryByText('Total Market Cap')).not.toBeInTheDocument();
    });

    it('should show market cap when showMarketCap is true', () => {
      render(<QuickStats data={mockData} showMarketCap={true} />);
      expect(screen.getByText('Total Market Cap')).toBeInTheDocument();
    });

    it('should format market cap in billions', () => {
      render(<QuickStats data={mockData} showMarketCap={true} />);
      // Total: 10B + 5B + 7.5B = 22.5B
      expect(screen.getByText('$22.50B')).toBeInTheDocument();
    });

    it('should not show market cap if total is 0', () => {
      render(
        <QuickStats
          data={[{ price_change_percentage_24h: 5, market_cap: 0 }]}
          showMarketCap={true}
        />
      );
      expect(screen.queryByText('Total Market Cap')).not.toBeInTheDocument();
    });

    it('should show "Combined value" subtitle', () => {
      render(<QuickStats data={mockData} showMarketCap={true} />);
      expect(screen.getByText('Combined value')).toBeInTheDocument();
    });
  });

  describe('24h Volume', () => {
    it('should display 24h volume when data has volume', () => {
      render(<QuickStats data={mockData} />);
      expect(screen.getByText('24h Volume')).toBeInTheDocument();
    });

    it('should format volume in billions', () => {
      render(<QuickStats data={mockData} />);
      // Total: 1B + 0.5B + 0.75B = 2.25B
      expect(screen.getByText('$2.25B')).toBeInTheDocument();
    });

    it('should not show volume if total is 0', () => {
      render(<QuickStats data={[{ price_change_percentage_24h: 5 }]} />);
      expect(screen.queryByText('24h Volume')).not.toBeInTheDocument();
    });

    it('should show "Trading volume" subtitle', () => {
      render(<QuickStats data={mockData} />);
      expect(screen.getByText('Trading volume')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle assets without price_change_percentage_24h', () => {
      render(
        <QuickStats data={[{ total_volume: 1000000000 }, { price_change_percentage_24h: 5 }]} />
      );

      // Should count 2 total assets
      expect(screen.getByText('2')).toBeInTheDocument();
      // But only 1 with change data
      expect(screen.getByText('1 up · 0 down')).toBeInTheDocument();
    });

    it('should handle zero price change', () => {
      render(
        <QuickStats
          data={[{ price_change_percentage_24h: 0 }, { price_change_percentage_24h: 0 }]}
        />
      );

      // 0 is not > 0 or < 0, so counts as neither gainer nor loser
      expect(screen.getByText('0 up · 0 down')).toBeInTheDocument();
      expect(screen.getByText('+0.00%')).toBeInTheDocument();
    });

    it('should handle mixed undefined and valid data', () => {
      render(
        <QuickStats
          data={[
            { price_change_percentage_24h: 5, total_volume: 100, market_cap: 1000 },
            { total_volume: 200 }, // No price change
            { price_change_percentage_24h: -3 }, // No volume
          ]}
        />
      );

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('1 up · 1 down')).toBeInTheDocument();
    });

    it('should handle very large numbers', () => {
      render(
        <QuickStats
          data={[{ price_change_percentage_24h: 5, total_volume: 100e12, market_cap: 500e12 }]}
          showMarketCap={true}
        />
      );

      // $100T = $100000.00B
      expect(screen.getByText('$100000.00B')).toBeInTheDocument();
      expect(screen.getByText('$500000.00B')).toBeInTheDocument();
    });
  });

  describe('Visual Elements', () => {
    it('should render Activity icons', () => {
      const { container } = render(<QuickStats data={mockData} />);
      // At least 2 activity icons (Total Assets and 24h Volume)
      expect(container.querySelectorAll('.lucide-activity').length).toBeGreaterThanOrEqual(2);
    });

    it('should render DollarSign icon when showing market cap', () => {
      const { container } = render(<QuickStats data={mockData} showMarketCap={true} />);
      expect(container.querySelector('.lucide-dollar-sign')).toBeInTheDocument();
    });

    it('should apply correct card styling', () => {
      const { container } = render(<QuickStats data={mockData} />);
      const cards = container.querySelectorAll('.bg-neutral-900\\/50');
      expect(cards.length).toBeGreaterThanOrEqual(3); // Total Assets, Avg Change, Volume
    });

    it('should apply border styling to cards', () => {
      const { container } = render(<QuickStats data={mockData} />);
      const borderedCards = container.querySelectorAll('.border-neutral-800');
      expect(borderedCards.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Props', () => {
    it('should accept showMarketCap as false explicitly', () => {
      render(<QuickStats data={mockData} showMarketCap={false} />);
      expect(screen.queryByText('Total Market Cap')).not.toBeInTheDocument();
    });

    it('should default showMarketCap to false', () => {
      render(<QuickStats data={mockData} />);
      expect(screen.queryByText('Total Market Cap')).not.toBeInTheDocument();
    });
  });
});
