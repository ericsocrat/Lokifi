/**
 * Markets Overview Page Tests
 *
 * Comprehensive tests for app/markets/page.tsx
 * Tests market data display, loading states, error handling, and navigation
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ============================================================================
// Mocks
// ============================================================================

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/markets',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock currency formatter
vi.mock('@/src/components/dashboard/useCurrencyFormatter', () => ({
  useCurrencyFormatter: () => ({
    formatCurrency: (value: number) => `$${value.toLocaleString()}`,
    formatCompactCurrency: (value: number) => `$${value.toLocaleString()}`,
    currency: 'USD',
  }),
}));

// Mock MarketStats component
vi.mock('@/src/components/markets/MarketStats', () => ({
  MarketStats: ({ data }: { data: unknown }) => (
    <div data-testid="market-stats">
      Market Stats: {JSON.stringify(data).substring(0, 50)}
    </div>
  ),
}));

// Mock ProtectedRoute to just render children
vi.mock('@/src/components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock unified assets hook
const mockRefetch = vi.fn();
const mockUseUnifiedAssets = vi.fn();

vi.mock('@/src/hooks/useUnifiedAssets', () => ({
  useUnifiedAssets: (...args: unknown[]) => mockUseUnifiedAssets(...args),
}));

// Import component after mocks
import MarketsOverviewPage from '../../app/markets/page';

// ============================================================================
// Test Data
// ============================================================================

const mockCryptoAssets = [
  {
    id: 'bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    type: 'crypto',
    current_price: 50000,
    price_change_percentage_24h: 2.5,
    market_cap: 1000000000000,
    image: 'https://example.com/btc.png',
  },
  {
    id: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    type: 'crypto',
    current_price: 3000,
    price_change_percentage_24h: -1.2,
    market_cap: 400000000000,
    image: 'https://example.com/eth.png',
  },
];

const mockStockAssets = [
  {
    id: 'apple',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    type: 'stocks',
    current_price: 175.5,
    price_change_percentage_24h: 1.8,
    market_cap: 2800000000000,
  },
  {
    id: 'microsoft',
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    type: 'stocks',
    current_price: 380.25,
    price_change_percentage_24h: -0.5,
    market_cap: 2500000000000,
  },
];

const mockSuccessData = {
  success: true,
  types: ['crypto', 'stocks', 'indices', 'forex'],
  data: {
    crypto: mockCryptoAssets,
    stocks: mockStockAssets,
    indices: [],
    forex: [],
  },
  total_count: 4,
  cached: false,
};

// ============================================================================
// Helper Functions
// ============================================================================

function setupLoadingState() {
  mockUseUnifiedAssets.mockReturnValue({
    data: undefined,
    isLoading: true,
    isError: false,
    error: null,
    refetch: mockRefetch,
    isFetching: false,
  });
}

function setupSuccessState(data = mockSuccessData) {
  mockUseUnifiedAssets.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    error: null,
    refetch: mockRefetch,
    isFetching: false,
  });
}

function setupErrorState(errorMessage = 'Failed to fetch market data') {
  mockUseUnifiedAssets.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: true,
    error: new Error(errorMessage),
    refetch: mockRefetch,
    isFetching: false,
  });
}

function setupFetchingState() {
  mockUseUnifiedAssets.mockReturnValue({
    data: mockSuccessData,
    isLoading: false,
    isError: false,
    error: null,
    refetch: mockRefetch,
    isFetching: true,
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('MarketsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefetch.mockResolvedValue({ data: mockSuccessData });
  });

  // ==========================================================================
  // Loading State Tests
  // ==========================================================================

  describe('Loading State', () => {
    it('should show loading spinner when fetching data', () => {
      setupLoadingState();
      render(<MarketsOverviewPage />);

      expect(screen.getByText('Loading markets...')).toBeInTheDocument();
    });

    it('should show loading animation', () => {
      setupLoadingState();
      render(<MarketsOverviewPage />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Page Header Tests
  // ==========================================================================

  describe('Page Header', () => {
    it('should render page title', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      expect(screen.getByText('Markets Overview')).toBeInTheDocument();
    });

    it('should render page subtitle', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      expect(screen.getByText('All asset classes in one place')).toBeInTheDocument();
    });

    it('should render refresh button', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('should call refetch when refresh button is clicked', async () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await userEvent.click(refreshButton);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('should show spinning icon when fetching', () => {
      setupFetchingState();
      render(<MarketsOverviewPage />);

      const spinningIcons = document.querySelectorAll('.animate-spin');
      expect(spinningIcons.length).toBeGreaterThan(0);
    });

    it('should disable refresh button when fetching', () => {
      setupFetchingState();
      render(<MarketsOverviewPage />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeDisabled();
    });
  });

  // ==========================================================================
  // Error State Tests
  // ==========================================================================

  describe('Error State', () => {
    it('should show error message when data fails to load', () => {
      setupErrorState();
      render(<MarketsOverviewPage />);

      expect(screen.getByText('Error Loading Markets')).toBeInTheDocument();
    });

    it('should show custom error message', () => {
      setupErrorState('Custom error message');
      render(<MarketsOverviewPage />);

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });

    it('should show Try Again button on error', () => {
      setupErrorState();
      render(<MarketsOverviewPage />);

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should call refetch when Try Again is clicked', async () => {
      setupErrorState();
      render(<MarketsOverviewPage />);

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await userEvent.click(tryAgainButton);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Market Stats Tests
  // ==========================================================================

  describe('Market Stats', () => {
    it('should render MarketStats component with data', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      expect(screen.getByTestId('market-stats')).toBeInTheDocument();
    });

    it('should not render MarketStats when loading', () => {
      setupLoadingState();
      render(<MarketsOverviewPage />);

      expect(screen.queryByTestId('market-stats')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Cryptocurrencies Section Tests
  // ==========================================================================

  describe('Cryptocurrencies Section', () => {
    it('should render cryptocurrency section header', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      expect(screen.getByText('Cryptocurrencies')).toBeInTheDocument();
    });

    it('should show crypto count in section', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      expect(screen.getByText(/Top 2 by market cap/)).toBeInTheDocument();
    });

    it('should render crypto asset cards', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      expect(screen.getByText('BTC')).toBeInTheDocument();
      expect(screen.getByText('Bitcoin')).toBeInTheDocument();
      expect(screen.getByText('ETH')).toBeInTheDocument();
      expect(screen.getByText('Ethereum')).toBeInTheDocument();
    });

    it('should show crypto prices', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      expect(screen.getByText('$50,000')).toBeInTheDocument();
      expect(screen.getByText('$3,000')).toBeInTheDocument();
    });

    it('should show positive price change with green color', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      const positiveChange = screen.getByText('+2.50%');
      expect(positiveChange).toBeInTheDocument();
      expect(positiveChange.closest('div')).toHaveClass('text-green-400');
    });

    it('should show negative price change with red color', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      const negativeChange = screen.getByText('-1.20%');
      expect(negativeChange).toBeInTheDocument();
      expect(negativeChange.closest('div')).toHaveClass('text-red-400');
    });

    it('should link to View All crypto page', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      const viewAllLinks = screen.getAllByText('View All');
      const cryptoViewAll = viewAllLinks[0].closest('a');
      expect(cryptoViewAll).toHaveAttribute('href', '/markets/crypto');
    });

    it('should link crypto cards to asset detail page', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      const btcLink = screen.getByText('Bitcoin').closest('a');
      expect(btcLink).toHaveAttribute('href', '/asset/BTC');
    });

    it('should render crypto images', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      const btcImage = screen.getByAltText('Bitcoin');
      expect(btcImage).toHaveAttribute('src', 'https://example.com/btc.png');
    });
  });

  // ==========================================================================
  // Stocks Section Tests
  // ==========================================================================

  describe('Stocks Section', () => {
    it('should render stocks section header', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      expect(screen.getByText('Stocks')).toBeInTheDocument();
    });

    it('should show Live Data badge', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      expect(screen.getByText('Live Data')).toBeInTheDocument();
    });

    it('should show stock data source info', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      expect(screen.getByText(/Real-time from Alpha Vantage/)).toBeInTheDocument();
    });

    it('should render stock asset cards', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
      expect(screen.getByText('Microsoft Corporation')).toBeInTheDocument();
    });

    it('should show stock prices', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      expect(screen.getByText('$175.5')).toBeInTheDocument();
      expect(screen.getByText('$380.25')).toBeInTheDocument();
    });

    it('should link to View All stocks page', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      const viewAllLinks = screen.getAllByText('View All');
      const stocksViewAll = viewAllLinks[1].closest('a');
      expect(stocksViewAll).toHaveAttribute('href', '/markets/stocks');
    });

    it('should link stock cards to asset detail page', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      const aaplLink = screen.getByText('Apple Inc.').closest('a');
      expect(aaplLink).toHaveAttribute('href', '/asset/AAPL');
    });

    it('should show symbol placeholder when no image', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      // Stocks don't have images, so they show symbol abbreviations
      expect(screen.getByText('AA')).toBeInTheDocument(); // AAPL
      expect(screen.getByText('MS')).toBeInTheDocument(); // MSFT
    });
  });

  // ==========================================================================
  // Cache Status Tests
  // ==========================================================================

  describe('Cache Status', () => {
    it('should show fresh data status when not cached', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      expect(screen.getByText('Fresh data from API')).toBeInTheDocument();
    });

    it('should show cached data status when cached', () => {
      const cachedData = { ...mockSuccessData, cached: true };
      setupSuccessState(cachedData);
      render(<MarketsOverviewPage />);

      expect(screen.getByText('Data from cache')).toBeInTheDocument();
    });

    it('should show green indicator for cached data', () => {
      const cachedData = { ...mockSuccessData, cached: true };
      setupSuccessState(cachedData);
      render(<MarketsOverviewPage />);

      const indicator = document.querySelector('.bg-green-500');
      expect(indicator).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Empty States Tests
  // ==========================================================================

  describe('Empty States', () => {
    it('should not render crypto section when no crypto assets', () => {
      const noCryptoData = {
        ...mockSuccessData,
        data: { ...mockSuccessData.data, crypto: [] },
      };
      setupSuccessState(noCryptoData);
      render(<MarketsOverviewPage />);

      expect(screen.queryByText('Cryptocurrencies')).not.toBeInTheDocument();
    });

    it('should not render stocks section when no stock assets', () => {
      const noStocksData = {
        ...mockSuccessData,
        data: { ...mockSuccessData.data, stocks: [] },
      };
      setupSuccessState(noStocksData);
      render(<MarketsOverviewPage />);

      expect(screen.queryByText('Stocks')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // UI Styling Tests
  // ==========================================================================

  describe('UI Styling', () => {
    it('should have dark background', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      const container = document.querySelector('.bg-surface-0');
      expect(container).toBeInTheDocument();
    });

    it('should have orange themed crypto section', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      const cryptoSection = document.querySelector('.border-orange-500\\/30');
      expect(cryptoSection).toBeInTheDocument();
    });

    it('should have green themed stocks section', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      const stocksSection = document.querySelector('.border-green-500\\/30');
      expect(stocksSection).toBeInTheDocument();
    });

    it('should have rounded corners on asset cards', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      const cards = document.querySelectorAll('.rounded-xl');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('should have sticky header', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      const stickyHeader = document.querySelector('.sticky');
      expect(stickyHeader).toBeInTheDocument();
    });

    it('should have backdrop blur on header', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      const blurHeader = document.querySelector('.backdrop-blur-xl');
      expect(blurHeader).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Hook Integration Tests
  // ==========================================================================

  describe('Hook Integration', () => {
    it('should call useUnifiedAssets with correct parameters', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      expect(mockUseUnifiedAssets).toHaveBeenCalledWith(10, [
        'crypto',
        'stocks',
        'indices',
        'forex',
      ]);
    });

    it('should request 10 assets per type', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      expect(mockUseUnifiedAssets).toHaveBeenCalledWith(
        10,
        expect.any(Array)
      );
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('Accessibility', () => {
    it('should have accessible button labels', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAccessibleName();
      });
    });

    it('should have accessible links', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
    });

    it('should have images with alt text', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      const images = screen.getAllByRole('img');
      images.forEach((img) => {
        expect(img).toHaveAttribute('alt');
      });
    });
  });

  // ==========================================================================
  // Protected Route Tests
  // ==========================================================================

  describe('Protected Route', () => {
    it('should be wrapped in ProtectedRoute', () => {
      setupSuccessState();
      render(<MarketsOverviewPage />);

      // Since we mock ProtectedRoute to just render children,
      // the content should be visible
      expect(screen.getByText('Markets Overview')).toBeInTheDocument();
    });
  });
});
