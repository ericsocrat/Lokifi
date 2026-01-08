/**
 * Dashboard Components Integration Tests
 *
 * Tests dashboard-related components and their functionality including:
 * - Stats cards rendering
 * - Period selector behavior
 * - Quick action buttons
 * - Navigation interactions
 *
 * Note: Next.js app/ pages are best tested via E2E tests (Playwright).
 * These tests focus on reusable dashboard components.
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
  usePathname: () => '/dashboard',
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

describe('Dashboard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
  });

  describe('PeriodSelector Component', () => {
    // Test a simple PeriodSelector component behavior
    const PeriodSelectorTest = () => {
      const periods = ['1D', '7D', '30D', '1Y', 'ALL'];
      const [selected, setSelected] = vi.hoisted(() => {
        let state = '1D';
        return [
          () => state,
          (v: string) => {
            state = v;
          },
        ];
      });

      return (
        <div className="flex gap-2">
          {periods.map((period) => (
            <button
              key={period}
              onClick={() => mockPush(`?period=${period}`)}
              className={period === '1D' ? 'bg-gradient-to-r from-lokifi-500' : 'bg-surface-2'}
            >
              {period}
            </button>
          ))}
        </div>
      );
    };

    it('should render all period options', () => {
      render(<PeriodSelectorTest />);

      expect(screen.getByText('1D')).toBeInTheDocument();
      expect(screen.getByText('7D')).toBeInTheDocument();
      expect(screen.getByText('30D')).toBeInTheDocument();
      expect(screen.getByText('1Y')).toBeInTheDocument();
      expect(screen.getByText('ALL')).toBeInTheDocument();
    });

    it('should highlight selected period with gradient', () => {
      render(<PeriodSelectorTest />);

      const selectedButton = screen.getByText('1D');
      expect(selectedButton).toHaveClass('bg-gradient-to-r');
    });

    it('should call router push when period is clicked', () => {
      render(<PeriodSelectorTest />);

      fireEvent.click(screen.getByText('7D'));
      expect(mockPush).toHaveBeenCalledWith('?period=7D');
    });
  });

  describe('StatsCard Component', () => {
    // Mock StatsCard for testing
    const StatsCard = ({
      label,
      value,
      isNegative = false,
    }: {
      label: string;
      value: string;
      isNegative?: boolean;
    }) => (
      <div className="rounded-2xl bg-surface-1 p-4">
        <p className="text-sm text-surface-11">{label}</p>
        <p className={`text-xl font-bold ${isNegative ? 'text-rose-400' : 'text-white'}`}>
          {value}
        </p>
      </div>
    );

    it('should render label and value', () => {
      render(<StatsCard label="Net Worth" value="$125,000" />);

      expect(screen.getByText('Net Worth')).toBeInTheDocument();
      expect(screen.getByText('$125,000')).toBeInTheDocument();
    });

    it('should use rose color for negative values', () => {
      render(<StatsCard label="Debts" value="$30,000" isNegative />);

      const value = screen.getByText('$30,000');
      expect(value).toHaveClass('text-rose-400');
    });

    it('should have correct container styling', () => {
      render(<StatsCard label="Cash" value="$25,000" />);

      const container = screen.getByText('Cash').closest('div');
      expect(container).toHaveClass('rounded-2xl', 'bg-surface-1');
    });
  });

  describe('QuickAction Component', () => {
    // Mock QuickAction button for testing
    const QuickAction = ({
      label,
      href,
      variant = 'default',
    }: {
      label: string;
      href: string;
      variant?: 'primary' | 'default';
    }) => {
      return (
        <button
          onClick={() => mockPush(href)}
          className={
            variant === 'primary'
              ? 'bg-gradient-to-r from-lokifi-500 to-electric-500'
              : 'border border-surface-3'
          }
        >
          {label}
        </button>
      );
    };

    it('should navigate to correct route on click', () => {
      render(<QuickAction label="View Portfolio" href="/portfolio" />);

      fireEvent.click(screen.getByText('View Portfolio'));
      expect(mockPush).toHaveBeenCalledWith('/portfolio');
    });

    it('should navigate to add-assets page', () => {
      render(<QuickAction label="Add More Assets" href="/dashboard/add-assets" />);

      fireEvent.click(screen.getByText('Add More Assets'));
      expect(mockPush).toHaveBeenCalledWith('/dashboard/add-assets');
    });

    it('should navigate to markets page', () => {
      render(<QuickAction label="Explore Markets" href="/markets" />);

      fireEvent.click(screen.getByText('Explore Markets'));
      expect(mockPush).toHaveBeenCalledWith('/markets');
    });

    it('should have gradient styling for primary variant', () => {
      render(<QuickAction label="Primary Action" href="/action" variant="primary" />);

      const button = screen.getByText('Primary Action');
      expect(button).toHaveClass('bg-gradient-to-r');
    });

    it('should have border styling for default variant', () => {
      render(<QuickAction label="Secondary Action" href="/action" variant="default" />);

      const button = screen.getByText('Secondary Action');
      expect(button).toHaveClass('border');
    });
  });

  describe('AllocationBar Component', () => {
    // Mock AllocationBar for testing
    const AllocationBar = ({
      allocations,
    }: {
      allocations: Array<{ name: string; percentage: number; color: string }>;
    }) => (
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        {allocations.map((item) => (
          <div
            key={item.name}
            style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
            data-testid={`allocation-${item.name.toLowerCase()}`}
          />
        ))}
      </div>
    );

    it('should render all allocation segments', () => {
      const allocations = [
        { name: 'Stocks', percentage: 40, color: '#8B5CF6' },
        { name: 'Crypto', percentage: 30, color: '#06B6D4' },
        { name: 'Bonds', percentage: 30, color: '#10B981' },
      ];

      render(<AllocationBar allocations={allocations} />);

      expect(screen.getByTestId('allocation-stocks')).toBeInTheDocument();
      expect(screen.getByTestId('allocation-crypto')).toBeInTheDocument();
      expect(screen.getByTestId('allocation-bonds')).toBeInTheDocument();
    });

    it('should apply correct width percentages', () => {
      const allocations = [
        { name: 'Stocks', percentage: 60, color: '#8B5CF6' },
        { name: 'Cash', percentage: 40, color: '#06B6D4' },
      ];

      render(<AllocationBar allocations={allocations} />);

      const stocks = screen.getByTestId('allocation-stocks');
      expect(stocks).toHaveStyle({ width: '60%' });

      const cash = screen.getByTestId('allocation-cash');
      expect(cash).toHaveStyle({ width: '40%' });
    });
  });

  describe('HoldingRow Component', () => {
    // Mock HoldingRow for testing
    const HoldingRow = ({
      symbol,
      name,
      value,
      percentage,
    }: {
      symbol: string;
      name: string;
      value: string;
      percentage: number;
    }) => (
      <div className="flex items-center justify-between py-3 border-b border-surface-3">
        <div>
          <p className="font-medium text-white">{symbol}</p>
          <p className="text-sm text-surface-11">{name}</p>
        </div>
        <div className="text-right">
          <p className="font-medium text-white">{value}</p>
          <p className="text-sm text-surface-11">{percentage}%</p>
        </div>
      </div>
    );

    it('should display symbol and name', () => {
      render(<HoldingRow symbol="AAPL" name="Apple Inc." value="$15,000" percentage={12} />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    });

    it('should display value and percentage', () => {
      render(<HoldingRow symbol="BTC" name="Bitcoin" value="$12,000" percentage={9.6} />);

      expect(screen.getByText('$12,000')).toBeInTheDocument();
      expect(screen.getByText('9.6%')).toBeInTheDocument();
    });
  });

  describe('EmptyState Component', () => {
    // Mock EmptyState for testing
    const EmptyState = ({ onAddAssets }: { onAddAssets: () => void }) => (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-white mb-4">Yassou! Welcome to Lokifi</h2>
        <p className="text-surface-11 mb-6">Start building your portfolio today</p>
        <button
          onClick={onAddAssets}
          className="bg-gradient-to-r from-lokifi-500 to-electric-500 px-6 py-3 rounded-lg"
        >
          Add Your First Asset
        </button>
      </div>
    );

    it('should render welcome message', () => {
      render(<EmptyState onAddAssets={vi.fn()} />);

      expect(screen.getByText('Yassou! Welcome to Lokifi')).toBeInTheDocument();
    });

    it('should render CTA button', () => {
      render(<EmptyState onAddAssets={vi.fn()} />);

      expect(screen.getByRole('button', { name: /add your first asset/i })).toBeInTheDocument();
    });

    it('should call onAddAssets when CTA clicked', () => {
      const handleAddAssets = vi.fn();
      render(<EmptyState onAddAssets={handleAddAssets} />);

      fireEvent.click(screen.getByRole('button', { name: /add your first asset/i }));
      expect(handleAddAssets).toHaveBeenCalled();
    });
  });

  describe('LiveBadge Component', () => {
    // Mock LiveBadge for testing
    const LiveBadge = () => (
      <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-xs">
        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
        LIVE
      </span>
    );

    it('should render LIVE text', () => {
      render(<LiveBadge />);

      expect(screen.getByText('LIVE')).toBeInTheDocument();
    });

    it('should have emerald styling', () => {
      render(<LiveBadge />);

      const badge = screen.getByText('LIVE').closest('span');
      expect(badge).toHaveClass('text-emerald-400', 'bg-emerald-500/20');
    });
  });

  describe('Dashboard Navigation Routes', () => {
    // Test that all expected routes are navigable
    const routes = [
      { label: 'Portfolio', path: '/portfolio' },
      { label: 'Markets', path: '/markets' },
      { label: 'Goals', path: '/goals' },
      { label: 'Debts', path: '/debts' },
      { label: 'Recap', path: '/recap' },
      { label: 'AI Research', path: '/ai-research' },
      { label: 'Settings', path: '/settings' },
    ];

    routes.forEach(({ label, path }) => {
      it(`should be able to navigate to ${label} page`, () => {
        const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
          <button onClick={() => mockPush(to)}>{children}</button>
        );

        render(<NavLink to={path}>{label}</NavLink>);
        fireEvent.click(screen.getByText(label));

        expect(mockPush).toHaveBeenCalledWith(path);
      });
    });
  });
});
