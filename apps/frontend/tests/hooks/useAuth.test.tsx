/**
 * Tests for useAuth Hook and AuthProvider
 *
 * Tests cover:
 * - Hook behavior outside AuthProvider (returns mock values for dev)
 * - AuthProvider state management (user, token, loading states)
 * - Login flow (successful, failed, network error)
 * - Logout flow
 * - Token persistence (localStorage)
 * - Auto-fetch user profile on mount with existing token
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider, useAuth } from '../../hooks/useAuth';
import { server } from '../mocks/server';

// Mock the logger
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock localStorage with internal store for proper state tracking
let localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageStore[key];
  }),
  clear: vi.fn(() => {
    localStorageStore = {};
  }),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Test component that consumes the hook
function TestConsumer({
  onStateChange,
}: {
  onStateChange?: (state: ReturnType<typeof useAuth>) => void;
}) {
  const auth = useAuth();

  // Report state to test if callback provided
  if (onStateChange) {
    onStateChange(auth);
  }

  return (
    <div>
      <div data-testid="loading">{auth.isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="user">{auth.user ? JSON.stringify(auth.user) : 'no-user'}</div>
      <div data-testid="token">{auth.token || 'no-token'}</div>
      <button data-testid="login-btn" onClick={() => auth.login('test@example.com', 'password')}>
        Login
      </button>
      <button data-testid="logout-btn" onClick={auth.logout}>
        Logout
      </button>
    </div>
  );
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    localStorageStore = {};
  });

  afterEach(() => {
    vi.clearAllMocks();
    server.resetHandlers();
  });

  describe('outside AuthProvider', () => {
    it('should return mock values for development when used outside provider', () => {
      render(<TestConsumer />);

      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      expect(screen.getByTestId('token')).toHaveTextContent('mock-token');

      const userContent = screen.getByTestId('user').textContent;
      expect(userContent).toContain('test@example.com');
      expect(userContent).toContain('Test User');
    });

    it('should provide working mock login function', async () => {
      const user = userEvent.setup();
      render(<TestConsumer />);

      await user.click(screen.getByTestId('login-btn'));
      // Mock login returns true (no actual state change since we're outside provider)
      // Just verify it doesn't throw
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    it('should provide working mock logout function', async () => {
      const user = userEvent.setup();
      render(<TestConsumer />);

      await user.click(screen.getByTestId('logout-btn'));
      // Mock logout is a no-op, verify no error
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });
  });

  describe('inside AuthProvider', () => {
    describe('initial state', () => {
      it('should transition to ready state when no stored token', async () => {
        // No token in localStorage, no API calls expected
        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(screen.getByTestId('loading')).toHaveTextContent('ready');
        });

        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
        expect(screen.getByTestId('token')).toHaveTextContent('no-token');
      });
    });

    describe('token persistence', () => {
      it('should restore user from stored token on mount', async () => {
        // Setup: Token exists in localStorage
        localStorageStore['auth_token'] = 'existing-token';

        // Setup: MSW handler for profile fetch
        server.use(
          http.get('/api/profile/me', () => {
            return HttpResponse.json({
              id: '123',
              email: 'user@example.com',
              full_name: 'Stored User',
            });
          })
        );

        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(screen.getByTestId('loading')).toHaveTextContent('ready');
        });

        const userContent = screen.getByTestId('user').textContent;
        expect(userContent).toContain('user@example.com');
        expect(userContent).toContain('Stored User');
      });

      it('should clear invalid token and show no user', async () => {
        // Setup: Invalid token in localStorage
        localStorageStore['auth_token'] = 'invalid-token';

        // Setup: MSW handler returns 401
        server.use(
          http.get('/api/profile/me', () => {
            return HttpResponse.json({ detail: 'Invalid token' }, { status: 401 });
          })
        );

        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(screen.getByTestId('loading')).toHaveTextContent('ready');
        });

        expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
        expect(screen.getByTestId('token')).toHaveTextContent('no-token');
      });

      it('should handle network error during token validation gracefully', async () => {
        // Setup: Token exists
        localStorageStore['auth_token'] = 'some-token';

        // Setup: MSW handler throws network error
        server.use(
          http.get('/api/profile/me', () => {
            return HttpResponse.error();
          })
        );

        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(screen.getByTestId('loading')).toHaveTextContent('ready');
        });

        // User state should remain null on error, but loading should complete
        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      });
    });

    describe('login flow', () => {
      it('should handle successful login', async () => {
        const user = userEvent.setup();

        // Setup: MSW handler for login
        server.use(
          http.post('/api/auth/login', async () => {
            return HttpResponse.json({
              user: {
                id: 'new-user-123',
                email: 'new@example.com',
                full_name: 'New User',
              },
              tokens: {
                access_token: 'new-token-abc',
              },
            });
          })
        );

        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );

        // Wait for initial load
        await waitFor(() => {
          expect(screen.getByTestId('loading')).toHaveTextContent('ready');
        });

        // Click login
        await user.click(screen.getByTestId('login-btn'));

        await waitFor(() => {
          expect(screen.getByTestId('token')).toHaveTextContent('new-token-abc');
        });

        expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'new-token-abc');

        const userContent = screen.getByTestId('user').textContent;
        expect(userContent).toContain('new@example.com');
      });

      it('should handle login failure (invalid credentials)', async () => {
        const user = userEvent.setup();

        // Setup: MSW handler returns 401
        server.use(
          http.post('/api/auth/login', () => {
            return HttpResponse.json({ detail: 'Invalid credentials' }, { status: 401 });
          })
        );

        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(screen.getByTestId('loading')).toHaveTextContent('ready');
        });

        await user.click(screen.getByTestId('login-btn'));

        // Wait a tick for async login to complete
        await waitFor(() => {
          // User should still be null after failed login
          expect(screen.getByTestId('user')).toHaveTextContent('no-user');
        });

        // setItem should not have been called with auth_token
        expect(localStorageMock.setItem).not.toHaveBeenCalled();
      });

      it('should handle login network error', async () => {
        const user = userEvent.setup();

        // Setup: MSW handler throws network error
        server.use(
          http.post('/api/auth/login', () => {
            return HttpResponse.error();
          })
        );

        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(screen.getByTestId('loading')).toHaveTextContent('ready');
        });

        await user.click(screen.getByTestId('login-btn'));

        // User should still be null after error
        await waitFor(() => {
          expect(screen.getByTestId('user')).toHaveTextContent('no-user');
        });
      });

      it('should handle login response without token', async () => {
        const user = userEvent.setup();

        // Setup: MSW handler returns response without access_token
        server.use(
          http.post('/api/auth/login', () => {
            return HttpResponse.json({
              user: { id: '1', email: 'test@example.com' },
              // Missing tokens field
            });
          })
        );

        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(screen.getByTestId('loading')).toHaveTextContent('ready');
        });

        await user.click(screen.getByTestId('login-btn'));

        // Should not set token or user when access_token is missing
        await waitFor(() => {
          expect(screen.getByTestId('user')).toHaveTextContent('no-user');
        });
      });
    });

    describe('logout flow', () => {
      it('should clear user, token, and localStorage on logout', async () => {
        const user = userEvent.setup();

        // Setup: Token exists and profile fetch succeeds
        localStorageStore['auth_token'] = 'current-token';
        server.use(
          http.get('/api/profile/me', () => {
            return HttpResponse.json({
              id: 'user-1',
              email: 'logged@example.com',
              full_name: 'Logged User',
            });
          })
        );

        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );

        // Wait for logged-in state
        await waitFor(() => {
          expect(screen.getByTestId('loading')).toHaveTextContent('ready');
          const userContent = screen.getByTestId('user').textContent;
          expect(userContent).toContain('logged@example.com');
        });

        // Click logout
        await user.click(screen.getByTestId('logout-btn'));

        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
        expect(screen.getByTestId('token')).toHaveTextContent('no-token');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
      });
    });
  });
});

describe('AuthProvider context value', () => {
  beforeEach(() => {
    localStorageStore = {};
  });

  it('should provide correct interface shape', async () => {
    let capturedAuth: ReturnType<typeof useAuth> | null = null;

    render(
      <AuthProvider>
        <TestConsumer
          onStateChange={(state) => {
            capturedAuth = state;
          }}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(capturedAuth).not.toBeNull();
    });

    // Verify interface shape
    expect(capturedAuth).toHaveProperty('user');
    expect(capturedAuth).toHaveProperty('isLoading');
    expect(capturedAuth).toHaveProperty('login');
    expect(capturedAuth).toHaveProperty('logout');
    expect(capturedAuth).toHaveProperty('token');
    expect(typeof capturedAuth!.login).toBe('function');
    expect(typeof capturedAuth!.logout).toBe('function');
  });
});
