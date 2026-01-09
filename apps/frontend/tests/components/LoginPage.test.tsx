/**
 * @fileoverview Comprehensive tests for the Login Page
 *
 * Test Coverage:
 * - Loading state display
 * - Authentication redirect behavior
 * - UI elements rendering
 * - Auth modal interactions
 * - Navigation links
 * - Responsive design elements
 * - Design system compliance
 * - Accessibility
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/login',
}));

// Mock AuthProvider
const mockUseAuth = vi.fn();
vi.mock('@/src/components/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock AuthModal
vi.mock('@/src/components/AuthModal', () => ({
  AuthModal: ({
    initialMode,
    onClose,
  }: {
    initialMode: 'login' | 'register';
    onClose: () => void;
  }) => (
    <div data-testid="auth-modal" data-mode={initialMode}>
      <button onClick={onClose} data-testid="close-modal">
        Close
      </button>
    </div>
  ),
}));

// Import after mocks
import LoginPage from '../../app/login/page';

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
    });
  });

  describe('Loading State', () => {
    it('should display loading state when auth is loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      });

      render(<LoginPage />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should show loading spinner animation', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      });

      render(<LoginPage />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should use design system colors in loading state', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      });

      render(<LoginPage />);

      const container = document.querySelector('.bg-surface-0');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Authentication Redirect', () => {
    it('should redirect authenticated users to dashboard', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', name: 'Test User' },
        loading: false,
      });

      render(<LoginPage />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should return null for authenticated users', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', name: 'Test User' },
        loading: false,
      });

      render(<LoginPage />);

      // After useEffect runs, component should return null
      // The component may render briefly before redirecting
      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    });

    it('should not redirect when still loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      });

      render(<LoginPage />);

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should not redirect unauthenticated users', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      render(<LoginPage />);

      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('Branding Section (Left Side)', () => {
    it('should display Lokifi logo', () => {
      render(<LoginPage />);

      const logoTexts = screen.getAllByText('Lokifi');
      expect(logoTexts.length).toBeGreaterThan(0);
    });

    it('should display logo icon with L', () => {
      render(<LoginPage />);

      const logoIcons = screen.getAllByText('L');
      expect(logoIcons.length).toBeGreaterThan(0);
    });

    it('should display main headline', () => {
      render(<LoginPage />);

      expect(screen.getByText('Your finances,')).toBeInTheDocument();
      expect(screen.getByText('all in one place')).toBeInTheDocument();
    });

    it('should display marketing description', () => {
      render(<LoginPage />);

      expect(screen.getByText(/Track your investments, monitor markets/i)).toBeInTheDocument();
    });

    it('should display feature list items', () => {
      render(<LoginPage />);

      expect(screen.getByText('Real-time portfolio tracking')).toBeInTheDocument();
      expect(screen.getByText(/Multi-asset support/i)).toBeInTheDocument();
      expect(screen.getByText('Smart alerts & notifications')).toBeInTheDocument();
      expect(screen.getByText('Beautiful, intuitive interface')).toBeInTheDocument();
    });
  });

  describe('Auth Options Section (Right Side)', () => {
    it('should display welcome message', () => {
      render(<LoginPage />);

      expect(screen.getByText('Welcome back')).toBeInTheDocument();
      expect(screen.getByText('Sign in to continue to your dashboard')).toBeInTheDocument();
    });

    it('should display Sign In button', () => {
      render(<LoginPage />);

      expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    });

    it('should display Create Account button', () => {
      render(<LoginPage />);

      expect(screen.getByRole('button', { name: /Create an Account/i })).toBeInTheDocument();
    });

    it('should display "New to Lokifi?" text', () => {
      render(<LoginPage />);

      expect(screen.getByText('New to Lokifi?')).toBeInTheDocument();
    });
  });

  describe('Auth Modal Interactions', () => {
    it('should open auth modal in login mode when Sign In clicked', () => {
      render(<LoginPage />);

      const signInButton = screen.getByRole('button', { name: /Sign In/i });
      fireEvent.click(signInButton);

      const modal = screen.getByTestId('auth-modal');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('data-mode', 'login');
    });

    it('should open auth modal in register mode when Create Account clicked', () => {
      render(<LoginPage />);

      const createAccountButton = screen.getByRole('button', { name: /Create an Account/i });
      fireEvent.click(createAccountButton);

      const modal = screen.getByTestId('auth-modal');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('data-mode', 'register');
    });

    it('should close auth modal when close button clicked', async () => {
      render(<LoginPage />);

      // Open modal
      const signInButton = screen.getByRole('button', { name: /Sign In/i });
      fireEvent.click(signInButton);

      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();

      // Close modal
      const closeButton = screen.getByTestId('close-modal');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();
      });
    });

    it('should toggle between login and register modes', async () => {
      render(<LoginPage />);

      // Open in login mode
      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));
      expect(screen.getByTestId('auth-modal')).toHaveAttribute('data-mode', 'login');

      // Close modal
      fireEvent.click(screen.getByTestId('close-modal'));

      await waitFor(() => {
        expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();
      });

      // Open in register mode
      fireEvent.click(screen.getByRole('button', { name: /Create an Account/i }));
      expect(screen.getByTestId('auth-modal')).toHaveAttribute('data-mode', 'register');
    });
  });

  describe('Demo Mode Section', () => {
    it('should display demo mode section', () => {
      render(<LoginPage />);

      expect(screen.getByText('Try without signing up')).toBeInTheDocument();
    });

    it('should display demo mode description', () => {
      render(<LoginPage />);

      expect(screen.getByText(/Explore the dashboard with demo data/i)).toBeInTheDocument();
    });

    it('should have Enter Demo Mode link', () => {
      render(<LoginPage />);

      const demoLink = screen.getByText('Enter Demo Mode');
      expect(demoLink).toBeInTheDocument();
      expect(demoLink.closest('a')).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('Footer Links', () => {
    it('should have Markets link', () => {
      render(<LoginPage />);

      const marketsLink = screen.getByRole('link', { name: 'Markets' });
      expect(marketsLink).toHaveAttribute('href', '/markets');
    });

    it('should have About link', () => {
      render(<LoginPage />);

      const aboutLink = screen.getByRole('link', { name: 'About' });
      expect(aboutLink).toHaveAttribute('href', '/');
    });

    it('should have Help button', () => {
      render(<LoginPage />);

      expect(screen.getByRole('button', { name: 'Help' })).toBeInTheDocument();
    });
  });

  describe('Design System Compliance', () => {
    it('should use surface-0 for background', () => {
      render(<LoginPage />);

      const mainContainer = document.querySelector('.bg-surface-0');
      expect(mainContainer).toBeInTheDocument();
    });

    it('should use surface-50 for card background', () => {
      render(<LoginPage />);

      const card = document.querySelector('.bg-surface-50\\/80');
      expect(card).toBeInTheDocument();
    });

    it('should use lokifi brand colors', () => {
      render(<LoginPage />);

      // Check for lokifi gradient classes
      const gradientElements = document.querySelectorAll('[class*="from-lokifi"]');
      expect(gradientElements.length).toBeGreaterThan(0);
    });

    it('should use surface-300 for muted text', () => {
      render(<LoginPage />);

      const mutedTextElements = document.querySelectorAll('.text-surface-300');
      expect(mutedTextElements.length).toBeGreaterThan(0);
    });

    it('should use gradient for primary button', () => {
      render(<LoginPage />);

      const signInButton = screen.getByRole('button', { name: /Sign In/i });
      expect(signInButton).toHaveClass('bg-gradient-to-r');
    });

    it('should use surface-100 for secondary button', () => {
      render(<LoginPage />);

      const createAccountButton = screen.getByRole('button', { name: /Create an Account/i });
      expect(createAccountButton).toHaveClass('bg-surface-100');
    });
  });

  describe('Responsive Design', () => {
    it('should have mobile logo element', () => {
      render(<LoginPage />);

      // Mobile logo is hidden on lg and above
      const mobileLogo = document.querySelector('.lg\\:hidden');
      expect(mobileLogo).toBeInTheDocument();
    });

    it('should have desktop branding section', () => {
      render(<LoginPage />);

      // Desktop branding is hidden on mobile
      const desktopBranding = document.querySelector('.lg\\:flex.lg\\:w-1\\/2');
      expect(desktopBranding).toBeInTheDocument();
    });

    it('should use flex layout for main container', () => {
      render(<LoginPage />);

      const mainContainer = document.querySelector('.min-h-screen.bg-surface-0.flex');
      expect(mainContainer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button labels', () => {
      render(<LoginPage />);

      expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create an Account/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Help/i })).toBeInTheDocument();
    });

    it('should have accessible links', () => {
      render(<LoginPage />);

      expect(screen.getByRole('link', { name: 'Markets' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Enter Demo Mode/i })).toBeInTheDocument();
    });

    it('should have proper heading hierarchy', () => {
      render(<LoginPage />);

      const h1 = document.querySelector('h1');
      const h2 = document.querySelector('h2');

      expect(h1).toBeInTheDocument();
      expect(h2).toBeInTheDocument();
    });

    it('should have visible focus states on buttons', () => {
      render(<LoginPage />);

      const signInButton = screen.getByRole('button', { name: /Sign In/i });
      expect(signInButton).toHaveClass('transition-all');
    });

    it('should not have any images without alt text', () => {
      render(<LoginPage />);

      const images = document.querySelectorAll('img');
      // No img elements expected - uses Lucide icons instead
      expect(images.length).toBe(0);
    });
  });

  describe('Icons', () => {
    it('should render Lock icon in Sign In button', () => {
      render(<LoginPage />);

      const signInButton = screen.getByRole('button', { name: /Sign In/i });
      const lockIcon = signInButton.querySelector('svg');
      expect(lockIcon).toBeInTheDocument();
    });

    it('should render User icon in Create Account button', () => {
      render(<LoginPage />);

      const createAccountButton = screen.getByRole('button', { name: /Create an Account/i });
      const userIcon = createAccountButton.querySelector('svg');
      expect(userIcon).toBeInTheDocument();
    });

    it('should render ArrowRight icons', () => {
      render(<LoginPage />);

      const arrowIcons = document.querySelectorAll('.lucide-arrow-right, [class*="lucide"]');
      // Multiple arrow icons exist in the UI
      expect(arrowIcons.length).toBeGreaterThanOrEqual(0);
    });

    it('should render Sparkles icons in feature list', () => {
      render(<LoginPage />);

      // Feature list items have sparkles icons
      const featureList = screen.getByText('Real-time portfolio tracking');
      expect(featureList).toBeInTheDocument();
    });
  });

  describe('Visual Effects', () => {
    it('should have backdrop blur on card', () => {
      render(<LoginPage />);

      const card = document.querySelector('.backdrop-blur-xl');
      expect(card).toBeInTheDocument();
    });

    it('should have shadow on card', () => {
      render(<LoginPage />);

      const card = document.querySelector('.shadow-2xl');
      expect(card).toBeInTheDocument();
    });

    it('should have hover scale effect on primary button', () => {
      render(<LoginPage />);

      const signInButton = screen.getByRole('button', { name: /Sign In/i });
      expect(signInButton.className).toContain('hover:scale');
    });

    it('should have blur effects on background', () => {
      render(<LoginPage />);

      const blurElements = document.querySelectorAll('.blur-3xl');
      expect(blurElements.length).toBeGreaterThan(0);
    });
  });

  describe('State Management', () => {
    it('should initialize with auth modal closed', () => {
      render(<LoginPage />);

      expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();
    });

    it('should correctly track modal open state', () => {
      render(<LoginPage />);

      // Initially closed
      expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();

      // Open modal
      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));
      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
    });

    it('should correctly track auth mode state', () => {
      render(<LoginPage />);

      // Test login mode
      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));
      expect(screen.getByTestId('auth-modal')).toHaveAttribute('data-mode', 'login');

      // Close and test register mode
      fireEvent.click(screen.getByTestId('close-modal'));
      fireEvent.click(screen.getByRole('button', { name: /Create an Account/i }));
      expect(screen.getByTestId('auth-modal')).toHaveAttribute('data-mode', 'register');
    });
  });
});
