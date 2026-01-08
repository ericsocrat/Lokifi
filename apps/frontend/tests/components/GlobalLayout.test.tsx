import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock useRouter
const mockPush = vi.fn();
const mockPathname = '/dashboard';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
}));

// Mock useAuth
let mockUser: { username?: string; email?: string } | null = null;
let mockLoading = false;

vi.mock('@/src/components/AuthProvider', () => ({
  useAuth: () => ({ user: mockUser, loading: mockLoading }),
}));

// Mock usePreferences
let mockDarkMode = false;
let mockCurrency = 'USD';
const mockSetDarkMode = vi.fn((value: boolean) => {
  mockDarkMode = value;
});
const mockSetCurrency = vi.fn((value: string) => {
  mockCurrency = value;
});

vi.mock('@/src/components/dashboard/PreferencesContext', () => ({
  usePreferences: () => ({
    darkMode: mockDarkMode,
    setDarkMode: mockSetDarkMode,
    currency: mockCurrency,
    setCurrency: mockSetCurrency,
  }),
}));

// Mock AuthModal
vi.mock('@/src/components/AuthModal', () => ({
  AuthModal: ({ initialMode, onClose }: { initialMode: string; onClose: () => void }) => (
    <div data-testid="auth-modal" data-mode={initialMode}>
      <button onClick={onClose}>Close Auth Modal</button>
    </div>
  ),
}));

// Mock NotificationBell
vi.mock('@/components/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell">Notifications</div>,
}));

import { GlobalLayout } from '@/components/layout/GlobalLayout';

