/**
 * @file AssetDetailPage.test.tsx
 * @description Tests for the asset/[symbol] page - individual asset detail with live prices
 * @session 140 - Page testing coverage
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock next/navigation BEFORE importing the component
const mockPush = vi.fn();
const mockBack = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ symbol: 'BTC' }),
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

// Mock ProtectedRoute
vi.mock('@/src/components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the hooks module
const mockSubscribe = vi.fn();
const mockRefetch = vi.fn();

vi.mock('@/src/hooks/useBackendPrices', () => ({
  useHistoricalPrices: vi.fn(),
  useTopCryptos: vi.fn(),
  useWebSocketPrices: vi.fn(),
}));

// Import after mocks
import * as backendPricesHooks from '@/src/hooks/useBackendPrices';
import AssetDetailPage from '../../app/asset/[symbol]/page';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

describe('AssetDetailPage', () => {
  const mockCryptoData = {
    id: 'bitcoin',
    symbol: 'btc',
    name: 'Bitcoin',
    image: 'https://example.com/bitcoin.png',
    current_price: 45000,
    market_cap: 850000000000,
    market_cap_rank: 1,
    fully_diluted_valuation: 950000000000,
    total_volume: 25000000000,
    high_24h: 46000,
    low_24h: 44000,
    price_change_24h: 1500,
    price_change_percentage_24h: 3.45,
    market_cap_change_24h: 25000000000,
    market_cap_change_percentage_24h: 3.02,
    circulating_supply: 19000000,
    total_supply: 21000000,
    max_supply: 21000000,
    ath: 69000,
    ath_change_percentage: -34.78,
    ath_date: '2021-11-10',
    atl: 67,
    atl_change_percentage: 67000,
    atl_date: '2013-07-06',
    roi: null,
    last_updated: '2024-01-01T12:00:00Z',
  };

  const mockHistoricalData = {
    success: true,
    symbol: 'BTC',
    period: '1m',
    count: 8,
    data: [
      { timestamp: Date.now() - 86400000 * 7, price: 42000 },
      { timestamp: Date.now() - 86400000 * 6, price: 43000 },
      { timestamp: Date.now() - 86400000 * 5, price: 44000 },
      { timestamp: Date.now() - 86400000 * 4, price: 43500 },
      { timestamp: Date.now() - 86400000 * 3, price: 44500 },
      { timestamp: Date.now() - 86400000 * 2, price: 45500 },
      { timestamp: Date.now() - 86400000, price: 44000 },
      { timestamp: Date.now(), price: 45000 },
    ],
    source: 'coingecko',
    cached: false,
  };

  function setupDefaultMocks() {
    vi.mocked(backendPricesHooks.useTopCryptos).mockReturnValue({
      data: { success: true, cryptos: [mockCryptoData], count: 1, cached: false },
      cryptos: [mockCryptoData],
      loading: false,
      error: null,
      refetch: mockRefetch,
      isSuccess: true,
      isCached: false,
    });

    vi.mocked(backendPricesHooks.useHistoricalPrices).mockReturnValue({
      data: mockHistoricalData,
      loading: false,
      error: null,
      refetch: mockRefetch,
      isSuccess: true,
      isCached: false,
    });

    vi.mocked(backendPricesHooks.useWebSocketPrices).mockReturnValue({
      prices: {},
      connected: false,
      error: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      subscribe: mockSubscribe,
      unsubscribe: vi.fn(),
      isConnected: false,
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    localStorageMock.getItem.mockReturnValue(JSON.stringify([]));
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the asset detail page', () => {
      render(<AssetDetailPage />);
      expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    });

    it('displays the asset symbol', () => {
      render(<AssetDetailPage />);
      expect(screen.getByText('BTC')).toBeInTheDocument();
    });

    it('displays CRYPTO badge', () => {
      render(<AssetDetailPage />);
      expect(screen.getByText('CRYPTO')).toBeInTheDocument();
    });

    it('displays the asset price', () => {
      render(<AssetDetailPage />);
      // Price may appear in multiple places - just check it exists
      expect(screen.getAllByText('$45,000.00').length).toBeGreaterThan(0);
    });

    it('displays positive price change correctly', () => {
      render(<AssetDetailPage />);
      // Price change percentage may appear in multiple places
      expect(screen.getAllByText(/3\.45%/).length).toBeGreaterThan(0);
    });

    it('displays negative price change correctly', () => {
      const negativeCrypto = {
        ...mockCryptoData,
        price_change_24h: -1500,
        price_change_percentage_24h: -3.45,
      };
      vi.mocked(backendPricesHooks.useTopCryptos).mockReturnValue({
        data: { success: true, cryptos: [negativeCrypto], count: 1, cached: false },
        cryptos: [negativeCrypto],
        loading: false,
        error: null,
        refetch: mockRefetch,
        isSuccess: true,
        isCached: false,
      });

      render(<AssetDetailPage />);
      expect(screen.getAllByText(/3\.45%/).length).toBeGreaterThan(0);
    });

    it('displays back button', () => {
      render(<AssetDetailPage />);
      expect(screen.getByRole('button', { name: /back to markets/i })).toBeInTheDocument();
    });

    it('displays category as Cryptocurrency', () => {
      render(<AssetDetailPage />);
      expect(screen.getByText('Cryptocurrency')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading spinner when crypto data is loading', () => {
      vi.mocked(backendPricesHooks.useTopCryptos).mockReturnValue({
        data: null,
        cryptos: [],
        loading: true,
        error: null,
        refetch: mockRefetch,
        isSuccess: false,
        isCached: false,
      });

      render(<AssetDetailPage />);
      expect(screen.getByText(/loading asset data/i)).toBeInTheDocument();
    });

    it('shows chart loading state when historical data is loading', () => {
      vi.mocked(backendPricesHooks.useHistoricalPrices).mockReturnValue({
        data: null,
        loading: true,
        error: null,
        refetch: mockRefetch,
        isSuccess: false,
        isCached: false,
      });

      render(<AssetDetailPage />);
      expect(screen.getByText(/loading chart data/i)).toBeInTheDocument();
    });
  });

  describe('Asset Not Found', () => {
    it('redirects to markets when asset does not exist', () => {
      vi.mocked(backendPricesHooks.useTopCryptos).mockReturnValue({
        data: { success: true, cryptos: [], count: 0, cached: false },
        cryptos: [],
        loading: false,
        error: null,
        refetch: mockRefetch,
        isSuccess: true,
        isCached: false,
      });

      render(<AssetDetailPage />);
      // The component redirects to markets when asset not found
      expect(mockPush).toHaveBeenCalledWith('/markets');
    });
  });

  describe('Navigation', () => {
    it('navigates to markets when back button is clicked', () => {
      render(<AssetDetailPage />);
      const backButton = screen.getByRole('button', { name: /back to markets/i });
      fireEvent.click(backButton);
      expect(mockPush).toHaveBeenCalledWith('/markets');
    });
  });

  describe('Price Chart', () => {
    it('displays price chart section', () => {
      render(<AssetDetailPage />);
      expect(screen.getByText('Price Chart')).toBeInTheDocument();
    });

    it('displays time frame selector buttons', () => {
      render(<AssetDetailPage />);
      expect(screen.getByRole('button', { name: /view 1d chart period/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view 7d chart period/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view 30d chart period/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view 1y chart period/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view all chart period/i })).toBeInTheDocument();
    });

    it('allows changing time frame', () => {
      render(<AssetDetailPage />);
      const monthButton = screen.getByRole('button', { name: /view 30d chart period/i });
      fireEvent.click(monthButton);
      expect(monthButton).toBeInTheDocument();
    });

    it('displays chart statistics when data is available', () => {
      render(<AssetDetailPage />);
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();
      expect(screen.getByText('Change')).toBeInTheDocument();
      expect(screen.getByText('Data Points')).toBeInTheDocument();
    });

    it('displays data points count', () => {
      render(<AssetDetailPage />);
      // 8 data points in mockHistoricalData
      expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('shows no data message when historical data is empty', () => {
      vi.mocked(backendPricesHooks.useHistoricalPrices).mockReturnValue({
        data: { ...mockHistoricalData, data: [], count: 0 },
        loading: false,
        error: null,
        refetch: mockRefetch,
        isSuccess: true,
        isCached: false,
      });

      render(<AssetDetailPage />);
      expect(screen.getByText(/no historical data available/i)).toBeInTheDocument();
    });
  });

  describe('Market Statistics', () => {
    it('displays market statistics section', () => {
      render(<AssetDetailPage />);
      expect(screen.getByText('Market Statistics')).toBeInTheDocument();
    });

    it('displays market cap label', () => {
      render(<AssetDetailPage />);
      expect(screen.getByText('Market Cap')).toBeInTheDocument();
    });

    it('displays 24h volume label', () => {
      render(<AssetDetailPage />);
      expect(screen.getByText('Volume (24h)')).toBeInTheDocument();
    });

    it('displays 24h high label', () => {
      render(<AssetDetailPage />);
      expect(screen.getByText('24h High')).toBeInTheDocument();
    });

    it('displays 24h low label', () => {
      render(<AssetDetailPage />);
      expect(screen.getByText('24h Low')).toBeInTheDocument();
    });

    it('displays previous close label', () => {
      render(<AssetDetailPage />);
      expect(screen.getByText('Prev. Close')).toBeInTheDocument();
    });
  });

  describe('52 Week High/Low', () => {
    it('displays 52 week high section', () => {
      render(<AssetDetailPage />);
      expect(screen.getByText('52W High')).toBeInTheDocument();
    });

    it('displays 52 week low section', () => {
      render(<AssetDetailPage />);
      expect(screen.getByText('52W Low')).toBeInTheDocument();
    });

    it('displays ATH value as 52W High', () => {
      render(<AssetDetailPage />);
      // ATH is $69,000
      expect(screen.getByText('$69,000.00')).toBeInTheDocument();
    });

    it('displays ATL value as 52W Low', () => {
      render(<AssetDetailPage />);
      // ATL is $67
      expect(screen.getByText('$67.00')).toBeInTheDocument();
    });
  });

  describe('Performance Metrics', () => {
    it('displays performance metrics section', () => {
      render(<AssetDetailPage />);
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
    });

    it("displays today's change label", () => {
      render(<AssetDetailPage />);
      expect(screen.getByText("Today's Change")).toBeInTheDocument();
    });

    it('displays period change label', () => {
      render(<AssetDetailPage />);
      expect(screen.getByText('Period Change')).toBeInTheDocument();
    });
  });

  describe('Watchlist Functionality', () => {
    it('displays add to watchlist button by default', () => {
      render(<AssetDetailPage />);
      expect(screen.getByRole('button', { name: /add bitcoin to watchlist/i })).toBeInTheDocument();
    });

    it('displays remove from watchlist button when asset is in watchlist', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(['BTC']));

      render(<AssetDetailPage />);
      expect(
        screen.getByRole('button', { name: /remove bitcoin from watchlist/i })
      ).toBeInTheDocument();
    });

    it('adds asset to watchlist when button is clicked', () => {
      render(<AssetDetailPage />);
      const addButton = screen.getByRole('button', { name: /add bitcoin to watchlist/i });
      fireEvent.click(addButton);

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('removes asset from watchlist when button is clicked', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(['BTC']));

      render(<AssetDetailPage />);
      const removeButton = screen.getByRole('button', { name: /remove bitcoin from watchlist/i });
      fireEvent.click(removeButton);

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('WebSocket Connection', () => {
    it('shows live indicator when connected', () => {
      vi.mocked(backendPricesHooks.useWebSocketPrices).mockReturnValue({
        prices: {},
        connected: true,
        error: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        subscribe: mockSubscribe,
        unsubscribe: vi.fn(),
        isConnected: true,
      });

      render(<AssetDetailPage />);
      expect(screen.getByText('LIVE MARKET DATA')).toBeInTheDocument();
    });

    it('shows connected status when WebSocket is connected', () => {
      vi.mocked(backendPricesHooks.useWebSocketPrices).mockReturnValue({
        prices: {},
        connected: true,
        error: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        subscribe: mockSubscribe,
        unsubscribe: vi.fn(),
        isConnected: true,
      });

      render(<AssetDetailPage />);
      expect(screen.getByText('Connected to backend')).toBeInTheDocument();
    });

    it('does not show live market data card when disconnected', () => {
      vi.mocked(backendPricesHooks.useWebSocketPrices).mockReturnValue({
        prices: {},
        connected: false,
        error: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        subscribe: mockSubscribe,
        unsubscribe: vi.fn(),
        isConnected: false,
      });

      render(<AssetDetailPage />);
      expect(screen.queryByText('LIVE MARKET DATA')).not.toBeInTheDocument();
    });

    it('updates price when WebSocket provides new data', async () => {
      vi.mocked(backendPricesHooks.useWebSocketPrices).mockReturnValue({
        prices: { BTC: { price: 50000, change: 2000, change_percent: 4.17 } },
        connected: true,
        error: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        subscribe: mockSubscribe,
        unsubscribe: vi.fn(),
        isConnected: true,
      });

      render(<AssetDetailPage />);
      // Live price should be used when available - may appear multiple times
      await waitFor(() => {
        expect(screen.getAllByText('$50,000.00').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Data Source Info', () => {
    it('displays data source information', () => {
      render(<AssetDetailPage />);
      expect(screen.getByText(/real data from backend/i)).toBeInTheDocument();
    });

    it('lists coingecko api integration', () => {
      render(<AssetDetailPage />);
      expect(screen.getByText(/coingecko api integration/i)).toBeInTheDocument();
    });

    it('lists historical price data', () => {
      render(<AssetDetailPage />);
      expect(screen.getByText(/historical price data/i)).toBeInTheDocument();
    });

    it('lists websocket live updates', () => {
      render(<AssetDetailPage />);
      expect(screen.getByText(/websocket live updates/i)).toBeInTheDocument();
    });
  });

  describe('Price Formatting', () => {
    it('formats large prices with commas', () => {
      render(<AssetDetailPage />);
      // Price appears in multiple places
      expect(screen.getAllByText('$45,000.00').length).toBeGreaterThan(0);
    });

    it('handles small price values correctly', () => {
      const smallPriceCrypto = {
        ...mockCryptoData,
        current_price: 0.00001234,
      };
      vi.mocked(backendPricesHooks.useTopCryptos).mockReturnValue({
        data: { success: true, cryptos: [smallPriceCrypto], count: 1, cached: false },
        cryptos: [smallPriceCrypto],
        loading: false,
        error: null,
        refetch: mockRefetch,
        isSuccess: true,
        isCached: false,
      });

      render(<AssetDetailPage />);
      // Should display with appropriate decimals - may appear multiple times
      expect(screen.getAllByText(/\$0\.0000123/).length).toBeGreaterThan(0);
    });
  });

  describe('Chart SVG Rendering', () => {
    it('renders SVG chart when data is available', () => {
      render(<AssetDetailPage />);
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders polyline elements for chart', () => {
      render(<AssetDetailPage />);
      const polylines = document.querySelectorAll('polyline');
      expect(polylines.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('handles missing crypto data gracefully (redirects)', () => {
      vi.mocked(backendPricesHooks.useTopCryptos).mockReturnValue({
        data: null,
        cryptos: [],
        loading: false,
        error: new Error('Failed to load'),
        refetch: mockRefetch,
        isSuccess: false,
        isCached: false,
      });

      render(<AssetDetailPage />);
      expect(mockPush).toHaveBeenCalledWith('/markets');
    });
  });

  describe('Component Export', () => {
    it('exports AssetDetailPage as default', () => {
      expect(AssetDetailPage).toBeDefined();
      expect(typeof AssetDetailPage).toBe('function');
    });
  });
});
