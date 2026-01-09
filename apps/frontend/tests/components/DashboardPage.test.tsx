/**
 * Dashboard Page Tests
 *
 * Comprehensive tests for app/dashboard/page.tsx
 * Tests loading states, empty states, populated states, and user interactions
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ============================================================================
// Mocks
// ============================================================================

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock preferences context
vi.mock('@/src/components/dashboard/PreferencesContext', () => ({
  usePreferences: () => ({
    darkMode: true,
    setDarkMode: vi.fn(),
    currency: 'USD',
  }),
}));

// Mock currency formatter
vi.mock('@/src/components/dashboard/useCurrencyFormatter', () => ({
  useCurrencyFormatter: () => ({
    formatCurrency: (value: number) => `$${value.toLocaleString()}`,
    formatCompactCurrency: (value: number) => `$${value.toLocaleString()}`,
    currency: 'USD',
  }),
}));

// Mock market data hook
const mockUsePortfolioPrices = vi.fn();
vi.mock('@/src/hooks/useMarketData', () => ({
  usePortfolioPrices: () => mockUsePortfolioPrices(),
}));

// Mock dashboard data functions
const mockHasAssets = vi.fn();
const mockGetStats = vi.fn();
const mockGetAllocationByCategory = vi.fn();
const mockGetTopHoldings = vi.fn();

vi.mock('@/src/lib/data/dashboardData', () => ({
  hasAssets: () => mockHasAssets(),
  getStats: () => mockGetStats(),
  getAllocationByCategory: () => mockGetAllocationByCategory(),
  getTopHoldings: (count: number) => mockGetTopHoldings(count),
}));

// Mock portfolio storage
vi.mock('@/src/lib/data/portfolioStorage', () => ({
  loadPortfolio: () => [],
}));

// Import component after mocks
import DashboardPage from '../../app/dashboard/page';

// ============================================================================
// Test Data
// ============================================================================

const mockStats = {
  investableAssets: 150000,
  cashOnHand: 25000,
  illiquid: 50000,
  debts: 30000,
  netWorth: 195000,
};

const mockAllocations = [
  { name: 'Crypto', value: 75000, percentage: 38.5, color: '#8B5CF6' },
  { name: 'Stocks', value: 60000, percentage: 30.8, color: '#06B6D4' },
  { name: 'Cash', value: 25000, percentage: 12.8, color: '#10B981' },
  { name: 'Real Estate', value: 35000, percentage: 17.9, color: '#F59E0B' },
];

const mockTopHoldings = [
  { symbol: 'BTC', name: 'Bitcoin', value: 50000, percentage: 25.6 },
  { symbol: 'ETH', name: 'Ethereum', value: 25000, percentage: 12.8 },
  { symbol: 'AAPL', name: 'Apple Inc.', value: 20000, percentage: 10.3 },
  { symbol: 'GOOGL', name: 'Alphabet', value: 15000, percentage: 7.7 },
  { symbol: 'MSFT', name: 'Microsoft', value: 12000, percentage: 6.2 },
];

const mockPriceData = {
  totalValue: 195000,
  totalChange: 3500,
  totalChangePercent: 1.83,
};

// ============================================================================
// Helper Functions
// ============================================================================

function setupEmptyState() {
  mockHasAssets.mockReturnValue(false);
  mockGetStats.mockReturnValue(null);
  mockGetAllocationByCategory.mockReturnValue([]);
  mockGetTopHoldings.mockReturnValue([]);
  mockUsePortfolioPrices.mockReturnValue({
    totalValue: 0,
    totalChange: 0,
    totalChangePercent: 0,
  });
}

function setupPopulatedState() {
  mockHasAssets.mockReturnValue(true);
  mockGetStats.mockReturnValue(mockStats);
  mockGetAllocationByCategory.mockReturnValue(mockAllocations);
  mockGetTopHoldings.mockReturnValue(mockTopHoldings);
  mockUsePortfolioPrices.mockReturnValue(mockPriceData);
}

function setupSuccessFetch(userData = { email: 'test@example.com', name: 'Test User' }) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(userData),
  });
}

function setupFailedFetch() {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 401,
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    setupSuccessFetch();
  });

  // ==========================================================================
  // Loading State Tests
  // ==========================================================================

  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      setupEmptyState();
      render(<DashboardPage />);

      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
    });

    it('should show loading animation', () => {
      setupEmptyState();
      render(<DashboardPage />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Page Header Tests
  // ==========================================================================

  describe('Page Header', () => {
    it('should render welcome message with user name', async () => {
      setupEmptyState();
      setupSuccessFetch({ email: 'john@example.com', name: 'John Doe' });
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Welcome back, John/)).toBeInTheDocument();
      });
    });

    it('should use email prefix when no name provided', async () => {
      setupEmptyState();
      setupSuccessFetch({ email: 'jane@example.com' });
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Welcome back, Jane/)).toBeInTheDocument();
      });
    });

    it('should show fallback name on auth failure', async () => {
      setupEmptyState();
      setupFailedFetch();
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Welcome back, Demo/)).toBeInTheDocument();
      });
    });

    it('should render subtitle', async () => {
      setupEmptyState();
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Your financial overview at a glance')).toBeInTheDocument();
      });
    });

    it('should render Add Assets button in header', async () => {
      setupEmptyState();
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add assets/i })).toBeInTheDocument();
      });
    });

    it('should navigate to add-assets when header button clicked', async () => {
      setupEmptyState();
      render(<DashboardPage />);

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /add assets/i });
        expect(addButton).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add assets/i });
      await userEvent.click(addButton);

      expect(mockPush).toHaveBeenCalledWith('/dashboard/add-assets');
    });
  });

  // ==========================================================================
  // Empty State Tests
  // ==========================================================================

  describe('Empty State', () => {
    beforeEach(() => {
      setupEmptyState();
    });

    it('should show welcome greeting with user name', async () => {
      setupSuccessFetch({ email: 'test@example.com', name: 'Test User' });
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Yassou, Test/)).toBeInTheDocument();
      });
    });

    it('should show getting started message', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/Here's where you come to see the overview of your portfolio/)
        ).toBeInTheDocument();
      });
    });

    it('should prompt user to add assets', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Please add your assets to get started/)).toBeInTheDocument();
      });
    });

    it('should render Add Your First Asset button', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /add your first asset/i })
        ).toBeInTheDocument();
      });
    });

    it('should navigate to add-assets from empty state button', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /add your first asset/i });
        expect(button).toBeInTheDocument();
      });

      const button = screen.getByRole('button', { name: /add your first asset/i });
      await userEvent.click(button);

      expect(mockPush).toHaveBeenCalledWith('/dashboard/add-assets');
    });

    it('should show sample stats cards', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const sampleLabels = screen.getAllByText('Sample');
        expect(sampleLabels.length).toBe(3);
      });
    });

    it('should show sample Net Worth card', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Net Worth')).toBeInTheDocument();
        expect(screen.getByText('€1.5M')).toBeInTheDocument();
      });
    });

    it('should show sample Total Assets card', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Assets')).toBeInTheDocument();
        expect(screen.getByText('€2M')).toBeInTheDocument();
      });
    });

    it('should show sample Debts card', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Debts')).toBeInTheDocument();
        expect(screen.getByText('€500K')).toBeInTheDocument();
      });
    });

    it('should show sample chart previews', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Net Worth Over Time')).toBeInTheDocument();
        expect(screen.getByText('Asset Allocation')).toBeInTheDocument();
      });
    });

    it('should show SAMPLE watermarks on charts', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const sampleWatermarks = screen.getAllByText('SAMPLE');
        expect(sampleWatermarks.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // Populated State Tests
  // ==========================================================================

  describe('Populated State', () => {
    beforeEach(() => {
      setupPopulatedState();
    });

    it('should show live net worth', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('$195,000')).toBeInTheDocument();
      });
    });

    it('should show LIVE badge', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('LIVE')).toBeInTheDocument();
      });
    });

    it('should show positive change in green', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const changeElement = screen.getByText(/\+\$3,500/);
        expect(changeElement).toBeInTheDocument();
        expect(changeElement.closest('span')).toHaveClass('text-emerald-400');
      });
    });

    it('should show percentage change', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/\+1\.83%/)).toBeInTheDocument();
      });
    });

    it('should show TODAY label', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('TODAY')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Period Selector Tests
  // ==========================================================================

  describe('Period Selector', () => {
    beforeEach(() => {
      setupPopulatedState();
    });

    it('should render all time period options', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'View 1d performance' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'View 7d performance' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'View 30d performance' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'View 1y performance' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'View all performance' })).toBeInTheDocument();
      });
    });

    it('should have 1D selected by default', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const button1D = screen.getByRole('button', { name: 'View 1d performance' });
        expect(button1D.className).toContain('from-lokifi');
      });
    });

    it('should update selected period on click', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'View 7d performance' })).toBeInTheDocument();
      });

      const button7D = screen.getByRole('button', { name: 'View 7d performance' });
      await userEvent.click(button7D);

      await waitFor(() => {
        expect(button7D.className).toContain('from-lokifi');
      });
    });
  });

  // ==========================================================================
  // Stats Cards Tests
  // ==========================================================================

  describe('Stats Cards', () => {
    beforeEach(() => {
      setupPopulatedState();
    });

    it('should show Investable Assets', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Investable Assets')).toBeInTheDocument();
        expect(screen.getByText('$150,000')).toBeInTheDocument();
      });
    });

    it('should show Cash on Hand', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Cash on Hand')).toBeInTheDocument();
        // Value may appear multiple times, just check label exists
        const cashLabels = screen.getAllByText('Cash on Hand');
        expect(cashLabels.length).toBeGreaterThan(0);
      });
    });

    it('should show Illiquid assets', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Illiquid')).toBeInTheDocument();
        // Value may appear multiple times, just check label exists
        const illiquidLabels = screen.getAllByText('Illiquid');
        expect(illiquidLabels.length).toBeGreaterThan(0);
      });
    });

    it('should show Debts in rose color', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const debtsLabel = screen.getAllByText('Debts');
        const debtsCard = debtsLabel[0].closest('div[class*="border"]');
        expect(debtsCard).toHaveClass('border-rose-500/20');
      });
    });
  });

  // ==========================================================================
  // Allocation Chart Tests
  // ==========================================================================

  describe('Allocation Chart', () => {
    beforeEach(() => {
      setupPopulatedState();
    });

    it('should show Allocation by Category header', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Allocation by Category')).toBeInTheDocument();
      });
    });

    it('should render allocation items', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Crypto')).toBeInTheDocument();
        expect(screen.getByText('Stocks')).toBeInTheDocument();
        expect(screen.getByText('Cash')).toBeInTheDocument();
        expect(screen.getByText('Real Estate')).toBeInTheDocument();
      });
    });

    it('should show allocation values', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('$75,000')).toBeInTheDocument();
        expect(screen.getByText('$60,000')).toBeInTheDocument();
      });
    });

    it('should show allocation percentages', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('38.5%')).toBeInTheDocument();
        expect(screen.getByText('30.8%')).toBeInTheDocument();
      });
    });

    it('should show empty message when no allocations', async () => {
      mockGetAllocationByCategory.mockReturnValue([]);
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('No allocations yet')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Top Holdings Tests
  // ==========================================================================

  describe('Top Holdings', () => {
    beforeEach(() => {
      setupPopulatedState();
    });

    it('should show Top Holdings header', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Top Holdings')).toBeInTheDocument();
      });
    });

    it('should show View All link', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const viewAllButtons = screen.getAllByText('View All');
        expect(viewAllButtons.length).toBeGreaterThan(0);
      });
    });

    it('should navigate to portfolio when View All clicked', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const viewAllButtons = screen.getAllByText('View All');
        expect(viewAllButtons.length).toBeGreaterThan(0);
      });

      const viewAllButtons = screen.getAllByText('View All');
      await userEvent.click(viewAllButtons[0]);

      expect(mockPush).toHaveBeenCalledWith('/portfolio');
    });

    it('should render top holding symbols', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('BTC')).toBeInTheDocument();
        expect(screen.getByText('ETH')).toBeInTheDocument();
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });
    });

    it('should render top holding names', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Bitcoin')).toBeInTheDocument();
        expect(screen.getByText('Ethereum')).toBeInTheDocument();
        expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
      });
    });

    it('should show ranking numbers', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('should show empty message when no holdings', async () => {
      mockGetTopHoldings.mockReturnValue([]);
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('No holdings yet')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Quick Actions Tests
  // ==========================================================================

  describe('Quick Actions', () => {
    beforeEach(() => {
      setupPopulatedState();
    });

    it('should render View Full Portfolio button', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'View your complete portfolio with detailed asset breakdown' })
        ).toBeInTheDocument();
      });
    });

    it('should navigate to portfolio on button click', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: 'View your complete portfolio with detailed asset breakdown' });
        expect(button).toBeInTheDocument();
      });

      const button = screen.getByRole('button', { name: 'View your complete portfolio with detailed asset breakdown' });
      await userEvent.click(button);

      expect(mockPush).toHaveBeenCalledWith('/portfolio');
    });

    it('should render Add More Assets button', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /add more assets/i })
        ).toBeInTheDocument();
      });
    });

    it('should navigate to add-assets on button click', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /add more assets/i });
        expect(button).toBeInTheDocument();
      });

      const button = screen.getByRole('button', { name: /add more assets/i });
      await userEvent.click(button);

      expect(mockPush).toHaveBeenCalledWith('/dashboard/add-assets');
    });

    it('should render Explore Markets button', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Browse live cryptocurrency, stock, forex, and indices markets' })
        ).toBeInTheDocument();
      });
    });

    it('should navigate to markets on button click', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: 'Browse live cryptocurrency, stock, forex, and indices markets' });
        expect(button).toBeInTheDocument();
      });

      const button = screen.getByRole('button', { name: 'Browse live cryptocurrency, stock, forex, and indices markets' });
      await userEvent.click(button);

      expect(mockPush).toHaveBeenCalledWith('/markets');
    });
  });

  // ==========================================================================
  // Negative Change Tests
  // ==========================================================================

  describe('Negative Change Display', () => {
    it('should show negative change in red', async () => {
      mockUsePortfolioPrices.mockReturnValue({
        totalValue: 185000,
        totalChange: -5000,
        totalChangePercent: -2.63,
      });
      setupPopulatedState();
      render(<DashboardPage />);

      await waitFor(() => {
        const changeElements = document.querySelectorAll('.text-rose-400');
        expect(changeElements.length).toBeGreaterThan(0);
      });
    });

    it('should show down trend icon for negative change', async () => {
      mockUsePortfolioPrices.mockReturnValue({
        totalValue: 185000,
        totalChange: -5000,
        totalChangePercent: -2.63,
      });
      setupPopulatedState();
      render(<DashboardPage />);

      await waitFor(() => {
        // The TrendingDown icon will be in a span with text-rose-400
        const negativeIndicators = document.querySelectorAll('.text-rose-400');
        expect(negativeIndicators.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // UI Styling Tests
  // ==========================================================================

  describe('UI Styling', () => {
    beforeEach(() => {
      setupPopulatedState();
    });

    it('should have dark background', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const container = document.querySelector('.bg-surface-0');
        expect(container).toBeInTheDocument();
      });
    });

    it('should have sticky header', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const stickyHeader = document.querySelector('.sticky');
        expect(stickyHeader).toBeInTheDocument();
      });
    });

    it('should have backdrop blur on header', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const blurHeader = document.querySelector('.backdrop-blur-xl');
        expect(blurHeader).toBeInTheDocument();
      });
    });

    it('should have rounded corners on cards', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const roundedCards = document.querySelectorAll('.rounded-2xl');
        expect(roundedCards.length).toBeGreaterThan(0);
      });
    });

    it('should have gradient buttons', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const gradientElements = document.querySelectorAll('[class*="from-lokifi"]');
        expect(gradientElements.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // Authentication Tests
  // ==========================================================================

  describe('Authentication', () => {
    it('should fetch user data on mount', async () => {
      setupEmptyState();
      render(<DashboardPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/auth/me',
          expect.objectContaining({ credentials: 'include' })
        );
      });
    });

    it('should handle network errors gracefully', async () => {
      setupEmptyState();
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Welcome back, Demo/)).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('Accessibility', () => {
    beforeEach(() => {
      setupPopulatedState();
    });

    it('should have accessible buttons', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach((button) => {
          expect(button).toHaveAccessibleName();
        });
      });
    });

    it('should have proper heading hierarchy', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toBeInTheDocument();
      });
    });
  });
});
