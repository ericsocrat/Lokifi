import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

// Mock AuthProvider
const mockUseAuth = vi.fn();

vi.mock('@/src/components/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

// Import after mocks are set up
import LandingPage from '../../app/page';

describe('LandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
  });

  describe('Loading State', () => {
    it('shows loading spinner when auth is loading', () => {
      mockUseAuth.mockReturnValue({ user: null, loading: true });

      render(<LandingPage />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('displays spinner animation during loading', () => {
      mockUseAuth.mockReturnValue({ user: null, loading: true });

      const { container } = render(<LandingPage />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Authenticated Users', () => {
    it('redirects authenticated users to dashboard', () => {
      mockUseAuth.mockReturnValue({ user: { id: '123', name: 'Test User' }, loading: false });

      render(<LandingPage />);

      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    });

    it('renders nothing for authenticated users', () => {
      mockUseAuth.mockReturnValue({ user: { id: '123', name: 'Test User' }, loading: false });

      const { container } = render(<LandingPage />);

      // Should return null, so container should only have the wrapper div
      expect(container.querySelector('[class*="min-h-screen"]')).toBeNull();
    });
  });

  describe('Unauthenticated Users - Hero Section', () => {
    it('displays the main headline', () => {
      render(<LandingPage />);

      expect(screen.getByText('Track Your Wealth,')).toBeInTheDocument();
      expect(screen.getByText('Master Your Future')).toBeInTheDocument();
    });

    it('displays the badge text', () => {
      render(<LandingPage />);

      expect(screen.getByText('Your Personal Finance Command Center')).toBeInTheDocument();
    });

    it('displays the subheadline', () => {
      render(<LandingPage />);

      expect(screen.getByText(/The modern way to manage your portfolio/i)).toBeInTheDocument();
    });

    it('renders Get Started Free CTA button', () => {
      render(<LandingPage />);

      const ctaButton = screen.getByRole('link', { name: /Get Started Free/i });
      expect(ctaButton).toBeInTheDocument();
      expect(ctaButton).toHaveAttribute('href', '/dashboard');
    });

    it('renders Explore Markets button', () => {
      render(<LandingPage />);

      const marketsButton = screen.getByRole('link', { name: /Explore Markets/i });
      expect(marketsButton).toBeInTheDocument();
      expect(marketsButton).toHaveAttribute('href', '/markets');
    });
  });

  describe('Unauthenticated Users - Stats Section', () => {
    it('displays all stats values', () => {
      render(<LandingPage />);

      expect(screen.getByText('50K+')).toBeInTheDocument();
      expect(screen.getByText('$2B+')).toBeInTheDocument();
      expect(screen.getByText('500+')).toBeInTheDocument();
      expect(screen.getByText('99.9%')).toBeInTheDocument();
    });

    it('displays all stats labels', () => {
      render(<LandingPage />);

      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('Assets Tracked')).toBeInTheDocument();
      expect(screen.getByText('Cryptocurrencies')).toBeInTheDocument();
      expect(screen.getByText('Uptime')).toBeInTheDocument();
    });
  });

  describe('Unauthenticated Users - Features Section', () => {
    it('displays features section heading', () => {
      render(<LandingPage />);

      expect(screen.getByText('Everything You Need to')).toBeInTheDocument();
      expect(screen.getByText('Succeed')).toBeInTheDocument();
    });

    it('displays all 6 feature cards', () => {
      render(<LandingPage />);

      expect(screen.getByText('Portfolio Tracking')).toBeInTheDocument();
      expect(screen.getByText('Live Market Data')).toBeInTheDocument();
      expect(screen.getByText('Smart Analytics')).toBeInTheDocument();
      expect(screen.getByText('Price Alerts')).toBeInTheDocument();
      expect(screen.getByText('Advanced Charts')).toBeInTheDocument();
      expect(screen.getByText('Bank-Level Security')).toBeInTheDocument();
    });

    it('displays feature descriptions', () => {
      render(<LandingPage />);

      expect(screen.getByText(/Track all your assets in one place/i)).toBeInTheDocument();
      expect(screen.getByText(/Real-time prices and market insights/i)).toBeInTheDocument();
      expect(screen.getByText(/Understand your portfolio allocation/i)).toBeInTheDocument();
      expect(screen.getByText(/Never miss a price movement/i)).toBeInTheDocument();
      expect(screen.getByText(/Professional charting tools/i)).toBeInTheDocument();
      expect(screen.getByText(/Your data is encrypted and protected/i)).toBeInTheDocument();
    });
  });

  describe('Unauthenticated Users - CTA Section', () => {
    it('displays CTA section heading', () => {
      render(<LandingPage />);

      expect(screen.getByText('Ready to Take Control?')).toBeInTheDocument();
    });

    it('displays CTA section description', () => {
      render(<LandingPage />);

      expect(screen.getByText(/Join thousands of investors who trust Lokifi/i)).toBeInTheDocument();
    });

    it('renders secondary CTA button', () => {
      render(<LandingPage />);

      const ctaButton = screen.getByRole('link', { name: /Start Tracking for Free/i });
      expect(ctaButton).toBeInTheDocument();
      expect(ctaButton).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('Unauthenticated Users - Footer', () => {
    it('displays Lokifi branding', () => {
      render(<LandingPage />);

      expect(screen.getByText('Lokifi')).toBeInTheDocument();
    });

    it('displays copyright text', () => {
      render(<LandingPage />);

      expect(screen.getByText('© 2026 Lokifi. All rights reserved.')).toBeInTheDocument();
    });

    it('renders navigation links in footer', () => {
      render(<LandingPage />);

      // Get all links in the footer
      const footerLinks = screen.getAllByRole('link');

      // Check that footer navigation links exist
      const marketsLink = footerLinks.find((link) => link.textContent === 'Markets');
      const dashboardLink = footerLinks.find((link) => link.textContent === 'Dashboard');
      const portfolioLink = footerLinks.find((link) => link.textContent === 'Portfolio');
      const alertsLink = footerLinks.find((link) => link.textContent === 'Alerts');

      expect(marketsLink).toHaveAttribute('href', '/markets');
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
      expect(portfolioLink).toHaveAttribute('href', '/portfolio');
      expect(alertsLink).toHaveAttribute('href', '/alerts');
    });
  });

  describe('Design System Compliance', () => {
    it('uses surface color tokens (not gray-*)', () => {
      const { container } = render(<LandingPage />);

      // The landing page should use surface colors from the design system
      const surfaceElements = container.querySelectorAll('[class*="surface-"]');
      expect(surfaceElements.length).toBeGreaterThan(0);

      // Should NOT use old gray-* colors
      const grayElements = container.querySelectorAll('[class*="gray-"]');
      expect(grayElements.length).toBe(0);
    });

    it('uses lokifi brand colors', () => {
      const { container } = render(<LandingPage />);

      // Check for lokifi brand color usage
      const lokifiElements = container.querySelectorAll('[class*="lokifi"]');
      expect(lokifiElements.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<LandingPage />);

      // Should have h1 for main headline
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toBeInTheDocument();

      // Should have h2 for section headings
      const h2Elements = screen.getAllByRole('heading', { level: 2 });
      expect(h2Elements.length).toBeGreaterThanOrEqual(2);

      // Should have h3 for feature titles
      const h3Elements = screen.getAllByRole('heading', { level: 3 });
      expect(h3Elements.length).toBe(6); // 6 features
    });

    it('all interactive elements are keyboard accessible', () => {
      render(<LandingPage />);

      const links = screen.getAllByRole('link');

      links.forEach((link) => {
        // Links should be focusable
        expect(link).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });

  describe('Responsive Design Classes', () => {
    it('has responsive text sizes', () => {
      const { container } = render(<LandingPage />);

      // Check for responsive text classes (md:text-*, lg:text-*)
      const responsiveText = container.querySelectorAll('[class*="md:text-"], [class*="lg:text-"]');
      expect(responsiveText.length).toBeGreaterThan(0);
    });

    it('has responsive grid layout', () => {
      const { container } = render(<LandingPage />);

      // Check for responsive grid classes
      const responsiveGrid = container.querySelectorAll(
        '[class*="md:grid-cols-"], [class*="lg:grid-cols-"]'
      );
      expect(responsiveGrid.length).toBeGreaterThan(0);
    });

    it('has responsive flex layout', () => {
      const { container } = render(<LandingPage />);

      // Check for responsive flex classes
      const responsiveFlex = container.querySelectorAll(
        '[class*="sm:flex-row"], [class*="md:flex-row"]'
      );
      expect(responsiveFlex.length).toBeGreaterThan(0);
    });
  });
});
