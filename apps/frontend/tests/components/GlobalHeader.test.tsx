import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GlobalHeader from '../../components/GlobalHeader';

// Hoisted mocks
const { mockAuth, mockCryptoSearch } = vi.hoisted(() => ({
  mockAuth: {
    user: null as { id: string; username: string; email: string } | null,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  },
  mockCryptoSearch: {
    results: [] as Array<{ id: string; symbol: string; name: string }>,
    loading: false,
  },
}));

vi.mock('@/src/components/AuthProvider', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('@/src/hooks/useBackendPrices', () => ({
  useCryptoSearch: () => mockCryptoSearch,
}));

vi.mock('@/src/components/AuthModal', () => ({
  AuthModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="auth-modal" onClick={onClose}>
      AuthModal
    </div>
  ),
}));

vi.mock('../../components/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell">NotificationBell</div>,
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    onClick,
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: () => void;
  }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

describe('GlobalHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.user = null;
    mockAuth.loading = false;
    mockCryptoSearch.results = [];
    mockCryptoSearch.loading = false;
  });

  describe('Rendering', () => {
    it('should render the header', () => {
      render(<GlobalHeader />);
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should render the Lokifi logo', () => {
      render(<GlobalHeader />);
      expect(screen.getByText('Lokifi')).toBeInTheDocument();
    });

    it('should render logo link to home', () => {
      render(<GlobalHeader />);
      const logoLink = screen.getByRole('link', { name: /lokifi/i });
      expect(logoLink).toHaveAttribute('href', '/');
    });
  });

  describe('Navigation', () => {
    it('should render Markets link', () => {
      render(<GlobalHeader />);
      expect(screen.getByRole('link', { name: /markets/i })).toBeInTheDocument();
    });

    it('should render Chart link', () => {
      render(<GlobalHeader />);
      expect(screen.getByRole('link', { name: /chart/i })).toBeInTheDocument();
    });

    it('should render Portfolio link', () => {
      render(<GlobalHeader />);
      expect(screen.getByRole('link', { name: /portfolio/i })).toBeInTheDocument();
    });

    it('should have proper navigation role', () => {
      render(<GlobalHeader />);
      expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
    });
  });

  describe('Search', () => {
    it('should render search input', () => {
      render(<GlobalHeader />);
      expect(screen.getByPlaceholderText(/search cryptocurrencies/i)).toBeInTheDocument();
    });

    it('should update search query on input', () => {
      render(<GlobalHeader />);
      const searchInput = screen.getByPlaceholderText(/search cryptocurrencies/i);

      fireEvent.change(searchInput, { target: { value: 'BTC' } });
      expect(searchInput).toHaveValue('BTC');
    });

    it('should show clear button when search has value', () => {
      render(<GlobalHeader />);
      const searchInput = screen.getByPlaceholderText(/search cryptocurrencies/i);

      fireEvent.change(searchInput, { target: { value: 'ETH' } });
      fireEvent.focus(searchInput);

      // The clear button should be visible
      const clearButton = screen.getByRole('button', { name: /clear search/i });
      expect(clearButton).toBeInTheDocument();
    });

    it('should clear search on clear button click', () => {
      render(<GlobalHeader />);
      const searchInput = screen.getByPlaceholderText(/search cryptocurrencies/i);

      fireEvent.change(searchInput, { target: { value: 'ETH' } });
      fireEvent.focus(searchInput);

      const clearButton = screen.getByRole('button', { name: /clear search/i });
      fireEvent.click(clearButton);

      expect(searchInput).toHaveValue('');
    });
  });

  describe('Unauthenticated State', () => {
    it('should show Log In / Sign Up button when not logged in', () => {
      render(<GlobalHeader />);
      expect(screen.getByRole('button', { name: /log in or sign up/i })).toBeInTheDocument();
    });

    it('should open auth modal when login button is clicked', () => {
      render(<GlobalHeader />);
      const loginButton = screen.getByRole('button', { name: /log in or sign up/i });

      fireEvent.click(loginButton);

      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
    });

    it('should show disabled notification bell when not logged in', () => {
      render(<GlobalHeader />);
      const bellButton = screen.getByTitle('Login to view notifications');
      expect(bellButton).toBeDisabled();
    });
  });

  describe('Authenticated State', () => {
    beforeEach(() => {
      mockAuth.user = {
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
      };
    });

    it('should show username when logged in', () => {
      render(<GlobalHeader />);
      expect(screen.getByText('@testuser')).toBeInTheDocument();
    });

    it('should show notification bell when logged in', () => {
      render(<GlobalHeader />);
      expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
    });

    it('should show email prefix if no username', () => {
      mockAuth.user = {
        id: '123',
        username: '',
        email: 'john@example.com',
      };

      render(<GlobalHeader />);
      expect(screen.getByText('john')).toBeInTheDocument();
    });
  });

  describe('Auth Modal', () => {
    it('should close auth modal when close is triggered', () => {
      render(<GlobalHeader />);
      const loginButton = screen.getByRole('button', { name: /log in or sign up/i });

      fireEvent.click(loginButton);
      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('auth-modal'));
      expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should be sticky positioned', () => {
      render(<GlobalHeader />);
      const header = screen.getByRole('banner');
      expect(header).toHaveClass('sticky');
    });

    it('should have backdrop blur', () => {
      render(<GlobalHeader />);
      const header = screen.getByRole('banner');
      expect(header).toHaveClass('backdrop-blur');
    });

    it('should have high z-index', () => {
      render(<GlobalHeader />);
      const header = screen.getByRole('banner');
      expect(header).toHaveClass('z-50');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible search input', () => {
      render(<GlobalHeader />);
      const searchInput = screen.getByPlaceholderText(/search cryptocurrencies/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should have navigation landmark', () => {
      render(<GlobalHeader />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
  });

  describe('Search Results', () => {
    it('should show loading state when searching', () => {
      mockCryptoSearch.loading = true;

      render(<GlobalHeader />);
      const searchInput = screen.getByPlaceholderText(/search cryptocurrencies/i);

      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: 'BTC' } });

      expect(screen.getByText(/searching/i)).toBeInTheDocument();
    });

    it('should show no results message when search returns empty', () => {
      mockCryptoSearch.results = [];
      mockCryptoSearch.loading = false;

      render(<GlobalHeader />);
      const searchInput = screen.getByPlaceholderText(/search cryptocurrencies/i);

      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: 'xyz123' } });

      expect(screen.getByText(/no results found for/i)).toBeInTheDocument();
    });

    it('should display search results with crypto info', () => {
      mockCryptoSearch.results = [
        {
          id: 'bitcoin',
          symbol: 'BTC',
          name: 'Bitcoin',
          image: 'https://example.com/btc.png',
          current_price: 45000.5,
          price_change_percentage_24h: 2.5,
          market_cap_rank: 1,
        },
      ];
      mockCryptoSearch.loading = false;

      render(<GlobalHeader />);
      const searchInput = screen.getByPlaceholderText(/search cryptocurrencies/i);

      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: 'bit' } });

      expect(screen.getByText('Bitcoin')).toBeInTheDocument();
      expect(screen.getByText('BTC')).toBeInTheDocument();
      expect(screen.getByText('Rank #1')).toBeInTheDocument();
      expect(screen.getByText('$45,000.50')).toBeInTheDocument();
      expect(screen.getByText('+2.50%')).toBeInTheDocument();
    });

    it('should display negative price change correctly', () => {
      mockCryptoSearch.results = [
        {
          id: 'ethereum',
          symbol: 'ETH',
          name: 'Ethereum',
          image: '',
          current_price: 3200,
          price_change_percentage_24h: -1.25,
          market_cap_rank: 2,
        },
      ];
      mockCryptoSearch.loading = false;

      render(<GlobalHeader />);
      const searchInput = screen.getByPlaceholderText(/search cryptocurrencies/i);

      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: 'eth' } });

      expect(screen.getByText('-1.25%')).toBeInTheDocument();
    });

    it('should show symbol fallback when no image', () => {
      mockCryptoSearch.results = [
        {
          id: 'solana',
          symbol: 'SOL',
          name: 'Solana',
          image: null,
          current_price: 100,
          price_change_percentage_24h: 0,
          market_cap_rank: null,
        },
      ];
      mockCryptoSearch.loading = false;

      render(<GlobalHeader />);
      const searchInput = screen.getByPlaceholderText(/search cryptocurrencies/i);

      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: 'sol' } });

      expect(screen.getByText('SO')).toBeInTheDocument(); // First 2 letters of symbol
    });

    it('should clear search and close dropdown when clicking a result', () => {
      mockCryptoSearch.results = [
        {
          id: 'bitcoin',
          symbol: 'BTC',
          name: 'Bitcoin',
          image: 'https://example.com/btc.png',
          current_price: 45000,
          price_change_percentage_24h: 2.5,
          market_cap_rank: 1,
        },
      ];
      mockCryptoSearch.loading = false;

      render(<GlobalHeader />);
      const searchInput = screen.getByPlaceholderText(/search cryptocurrencies/i);

      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: 'bit' } });

      // Verify result is shown
      expect(screen.getByText('Bitcoin')).toBeInTheDocument();

      const resultLink = screen.getByRole('link', { name: /bitcoin/i });
      fireEvent.click(resultLink);

      // After clicking, search should be cleared and dropdown hidden
      expect(searchInput).toHaveValue('');
    });

    it('should format prices with appropriate decimal places for low values', () => {
      mockCryptoSearch.results = [
        {
          id: 'shiba',
          symbol: 'SHIB',
          name: 'Shiba Inu',
          image: 'https://example.com/shib.png',
          current_price: 0.00001234,
          price_change_percentage_24h: 5,
          market_cap_rank: 15,
        },
      ];
      mockCryptoSearch.loading = false;

      render(<GlobalHeader />);
      const searchInput = screen.getByPlaceholderText(/search cryptocurrencies/i);

      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: 'shib' } });

      // Low price should show more decimal places (toLocaleString rounds to 6 decimals)
      expect(screen.getByText(/\$0\.000012/)).toBeInTheDocument();
    });

    it('should close search results when clicking outside', () => {
      mockCryptoSearch.results = [
        {
          id: 'bitcoin',
          symbol: 'BTC',
          name: 'Bitcoin',
          image: 'https://example.com/btc.png',
          current_price: 45000,
          price_change_percentage_24h: 2.5,
          market_cap_rank: 1,
        },
      ];

      render(<GlobalHeader />);
      const searchInput = screen.getByPlaceholderText(/search cryptocurrencies/i);

      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: 'bit' } });

      expect(screen.getByText('Bitcoin')).toBeInTheDocument();

      // Click outside the search area
      fireEvent.mouseDown(document.body);

      // Dropdown should be closed
      expect(screen.queryByText('Bitcoin')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading skeleton when auth is loading', () => {
      mockAuth.loading = true;
      mockAuth.user = null;

      render(<GlobalHeader />);

      // Should have loading skeleton (animate-pulse class)
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });
});
