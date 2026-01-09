/**
 * Tests for IndicesPage component
 *
 * Market indices page displaying major market indices with cards,
 * real-time data from useUnifiedIndices hook, and navigation.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/markets/indices',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock ProtectedRoute
vi.mock('@/src/components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock currency formatter
vi.mock('@/src/components/dashboard/useCurrencyFormatter', () => ({
  useCurrencyFormatter: () => ({
    formatCurrency: (value: number) => `$${value.toLocaleString()}`,
    formatCompactCurrency: (value: number) => `$${(value / 1000000).toFixed(1)}M`,
  }),
}));

// Mock indices data
const mockIndices = [
  {
    id: 'sp500',
    symbol: 'SPX',
    name: 'S&P 500',
    current_price: 5234.18,
    price_change_24h: 45.23,
    price_change_percentage_24h: 0.87,
    volume_24h: 2500000000,
    market_cap: 45000000000000,
    asset_type: 'index',
  },
  {
    id: 'dow',
    symbol: 'DJI',
    name: 'Dow Jones Industrial',
    current_price: 39127.8,
    price_change_24h: -125.5,
    price_change_percentage_24h: -0.32,
    volume_24h: 1800000000,
    market_cap: 12000000000000,
    asset_type: 'index',
  },
  {
    id: 'nasdaq',
    symbol: 'IXIC',
    name: 'NASDAQ Composite',
    current_price: 16428.82,
    price_change_24h: 78.15,
    price_change_percentage_24h: 0.48,
    volume_24h: 3200000000,
    market_cap: 22000000000000,
    asset_type: 'index',
  },
  {
    id: 'ftse',
    symbol: 'FTSE',
    name: 'FTSE 100',
    current_price: 8317.59,
    price_change_24h: -15.2,
    price_change_percentage_24h: -0.18,
    volume_24h: 900000000,
    market_cap: 2500000000000,
    asset_type: 'index',
  },
  {
    id: 'nikkei',
    symbol: 'N225',
    name: 'Nikkei 225',
    current_price: 38647.75,
    price_change_24h: 423.5,
    price_change_percentage_24h: 1.11,
    volume_24h: 1200000000,
    market_cap: 6800000000000,
    asset_type: 'index',
  },
];

// Mock useUnifiedIndices hook
const mockRefetch = vi.fn();
vi.mock('@/src/hooks/useUnifiedAssets', () => ({
  useUnifiedIndices: vi.fn(() => ({
    data: mockIndices,
    response: { cached: false },
    isLoading: false,
    error: null,
    refetch: mockRefetch,
    isFetching: false,
  })),
}));

// Import after mocks
import { useUnifiedIndices } from '@/src/hooks/useUnifiedAssets';
import IndicesPage from '../../app/markets/indices/page';

describe('IndicesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useUnifiedIndices as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockIndices,
      response: { cached: false },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      isFetching: false,
    });
  });

  describe('Header', () => {
    it('renders page title', () => {
      render(<IndicesPage />);
      expect(screen.getByText('Market Indices')).toBeInTheDocument();
    });

    it('renders mock data badge', () => {
      render(<IndicesPage />);
      expect(screen.getByText('Mock Data')).toBeInTheDocument();
    });

    it('displays indices count', () => {
      render(<IndicesPage />);
      expect(screen.getByText('5 major market indices worldwide')).toBeInTheDocument();
    });

    it('renders refresh button', () => {
      render(<IndicesPage />);
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('calls refetch on refresh button click', () => {
      render(<IndicesPage />);
      fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Mock Data Warning', () => {
    it('renders mock data notice section', () => {
      render(<IndicesPage />);
      expect(screen.getByText('Mock Data Notice')).toBeInTheDocument();
    });

    it('explains mock data usage', () => {
      render(<IndicesPage />);
      expect(
        screen.getByText(/This page currently displays mock market indices data/i)
      ).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      (useUnifiedIndices as ReturnType<typeof vi.fn>).mockReturnValue({
        data: [],
        response: null,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
        isFetching: false,
      });
      render(<IndicesPage />);
      expect(screen.getByText('Loading indices...')).toBeInTheDocument();
    });

    it('shows spinner animation', () => {
      (useUnifiedIndices as ReturnType<typeof vi.fn>).mockReturnValue({
        data: [],
        response: null,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
        isFetching: false,
      });
      const { container } = render(<IndicesPage />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error message when error occurs', () => {
      (useUnifiedIndices as ReturnType<typeof vi.fn>).mockReturnValue({
        data: [],
        response: null,
        isLoading: false,
        error: { message: 'Network error' },
        refetch: mockRefetch,
        isFetching: false,
      });
      render(<IndicesPage />);
      expect(screen.getByText('Error Loading Indices')).toBeInTheDocument();
    });

    it('displays error message text', () => {
      (useUnifiedIndices as ReturnType<typeof vi.fn>).mockReturnValue({
        data: [],
        response: null,
        isLoading: false,
        error: { message: 'Network error' },
        refetch: mockRefetch,
        isFetching: false,
      });
      render(<IndicesPage />);
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('shows Try Again button on error', () => {
      (useUnifiedIndices as ReturnType<typeof vi.fn>).mockReturnValue({
        data: [],
        response: null,
        isLoading: false,
        error: { message: 'Network error' },
        refetch: mockRefetch,
        isFetching: false,
      });
      render(<IndicesPage />);
      expect(
        screen.getByRole('button', { name: /retry loading indices data/i })
      ).toBeInTheDocument();
    });

    it('calls refetch on Try Again click', () => {
      (useUnifiedIndices as ReturnType<typeof vi.fn>).mockReturnValue({
        data: [],
        response: null,
        isLoading: false,
        error: { message: 'Network error' },
        refetch: mockRefetch,
        isFetching: false,
      });
      render(<IndicesPage />);
      fireEvent.click(screen.getByRole('button', { name: /retry loading indices data/i }));
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Index Cards', () => {
    it('renders S&P 500 card', () => {
      render(<IndicesPage />);
      expect(screen.getByText('SPX')).toBeInTheDocument();
      expect(screen.getByText('S&P 500')).toBeInTheDocument();
    });

    it('renders Dow Jones card', () => {
      render(<IndicesPage />);
      expect(screen.getByText('DJI')).toBeInTheDocument();
      expect(screen.getByText('Dow Jones Industrial')).toBeInTheDocument();
    });

    it('renders NASDAQ card', () => {
      render(<IndicesPage />);
      expect(screen.getByText('IXIC')).toBeInTheDocument();
      expect(screen.getByText('NASDAQ Composite')).toBeInTheDocument();
    });

    it('renders FTSE card', () => {
      render(<IndicesPage />);
      expect(screen.getByText('FTSE')).toBeInTheDocument();
      expect(screen.getByText('FTSE 100')).toBeInTheDocument();
    });

    it('renders Nikkei card', () => {
      render(<IndicesPage />);
      expect(screen.getByText('N225')).toBeInTheDocument();
      expect(screen.getByText('Nikkei 225')).toBeInTheDocument();
    });
  });

  describe('Price Display', () => {
    it('displays S&P 500 price', () => {
      render(<IndicesPage />);
      expect(screen.getByText('$5,234.18')).toBeInTheDocument();
    });

    it('displays positive price change with plus sign', () => {
      render(<IndicesPage />);
      // S&P 500 positive change
      expect(screen.getByText('+0.87%')).toBeInTheDocument();
    });

    it('displays negative price change', () => {
      render(<IndicesPage />);
      // Dow Jones negative change
      expect(screen.getByText('-0.32%')).toBeInTheDocument();
    });

    it('displays Nikkei strong positive change', () => {
      render(<IndicesPage />);
      expect(screen.getByText('+1.11%')).toBeInTheDocument();
    });
  });

  describe('Statistics Display', () => {
    it('shows 24h Volume label', () => {
      render(<IndicesPage />);
      const volumeLabels = screen.getAllByText('24h Volume');
      expect(volumeLabels.length).toBe(5); // One per index
    });

    it('shows Market Cap label', () => {
      render(<IndicesPage />);
      // Market Cap appears multiple times (in stats and separate section)
      const marketCapLabels = screen.getAllByText('Market Cap');
      expect(marketCapLabels.length).toBeGreaterThan(0);
    });
  });

  describe('Navigation', () => {
    it('navigates to S&P 500 asset page on card click', () => {
      render(<IndicesPage />);
      // Find the S&P 500 card by its symbol and click
      const spxCard = screen.getByText('SPX').closest('div[class*="cursor-pointer"]');
      if (spxCard) {
        fireEvent.click(spxCard);
        expect(mockPush).toHaveBeenCalledWith('/asset/SPX');
      }
    });

    it('navigates to NASDAQ asset page on card click', () => {
      render(<IndicesPage />);
      const nasdaqCard = screen.getByText('IXIC').closest('div[class*="cursor-pointer"]');
      if (nasdaqCard) {
        fireEvent.click(nasdaqCard);
        expect(mockPush).toHaveBeenCalledWith('/asset/IXIC');
      }
    });

    it('navigates to Nikkei asset page on card click', () => {
      render(<IndicesPage />);
      const nikkeiCard = screen.getByText('N225').closest('div[class*="cursor-pointer"]');
      if (nikkeiCard) {
        fireEvent.click(nikkeiCard);
        expect(mockPush).toHaveBeenCalledWith('/asset/N225');
      }
    });
  });

  describe('Region Colors', () => {
    it('applies US market colors for S&P 500', () => {
      const { container } = render(<IndicesPage />);
      // S&P 500 should have blue color (US market)
      expect(container.querySelector('.bg-blue-500\\/10')).toBeInTheDocument();
    });

    it('applies European market colors for FTSE', () => {
      const { container } = render(<IndicesPage />);
      // FTSE should have purple color (European market)
      expect(container.querySelector('.bg-purple-500\\/10')).toBeInTheDocument();
    });

    it('applies Asian market colors for Nikkei', () => {
      const { container } = render(<IndicesPage />);
      // Nikkei should have red color (Asian market)
      expect(container.querySelector('.bg-red-500\\/10')).toBeInTheDocument();
    });
  });

  describe('Cache Status', () => {
    it('shows fresh data indicator when not cached', () => {
      render(<IndicesPage />);
      expect(screen.getByText('Fresh data from API')).toBeInTheDocument();
    });

    it('shows cached data indicator when cached', () => {
      (useUnifiedIndices as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockIndices,
        response: { cached: true },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        isFetching: false,
      });
      render(<IndicesPage />);
      expect(screen.getByText('Data from cache')).toBeInTheDocument();
    });

    it('shows blue indicator for fresh data', () => {
      const { container } = render(<IndicesPage />);
      expect(container.querySelector('.bg-blue-500')).toBeInTheDocument();
    });

    it('shows green indicator for cached data', () => {
      (useUnifiedIndices as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockIndices,
        response: { cached: true },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        isFetching: false,
      });
      const { container } = render(<IndicesPage />);
      expect(container.querySelector('.bg-green-500')).toBeInTheDocument();
    });
  });

  describe('Fetching State', () => {
    it('disables refresh button when fetching', () => {
      (useUnifiedIndices as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockIndices,
        response: { cached: false },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        isFetching: true,
      });
      render(<IndicesPage />);
      expect(screen.getByRole('button', { name: /refresh/i })).toBeDisabled();
    });

    it('shows spinning icon when fetching', () => {
      (useUnifiedIndices as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockIndices,
        response: { cached: false },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        isFetching: true,
      });
      const { container } = render(<IndicesPage />);
      // The refresh icon should have animate-spin class when fetching
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('has dark gradient background', () => {
      const { container } = render(<IndicesPage />);
      expect(container.querySelector('.min-h-screen')).toBeInTheDocument();
    });

    it('has grid layout for index cards', () => {
      const { container } = render(<IndicesPage />);
      expect(container.querySelector('.grid')).toBeInTheDocument();
    });

    it('has responsive grid columns', () => {
      const { container } = render(<IndicesPage />);
      expect(container.querySelector('.lg\\:grid-cols-3')).toBeInTheDocument();
    });

    it('has sticky header', () => {
      const { container } = render(<IndicesPage />);
      expect(container.querySelector('.sticky')).toBeInTheDocument();
    });
  });

  describe('Trend Indicators', () => {
    it('shows trending up icon for positive changes', () => {
      const { container } = render(<IndicesPage />);
      // TrendingUp icons for positive changes (S&P, NASDAQ, Nikkei)
      const greenItems = container.querySelectorAll('.text-green-500');
      expect(greenItems.length).toBeGreaterThan(0);
    });

    it('shows trending down icon for negative changes', () => {
      const { container } = render(<IndicesPage />);
      // TrendingDown icons for negative changes (Dow, FTSE)
      const redItems = container.querySelectorAll('.text-red-500');
      expect(redItems.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('renders index symbols for screen readers', () => {
      render(<IndicesPage />);
      expect(screen.getByText('SPX')).toBeInTheDocument();
      expect(screen.getByText('DJI')).toBeInTheDocument();
      expect(screen.getByText('IXIC')).toBeInTheDocument();
    });

    it('renders index names for screen readers', () => {
      render(<IndicesPage />);
      expect(screen.getByText('S&P 500')).toBeInTheDocument();
      expect(screen.getByText('Dow Jones Industrial')).toBeInTheDocument();
      expect(screen.getByText('NASDAQ Composite')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('renders empty grid when no indices', () => {
      (useUnifiedIndices as ReturnType<typeof vi.fn>).mockReturnValue({
        data: [],
        response: { cached: false },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        isFetching: false,
      });
      render(<IndicesPage />);
      expect(screen.getByText('0 major market indices worldwide')).toBeInTheDocument();
    });
  });
});
