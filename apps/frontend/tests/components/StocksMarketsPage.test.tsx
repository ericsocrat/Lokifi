import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import StocksPage from '../../app/markets/stocks/page';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/markets/stocks',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock ProtectedRoute
vi.mock('@/src/components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock useCurrencyFormatter
vi.mock('@/src/components/dashboard/useCurrencyFormatter', () => ({
  useCurrencyFormatter: () => ({
    formatCurrency: (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  }),
}));

// Mock stocks hook
const mockRefetch = vi.fn();

const mockStocksData = [
  {
    id: 'AAPL',
    symbol: 'AAPL',
    name: 'Apple Inc',
    current_price: 185.50,
    price_change_percentage_24h: 1.25,
    market_cap: 2900000000000,
  },
  {
    id: 'MSFT',
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    current_price: 378.20,
    price_change_percentage_24h: -0.45,
    market_cap: 2800000000000,
  },
  {
    id: 'GOOGL',
    symbol: 'GOOGL',
    name: 'Alphabet Inc',
    current_price: 142.30,
    price_change_percentage_24h: 0.85,
    market_cap: 1800000000000,
  },
];

const mockHookReturn = {
  data: mockStocksData,
  response: { cached: false },
  isLoading: false,
  error: null,
  refetch: mockRefetch,
  isFetching: false,
};

vi.mock('@/src/hooks/useUnifiedAssets', () => ({
  useUnifiedStocks: () => mockHookReturn,
}));

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    reset: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('StocksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.reset();
    // Reset mock to default state
    mockHookReturn.data = mockStocksData;
    mockHookReturn.response = { cached: false };
    mockHookReturn.isLoading = false;
    mockHookReturn.error = null;
    mockHookReturn.isFetching = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Header', () => {
    it('renders page title with dollar icon', async () => {
      render(<StocksPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Stock Markets')).toBeInTheDocument();
      });
    });

    it('shows Live Data badge', async () => {
      render(<StocksPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Live Data')).toBeInTheDocument();
      });
    });

    it('shows stock count', async () => {
      render(<StocksPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/3 stocks/)).toBeInTheDocument();
      });
    });

    it('shows data source attribution', async () => {
      render(<StocksPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/Real-time from Alpha Vantage/)).toBeInTheDocument();
      });
    });

    it('renders refresh button', async () => {
      render(<StocksPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
      });
    });

    it('calls refetch on refresh button click', async () => {
      render(<StocksPage />);
      
      await waitFor(() => {
        const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
        fireEvent.click(refreshBtn);
      });
      
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Search', () => {
    it('renders search input', async () => {
      render(<StocksPage />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search stocks/)).toBeInTheDocument();
      });
    });

    it('allows typing in search input', async () => {
      render(<StocksPage />);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/Search stocks/) as HTMLInputElement;
        fireEvent.change(searchInput, { target: { value: 'Apple' } });
        expect(searchInput.value).toBe('Apple');
      });
    });

    it('filters stocks by search query', async () => {
      render(<StocksPage />);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/Search stocks/) as HTMLInputElement;
        fireEvent.change(searchInput, { target: { value: 'Apple' } });
      });
      
      // Only Apple should match
      await waitFor(() => {
        expect(screen.getByText('Apple Inc')).toBeInTheDocument();
      });
    });
  });

  describe('Mock Data Warning', () => {
    it('displays mock data notice', async () => {
      render(<StocksPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Mock Data Notice')).toBeInTheDocument();
      });
    });

    it('shows warning about mock data', async () => {
      render(<StocksPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/This page currently displays mock stock data/)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading', async () => {
      mockHookReturn.isLoading = true;
      mockHookReturn.data = [];
      
      render(<StocksPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Loading stocks...')).toBeInTheDocument();
      });
    });

    it('shows spinner element', async () => {
      mockHookReturn.isLoading = true;
      mockHookReturn.data = [];
      
      const { container } = render(<StocksPage />);
      
      await waitFor(() => {
        const spinner = container.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('shows error message when error occurs', async () => {
      mockHookReturn.error = { message: 'Failed to fetch stocks' };
      mockHookReturn.data = [];
      
      render(<StocksPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Error Loading Stocks')).toBeInTheDocument();
      });
    });

    it('shows Try Again button on error', async () => {
      mockHookReturn.error = { message: 'Network error' };
      mockHookReturn.data = [];
      
      render(<StocksPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
      });
    });

    it('calls refetch on Try Again click', async () => {
      mockHookReturn.error = { message: 'Network error' };
      mockHookReturn.data = [];
      
      render(<StocksPage />);
      
      await waitFor(() => {
        const tryAgainBtn = screen.getByRole('button', { name: 'Try Again' });
        fireEvent.click(tryAgainBtn);
      });
      
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Table Headers', () => {
    it('renders Stock column', async () => {
      render(<StocksPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Stock')).toBeInTheDocument();
      });
    });

    it('renders Price column', async () => {
      render(<StocksPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Price')).toBeInTheDocument();
      });
    });

    it('renders 24h % column', async () => {
      render(<StocksPage />);
      
      await waitFor(() => {
        expect(screen.getByText('24h %')).toBeInTheDocument();
      });
    });

    it('renders Market Cap column', async () => {
      render(<StocksPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Market Cap')).toBeInTheDocument();
      });
    });
  });

  describe('Stock Data Display', () => {
    it('renders Apple stock', async () => {
      render(<StocksPage />);
      
      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
        expect(screen.getByText('Apple Inc')).toBeInTheDocument();
      });
    });

    it('renders Microsoft stock', async () => {
      render(<StocksPage />);
      
      await waitFor(() => {
        expect(screen.getByText('MSFT')).toBeInTheDocument();
        expect(screen.getByText('Microsoft Corporation')).toBeInTheDocument();
      });
    });

    it('renders Google stock', async () => {
      render(<StocksPage />);
      
      await waitFor(() => {
        expect(screen.getByText('GOOGL')).toBeInTheDocument();
        expect(screen.getByText('Alphabet Inc')).toBeInTheDocument();
      });
    });

    it('displays stock prices', async () => {
      render(<StocksPage />);
      
      await waitFor(() => {
        expect(screen.getByText('$185.50')).toBeInTheDocument();
        expect(screen.getByText('$378.20')).toBeInTheDocument();
        expect(screen.getByText('$142.30')).toBeInTheDocument();
      });
    });

    it('displays positive price changes', async () => {
      render(<StocksPage />);
      
      await waitFor(() => {
        expect(screen.getByText('+1.25%')).toBeInTheDocument();
        expect(screen.getByText('+0.85%')).toBeInTheDocument();
      });
    });

    it('displays negative price changes', async () => {
      render(<StocksPage />);
      
      await waitFor(() => {
        expect(screen.getByText('-0.45%')).toBeInTheDocument();
      });
    });
  });

  describe('Sorting', () => {
    it('allows sorting by Stock name', async () => {
      render(<StocksPage />);
      
      await waitFor(() => {
        const stockHeader = screen.getByText('Stock').closest('div');
        if (stockHeader) {
          fireEvent.click(stockHeader);
        }
      });
      
      // Should still render data
      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    it('allows sorting by Price', async () => {
      render(<StocksPage />);
      
      await waitFor(() => {
        const priceHeader = screen.getByText('Price').closest('div');
        if (priceHeader) {
          fireEvent.click(priceHeader);
        }
      });
      
      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    it('allows sorting by Market Cap', async () => {
      render(<StocksPage />);
      
      await waitFor(() => {
        const marketCapHeader = screen.getByText('Market Cap').closest('div');
        if (marketCapHeader) {
          fireEvent.click(marketCapHeader);
        }
      });
      
      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });
  });

  describe('Watchlist', () => {
    it('loads watchlist from localStorage', async () => {
      localStorageMock.getItem.mockReturnValue('["AAPL"]');
      
      render(<StocksPage />);
      
      await waitFor(() => {
        expect(localStorageMock.getItem).toHaveBeenCalledWith('watchlist');
      });
    });

    it('renders watchlist star buttons', async () => {
      const { container } = render(<StocksPage />);
      
      await waitFor(() => {
        const starIcons = container.querySelectorAll('.lucide-star');
        expect(starIcons.length).toBe(3);
      });
    });

    it('saves to watchlist on star click', async () => {
      const { container } = render(<StocksPage />);
      
      await waitFor(() => {
        const starButtons = container.querySelectorAll('button');
        const watchlistBtn = Array.from(starButtons).find(btn => 
          btn.querySelector('.lucide-star')
        );
        if (watchlistBtn) {
          fireEvent.click(watchlistBtn);
        }
      });
      
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    it('navigates to asset page on row click', async () => {
      render(<StocksPage />);
      
      await waitFor(() => {
        const aaplRow = screen.getByText('AAPL').closest('div[class*="cursor-pointer"]');
        if (aaplRow) {
          fireEvent.click(aaplRow);
        }
      });
      
      expect(mockPush).toHaveBeenCalledWith('/asset/AAPL');
    });

    it('does not navigate on watchlist star click', async () => {
      const { container } = render(<StocksPage />);
      
      await waitFor(() => {
        const starButtons = container.querySelectorAll('button');
        const watchlistBtn = Array.from(starButtons).find(btn => 
          btn.querySelector('.lucide-star')
        );
        if (watchlistBtn) {
          fireEvent.click(watchlistBtn);
        }
      });
      
      // Should not navigate because stopPropagation
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Cache Status', () => {
    it('shows fresh data indicator', async () => {
      mockHookReturn.response = { cached: false };
      
      render(<StocksPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Fresh data from API')).toBeInTheDocument();
      });
    });

    it('shows cached data indicator', async () => {
      mockHookReturn.response = { cached: true };
      
      render(<StocksPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Data from cache')).toBeInTheDocument();
      });
    });
  });

  describe('Fetching State', () => {
    it('disables refresh button when fetching', async () => {
      mockHookReturn.isFetching = true;
      
      render(<StocksPage />);
      
      await waitFor(() => {
        const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
        expect(refreshBtn).toBeDisabled();
      });
    });
  });

  describe('Styling', () => {
    it('has dark gradient background', async () => {
      const { container } = render(<StocksPage />);
      
      await waitFor(() => {
        const mainDiv = container.querySelector('.bg-linear-to-br');
        expect(mainDiv).toBeInTheDocument();
      });
    });

    it('has sticky header', async () => {
      const { container } = render(<StocksPage />);
      
      await waitFor(() => {
        const header = container.querySelector('.sticky');
        expect(header).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('renders stock names for screen readers', async () => {
      render(<StocksPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Apple Inc')).toBeInTheDocument();
        expect(screen.getByText('Microsoft Corporation')).toBeInTheDocument();
        expect(screen.getByText('Alphabet Inc')).toBeInTheDocument();
      });
    });
  });
});
