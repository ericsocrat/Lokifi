/**
 * Tests for auth-protection (HOC and hook)
 */
import { useRequireAuth, withAuth } from '@/lib/api/auth-protection';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock AuthProvider
const mockUseAuth = vi.fn();
vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('auth-protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('withAuth HOC', () => {
    const TestComponent = ({ name }: { name: string }) => (
      <div data-testid="protected-content">Hello, {name}!</div>
    );

    describe('when authenticated', () => {
      beforeEach(() => {
        mockUseAuth.mockReturnValue({ user: { id: '1', email: 'test@example.com' }, loading: false });
      });

      it('should render the wrapped component', () => {
        const ProtectedComponent = withAuth(TestComponent);
        render(<ProtectedComponent name="World" />);

        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        expect(screen.getByText('Hello, World!')).toBeInTheDocument();
      });

      it('should pass props to wrapped component', () => {
        const ProtectedComponent = withAuth(TestComponent);
        render(<ProtectedComponent name="User" />);

        expect(screen.getByText('Hello, User!')).toBeInTheDocument();
      });

      it('should not redirect', () => {
        const ProtectedComponent = withAuth(TestComponent);
        render(<ProtectedComponent name="Test" />);

        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    describe('when not authenticated', () => {
      beforeEach(() => {
        mockUseAuth.mockReturnValue({ user: null, loading: false });
      });

      it('should not render the wrapped component', () => {
        const ProtectedComponent = withAuth(TestComponent);
        render(<ProtectedComponent name="World" />);

        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      });

      it('should redirect to default path (/)', async () => {
        const ProtectedComponent = withAuth(TestComponent);
        render(<ProtectedComponent name="Test" />);

        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith('/');
        });
      });

      it('should redirect to custom path when provided', async () => {
        const ProtectedComponent = withAuth(TestComponent, { redirectTo: '/login' });
        render(<ProtectedComponent name="Test" />);

        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith('/login');
        });
      });

      it('should store current path in sessionStorage for redirect', async () => {
        const ProtectedComponent = withAuth(TestComponent);
        render(<ProtectedComponent name="Test" />);

        await waitFor(() => {
          expect(sessionStorage.getItem('redirectAfterAuth')).toBe(window.location.pathname);
        });
      });
    });

    describe('when loading', () => {
      beforeEach(() => {
        mockUseAuth.mockReturnValue({ user: null, loading: true });
      });

      it('should show default loading state', () => {
        const ProtectedComponent = withAuth(TestComponent);
        render(<ProtectedComponent name="Test" />);

        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });

      it('should not redirect while loading', () => {
        const ProtectedComponent = withAuth(TestComponent);
        render(<ProtectedComponent name="Test" />);

        expect(mockPush).not.toHaveBeenCalled();
      });

      it('should show custom loading component when provided', () => {
        const customLoading = <div data-testid="custom-loader">Custom Loading...</div>;
        const ProtectedComponent = withAuth(TestComponent, { loadingComponent: customLoading });
        render(<ProtectedComponent name="Test" />);

        expect(screen.getByTestId('custom-loader')).toBeInTheDocument();
        expect(screen.getByText('Custom Loading...')).toBeInTheDocument();
      });
    });

    describe('loading to authenticated transition', () => {
      it('should show content after loading completes with authenticated user', async () => {
        // Start with loading state
        mockUseAuth.mockReturnValue({ user: null, loading: true });
        
        const ProtectedComponent = withAuth(TestComponent);
        const { rerender } = render(<ProtectedComponent name="World" />);

        expect(screen.getByText('Loading...')).toBeInTheDocument();

        // Transition to authenticated
        mockUseAuth.mockReturnValue({ user: { id: '1' }, loading: false });
        rerender(<ProtectedComponent name="World" />);

        await waitFor(() => {
          expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        });
      });

      it('should redirect after loading completes without user', async () => {
        // Start with loading state
        mockUseAuth.mockReturnValue({ user: null, loading: true });
        
        const ProtectedComponent = withAuth(TestComponent);
        const { rerender } = render(<ProtectedComponent name="Test" />);

        expect(mockPush).not.toHaveBeenCalled();

        // Transition to unauthenticated
        mockUseAuth.mockReturnValue({ user: null, loading: false });
        rerender(<ProtectedComponent name="Test" />);

        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith('/');
        });
      });
    });
  });

  describe('useRequireAuth hook', () => {
    describe('when authenticated', () => {
      beforeEach(() => {
        mockUseAuth.mockReturnValue({ user: { id: '1', email: 'test@example.com' }, loading: false });
      });

      it('should return user and authentication state', () => {
        const { result } = renderHook(() => useRequireAuth());

        expect(result.current.user).toEqual({ id: '1', email: 'test@example.com' });
        expect(result.current.loading).toBe(false);
        expect(result.current.isAuthenticated).toBe(true);
      });

      it('should not redirect', () => {
        renderHook(() => useRequireAuth());

        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    describe('when not authenticated', () => {
      beforeEach(() => {
        mockUseAuth.mockReturnValue({ user: null, loading: false });
      });

      it('should return null user and isAuthenticated false', () => {
        const { result } = renderHook(() => useRequireAuth());

        expect(result.current.user).toBeNull();
        expect(result.current.loading).toBe(false);
        expect(result.current.isAuthenticated).toBe(false);
      });

      it('should redirect to default path (/)', async () => {
        renderHook(() => useRequireAuth());

        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith('/');
        });
      });

      it('should redirect to custom path when provided', async () => {
        renderHook(() => useRequireAuth('/auth/login'));

        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith('/auth/login');
        });
      });

      it('should store redirect path in sessionStorage', async () => {
        renderHook(() => useRequireAuth());

        await waitFor(() => {
          expect(sessionStorage.getItem('redirectAfterAuth')).toBe(window.location.pathname);
        });
      });
    });

    describe('when loading', () => {
      beforeEach(() => {
        mockUseAuth.mockReturnValue({ user: null, loading: true });
      });

      it('should return loading state', () => {
        const { result } = renderHook(() => useRequireAuth());

        expect(result.current.loading).toBe(true);
        expect(result.current.isAuthenticated).toBe(false);
      });

      it('should not redirect while loading', () => {
        renderHook(() => useRequireAuth());

        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    describe('state transitions', () => {
      it('should redirect after loading completes without user', async () => {
        mockUseAuth.mockReturnValue({ user: null, loading: true });
        
        const { rerender } = renderHook(() => useRequireAuth());

        expect(mockPush).not.toHaveBeenCalled();

        // Simulate auth check completing
        mockUseAuth.mockReturnValue({ user: null, loading: false });
        rerender();

        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith('/');
        });
      });
    });
  });
});
