import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PortfolioAnalytics } from '../../src/components/dashboard/PortfolioAnalytics';
import type { PortfolioAnalytics as PortfolioAnalyticsType } from '../../src/lib/utils/portfolio';

// Mock getPortfolioAnalytics
const mockGetPortfolioAnalytics = vi.fn();
vi.mock('../../src/lib/utils/portfolio', async () => {
  const actual = await vi.importActual('../../src/lib/utils/portfolio');
  return {
    ...actual,
    getPortfolioAnalytics: () => mockGetPortfolioAnalytics(),
  };
});

// Mock logger
vi.mock('../../src/lib/utils/logger', () => ({
  createLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

const mockAnalyticsData: PortfolioAnalyticsType = {
  handle: 'testuser',
  total_cost: 10000.0,
  total_value: 12500.0,
  total_pl: 2500.0,
  total_pl_pct: 25.0,
  allocations: [
    {
      symbol: 'BTC',
      weight_pct: 60.0,
      market_value: 7500.0,
      cost_value: 6000.0,
      qty: 0.5,
      current_price: 15000.0,
      unrealized_pl: 1500.0,
      pl_pct: 25.0,
    },
    {
      symbol: 'ETH',
      weight_pct: 40.0,
      market_value: 5000.0,
      cost_value: 4000.0,
      qty: 2.0,
      current_price: 2500.0,
      unrealized_pl: 1000.0,
      pl_pct: 25.0,
    },
  ],
  movers: {
    gainers: [{ symbol: 'BTC', pl_pct: 25.0 }],
    losers: [{ symbol: 'ETH', pl_pct: -5.0 }],
  },
  concentration: {
    top3_weight_pct: 100.0,
    position_count: 2,
    priced_positions: 2,
  },
};

describe('PortfolioAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Loading State', () => {
    it('should show loading skeleton initially', async () => {
      mockGetPortfolioAnalytics.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockAnalyticsData), 100))
      );

      render(<PortfolioAnalytics />);

      // Should show loading state (animated pulse)
      const loadingElements = document.querySelectorAll('.animate-pulse');
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it('should not auto-load when autoLoad is false', () => {
      render(<PortfolioAnalytics autoLoad={false} />);
      expect(mockGetPortfolioAnalytics).not.toHaveBeenCalled();
    });
  });

  describe('Success State', () => {
    beforeEach(() => {
      mockGetPortfolioAnalytics.mockResolvedValue(mockAnalyticsData);
    });

    it('should render portfolio overview with correct values', async () => {
      render(<PortfolioAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Portfolio Overview')).toBeInTheDocument();
      });

      // Check total cost
      expect(screen.getByText('Total Cost')).toBeInTheDocument();
      expect(screen.getByText('$10,000.00')).toBeInTheDocument();

      // Check total value
      expect(screen.getByText('Total Value')).toBeInTheDocument();
      expect(screen.getAllByText('$12,500.00')[0]).toBeInTheDocument();

      // Check total P/L
      expect(screen.getByText('Total P/L')).toBeInTheDocument();
      expect(screen.getAllByText('$2,500.00')[0]).toBeInTheDocument();

      // Check total P/L %
      expect(screen.getByText('Total P/L %')).toBeInTheDocument();
      expect(screen.getAllByText(/\+25\.00%/)[0]).toBeInTheDocument();
    });

    it('should render allocations table with all positions', async () => {
      render(<PortfolioAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Allocations')).toBeInTheDocument();
      });

      // Check table headers
      expect(screen.getByText('Symbol')).toBeInTheDocument();
      expect(screen.getByText('Weight %')).toBeInTheDocument();
      expect(screen.getByText('Market Value')).toBeInTheDocument();

      // Check BTC and ETH are in the allocations table
      expect(screen.getAllByText('BTC')[0]).toBeInTheDocument();
      expect(screen.getAllByText('ETH')[0]).toBeInTheDocument();
      expect(screen.getByText('60.00%')).toBeInTheDocument();
      expect(screen.getByText('40.00%')).toBeInTheDocument();
    });

    it('should render top gainers section', async () => {
      render(<PortfolioAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Top Gainers')).toBeInTheDocument();
      });

      // BTC appears in top gainers
      const gainersSection = screen.getByText('Top Gainers').closest('div');
      expect(gainersSection).toBeInTheDocument();
    });

    it('should render top losers section', async () => {
      const dataWithLosers = {
        ...mockAnalyticsData,
        movers: {
          ...mockAnalyticsData.movers,
          losers: [{ symbol: 'DOGE', pl_pct: -15.5 }],
        },
      };

      mockGetPortfolioAnalytics.mockResolvedValue(dataWithLosers);

      render(<PortfolioAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Top Losers')).toBeInTheDocument();
      });

      expect(screen.getByText('-15.50%')).toBeInTheDocument();
    });

    it('should render concentration metrics', async () => {
      render(<PortfolioAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Concentration Metrics')).toBeInTheDocument();
      });

      expect(screen.getByText('Top 3 Weight')).toBeInTheDocument();
      expect(screen.getByText('100.00%')).toBeInTheDocument();

      expect(screen.getByText('Total Positions')).toBeInTheDocument();
      expect(screen.getByText('Priced Positions')).toBeInTheDocument();
      
      // Check that both position counts show "2" (but don't check for duplicates)
      const positionCounts = screen.getAllByText('2');
      expect(positionCounts.length).toBeGreaterThanOrEqual(2); // One in table, two in metrics
    });

    it('should show diversification status for high concentration', async () => {
      const highConcentrationData = {
        ...mockAnalyticsData,
        concentration: {
          top3_weight_pct: 75.0,
          position_count: 5,
          priced_positions: 5,
        },
      };

      mockGetPortfolioAnalytics.mockResolvedValue(highConcentrationData);

      render(<PortfolioAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('High concentration')).toBeInTheDocument();
      });
    });

    it('should show diversification status for moderate concentration', async () => {
      const moderateConcentrationData = {
        ...mockAnalyticsData,
        concentration: {
          top3_weight_pct: 45.0,
          position_count: 10,
          priced_positions: 10,
        },
      };

      mockGetPortfolioAnalytics.mockResolvedValue(moderateConcentrationData);

      render(<PortfolioAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Moderate concentration')).toBeInTheDocument();
      });
    });

    it('should show diversification status for well diversified', async () => {
      const wellDiversifiedData = {
        ...mockAnalyticsData,
        concentration: {
          top3_weight_pct: 25.0,
          position_count: 15,
          priced_positions: 15,
        },
      };

      mockGetPortfolioAnalytics.mockResolvedValue(wellDiversifiedData);

      render(<PortfolioAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Well diversified')).toBeInTheDocument();
      });
    });

    it('should show warning when some positions are missing prices', async () => {
      const missingPricesData = {
        ...mockAnalyticsData,
        concentration: {
          top3_weight_pct: 50.0,
          position_count: 5,
          priced_positions: 3,
        },
      };

      mockGetPortfolioAnalytics.mockResolvedValue(missingPricesData);

      render(<PortfolioAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('2 positions missing prices')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should render error message when API fails', async () => {
      mockGetPortfolioAnalytics.mockRejectedValue(new Error('API Error'));

      render(<PortfolioAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load analytics')).toBeInTheDocument();
      });

      expect(screen.getByText('API Error')).toBeInTheDocument();
    });

    it('should allow retrying after error', async () => {
      mockGetPortfolioAnalytics.mockRejectedValueOnce(new Error('API Error'));

      render(<PortfolioAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load analytics')).toBeInTheDocument();
      });

      // Mock successful response for retry
      mockGetPortfolioAnalytics.mockResolvedValue(mockAnalyticsData);

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryButton);

      // Should show data after retry
      await waitFor(() => {
        expect(screen.getByText('Portfolio Overview')).toBeInTheDocument();
      });
    });

    it('should handle generic error messages', async () => {
      mockGetPortfolioAnalytics.mockRejectedValue('Unknown error');

      render(<PortfolioAnalytics />);

      await waitFor(() => {
        const errorMessages = screen.getAllByText('Failed to load analytics');
        expect(errorMessages.length).toBeGreaterThan(0); // Header and detail text both show error
      });
    });
  });

  describe('Empty State', () => {
    it('should show load button when no data and autoLoad is false', () => {
      render(<PortfolioAnalytics autoLoad={false} />);

      expect(screen.getByText('No analytics data available')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /load analytics/i })).toBeInTheDocument();
    });

    it('should load data when clicking load button', async () => {
      mockGetPortfolioAnalytics.mockResolvedValue(mockAnalyticsData);

      render(<PortfolioAnalytics autoLoad={false} />);

      const loadButton = screen.getByRole('button', { name: /load analytics/i });
      await userEvent.click(loadButton);

      await waitFor(() => {
        expect(screen.getByText('Portfolio Overview')).toBeInTheDocument();
      });
    });

    it('should show empty movers sections when no movers data', async () => {
      const noMoversData = {
        ...mockAnalyticsData,
        movers: {
          gainers: [],
          losers: [],
        },
      };

      mockGetPortfolioAnalytics.mockResolvedValue(noMoversData);

      render(<PortfolioAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Top Gainers')).toBeInTheDocument();
      });

      expect(screen.getByText('No gainers')).toBeInTheDocument();
      expect(screen.getByText('No losers')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null prices in allocations', async () => {
      const nullPriceData = {
        ...mockAnalyticsData,
        allocations: [
          {
            symbol: 'UNKNOWN',
            weight_pct: 100.0,
            market_value: 0.0,
            cost_value: 1000.0,
            qty: 100.0,
            current_price: null,
            unrealized_pl: null,
            pl_pct: null,
          },
        ],
      };

      mockGetPortfolioAnalytics.mockResolvedValue(nullPriceData);

      render(<PortfolioAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Allocations')).toBeInTheDocument();
      });

      // Should show N/A for null values
      const naCells = screen.getAllByText('N/A');
      expect(naCells.length).toBeGreaterThan(0);
    });

    it('should format negative P/L correctly', async () => {
      const negativeData = {
        ...mockAnalyticsData,
        total_pl: -1500.0,
        total_pl_pct: -15.0,
      };

      mockGetPortfolioAnalytics.mockResolvedValue(negativeData);

      render(<PortfolioAnalytics />);

      await waitFor(() => {
        // Use getAllByText to handle text that may be split by formatting and appears once
        const negativeValues = screen.getAllByText((content, element) => {
          return element?.textContent === '$-1,500.00' || element?.textContent?.includes('-1,500.00') || false;
        });
        expect(negativeValues.length).toBeGreaterThan(0);
      });

      expect(screen.getAllByText('-15.00%')[0]).toBeInTheDocument();
    });

    it('should handle large numbers correctly', async () => {
      const largeNumbersData = {
        ...mockAnalyticsData,
        total_cost: 1000000.0,
        total_value: 1250000.0,
        total_pl: 250000.0,
      };

      mockGetPortfolioAnalytics.mockResolvedValue(largeNumbersData);

      render(<PortfolioAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('$1,000,000.00')).toBeInTheDocument();
      });

      expect(screen.getByText('$1,250,000.00')).toBeInTheDocument();
      expect(screen.getByText('$250,000.00')).toBeInTheDocument();
    });
  });
});
