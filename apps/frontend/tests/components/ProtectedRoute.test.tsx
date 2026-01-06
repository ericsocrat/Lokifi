/**
 * @fileoverview Tests for ProtectedRoute component
 *
 * ProtectedRoute is an authentication wrapper component that:
 * - Shows a loading state while checking auth
 * - Redirects/shows message when auth is required but user not logged in
 * - Renders children when user is authenticated
 * - Optionally accepts a custom fallback component
 * - Stores intended destination in sessionStorage for post-login redirect
 *
 * Test categories:
 * 1. Loading State - Spinner while checking auth
 * 2. Unauthenticated State - Message prompt for login
 * 3. Authenticated State - Renders children
 * 4. Custom Fallback - Uses provided fallback when unauthenticated
 * 5. requireAuth=false - Renders children without auth
 * 6. SessionStorage - Stores redirect path
 */
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard'),
}));

// Mock auth state
let mockUser: { id: string; email: string } | null = null;
let mockLoading = true;

// Mock with the same path the component uses
vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: mockLoading,
  }),
}));

// Import after mocks
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Helper to set auth state
function setAuthState(user: typeof mockUser, loading: boolean) {
  mockUser = user;
  mockLoading = loading;
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to loading state
    setAuthState(null, true);
    // Clear sessionStorage
    sessionStorage.clear();
  });

  // ==========================================================================
  // Loading State Tests
  // ==========================================================================

  describe('loading state', () => {
    it('should show loading spinner while checking auth', () => {
      setAuthState(null, true);

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should show spinner with spinning animation', () => {
      setAuthState(null, true);

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should center the loading state', () => {
      setAuthState(null, true);

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      const container = screen.getByText('Loading...').closest('div');
      expect(container?.closest('div.flex')).toHaveClass('items-center', 'justify-center');
    });
  });

  // ==========================================================================
  // Unauthenticated State Tests
  // ==========================================================================

  describe('unauthenticated state', () => {
    it('should show authentication required message when not logged in', async () => {
      setAuthState(null, false);

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      });
    });

    it('should not show protected content when not authenticated', async () => {
      setAuthState(null, false);

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });

    it('should show login instruction message', async () => {
      setAuthState(null, false);

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText(/Login \/ Sign Up/)).toBeInTheDocument();
      });
    });

    it('should show navigation hint', async () => {
      setAuthState(null, false);

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(
          screen.getByText(/Look for the blue button in the navigation bar/)
        ).toBeInTheDocument();
      });
    });

    it('should show lock icon when unauthenticated', async () => {
      setAuthState(null, false);

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        const svg = document.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Authenticated State Tests
  // ==========================================================================

  describe('authenticated state', () => {
    it('should render children when user is authenticated', async () => {
      setAuthState({ id: '1', email: 'test@example.com' }, false);

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('should not show loading state when authenticated', async () => {
      setAuthState({ id: '1', email: 'test@example.com' }, false);

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });

    it('should not show authentication required when authenticated', async () => {
      setAuthState({ id: '1', email: 'test@example.com' }, false);

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Custom Fallback Tests
  // ==========================================================================

  describe('custom fallback', () => {
    it('should render custom fallback when provided and not authenticated', async () => {
      setAuthState(null, false);

      render(
        <ProtectedRoute fallback={<div>Custom Fallback</div>}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
      });
    });

    it('should not show default message when custom fallback provided', async () => {
      setAuthState(null, false);

      render(
        <ProtectedRoute fallback={<div>Custom Fallback</div>}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
      });
    });

    it('should not render fallback when authenticated', async () => {
      setAuthState({ id: '1', email: 'test@example.com' }, false);

      render(
        <ProtectedRoute fallback={<div>Custom Fallback</div>}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.queryByText('Custom Fallback')).not.toBeInTheDocument();
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // requireAuth=false Tests
  // ==========================================================================

  describe('requireAuth=false', () => {
    it('should render children even when not authenticated', async () => {
      setAuthState(null, false);

      render(
        <ProtectedRoute requireAuth={false}>
          <div>Public Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Public Content')).toBeInTheDocument();
      });
    });

    it('should not show authentication message when requireAuth is false', async () => {
      setAuthState(null, false);

      render(
        <ProtectedRoute requireAuth={false}>
          <div>Public Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
      });
    });

    it('should render children when authenticated and requireAuth is false', async () => {
      setAuthState({ id: '1', email: 'test@example.com' }, false);

      render(
        <ProtectedRoute requireAuth={false}>
          <div>Public Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Public Content')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // SessionStorage Tests
  // ==========================================================================

  describe('sessionStorage redirect', () => {
    it('should store redirect path when auth required but user not logged in', async () => {
      setAuthState(null, false);

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(sessionStorage.getItem('redirectAfterAuth')).toBe('/dashboard');
      });
    });

    it('should not store redirect path when user is authenticated', async () => {
      setAuthState({ id: '1', email: 'test@example.com' }, false);

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(sessionStorage.getItem('redirectAfterAuth')).toBeNull();
      });
    });

    it('should not store redirect path when requireAuth is false', async () => {
      setAuthState(null, false);

      render(
        <ProtectedRoute requireAuth={false}>
          <div>Public Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(sessionStorage.getItem('redirectAfterAuth')).toBeNull();
      });
    });
  });

  // ==========================================================================
  // State Transition Tests
  // ==========================================================================

  describe('state transitions', () => {
    it('should handle loading to authenticated transition', async () => {
      // Start loading
      setAuthState(null, true);

      const { rerender } = render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Complete loading with authenticated user
      setAuthState({ id: '1', email: 'test@example.com' }, false);

      rerender(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('should handle loading to unauthenticated transition', async () => {
      // Start loading
      setAuthState(null, true);

      const { rerender } = render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Complete loading without user
      setAuthState(null, false);

      rerender(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('integration', () => {
    it('should work with complex child components', async () => {
      setAuthState({ id: '1', email: 'test@example.com' }, false);

      render(
        <ProtectedRoute>
          <div data-testid="complex-child">
            <header>Header</header>
            <main>Main Content</main>
            <footer>Footer</footer>
          </div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByTestId('complex-child')).toBeInTheDocument();
        expect(screen.getByText('Header')).toBeInTheDocument();
        expect(screen.getByText('Main Content')).toBeInTheDocument();
        expect(screen.getByText('Footer')).toBeInTheDocument();
      });
    });

    it('should preserve child component state', async () => {
      setAuthState({ id: '1', email: 'test@example.com' }, false);

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        const content = screen.getByText('Protected Content');
        expect(content).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('accessibility', () => {
    it('should have accessible loading state', () => {
      setAuthState(null, true);

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should have accessible authentication message', async () => {
      setAuthState(null, false);

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        const heading = screen.getByRole('heading', { name: 'Authentication Required' });
        expect(heading).toBeInTheDocument();
      });
    });
  });
});
