import { AuthProvider, useAuth } from '@/components/AuthProvider';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '../mocks/server';

const API_URL = 'http://localhost:8000';

describe('AuthProvider', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('starts with loading state', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBeNull();
    });

    it('fetches user data on mount if authenticated', async () => {
      server.use(
        http.get(`${API_URL}/api/auth/me`, () => {
          return HttpResponse.json({
            user: {
              id: '1',
              email: 'test@example.com',
              full_name: 'Test User',
              created_at: '2024-01-01T00:00:00Z',
            },
            profile: {
              username: 'testuser',
              avatar_url: 'https://example.com/avatar.jpg',
              bio: 'Test bio',
            },
          });
        })
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual({
        id: '1',
        email: 'test@example.com',
        full_name: 'Test User',
        username: 'testuser',
        avatar_url: 'https://example.com/avatar.jpg',
        bio: 'Test bio',
        created_at: '2024-01-01T00:00:00Z',
      });
    });

    it('sets user to null if /me request fails', async () => {
      server.use(
        http.get(`${API_URL}/api/auth/me`, () => {
          return HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 });
        })
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });

    it('handles network errors gracefully', async () => {
      server.use(
        http.get(`${API_URL}/api/auth/me`, () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });
  });

  describe('login', () => {
    it('successfully logs in user', async () => {
      server.use(
        http.post(`${API_URL}/api/auth/login`, () => {
          return HttpResponse.json({
            access_token: 'test-token',
            token_type: 'bearer',
          });
        }),
        http.get(`${API_URL}/api/auth/me`, () => {
          return HttpResponse.json({
            user: {
              id: '1',
              email: 'test@example.com',
              full_name: 'Test User',
              created_at: '2024-01-01T00:00:00Z',
            },
            profile: {
              username: 'testuser',
            },
          });
        })
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      await waitFor(() => {
        expect(result.current.user).toEqual({
          id: '1',
          email: 'test@example.com',
          full_name: 'Test User',
          username: 'testuser',
          avatar_url: undefined,
          bio: undefined,
          created_at: '2024-01-01T00:00:00Z',
        });
      });
    });

    it('throws error on login failure', async () => {
      server.use(
        http.post(`${API_URL}/api/auth/login`, () => {
          return HttpResponse.json({ detail: 'Invalid credentials' }, { status: 401 });
        })
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(async () => {
        await act(async () => {
          await result.current.login('wrong@example.com', 'wrongpass');
        });
      }).rejects.toThrow();
    });

    it('logs login attempts with console', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      server.use(
        http.post(`${API_URL}/api/auth/login`, () => {
          return HttpResponse.json({
            access_token: 'test-token',
          });
        }),
        http.get(`${API_URL}/api/auth/me`, () => {
          return HttpResponse.json({
            user: {
              id: '1',
              email: 'test@example.com',
              full_name: 'Test User',
              created_at: '2024-01-01T00:00:00Z',
            },
          });
        })
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(consoleSpy).toHaveBeenCalledWith('🔐 AuthProvider: Logging in...');
      expect(consoleSpy).toHaveBeenCalledWith(
        '🔐 AuthProvider: Login successful, refreshing user data...'
      );
    });
  });

  describe('register', () => {
    it('successfully registers user', async () => {
      server.use(
        http.post(`${API_URL}/api/auth/register`, () => {
          return HttpResponse.json({
            id: '1',
            email: 'new@example.com',
            full_name: 'New User',
            created_at: '2024-01-01T00:00:00Z',
          });
        }),
        http.get(`${API_URL}/api/auth/me`, () => {
          return HttpResponse.json({
            user: {
              id: '1',
              email: 'new@example.com',
              full_name: 'New User',
              created_at: '2024-01-01T00:00:00Z',
            },
            profile: {
              username: 'newuser',
            },
          });
        })
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.register('new@example.com', 'password123', 'New User', 'newuser');
      });

      await waitFor(() => {
        expect(result.current.user).toEqual({
          id: '1',
          email: 'new@example.com',
          full_name: 'New User',
          username: 'newuser',
          avatar_url: undefined,
          bio: undefined,
          created_at: '2024-01-01T00:00:00Z',
        });
      });
    });

    it('throws error on registration failure', async () => {
      server.use(
        http.post(`${API_URL}/api/auth/register`, () => {
          return HttpResponse.json({ detail: 'Email already exists' }, { status: 400 });
        })
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(async () => {
        await act(async () => {
          await result.current.register('existing@example.com', 'password123', 'Test User');
        });
      }).rejects.toThrow();
    });

    it('logs registration attempts with console', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      server.use(
        http.post(`${API_URL}/api/auth/register`, () => {
          return HttpResponse.json({
            id: '1',
            email: 'new@example.com',
          });
        }),
        http.get(`${API_URL}/api/auth/me`, () => {
          return HttpResponse.json({
            user: {
              id: '1',
              email: 'new@example.com',
              full_name: 'New User',
              created_at: '2024-01-01T00:00:00Z',
            },
          });
        })
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.register('new@example.com', 'password123', 'New User');
      });

      expect(consoleSpy).toHaveBeenCalledWith('📝 AuthProvider: Registering...');
      expect(consoleSpy).toHaveBeenCalledWith(
        '📝 AuthProvider: Registration successful, refreshing user data...'
      );
    });
  });

  describe('logout', () => {
    it('successfully logs out user', async () => {
      server.use(
        http.get(`${API_URL}/api/auth/me`, () => {
          return HttpResponse.json({
            user: {
              id: '1',
              email: 'test@example.com',
              full_name: 'Test User',
              created_at: '2024-01-01T00:00:00Z',
            },
          });
        }),
        http.post(`${API_URL}/api/auth/logout`, () => {
          return HttpResponse.json({ message: 'Logged out successfully' });
        })
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // User should be loaded
      expect(result.current.user).not.toBeNull();

      // Logout
      await act(async () => {
        result.current.logout();
      });

      // Wait for logout to complete
      await waitFor(() => {
        expect(result.current.user).toBeNull();
      });
    });

    it('logs logout attempts with console', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      server.use(
        http.get(`${API_URL}/api/auth/me`, () => {
          return HttpResponse.json({
            user: {
              id: '1',
              email: 'test@example.com',
              full_name: 'Test User',
              created_at: '2024-01-01T00:00:00Z',
            },
          });
        }),
        http.post(`${API_URL}/api/auth/logout`, () => {
          return HttpResponse.json({});
        })
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        result.current.logout();
      });

      expect(consoleSpy).toHaveBeenCalledWith('🚪 AuthProvider: Logging out...');
      expect(consoleSpy).toHaveBeenCalledWith('🚪 AuthProvider: Logged out');
    });

    it('throws error if logout API call fails', async () => {
      server.use(
        http.get(`${API_URL}/api/auth/me`, () => {
          return HttpResponse.json({
            user: {
              id: '1',
              email: 'test@example.com',
              full_name: 'Test User',
              created_at: '2024-01-01T00:00:00Z',
            },
          });
        }),
        http.post(`${API_URL}/api/auth/logout`, () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).not.toBeNull();

      // Logout should throw error if API fails
      await expect(async () => {
        await act(async () => {
          await result.current.logout();
        });
      }).rejects.toThrow();

      // Note: User state is NOT cleared on error (known limitation)
      // This is current behavior - logout() doesn't handle errors gracefully
    });
  });

  describe('refresh', () => {
    it('refreshes user data successfully', async () => {
      let callCount = 0;
      server.use(
        http.get(`${API_URL}/api/auth/me`, () => {
          callCount++;
          return HttpResponse.json({
            user: {
              id: '1',
              email: 'test@example.com',
              full_name: callCount === 1 ? 'Old Name' : 'New Name',
              created_at: '2024-01-01T00:00:00Z',
            },
          });
        })
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user?.full_name).toBe('Old Name');

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.user?.full_name).toBe('New Name');
      });
    });

    it('handles refresh errors gracefully', async () => {
      let callCount = 0;
      server.use(
        http.get(`${API_URL}/api/auth/me`, () => {
          callCount++;
          if (callCount === 1) {
            return HttpResponse.json({
              user: {
                id: '1',
                email: 'test@example.com',
                full_name: 'Test User',
                created_at: '2024-01-01T00:00:00Z',
              },
            });
          }
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).not.toBeNull();

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
      });
    });
  });

  describe('useAuth hook', () => {
    it('throws error when used outside AuthProvider', () => {
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within AuthProvider');
    });

    it('returns context value when used inside AuthProvider', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('login');
      expect(result.current).toHaveProperty('register');
      expect(result.current).toHaveProperty('logout');
      expect(result.current).toHaveProperty('refresh');
    });
  });

  describe('renders children correctly', () => {
    it('renders child components', () => {
      render(
        <AuthProvider>
          <div data-testid="child">Child Content</div>
        </AuthProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });
  });
});
