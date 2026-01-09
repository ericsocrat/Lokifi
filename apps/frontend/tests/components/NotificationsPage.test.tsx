/**
 * Notifications Page Tests
 *
 * Comprehensive tests for app/notifications/page.tsx
 * Tests authentication states, page layout, and component integration
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ============================================================================
// Mocks
// ============================================================================

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/notifications',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock auth provider
const mockUseAuth = vi.fn();
vi.mock('../../src/components/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock Navbar component
vi.mock('../../src/components/Navbar', () => ({
  Navbar: () => <nav data-testid="navbar">Navbar</nav>,
}));

// Mock NotificationCenter component
vi.mock('../../components/NotificationCenter', () => ({
  NotificationCenter: ({
    className,
    showHeader,
    maxHeight,
  }: {
    className?: string;
    showHeader?: boolean;
    maxHeight?: string;
  }) => (
    <div
      data-testid="notification-center"
      data-classname={className}
      data-show-header={showHeader}
      data-max-height={maxHeight}
    >
      NotificationCenter
    </div>
  ),
}));

// Import component after mocks
import NotificationsPage from '../../app/notifications/page';

// ============================================================================
// Helper Functions
// ============================================================================

function setupAuthenticatedUser(userData = { email: 'test@example.com', name: 'Test User' }) {
  mockUseAuth.mockReturnValue({
    user: userData,
    isLoading: false,
  });
}

function setupUnauthenticatedUser() {
  mockUseAuth.mockReturnValue({
    user: null,
    isLoading: false,
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Unauthenticated State Tests
  // ==========================================================================

  describe('Unauthenticated State', () => {
    beforeEach(() => {
      setupUnauthenticatedUser();
    });

    it('should show access required message when not logged in', () => {
      render(<NotificationsPage />);

      expect(screen.getByText('Access Required')).toBeInTheDocument();
    });

    it('should show login prompt message', () => {
      render(<NotificationsPage />);

      expect(screen.getByText('Please log in to view your notifications.')).toBeInTheDocument();
    });

    it('should render Log In button', () => {
      render(<NotificationsPage />);

      expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument();
    });

    it('should link Log In button to login page', () => {
      render(<NotificationsPage />);

      const loginLink = screen.getByRole('link', { name: /log in/i });
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('should render Navbar even when unauthenticated', () => {
      render(<NotificationsPage />);

      expect(screen.getByTestId('navbar')).toBeInTheDocument();
    });

    it('should not render NotificationCenter when unauthenticated', () => {
      render(<NotificationsPage />);

      expect(screen.queryByTestId('notification-center')).not.toBeInTheDocument();
    });

    it('should have dark background', () => {
      render(<NotificationsPage />);

      const container = document.querySelector('.bg-neutral-950');
      expect(container).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Authenticated State Tests
  // ==========================================================================

  describe('Authenticated State', () => {
    beforeEach(() => {
      setupAuthenticatedUser();
    });

    it('should render page title', () => {
      render(<NotificationsPage />);

      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('should render page subtitle', () => {
      render(<NotificationsPage />);

      expect(
        screen.getByText('Stay updated with your latest activities and interactions.')
      ).toBeInTheDocument();
    });

    it('should render Navbar', () => {
      render(<NotificationsPage />);

      expect(screen.getByTestId('navbar')).toBeInTheDocument();
    });

    it('should render NotificationCenter component', () => {
      render(<NotificationsPage />);

      expect(screen.getByTestId('notification-center')).toBeInTheDocument();
    });

    it('should not show access required message', () => {
      render(<NotificationsPage />);

      expect(screen.queryByText('Access Required')).not.toBeInTheDocument();
    });

    it('should not show login prompt', () => {
      render(<NotificationsPage />);

      expect(
        screen.queryByText('Please log in to view your notifications.')
      ).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // NotificationCenter Props Tests
  // ==========================================================================

  describe('NotificationCenter Props', () => {
    beforeEach(() => {
      setupAuthenticatedUser();
    });

    it('should pass full width class to NotificationCenter', () => {
      render(<NotificationsPage />);

      const center = screen.getByTestId('notification-center');
      expect(center).toHaveAttribute('data-classname', 'w-full');
    });

    it('should pass showHeader=false to NotificationCenter', () => {
      render(<NotificationsPage />);

      const center = screen.getByTestId('notification-center');
      expect(center).toHaveAttribute('data-show-header', 'false');
    });

    it('should pass maxHeight to NotificationCenter', () => {
      render(<NotificationsPage />);

      const center = screen.getByTestId('notification-center');
      expect(center).toHaveAttribute('data-max-height', 'calc(100vh - 200px)');
    });
  });

  // ==========================================================================
  // Layout Tests
  // ==========================================================================

  describe('Layout', () => {
    beforeEach(() => {
      setupAuthenticatedUser();
    });

    it('should have dark background', () => {
      render(<NotificationsPage />);

      const container = document.querySelector('.bg-neutral-950');
      expect(container).toBeInTheDocument();
    });

    it('should have max width container', () => {
      render(<NotificationsPage />);

      const maxWidthContainer = document.querySelector('.max-w-4xl');
      expect(maxWidthContainer).toBeInTheDocument();
    });

    it('should have horizontal padding', () => {
      render(<NotificationsPage />);

      const paddedContainer = document.querySelector('.px-4');
      expect(paddedContainer).toBeInTheDocument();
    });

    it('should have vertical padding', () => {
      render(<NotificationsPage />);

      const paddedContainer = document.querySelector('.py-8');
      expect(paddedContainer).toBeInTheDocument();
    });

    it('should center content horizontally', () => {
      render(<NotificationsPage />);

      const centeredContainer = document.querySelector('.mx-auto');
      expect(centeredContainer).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Typography Tests
  // ==========================================================================

  describe('Typography', () => {
    beforeEach(() => {
      setupAuthenticatedUser();
    });

    it('should have h1 heading for title', () => {
      render(<NotificationsPage />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Notifications');
    });

    it('should have white text for title', () => {
      render(<NotificationsPage />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveClass('text-white');
    });

    it('should have semibold title', () => {
      render(<NotificationsPage />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveClass('font-semibold');
    });

    it('should have neutral text for subtitle', () => {
      render(<NotificationsPage />);

      const subtitle = screen.getByText(
        'Stay updated with your latest activities and interactions.'
      );
      expect(subtitle).toHaveClass('text-neutral-400');
    });
  });

  // ==========================================================================
  // Login Button Styling Tests (Unauthenticated)
  // ==========================================================================

  describe('Login Button Styling', () => {
    beforeEach(() => {
      setupUnauthenticatedUser();
    });

    it('should have blue background', () => {
      render(<NotificationsPage />);

      const loginLink = screen.getByRole('link', { name: /log in/i });
      expect(loginLink).toHaveClass('bg-blue-600');
    });

    it('should have white text', () => {
      render(<NotificationsPage />);

      const loginLink = screen.getByRole('link', { name: /log in/i });
      expect(loginLink).toHaveClass('text-white');
    });

    it('should have rounded corners', () => {
      render(<NotificationsPage />);

      const loginLink = screen.getByRole('link', { name: /log in/i });
      expect(loginLink).toHaveClass('rounded-lg');
    });

    it('should have hover state', () => {
      render(<NotificationsPage />);

      const loginLink = screen.getByRole('link', { name: /log in/i });
      expect(loginLink).toHaveClass('hover:bg-blue-500');
    });

    it('should have transition effect', () => {
      render(<NotificationsPage />);

      const loginLink = screen.getByRole('link', { name: /log in/i });
      expect(loginLink).toHaveClass('transition-colors');
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('Accessibility', () => {
    it('should have proper heading hierarchy when authenticated', () => {
      setupAuthenticatedUser();
      render(<NotificationsPage />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
    });

    it('should have proper heading hierarchy when unauthenticated', () => {
      setupUnauthenticatedUser();
      render(<NotificationsPage />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
    });

    it('should have accessible link when unauthenticated', () => {
      setupUnauthenticatedUser();
      render(<NotificationsPage />);

      const link = screen.getByRole('link', { name: /log in/i });
      expect(link).toHaveAccessibleName();
    });
  });

  // ==========================================================================
  // User Variations Tests
  // ==========================================================================

  describe('User Variations', () => {
    it('should work with minimal user object', () => {
      mockUseAuth.mockReturnValue({
        user: { email: 'minimal@test.com' },
        isLoading: false,
      });
      render(<NotificationsPage />);

      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('should work with full user object', () => {
      mockUseAuth.mockReturnValue({
        user: {
          email: 'full@test.com',
          name: 'Full User',
          id: '123',
          avatar: 'https://example.com/avatar.png',
        },
        isLoading: false,
      });
      render(<NotificationsPage />);

      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });
});
