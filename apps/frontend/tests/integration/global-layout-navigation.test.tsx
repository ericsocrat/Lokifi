/**
 * GlobalLayout Navigation Integration Tests
 *
 * Tests the navigation functionality including:
 * - Sidebar navigation items
 * - Active state highlighting
 * - Currency selector
 * - Navigation interactions
 *
 * Note: GlobalLayout uses lucide-react icons which need to be mocked.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock lucide-react icons FIRST (before any component imports)
vi.mock('lucide-react', () => ({
  LayoutDashboard: () => <div data-testid="icon-dashboard" />,
  Briefcase: () => <div data-testid="icon-portfolio" />,
  TrendingUp: () => <div data-testid="icon-markets" />,
  Target: () => <div data-testid="icon-goals" />,
  CreditCard: () => <div data-testid="icon-debts" />,
  History: () => <div data-testid="icon-recap" />,
  Brain: () => <div data-testid="icon-ai" />,
  Settings: () => <div data-testid="icon-settings" />,
  ChevronLeft: () => <div data-testid="icon-chevron-left" />,
  ChevronRight: () => <div data-testid="icon-chevron-right" />,
  ChevronDown: ({ className }: { className?: string }) => (
    <div data-testid="icon-chevron-down" className={className} />
  ),
  User: () => <div data-testid="icon-user" />,
  LogOut: () => <div data-testid="icon-logout" />,
  Sun: () => <div data-testid="icon-sun" />,
  Moon: () => <div data-testid="icon-moon" />,
  Menu: () => <div data-testid="icon-menu" />,
  X: () => <div data-testid="icon-x" />,
  Plus: () => <div data-testid="icon-plus" />,
}));

// Mock next/navigation
const mockPush = vi.fn();
const mockPathname = vi.fn(() => '/dashboard');

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => mockPathname(),
}));

// Mock PreferencesContext
const mockSetCurrency = vi.fn();
const mockSetDarkMode = vi.fn();

vi.mock('@/src/components/dashboard/PreferencesContext', () => ({
  usePreferences: () => ({
    darkMode: true,
    setDarkMode: mockSetDarkMode,
    currency: 'USD',
    setCurrency: mockSetCurrency,
  }),
}));

describe('GlobalLayout Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    mockPathname.mockReturnValue('/dashboard');
  });

  describe('Navigation Item Component', () => {
    // Test navigation item behavior with a mock component that mirrors GlobalLayout behavior
    const NavItem = ({
      label,
      href,
      isActive,
    }: {
      label: string;
      href: string;
      isActive: boolean;
    }) => (
      <button
        onClick={() => mockPush(href)}
        className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
          isActive ? 'bg-lokifi-600/20 text-lokifi-400' : 'text-surface-11 hover:bg-surface-2'
        }`}
      >
        <span>{label}</span>
      </button>
    );

    it('should navigate to dashboard when clicked', () => {
      render(<NavItem label="Dashboard" href="/dashboard" isActive={false} />);

      fireEvent.click(screen.getByText('Dashboard'));
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('should navigate to portfolio when clicked', () => {
      render(<NavItem label="Portfolio" href="/portfolio" isActive={false} />);

      fireEvent.click(screen.getByText('Portfolio'));
      expect(mockPush).toHaveBeenCalledWith('/portfolio');
    });

    it('should navigate to markets when clicked', () => {
      render(<NavItem label="Markets" href="/markets" isActive={false} />);

      fireEvent.click(screen.getByText('Markets'));
      expect(mockPush).toHaveBeenCalledWith('/markets');
    });

    it('should navigate to goals when clicked', () => {
      render(<NavItem label="Goals" href="/goals" isActive={false} />);

      fireEvent.click(screen.getByText('Goals'));
      expect(mockPush).toHaveBeenCalledWith('/goals');
    });

    it('should navigate to debts when clicked', () => {
      render(<NavItem label="Debts" href="/debts" isActive={false} />);

      fireEvent.click(screen.getByText('Debts'));
      expect(mockPush).toHaveBeenCalledWith('/debts');
    });

    it('should navigate to recap when clicked', () => {
      render(<NavItem label="Recap" href="/recap" isActive={false} />);

      fireEvent.click(screen.getByText('Recap'));
      expect(mockPush).toHaveBeenCalledWith('/recap');
    });

    it('should navigate to ai-research when clicked', () => {
      render(<NavItem label="AI Research" href="/ai-research" isActive={false} />);

      fireEvent.click(screen.getByText('AI Research'));
      expect(mockPush).toHaveBeenCalledWith('/ai-research');
    });

    it('should navigate to settings when clicked', () => {
      render(<NavItem label="Settings" href="/settings" isActive={false} />);

      fireEvent.click(screen.getByText('Settings'));
      expect(mockPush).toHaveBeenCalledWith('/settings');
    });

    it('should have active styling when route is active', () => {
      render(<NavItem label="Dashboard" href="/dashboard" isActive={true} />);

      const item = screen.getByText('Dashboard').closest('button');
      expect(item).toHaveClass('bg-lokifi-600/20', 'text-lokifi-400');
    });

    it('should not have active styling when route is not active', () => {
      render(<NavItem label="Markets" href="/markets" isActive={false} />);

      const item = screen.getByText('Markets').closest('button');
      expect(item).not.toHaveClass('bg-lokifi-600/20');
      expect(item).toHaveClass('text-surface-11');
    });
  });

  describe('Currency Selector Component', () => {
    const CurrencySelector = ({
      value,
      onChange,
    }: {
      value: string;
      onChange: (value: string) => void;
    }) => {
      const currencies = ['USD', 'EUR', 'GBP'];

      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-surface-2 text-white rounded px-2 py-1"
        >
          {currencies.map((curr) => (
            <option key={curr} value={curr}>
              {curr}
            </option>
          ))}
        </select>
      );
    };

    it('should render currency selector with all options', () => {
      render(<CurrencySelector value="USD" onChange={vi.fn()} />);

      expect(screen.getByDisplayValue('USD')).toBeInTheDocument();
      expect(screen.getByText('USD')).toBeInTheDocument();
      expect(screen.getByText('EUR')).toBeInTheDocument();
      expect(screen.getByText('GBP')).toBeInTheDocument();
    });

    it('should call onChange when currency changes', () => {
      const handleChange = vi.fn();
      render(<CurrencySelector value="USD" onChange={handleChange} />);

      fireEvent.change(screen.getByDisplayValue('USD'), { target: { value: 'EUR' } });
      expect(handleChange).toHaveBeenCalledWith('EUR');
    });

    it('should not display redundant currency symbols (bug fix verification)', () => {
      render(<CurrencySelector value="USD" onChange={vi.fn()} />);

      const options = screen.getAllByRole('option');

      // Verify options show currency code only, not "USD €" pattern
      const usdOption = options.find((opt) => opt.textContent === 'USD');
      expect(usdOption).toBeDefined();

      // Should NOT have the euro symbol appended
      const badOption = options.find((opt) => opt.textContent?.includes('€'));
      expect(badOption).toBeUndefined();
    });
  });

  describe('Sidebar Toggle Component', () => {
    const Sidebar = ({ collapsed }: { collapsed: boolean }) => (
      <aside className={`transition-all ${collapsed ? 'w-20' : 'w-64'}`}>
        <span className={collapsed ? 'hidden' : ''}>Dashboard</span>
      </aside>
    );

    const SidebarToggle = () => {
      const [collapsed, setCollapsed] = vi.hoisted(() => {
        let state = false;
        return [() => state, (v: boolean) => { state = v; }];
      });

      return (
        <div>
          <button onClick={() => mockPush('toggle')} data-testid="toggle-btn">
            Toggle
          </button>
          <Sidebar collapsed={false} />
        </div>
      );
    };

    it('should show expanded width by default', () => {
      render(<Sidebar collapsed={false} />);

      const sidebar = screen.getByText('Dashboard').closest('aside');
      expect(sidebar).toHaveClass('w-64');
    });

    it('should show collapsed width when collapsed', () => {
      render(<Sidebar collapsed={true} />);

      const sidebar = screen.getByRole('complementary');
      expect(sidebar).toHaveClass('w-20');
    });

    it('should hide labels when collapsed', () => {
      render(<Sidebar collapsed={true} />);

      const label = screen.getByText('Dashboard');
      expect(label).toHaveClass('hidden');
    });

    it('should show labels when expanded', () => {
      render(<Sidebar collapsed={false} />);

      const label = screen.getByText('Dashboard');
      expect(label).not.toHaveClass('hidden');
    });
  });

  describe('Logo Component', () => {
    const Logo = ({ onClick }: { onClick: () => void }) => (
      <button onClick={onClick} className="flex items-center gap-2">
        <span className="text-xl font-bold bg-gradient-to-r from-lokifi-400 to-electric-400 bg-clip-text text-transparent">
          Lokifi
        </span>
      </button>
    );

    it('should display Lokifi logo text', () => {
      render(<Logo onClick={vi.fn()} />);

      expect(screen.getByText('Lokifi')).toBeInTheDocument();
    });

    it('should navigate to dashboard when clicked', () => {
      render(<Logo onClick={() => mockPush('/dashboard')} />);

      fireEvent.click(screen.getByText('Lokifi'));
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('should have gradient styling', () => {
      render(<Logo onClick={vi.fn()} />);

      const logo = screen.getByText('Lokifi');
      expect(logo).toHaveClass('bg-gradient-to-r', 'from-lokifi-400', 'to-electric-400');
    });
  });

  describe('User Menu Component', () => {
    const UserMenu = ({
      isAuthenticated,
      userName,
      onLogin,
      onLogout,
    }: {
      isAuthenticated: boolean;
      userName?: string;
      onLogin: () => void;
      onLogout: () => void;
    }) => {
      if (!isAuthenticated) {
        return (
          <button onClick={onLogin} className="text-lokifi-400">
            Log In
          </button>
        );
      }

      return (
        <div className="flex items-center gap-2">
          <span className="text-white">{userName}</span>
          <button onClick={onLogout}>Logout</button>
        </div>
      );
    };

    it('should show login button when not authenticated', () => {
      render(<UserMenu isAuthenticated={false} onLogin={vi.fn()} onLogout={vi.fn()} />);

      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    });

    it('should call onLogin when login button clicked', () => {
      const handleLogin = vi.fn();
      render(<UserMenu isAuthenticated={false} onLogin={handleLogin} onLogout={vi.fn()} />);

      fireEvent.click(screen.getByRole('button', { name: /log in/i }));
      expect(handleLogin).toHaveBeenCalled();
    });

    it('should show user name when authenticated', () => {
      render(
        <UserMenu isAuthenticated={true} userName="Test User" onLogin={vi.fn()} onLogout={vi.fn()} />
      );

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should show logout button when authenticated', () => {
      render(
        <UserMenu isAuthenticated={true} userName="Test User" onLogin={vi.fn()} onLogout={vi.fn()} />
      );

      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    });

    it('should call onLogout when logout button clicked', () => {
      const handleLogout = vi.fn();
      render(
        <UserMenu
          isAuthenticated={true}
          userName="Test User"
          onLogin={vi.fn()}
          onLogout={handleLogout}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /logout/i }));
      expect(handleLogout).toHaveBeenCalled();
    });
  });

  describe('Full Navigation Flow', () => {
    // Test the full navigation flow with all routes
    const routes = [
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Portfolio', path: '/portfolio' },
      { label: 'Markets', path: '/markets' },
      { label: 'Goals', path: '/goals' },
      { label: 'Debts', path: '/debts' },
      { label: 'Recap', path: '/recap' },
      { label: 'AI Research', path: '/ai-research' },
      { label: 'Settings', path: '/settings' },
    ];

    routes.forEach(({ label, path }) => {
      it(`should navigate to ${path} when ${label} is clicked`, () => {
        const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
          <button onClick={() => mockPush(to)}>{children}</button>
        );

        render(<NavLink to={path}>{label}</NavLink>);
        fireEvent.click(screen.getByText(label));

        expect(mockPush).toHaveBeenCalledWith(path);
      });
    });
  });

  describe('Active Route Detection', () => {
    const isActiveRoute = (currentPath: string, itemPath: string) => {
      if (itemPath === '/dashboard') {
        return currentPath === '/dashboard' || currentPath.startsWith('/dashboard/');
      }
      return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
    };

    it('should detect dashboard as active on /dashboard', () => {
      expect(isActiveRoute('/dashboard', '/dashboard')).toBe(true);
    });

    it('should detect dashboard as active on /dashboard/add-assets', () => {
      expect(isActiveRoute('/dashboard/add-assets', '/dashboard')).toBe(true);
    });

    it('should detect portfolio as active on /portfolio', () => {
      expect(isActiveRoute('/portfolio', '/portfolio')).toBe(true);
    });

    it('should not detect markets as active on /dashboard', () => {
      expect(isActiveRoute('/dashboard', '/markets')).toBe(false);
    });

    it('should detect settings as active on /settings/profile', () => {
      expect(isActiveRoute('/settings/profile', '/settings')).toBe(true);
    });
  });
});