describe('GlobalLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockLoading = false;
    mockDarkMode = false;
    mockCurrency = 'USD';
  });

  describe('Rendering', () => {
    it('should render the layout with sidebar and main content', () => {
      render(
        <GlobalLayout>
          <div data-testid="child-content">Test Content</div>
        </GlobalLayout>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('should render the Lokifi logo', () => {
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );
      expect(screen.getByText('Lokifi')).toBeInTheDocument();
    });

    it('should render all navigation items', () => {
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      expect(screen.getByText('Net Worth')).toBeInTheDocument();
      expect(screen.getByText('Portfolio')).toBeInTheDocument();
      expect(screen.getByText('Markets')).toBeInTheDocument();
      expect(screen.getByText('Debts')).toBeInTheDocument();
      expect(screen.getByText('Recap')).toBeInTheDocument();
      expect(screen.getByText('Chart')).toBeInTheDocument();
      expect(screen.getByText('Alerts')).toBeInTheDocument();
      expect(screen.getByText('AI Research')).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );
      expect(screen.getByPlaceholderText('Search cryptocurrencies...')).toBeInTheDocument();
    });

    it('should render currency selector', () => {
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText('USD €')).toBeInTheDocument();
    });

    it('should render dark mode toggle', () => {
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );
      expect(screen.getByLabelText('Toggle dark mode')).toBeInTheDocument();
    });

    it('should render Settings link', () => {
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  describe('Sidebar Toggle', () => {
    it('should toggle sidebar when clicking toggle button', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      // Initially sidebar is open (w-64)
      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('w-64');

      // Click toggle button
      await user.click(screen.getByLabelText('Toggle sidebar'));

      // Sidebar should collapse (w-20)
      expect(sidebar).toHaveClass('w-20');
    });

    it('should hide text when sidebar is collapsed', async () => {
      const user = userEvent.setup();
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      // Initially logo text is visible
      expect(screen.getByText('Lokifi')).toBeInTheDocument();

      // Click toggle button to collapse
      await user.click(screen.getByLabelText('Toggle sidebar'));

      // Logo text should be hidden
      expect(screen.queryByText('Lokifi')).not.toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate to dashboard when clicking Net Worth', async () => {
      const user = userEvent.setup();
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      await user.click(screen.getByText('Net Worth'));

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('should navigate to portfolio when clicking Portfolio', async () => {
      const user = userEvent.setup();
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      await user.click(screen.getByText('Portfolio'));

      expect(mockPush).toHaveBeenCalledWith('/portfolio');
    });

    it('should navigate to markets when clicking Markets', async () => {
      const user = userEvent.setup();
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      await user.click(screen.getByText('Markets'));

      expect(mockPush).toHaveBeenCalledWith('/markets');
    });

    it('should navigate to settings when clicking Settings', async () => {
      const user = userEvent.setup();
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      await user.click(screen.getByText('Settings'));

      expect(mockPush).toHaveBeenCalledWith('/settings');
    });

    it('should navigate to dashboard when clicking logo', async () => {
      const user = userEvent.setup();
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      await user.click(screen.getByText('Lokifi'));

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Dark Mode Toggle', () => {
    it('should show moon icon in light mode', () => {
      mockDarkMode = false;
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      // Moon icon should be visible (for toggling to dark mode)
      const toggleButton = screen.getByLabelText('Toggle dark mode');
      expect(toggleButton.querySelector('.lucide-moon')).toBeTruthy();
    });

    it('should show sun icon in dark mode', () => {
      mockDarkMode = true;
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      // Sun icon should be visible (for toggling to light mode)
      const toggleButton = screen.getByLabelText('Toggle dark mode');
      expect(toggleButton.querySelector('.lucide-sun')).toBeTruthy();
    });

    it('should call setDarkMode when clicking toggle', async () => {
      mockDarkMode = false;
      const user = userEvent.setup();
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      await user.click(screen.getByLabelText('Toggle dark mode'));

      expect(mockSetDarkMode).toHaveBeenCalledWith(true);
    });
  });

  describe('Currency Selector', () => {
    it('should display all currency options', () => {
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      const currencySelect = screen.getByRole('combobox');
      expect(currencySelect.querySelectorAll('option')).toHaveLength(6);
      expect(screen.getByText('USD €')).toBeInTheDocument();
      expect(screen.getByText('EUR €')).toBeInTheDocument();
      expect(screen.getByText('GBP €')).toBeInTheDocument();
      expect(screen.getByText('JPY €')).toBeInTheDocument();
    });

    it('should call setCurrency when selecting new currency', async () => {
      const user = userEvent.setup();
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      await user.selectOptions(screen.getByRole('combobox'), 'EUR');

      expect(mockSetCurrency).toHaveBeenCalledWith('EUR');
    });
  });

  describe('Search', () => {
    it('should update search query when typing', async () => {
      const user = userEvent.setup();
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      const searchInput = screen.getByPlaceholderText('Search cryptocurrencies...');
      await user.type(searchInput, 'bitcoin');

      expect(searchInput).toHaveValue('bitcoin');
    });
  });

  describe('Authentication - Logged Out', () => {
    it('should show Log In / Sign Up button when not logged in', () => {
      mockUser = null;
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      expect(screen.getByText('Log In / Sign Up')).toBeInTheDocument();
    });

    it('should show disabled bell icon when not logged in', () => {
      mockUser = null;
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      const disabledBell = screen.getByTitle('Login to view notifications');
      expect(disabledBell).toBeDisabled();
    });

    it('should open auth modal when clicking Log In button', async () => {
      mockUser = null;
      const user = userEvent.setup();
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      await user.click(screen.getByText('Log In / Sign Up'));

      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
      expect(screen.getByTestId('auth-modal')).toHaveAttribute('data-mode', 'login');
    });

    it('should close auth modal when clicking close button', async () => {
      mockUser = null;
      const user = userEvent.setup();
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      await user.click(screen.getByText('Log In / Sign Up'));
      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();

      await user.click(screen.getByText('Close Auth Modal'));
      expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();
    });
  });

  describe('Authentication - Logged In', () => {
    it('should show user profile button when logged in', () => {
      mockUser = { username: 'testuser', email: 'test@example.com' };
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      expect(screen.getByText('@testuser')).toBeInTheDocument();
    });

    it('should show email prefix when no username', () => {
      mockUser = { email: 'john.doe@example.com' };
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      expect(screen.getByText('john.doe')).toBeInTheDocument();
    });

    it('should show NotificationBell when logged in', () => {
      mockUser = { username: 'testuser' };
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
    });

    it('should navigate to profile when clicking user button', async () => {
      mockUser = { username: 'testuser' };
      const user = userEvent.setup();
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      await user.click(screen.getByLabelText('User profile'));

      expect(mockPush).toHaveBeenCalledWith('/profile');
    });

    it('should not show Log In button when logged in', () => {
      mockUser = { username: 'testuser' };
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      expect(screen.queryByText('Log In / Sign Up')).not.toBeInTheDocument();
    });
  });

  describe('Authentication - Loading', () => {
    it('should show loading skeleton while loading', () => {
      mockLoading = true;
      const { container } = render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      // Should show animate-pulse loading skeleton
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('should not show user info while loading', () => {
      mockLoading = true;
      mockUser = { username: 'testuser' };
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      expect(screen.queryByText('@testuser')).not.toBeInTheDocument();
      expect(screen.queryByText('Log In / Sign Up')).not.toBeInTheDocument();
    });
  });

  describe('Active State', () => {
    it('should highlight Net Worth when on dashboard', () => {
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      const netWorthButton = screen.getByText('Net Worth').closest('button');
      // Updated to check for new Tailwind v4 gradient styling
      expect(netWorthButton).toHaveClass('bg-gradient-to-r', 'from-lokifi/15');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-labels on toggle buttons', () => {
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      expect(screen.getByLabelText('Toggle sidebar')).toBeInTheDocument();
      expect(screen.getByLabelText('Toggle dark mode')).toBeInTheDocument();
    });

    it('should have proper aria-label on login button', () => {
      mockUser = null;
      render(
        <GlobalLayout>
          <div />
        </GlobalLayout>
      );

      expect(screen.getByLabelText('Log in or sign up')).toBeInTheDocument();
    });
  });
});
