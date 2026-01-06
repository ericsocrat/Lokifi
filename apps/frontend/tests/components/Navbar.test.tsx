/**
 * Navbar Component Tests
 *
 * Tests for main navigation component with authentication
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// Mock NotificationBell
vi.mock('../../components/NotificationBell', () => ({
  NotificationBell: ({ className }: { className?: string }) => (
    <div data-testid="notification-bell" className={className}>
      NotificationBell
    </div>
  ),
}));

// Mock AuthModal
vi.mock('@/components/AuthModal', () => ({
  AuthModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="auth-modal">
      <button onClick={onClose} data-testid="close-modal">
        Close Modal
      </button>
    </div>
  ),
}));

// Auth mock state
let mockUser: { email: string; full_name?: string } | null = null;
const mockLogout = vi.fn();

vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
  }),
}));

// Import component after mocks
import { Navbar } from '@/components/Navbar';

describe('Navbar', () => {
  beforeEach(() => {
    mockUser = null;
    mockLogout.mockClear();
  });

  describe('Header Structure', () => {
    it('should render header element with correct styling', () => {
      render(<Navbar />);

      const header = document.querySelector('header');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('border-b', 'border-neutral-800', 'bg-neutral-900/50');
    });

    it('should render navigation container', () => {
      render(<Navbar />);

      const nav = document.querySelector('nav');
      expect(nav).toBeInTheDocument();
    });
  });

  describe('Navigation Links', () => {
    it('should render Lokifi brand link', () => {
      render(<Navbar />);

      const brandLink = screen.getByText('Lokifi');
      expect(brandLink).toBeInTheDocument();
      expect(brandLink.closest('a')).toHaveAttribute('href', '/');
      expect(brandLink).toHaveClass('font-semibold');
    });

    it('should render Portfolio link', () => {
      render(<Navbar />);

      const portfolioLink = screen.getByText('Portfolio');
      expect(portfolioLink).toBeInTheDocument();
      expect(portfolioLink.closest('a')).toHaveAttribute('href', '/portfolio');
    });

    it('should render Alerts link', () => {
      render(<Navbar />);

      const alertsLink = screen.getByText('Alerts');
      expect(alertsLink).toBeInTheDocument();
      expect(alertsLink.closest('a')).toHaveAttribute('href', '/alerts');
    });

    it('should render Chat link', () => {
      render(<Navbar />);

      const chatLink = screen.getByText('Chat');
      expect(chatLink).toBeInTheDocument();
      expect(chatLink.closest('a')).toHaveAttribute('href', '/chat');
    });

    it('should apply hover styling classes to nav links', () => {
      render(<Navbar />);

      const portfolioLink = screen.getByText('Portfolio');
      expect(portfolioLink).toHaveClass('text-neutral-300', 'hover:text-white');
    });
  });

  describe('Unauthenticated State', () => {
    beforeEach(() => {
      mockUser = null;
    });

    it('should show Login / Sign Up button when not authenticated', () => {
      render(<Navbar />);

      expect(screen.getByText('Login / Sign Up')).toBeInTheDocument();
    });

    it('should not show notification bell when not authenticated', () => {
      render(<Navbar />);

      expect(screen.queryByTestId('notification-bell')).not.toBeInTheDocument();
    });

    it('should not show logout button when not authenticated', () => {
      render(<Navbar />);

      expect(screen.queryByText('Logout')).not.toBeInTheDocument();
    });

    it('should not show user name when not authenticated', () => {
      render(<Navbar />);

      // Should only show Login button, not email or name
      expect(screen.queryByText('user@example.com')).not.toBeInTheDocument();
    });

    it('should apply correct styling to login button', () => {
      render(<Navbar />);

      const loginButton = screen.getByText('Login / Sign Up');
      expect(loginButton).toHaveClass(
        'bg-blue-600',
        'hover:bg-blue-700',
        'text-white',
        'font-medium'
      );
    });
  });

  describe('Authenticated State', () => {
    beforeEach(() => {
      mockUser = { email: 'user@example.com', full_name: 'John Doe' };
    });

    it('should show notification bell when authenticated', () => {
      render(<Navbar />);

      expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
    });

    it('should show user full name when available', () => {
      render(<Navbar />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should show email when full name is not available', () => {
      mockUser = { email: 'user@example.com' };
      render(<Navbar />);

      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    it('should show logout button when authenticated', () => {
      render(<Navbar />);

      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    it('should not show login button when authenticated', () => {
      render(<Navbar />);

      expect(screen.queryByText('Login / Sign Up')).not.toBeInTheDocument();
    });

    it('should apply correct styling to logout button', () => {
      render(<Navbar />);

      const logoutButton = screen.getByText('Logout');
      expect(logoutButton).toHaveClass('bg-neutral-800', 'hover:bg-neutral-700', 'text-sm');
    });

    it('should call logout when logout button is clicked', () => {
      render(<Navbar />);

      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('Auth Modal', () => {
    beforeEach(() => {
      mockUser = null;
    });

    it('should not show auth modal initially', () => {
      render(<Navbar />);

      expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();
    });

    it('should show auth modal when login button is clicked', () => {
      render(<Navbar />);

      fireEvent.click(screen.getByText('Login / Sign Up'));

      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
    });

    it('should close auth modal when onClose is called', () => {
      render(<Navbar />);

      // Open modal
      fireEvent.click(screen.getByText('Login / Sign Up'));
      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();

      // Close modal
      fireEvent.click(screen.getByTestId('close-modal'));
      expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should have max-width container', () => {
      render(<Navbar />);

      const container = document.querySelector('.max-w-6xl');
      expect(container).toBeInTheDocument();
    });

    it('should use flex layout for alignment', () => {
      render(<Navbar />);

      const container = document.querySelector('.flex.items-center.justify-between');
      expect(container).toBeInTheDocument();
    });

    it('should have proper spacing between nav items', () => {
      render(<Navbar />);

      const nav = document.querySelector('nav');
      expect(nav).toHaveClass('gap-4');
    });
  });

  describe('User Display', () => {
    it('should display user name with text-neutral-300 styling', () => {
      mockUser = { email: 'user@example.com', full_name: 'John Doe' };
      render(<Navbar />);

      const userDisplay = screen.getByText('John Doe');
      expect(userDisplay).toHaveClass('text-sm', 'text-neutral-300');
    });

    it('should prefer full_name over email for display', () => {
      mockUser = { email: 'user@example.com', full_name: 'John Doe' };
      render(<Navbar />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('user@example.com')).not.toBeInTheDocument();
    });
  });

  describe('NotificationBell Integration', () => {
    it('should render NotificationBell with mr-2 class when authenticated', () => {
      mockUser = { email: 'user@example.com' };
      render(<Navbar />);

      const bell = screen.getByTestId('notification-bell');
      expect(bell).toHaveClass('mr-2');
    });
  });

  describe('Accessibility', () => {
    it('should have semantic header element', () => {
      render(<Navbar />);

      expect(document.querySelector('header')).toBeInTheDocument();
    });

    it('should have semantic nav element', () => {
      render(<Navbar />);

      expect(document.querySelector('nav')).toBeInTheDocument();
    });

    it('should have clickable buttons with clear text', () => {
      render(<Navbar />);

      const loginButton = screen.getByRole('button', { name: /login/i });
      expect(loginButton).toBeInTheDocument();
    });

    it('should render navigation links as proper anchor elements', () => {
      render(<Navbar />);

      const links = document.querySelectorAll('nav a');
      expect(links.length).toBe(4); // Lokifi, Portfolio, Alerts, Chat
    });

    it('should have proper button for logout when authenticated', () => {
      mockUser = { email: 'user@example.com' };
      render(<Navbar />);

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      expect(logoutButton).toBeInTheDocument();
    });
  });
});
