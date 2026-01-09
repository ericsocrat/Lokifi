import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CryptoMarketsPage from '../../app/markets/crypto/page';

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
  usePathname: () => '/markets/crypto',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock ProtectedRoute
vi.mock('@/src/components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock useCurrencyFormatter
vi.mock('@/src/components/dashboard/useCurrencyFormatter', () => ({
  useCurrencyFormatter: () => ({
    formatCurrency: (value: number) =>
      `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  }),
}));

// Mock crypto hooks
const mockRefetch = vi.fn();
const mockSubscribe = vi.fn();

vi.mock('@/src/hooks/useBackendPrices', () => ({
  useTopCryptos: () => ({
    cryptos: [
      {
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        image: 'https://example.com/btc.png',
        current_price: 43000,
        price_change_percentage_24h: 2.5,
        total_volume: 25000000000,
        market_cap: 840000000000,
        market_cap_rank: 1,
      },
      {
        id: 'ethereum',
        symbol: 'eth',
        name: 'Ethereum',
        image: 'https://example.com/eth.png',
        current_price: 2200,
        price_change_percentage_24h: -1.2,
        total_volume: 15000000000,
        market_cap: 260000000000,
        market_cap_rank: 2,
      },
      {
        id: 'solana',
        symbol: 'sol',
        name: 'Solana',
        image: 'https://example.com/sol.png',
        current_price: 100,
        price_change_percentage_24h: 5.8,
        total_volume: 2000000000,
        market_cap: 42000000000,
        market_cap_rank: 5,
      },
    ],
    loading: false,
    error: null,
    refetch: mockRefetch,
  }),
  useCryptoSearch: () => ({
    results: [],
    loading: false,
  }),
  useWebSocketPrices: () => ({
    prices: {},
    connected: false,
    subscribe: mockSubscribe,
  }),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    width,
    height,
    className,
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
    className?: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} className={className} />
  ),
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

describe('CryptoMarketsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Header', () => {
    it('renders page title', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        expect(screen.getByText('Crypto Markets')).toBeInTheDocument();
      });
    });

    it('shows number of tracked assets', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Track 3\+ cryptocurrencies/)).toBeInTheDocument();
      });
    });

    it('renders refresh button', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
      });
    });

    it('calls refetch on refresh button click', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
        fireEvent.click(refreshBtn);
      });

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Market Stats', () => {
    it('renders Assets card', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        expect(screen.getByText('Assets')).toBeInTheDocument();
        expect(screen.getByText('Tracked')).toBeInTheDocument();
      });
    });

    it('renders Top Gainer card', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        expect(screen.getByText('Top Gainer')).toBeInTheDocument();
      });
    });

    it('shows top gainer symbol (Solana with highest gain)', async () => {
      render(<CryptoMarketsPage />);

      // Solana has 5.8% gain, highest
      await waitFor(() => {
        expect(screen.getByText('SOL')).toBeInTheDocument();
      });
    });

    it('renders Top Loser card', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        expect(screen.getByText('Top Loser')).toBeInTheDocument();
      });
    });

    it('shows top loser symbol (Ethereum with negative change)', async () => {
      render(<CryptoMarketsPage />);

      // Ethereum has -1.2% change
      await waitFor(() => {
        expect(screen.getByText('ETH')).toBeInTheDocument();
      });
    });

    it('renders Market Cap card', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        // Market Cap appears in stats card and table header
        const marketCapElements = screen.getAllByText('Market Cap');
        expect(marketCapElements.length).toBeGreaterThan(0);
        expect(screen.getByText('Total Value')).toBeInTheDocument();
      });
    });
  });

  describe('Search', () => {
    it('renders search input', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search cryptocurrencies/)).toBeInTheDocument();
      });
    });

    it('allows typing in search input', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(
          /Search cryptocurrencies/
        ) as HTMLInputElement;
        fireEvent.change(searchInput, { target: { value: 'bitcoin' } });
        expect(searchInput.value).toBe('bitcoin');
      });
    });
  });

  describe('Table Headers', () => {
    it('renders Rank column', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        expect(screen.getByText('Rank')).toBeInTheDocument();
      });
    });

    it('renders Asset column', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        expect(screen.getByText('Asset')).toBeInTheDocument();
      });
    });

    it('renders Price column', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        expect(screen.getByText('Price')).toBeInTheDocument();
      });
    });

    it('renders 24h Change column', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        expect(screen.getByText('24h Change')).toBeInTheDocument();
      });
    });

    it('renders Volume column', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        expect(screen.getByText('Volume')).toBeInTheDocument();
      });
    });

    it('renders Market Cap column in table', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        // There are multiple Market Cap elements - one in stats card, one in table
        const marketCapElements = screen.getAllByText('Market Cap');
        expect(marketCapElements.length).toBeGreaterThan(0);
      });
    });

    it('renders Actions column', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });
    });
  });

  describe('Crypto Table Data', () => {
    it('renders Bitcoin row', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        expect(screen.getByText('Bitcoin')).toBeInTheDocument();
        expect(screen.getByText('btc')).toBeInTheDocument();
      });
    });

    it('renders Ethereum row', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        // Ethereum appears in table row and possibly in top loser card
        const ethElements = screen.getAllByText('Ethereum');
        expect(ethElements.length).toBeGreaterThan(0);
        expect(screen.getAllByText('eth').length).toBeGreaterThan(0);
      });
    });

    it('renders Solana row', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        // Solana appears in table row and top gainer card
        const solElements = screen.getAllByText('Solana');
        expect(solElements.length).toBeGreaterThan(0);
        expect(screen.getAllByText('sol').length).toBeGreaterThan(0);
      });
    });

    it('displays market cap rank', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        expect(screen.getByText('#1')).toBeInTheDocument();
        expect(screen.getByText('#2')).toBeInTheDocument();
      });
    });

    it('renders crypto images', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        const images = screen.getAllByRole('img');
        expect(images.length).toBe(3);
      });
    });

    it('displays price changes with colors', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        // Positive change shows green - may appear multiple times (table + stats)
        const positiveChanges = screen.getAllByText('+2.50%');
        expect(positiveChanges.length).toBeGreaterThan(0);
        // Negative change - Ethereum
        const negativeChanges = screen.getAllByText('-1.20%');
        expect(negativeChanges.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Sorting', () => {
    it('allows sorting by rank', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        const rankBtn = screen.getByRole('button', { name: /Rank/i });
        fireEvent.click(rankBtn);
      });

      // Should toggle sort direction
      expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    });

    it('allows sorting by price', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        const priceBtn = screen.getByRole('button', { name: /Price/i });
        fireEvent.click(priceBtn);
      });

      expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    });

    it('allows sorting by 24h change', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        const changeBtn = screen.getByRole('button', { name: /24h Change/i });
        fireEvent.click(changeBtn);
      });

      expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    });

    it('allows sorting by volume', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        const volumeBtn = screen.getByRole('button', { name: /Volume/i });
        fireEvent.click(volumeBtn);
      });

      expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    });

    it('toggles sort direction on double click', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        const priceBtn = screen.getByRole('button', { name: /Price/i });
        fireEvent.click(priceBtn);
        fireEvent.click(priceBtn);
      });

      // Should still render data
      expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    });
  });

  describe('Watchlist', () => {
    it('renders watchlist star buttons', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        const starButtons = screen
          .getAllByRole('button')
          .filter((btn) => btn.querySelector('svg.lucide-star'));
        expect(starButtons.length).toBe(3);
      });
    });

    it('loads watchlist from localStorage', async () => {
      localStorageMock.getItem.mockReturnValue('["BTC"]');

      render(<CryptoMarketsPage />);

      await waitFor(() => {
        expect(localStorageMock.getItem).toHaveBeenCalledWith('watchlist');
      });
    });

    it('saves to watchlist on star click', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        const starButtons = screen
          .getAllByRole('button')
          .filter((btn) => btn.querySelector('svg.lucide-star'));
        fireEvent.click(starButtons[0]);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'watchlist',
        expect.stringContaining('BTC')
      );
    });
  });

  describe('Row Click Navigation', () => {
    it('navigates to asset page on row click', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        const bitcoinRow = screen.getByText('Bitcoin').closest('tr');
        if (bitcoinRow) {
          fireEvent.click(bitcoinRow);
        }
      });

      expect(mockPush).toHaveBeenCalledWith('/asset/BTC');
    });

    it('does not navigate when clicking watchlist star', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        const starButtons = screen
          .getAllByRole('button')
          .filter((btn) => btn.querySelector('svg.lucide-star'));
        fireEvent.click(starButtons[0]);
      });

      // Should not navigate since stopPropagation is called
      expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining('/asset/'));
    });
  });

  describe('Styling', () => {
    it('has gradient title', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        const title = screen.getByText('Crypto Markets');
        expect(title).toHaveClass('bg-clip-text', 'text-transparent');
      });
    });

    it('has proper background', async () => {
      const { container } = render(<CryptoMarketsPage />);

      await waitFor(() => {
        // The outer div has min-h-screen and bg-surface-0
        const bgDiv = container.querySelector('.min-h-screen.bg-surface-0');
        expect(bgDiv).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has accessible table structure', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    });

    it('has column headers', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        const headers = screen.getAllByRole('columnheader');
        expect(headers.length).toBe(7);
      });
    });

    it('has table rows', async () => {
      render(<CryptoMarketsPage />);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        // Header row + 3 data rows
        expect(rows.length).toBe(4);
      });
    });
  });
});
