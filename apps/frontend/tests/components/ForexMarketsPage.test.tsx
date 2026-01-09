import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ForexPage from '../../app/markets/forex/page';

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
  usePathname: () => '/markets/forex',
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

// Mock forex hook
const mockRefetch = vi.fn();

const mockForexData = [
  {
    id: 'EUR/USD',
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    current_price: 1.0850,
    price_change_percentage_24h: 0.25,
    volume_24h: 5000000000,
    market_cap: 0,
  },
  {
    id: 'GBP/USD',
    symbol: 'GBP/USD',
    name: 'British Pound / US Dollar',
    current_price: 1.2650,
    price_change_percentage_24h: -0.15,
    volume_24h: 3000000000,
    market_cap: 0,
  },
  {
    id: 'USD/JPY',
    symbol: 'USD/JPY',
    name: 'US Dollar / Japanese Yen',
    current_price: 149.25,
    price_change_percentage_24h: 0.45,
    volume_24h: 4000000000,
    market_cap: 0,
  },
];

const mockHookReturn = {
  data: mockForexData,
  response: { cached: false },
  isLoading: false,
  error: null,
  refetch: mockRefetch,
  isFetching: false,
};

vi.mock('@/src/hooks/useUnifiedAssets', () => ({
  useUnifiedForex: () => mockHookReturn,
}));

