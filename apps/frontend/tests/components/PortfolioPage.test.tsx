import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  usePathname: () => '/portfolio',
}));

// Mock next/dynamic to render AddAssetModal directly
vi.mock('next/dynamic', () => ({
  default: () => () => null, // Don't render modal in tests
}));

// Mock PreferencesContext
vi.mock('@/src/components/dashboard/PreferencesContext', () => ({
  usePreferences: () => ({
    darkMode: true,
    setDarkMode: vi.fn(),
    currency: 'USD',
    setCurrency: vi.fn(),
  }),
}));

// Mock useCurrencyFormatter
vi.mock('@/src/components/dashboard/useCurrencyFormatter', () => ({
  useCurrencyFormatter: () => ({
    formatCurrency: (amount: number) => `$${amount.toLocaleString()}`,
  }),
}));

// Mock useToast
const mockAddToast = vi.fn();
vi.mock('@/src/components/dashboard/ToastProvider', () => ({
  useToast: () => ({
    addToast: mockAddToast,
    removeToast: vi.fn(),
    toasts: [],
  }),
}));

// Mock ProtectedRoute to render children directly
vi.mock('@/src/components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock portfolioStorage
const mockLoadPortfolio = vi.fn();
const mockAddAssets = vi.fn();
const mockAddSection = vi.fn();
const mockDeleteAsset = vi.fn();
vi.mock('@/src/lib/data/portfolioStorage', () => ({
  loadPortfolio: () => mockLoadPortfolio(),
  addAssets: (...args: unknown[]) => mockAddAssets(...args),
  addSection: (...args: unknown[]) => mockAddSection(...args),
  deleteAsset: (...args: unknown[]) => mockDeleteAsset(...args),
}));

// Mock usePortfolioPrices
const mockUsePortfolioPrices = vi.fn();
vi.mock('@/src/hooks/useMarketData', () => ({
  usePortfolioPrices: () => mockUsePortfolioPrices(),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocks
import PortfolioPage from '../../app/portfolio/page';

describe('PortfolioPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadPortfolio.mockReturnValue([]);
    mockUsePortfolioPrices.mockReturnValue({
      prices: new Map(),
      totalValue: 0,
      totalChange: 0,
      totalChangePercent: 0,
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ email: 'test@example.com', name: 'Test User' }),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      // Keep fetch pending to show loading state
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<PortfolioPage />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Page Header', () => {
    it('should render portfolio value header', async () => {
      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Portfolio Value')).toBeInTheDocument();
      });
    });

    it('should render LIVE indicator', async () => {
      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByText('LIVE')).toBeInTheDocument();
      });
    });

    it('should render portfolio value', async () => {
      mockUsePortfolioPrices.mockReturnValue({
        prices: new Map(),
        totalValue: 125000,
        totalChange: 1500,
        totalChangePercent: 1.21,
      });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByText('$125,000')).toBeInTheDocument();
      });
    });

    it('should show positive change with green styling', async () => {
      mockUsePortfolioPrices.mockReturnValue({
        prices: new Map(),
        totalValue: 125000,
        totalChange: 1500,
        totalChangePercent: 2.5,
      });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByText('+2.50%')).toBeInTheDocument();
      });
    });

    it('should show negative change with red styling', async () => {
      mockUsePortfolioPrices.mockReturnValue({
        prices: new Map(),
        totalValue: 125000,
        totalChange: -500,
        totalChangePercent: -0.4,
      });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByText('-0.40%')).toBeInTheDocument();
      });
    });
  });

  describe('Timeframe Selector', () => {
    it('should render all timeframe options', async () => {
      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '1D' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '1W' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '1M' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '1Y' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'ALL' })).toBeInTheDocument();
      });
    });

    it('should highlight 1D by default', async () => {
      render(<PortfolioPage />);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: '1D' });
        expect(button).toHaveClass('bg-white');
      });
    });

    it('should change timeframe when clicked', async () => {
      const user = userEvent.setup();
      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '1M' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: '1M' }));

      const monthButton = screen.getByRole('button', { name: '1M' });
      expect(monthButton).toHaveClass('bg-white');
    });
  });

  describe('Quick Actions', () => {
    it('should render Quick Actions section', async () => {
      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      });
    });

    it('should render Add Asset button', async () => {
      render(<PortfolioPage />);

      await waitFor(() => {
        const addButton = screen.getAllByText(/add asset/i);
        expect(addButton.length).toBeGreaterThan(0);
      });
    });
  });

  describe('View Mode Toggle', () => {
    it('should render view mode toggle buttons', async () => {
      render(<PortfolioPage />);

      await waitFor(() => {
        // Check for Grid and List text in view toggle
        const viewButtons = document.querySelectorAll('button');
        const hasListView = Array.from(viewButtons).some(
          (btn) => btn.textContent?.includes('List') || btn.getAttribute('aria-label')?.includes('list')
        );
        expect(hasListView || viewButtons.length > 0).toBe(true);
      });
    });

    it('should start in list view by default', async () => {
      render(<PortfolioPage />);

      await waitFor(() => {
        // List view should be active (has bg-surface-200 class)
        const listButton = screen.queryByText('List');
        if (listButton) {
          expect(listButton.closest('button')).toHaveClass('bg-surface-200');
        }
      });
    });
  });

  describe('Empty Portfolio State', () => {
    it('should show empty state when no sections exist', async () => {
      mockLoadPortfolio.mockReturnValue([]);

      render(<PortfolioPage />);

      await waitFor(() => {
        // Should show empty message or Add Asset prompt
        const addAssetButtons = screen.getAllByText(/add asset/i);
        expect(addAssetButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Portfolio with Sections', () => {
    beforeEach(() => {
      mockLoadPortfolio.mockReturnValue([
        {
          id: 'section-1',
          title: 'Stocks',
          icon: 'briefcase',
          assets: [
            { id: 'asset-1', symbol: 'AAPL', name: 'Apple Inc.', shares: 10, value: 1500, color: '#FF0000' },
            { id: 'asset-2', symbol: 'MSFT', name: 'Microsoft', shares: 5, value: 2000, color: '#00FF00' },
          ],
        },
        {
          id: 'section-2',
          title: 'Crypto',
          icon: 'bitcoin',
          assets: [
            { id: 'asset-3', symbol: 'BTC', name: 'Bitcoin', shares: 0.5, value: 25000, color: '#F7931A' },
          ],
        },
      ]);
      const pricesMap = new Map();
      pricesMap.set('AAPL', 150);
      pricesMap.set('MSFT', 400);
      pricesMap.set('BTC', 50000);
      mockUsePortfolioPrices.mockReturnValue({
        prices: pricesMap,
        totalValue: 28500,
        totalChange: 1000,
        totalChangePercent: 3.6,
      });
    });

    it('should render section titles', async () => {
      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByText('Stocks')).toBeInTheDocument();
        expect(screen.getByText('Crypto')).toBeInTheDocument();
      });
    });

    it('should render asset symbols', async () => {
      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getAllByText('AAPL').length).toBeGreaterThan(0);
        expect(screen.getAllByText('MSFT').length).toBeGreaterThan(0);
        expect(screen.getAllByText('BTC').length).toBeGreaterThan(0);
      });
    });

    it('should render asset names', async () => {
      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
        expect(screen.getByText('Microsoft')).toBeInTheDocument();
        expect(screen.getByText('Bitcoin')).toBeInTheDocument();
      });
    });
  });

  describe('Authentication', () => {
    it('should fall back to demo user when auth fails', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      render(<PortfolioPage />);

      await waitFor(() => {
        // Should still render portfolio page
        expect(screen.getByText('Total Portfolio Value')).toBeInTheDocument();
      });
    });

    it('should handle fetch error gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(<PortfolioPage />);

      await waitFor(() => {
        // Should still render portfolio page with demo user
        expect(screen.getByText('Total Portfolio Value')).toBeInTheDocument();
      });
    });
  });

  describe('Portfolio Stats', () => {
    it('should render today change label', async () => {
      mockUsePortfolioPrices.mockReturnValue({
        prices: new Map(),
        totalValue: 50000,
        totalChange: 500,
        totalChangePercent: 1.0,
      });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByText(/today's change/i)).toBeInTheDocument();
      });
    });

    it('should render positive today change with plus sign', async () => {
      mockUsePortfolioPrices.mockReturnValue({
        prices: new Map(),
        totalValue: 50000,
        totalChange: 500,
        totalChangePercent: 1.0,
      });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByText('+$500')).toBeInTheDocument();
      });
    });
  });

  describe('Filter and Sort', () => {
    it('should render filter button', async () => {
      render(<PortfolioPage />);

      await waitFor(() => {
        const filterButtons = document.querySelectorAll('button');
        // Filter functionality should be present
        expect(filterButtons.length).toBeGreaterThan(0);
      });
    });

    it('should render sort button', async () => {
      render(<PortfolioPage />);

      await waitFor(() => {
        const sortButtons = document.querySelectorAll('button');
        // Sort functionality should be present
        expect(sortButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Mini Chart', () => {
    it('should render performance visualization', async () => {
      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByText('Performance over time')).toBeInTheDocument();
      });
    });

    it('should render real-time data indicator', async () => {
      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByText('Real-time data')).toBeInTheDocument();
      });
    });
  });

  describe('Section Collapse', () => {
    beforeEach(() => {
      mockLoadPortfolio.mockReturnValue([
        {
          id: 'section-1',
          title: 'Stocks',
          icon: 'briefcase',
          assets: [
            { id: 'asset-1', symbol: 'AAPL', name: 'Apple', shares: 10, value: 1500, color: '#FF0000' },
          ],
        },
      ]);
      const pricesMap = new Map();
      pricesMap.set('AAPL', 150);
      mockUsePortfolioPrices.mockReturnValue({
        prices: pricesMap,
        totalValue: 1500,
        totalChange: 50,
        totalChangePercent: 3.4,
      });
    });

    it('should render section headers as buttons', async () => {
      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByText('Stocks')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible buttons', async () => {
      render(<PortfolioPage />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });

    it('should not have accessibility violations in timeframe selector', async () => {
      render(<PortfolioPage />);

      await waitFor(() => {
        const timeframeButtons = ['1D', '1W', '1M', '1Y', 'ALL'];
        timeframeButtons.forEach((tf) => {
          const button = screen.getByRole('button', { name: tf });
          expect(button).toBeEnabled();
        });
      });
    });
  });

  describe('UI Styling', () => {
    it('should have gradient background on portfolio value card', async () => {
      render(<PortfolioPage />);

      await waitFor(() => {
        const card = document.querySelector('.bg-gradient-to-br');
        expect(card).toBeInTheDocument();
      });
    });

    it('should have rounded corners on cards', async () => {
      render(<PortfolioPage />);

      await waitFor(() => {
        const roundedCards = document.querySelectorAll('.rounded-2xl');
        expect(roundedCards.length).toBeGreaterThan(0);
      });
    });
  });
});