describe('ForexPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock to default state
    mockHookReturn.data = mockForexData;
    mockHookReturn.response = { cached: false };
    mockHookReturn.isLoading = false;
    mockHookReturn.error = null;
    mockHookReturn.isFetching = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Header', () => {
    it('renders page title with globe icon', async () => {
      render(<ForexPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Forex Markets')).toBeInTheDocument();
      });
    });

    it('shows Live Data badge', async () => {
      render(<ForexPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Live Data')).toBeInTheDocument();
      });
    });

    it('shows currency pair count', async () => {
      render(<ForexPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/3 currency pairs/)).toBeInTheDocument();
      });
    });

    it('shows data source attribution', async () => {
      render(<ForexPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/Real-time from ExchangeRate-API/)).toBeInTheDocument();
      });
    });

    it('renders refresh button', async () => {
      render(<ForexPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
      });
    });

    it('calls refetch on refresh button click', async () => {
      render(<ForexPage />);
      
      await waitFor(() => {
        const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
        fireEvent.click(refreshBtn);
      });
      
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading', async () => {
      mockHookReturn.isLoading = true;
      mockHookReturn.data = [];
      
      render(<ForexPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Loading forex pairs...')).toBeInTheDocument();
      });
    });

    it('shows loading spinner element', async () => {
      mockHookReturn.isLoading = true;
      mockHookReturn.data = [];
      
      const { container } = render(<ForexPage />);
      
      await waitFor(() => {
        const spinner = container.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('shows error message when error occurs', async () => {
      mockHookReturn.error = { message: 'Failed to fetch forex data' };
      mockHookReturn.data = [];
      
      render(<ForexPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Error Loading Forex Data')).toBeInTheDocument();
      });
    });

    it('shows Try Again button on error', async () => {
      mockHookReturn.error = { message: 'Network error' };
      mockHookReturn.data = [];
      
      render(<ForexPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
      });
    });

    it('calls refetch on Try Again click', async () => {
      mockHookReturn.error = { message: 'Network error' };
      mockHookReturn.data = [];
      
      render(<ForexPage />);
      
      await waitFor(() => {
        const tryAgainBtn = screen.getByRole('button', { name: 'Try Again' });
        fireEvent.click(tryAgainBtn);
      });
      
      expect(mockRefetch).toHaveBeenCalled();
    });

    it('displays error message text', async () => {
      mockHookReturn.error = { message: 'API rate limit exceeded' };
      mockHookReturn.data = [];
      
      render(<ForexPage />);
      
      await waitFor(() => {
        expect(screen.getByText('API rate limit exceeded')).toBeInTheDocument();
      });
    });
  });

  describe('Forex Pair Cards', () => {
    it('renders EUR/USD pair', async () => {
      render(<ForexPage />);
      
      await waitFor(() => {
        expect(screen.getByText('EUR/USD')).toBeInTheDocument();
        expect(screen.getByText('Euro / US Dollar')).toBeInTheDocument();
      });
    });

    it('renders GBP/USD pair', async () => {
      render(<ForexPage />);
      
      await waitFor(() => {
        expect(screen.getByText('GBP/USD')).toBeInTheDocument();
        expect(screen.getByText('British Pound / US Dollar')).toBeInTheDocument();
      });
    });

    it('renders USD/JPY pair', async () => {
      render(<ForexPage />);
      
      await waitFor(() => {
        expect(screen.getByText('USD/JPY')).toBeInTheDocument();
        expect(screen.getByText('US Dollar / Japanese Yen')).toBeInTheDocument();
      });
    });

    it('displays exchange rates with 4 decimal places', async () => {
      render(<ForexPage />);
      
      await waitFor(() => {
        expect(screen.getByText('1.0850')).toBeInTheDocument();
        expect(screen.getByText('1.2650')).toBeInTheDocument();
        expect(screen.getByText('149.2500')).toBeInTheDocument();
      });
    });

    it('displays positive price changes with plus sign', async () => {
      render(<ForexPage />);
      
      await waitFor(() => {
        expect(screen.getByText('+0.25%')).toBeInTheDocument();
        expect(screen.getByText('+0.45%')).toBeInTheDocument();
      });
    });

    it('displays negative price changes', async () => {
      render(<ForexPage />);
      
      await waitFor(() => {
        expect(screen.getByText('-0.15%')).toBeInTheDocument();
      });
    });
  });

  describe('Card Stats', () => {
    it('displays 24h Volume label', async () => {
      render(<ForexPage />);
      
      await waitFor(() => {
        const volumeLabels = screen.getAllByText('24h Volume');
        expect(volumeLabels.length).toBe(3);
      });
    });

    it('displays Market Cap label', async () => {
      render(<ForexPage />);
      
      await waitFor(() => {
        const capLabels = screen.getAllByText('Market Cap');
        expect(capLabels.length).toBe(3);
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to asset page on card click', async () => {
      render(<ForexPage />);
      
      await waitFor(() => {
        const eurUsdCard = screen.getByText('EUR/USD').closest('div[class*="cursor-pointer"]');
        if (eurUsdCard) {
          fireEvent.click(eurUsdCard);
        }
      });
      
      expect(mockPush).toHaveBeenCalledWith('/asset/EUR/USD');
    });

    it('navigates to correct asset for each pair', async () => {
      render(<ForexPage />);
      
      await waitFor(() => {
        const gbpUsdCard = screen.getByText('GBP/USD').closest('div[class*="cursor-pointer"]');
        if (gbpUsdCard) {
          fireEvent.click(gbpUsdCard);
        }
      });
      
      expect(mockPush).toHaveBeenCalledWith('/asset/GBP/USD');
    });
  });

  describe('Cache Status', () => {
    it('shows fresh data indicator when not cached', async () => {
      mockHookReturn.response = { cached: false };
      
      render(<ForexPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Fresh data from API')).toBeInTheDocument();
      });
    });

    it('shows cached data indicator when cached', async () => {
      mockHookReturn.response = { cached: true };
      
      render(<ForexPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Data from cache')).toBeInTheDocument();
      });
    });

    it('shows green indicator for cached data', async () => {
      mockHookReturn.response = { cached: true };
      
      const { container } = render(<ForexPage />);
      
      await waitFor(() => {
        const greenDot = container.querySelector('.bg-green-500');
        expect(greenDot).toBeInTheDocument();
      });
    });

    it('shows blue indicator for fresh data', async () => {
      mockHookReturn.response = { cached: false };
      
      const { container } = render(<ForexPage />);
      
      await waitFor(() => {
        const blueDot = container.querySelector('.bg-blue-500');
        expect(blueDot).toBeInTheDocument();
      });
    });
  });

  describe('Fetching State', () => {
    it('disables refresh button when fetching', async () => {
      mockHookReturn.isFetching = true;
      
      render(<ForexPage />);
      
      await waitFor(() => {
        const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
        expect(refreshBtn).toBeDisabled();
      });
    });

    it('shows spinning icon when fetching', async () => {
      mockHookReturn.isFetching = true;
      
      const { container } = render(<ForexPage />);
      
      await waitFor(() => {
        const spinningIcon = container.querySelector('.animate-spin');
        expect(spinningIcon).toBeInTheDocument();
      });
    });
  });

  describe('Styling', () => {
    it('has dark gradient background', async () => {
      const { container } = render(<ForexPage />);
      
      await waitFor(() => {
        const mainDiv = container.querySelector('.bg-linear-to-br');
        expect(mainDiv).toBeInTheDocument();
      });
    });

    it('has sticky header', async () => {
      const { container } = render(<ForexPage />);
      
      await waitFor(() => {
        const header = container.querySelector('.sticky');
        expect(header).toBeInTheDocument();
      });
    });

    it('renders cards in a grid layout', async () => {
      const { container } = render(<ForexPage />);
      
      await waitFor(() => {
        const grid = container.querySelector('.grid');
        expect(grid).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('has responsive grid columns', async () => {
      const { container } = render(<ForexPage />);
      
      await waitFor(() => {
        const grid = container.querySelector('.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3.xl\\:grid-cols-4');
        expect(grid).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('renders all currency pair names', async () => {
      render(<ForexPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Euro / US Dollar')).toBeInTheDocument();
        expect(screen.getByText('British Pound / US Dollar')).toBeInTheDocument();
        expect(screen.getByText('US Dollar / Japanese Yen')).toBeInTheDocument();
      });
    });

    it('has clickable cards for navigation', async () => {
      const { container } = render(<ForexPage />);
      
      await waitFor(() => {
        const clickableCards = container.querySelectorAll('.cursor-pointer');
        expect(clickableCards.length).toBe(3);
      });
    });
  });
});
