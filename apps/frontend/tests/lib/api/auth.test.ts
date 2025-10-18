import * as apiFetch from '@/lib/api/apiFetch';
import * as auth from '@/lib/api/auth';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '../../mocks/server';

const API_URL = 'http://localhost:8000';

// Mock the token functions
vi.mock('@/lib/api/apiFetch', async () => {
  const actual = await vi.importActual('@/lib/api/apiFetch');
  return {
    ...actual,
    setToken: vi.fn(),
    getToken: vi.fn(),
  };
});

describe('Auth API Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('registers a new user successfully', async () => {
      const mockResponse = {
        user: {
          id: 1,
          email: 'newuser@example.com',
          full_name: 'New User',
          username: 'newuser',
        },
      };

      server.use(
        http.post(`${API_URL}/api/auth/register`, () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await auth.register(
        'newuser@example.com',
        'password123',
        'New User',
        'newuser'
      );

      expect(result).toEqual(mockResponse);
      expect(result.user.email).toBe('newuser@example.com');
      expect(result.user.full_name).toBe('New User');
    });

    it('registers user without optional username', async () => {
      const mockResponse = {
        user: {
          id: 2,
          email: 'user2@example.com',
          full_name: 'User Two',
        },
      };

      server.use(
        http.post(`${API_URL}/api/auth/register`, () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await auth.register('user2@example.com', 'password123', 'User Two');

      expect(result).toEqual(mockResponse);
      expect(result.user.username).toBeUndefined();
    });

    it('handles registration error when email exists', async () => {
      server.use(
        http.post(`${API_URL}/api/auth/register`, () => {
          return HttpResponse.json({ detail: 'Email already registered' }, { status: 400 });
        })
      );

      await expect(
        auth.register('existing@example.com', 'password123', 'Existing User')
      ).rejects.toThrow();
    });

    it('handles validation errors', async () => {
      server.use(
        http.post(`${API_URL}/api/auth/register`, () => {
          return HttpResponse.json(
            {
              detail: [
                {
                  loc: ['body', 'email'],
                  msg: 'Invalid email format',
                  type: 'value_error.email',
                },
              ],
            },
            { status: 422 }
          );
        })
      );

      await expect(auth.register('invalid-email', 'password123', 'User')).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('logs in user successfully', async () => {
      const mockResponse = {
        user: {
          id: 1,
          email: 'test@example.com',
          full_name: 'Test User',
        },
      };

      server.use(
        http.post(`${API_URL}/api/auth/login`, () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await auth.login('test@example.com', 'password123');

      expect(result).toEqual(mockResponse);
      expect(result.user.email).toBe('test@example.com');
    });

    it('handles invalid credentials', async () => {
      server.use(
        http.post(`${API_URL}/api/auth/login`, () => {
          return HttpResponse.json({ detail: 'Invalid credentials' }, { status: 401 });
        })
      );

      await expect(auth.login('wrong@example.com', 'wrongpassword')).rejects.toThrow();
    });

    it('handles account locked error', async () => {
      server.use(
        http.post(`${API_URL}/api/auth/login`, () => {
          return HttpResponse.json(
            { detail: 'Account locked due to too many failed attempts' },
            { status: 403 }
          );
        })
      );

      await expect(auth.login('locked@example.com', 'password123')).rejects.toThrow();
    });

    it('handles network errors', async () => {
      server.use(
        http.post(`${API_URL}/api/auth/login`, () => {
          return HttpResponse.error();
        })
      );

      await expect(auth.login('test@example.com', 'password123')).rejects.toThrow();
    });
  });

  describe('googleAuth', () => {
    it('authenticates with Google successfully', async () => {
      const mockResponse = {
        user: {
          id: 1,
          email: 'google@example.com',
          full_name: 'Google User',
          provider: 'google',
        },
      };

      server.use(
        http.post(`${API_URL}/api/auth/google`, () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await auth.googleAuth('mock-google-access-token');

      expect(result).toEqual(mockResponse);
      expect(result.user.provider).toBe('google');
    });

    it('handles invalid Google token', async () => {
      server.use(
        http.post(`${API_URL}/api/auth/google`, () => {
          return HttpResponse.json({ detail: 'Invalid Google access token' }, { status: 401 });
        })
      );

      await expect(auth.googleAuth('invalid-token')).rejects.toThrow();
    });

    it('handles expired Google token', async () => {
      server.use(
        http.post(`${API_URL}/api/auth/google`, () => {
          return HttpResponse.json({ detail: 'Google token expired' }, { status: 401 });
        })
      );

      await expect(auth.googleAuth('expired-token')).rejects.toThrow();
    });

    it('handles Google API errors', async () => {
      server.use(
        http.post(`${API_URL}/api/auth/google`, () => {
          return HttpResponse.json({ detail: 'Failed to verify Google token' }, { status: 500 });
        })
      );

      await expect(auth.googleAuth('problematic-token')).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('logs out user successfully', async () => {
      server.use(
        http.post(`${API_URL}/api/auth/logout`, () => {
          return HttpResponse.json({ message: 'Logged out successfully' });
        })
      );

      await expect(auth.logout()).resolves.not.toThrow();
    });

    it('handles logout when already logged out', async () => {
      server.use(
        http.post(`${API_URL}/api/auth/logout`, () => {
          return HttpResponse.json({ detail: 'No active session' }, { status: 401 });
        })
      );

      // Logout should succeed even if no session exists
      await expect(auth.logout()).rejects.toThrow();
    });

    it('handles server errors during logout', async () => {
      server.use(
        http.post(`${API_URL}/api/auth/logout`, () => {
          return HttpResponse.json({ detail: 'Internal server error' }, { status: 500 });
        })
      );

      await expect(auth.logout()).rejects.toThrow();
    });
  });

  describe('me', () => {
    it('fetches current user successfully', async () => {
      const mockUser = {
        user: {
          id: 1,
          email: 'current@example.com',
          full_name: 'Current User',
          username: 'currentuser',
        },
      };

      server.use(
        http.get(`${API_URL}/api/auth/me`, () => {
          return HttpResponse.json(mockUser);
        })
      );

      const result = await auth.me();

      expect(result).toEqual(mockUser);
      expect(result.user.email).toBe('current@example.com');
    });

    it('handles unauthenticated request', async () => {
      server.use(
        http.get(`${API_URL}/api/auth/me`, () => {
          return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 });
        })
      );

      await expect(auth.me()).rejects.toThrow();
    });

    it('handles expired session', async () => {
      server.use(
        http.get(`${API_URL}/api/auth/me`, () => {
          return HttpResponse.json({ detail: 'Session expired' }, { status: 401 });
        })
      );

      await expect(auth.me()).rejects.toThrow();
    });

    it('handles server errors', async () => {
      server.use(
        http.get(`${API_URL}/api/auth/me`, () => {
          return HttpResponse.error();
        })
      );

      await expect(auth.me()).rejects.toThrow();
    });
  });

  describe('authToken', () => {
    it('returns token from storage', () => {
      const mockToken = 'mock-jwt-token-12345';
      vi.mocked(apiFetch.getToken).mockReturnValue(mockToken);

      const result = auth.authToken();

      expect(result).toBe(mockToken);
      expect(apiFetch.getToken).toHaveBeenCalled();
    });

    it('returns null when no token exists', () => {
      vi.mocked(apiFetch.getToken).mockReturnValue(null);

      const result = auth.authToken();

      expect(result).toBeNull();
      expect(apiFetch.getToken).toHaveBeenCalled();
    });

    it('returns undefined when token is undefined', () => {
      vi.mocked(apiFetch.getToken).mockReturnValue(undefined);

      const result = auth.authToken();

      expect(result).toBeUndefined();
      expect(apiFetch.getToken).toHaveBeenCalled();
    });
  });

  describe('Integration: Full Auth Flow', () => {
    it('completes full authentication flow', async () => {
      // 1. Register
      const registerResponse = {
        user: {
          id: 1,
          email: 'flow@example.com',
          full_name: 'Flow User',
        },
      };

      server.use(
        http.post(`${API_URL}/api/auth/register`, () => {
          return HttpResponse.json(registerResponse);
        })
      );

      const registered = await auth.register('flow@example.com', 'password123', 'Flow User');
      expect(registered.user.email).toBe('flow@example.com');

      // 2. Login
      server.use(
        http.post(`${API_URL}/api/auth/login`, () => {
          return HttpResponse.json(registerResponse);
        })
      );

      const loggedIn = await auth.login('flow@example.com', 'password123');
      expect(loggedIn.user.email).toBe('flow@example.com');

      // 3. Fetch user
      server.use(
        http.get(`${API_URL}/api/auth/me`, () => {
          return HttpResponse.json(registerResponse);
        })
      );

      const user = await auth.me();
      expect(user.user.email).toBe('flow@example.com');

      // 4. Logout
      server.use(
        http.post(`${API_URL}/api/auth/logout`, () => {
          return HttpResponse.json({ message: 'Logged out' });
        })
      );

      await expect(auth.logout()).resolves.not.toThrow();
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('handles malformed JSON responses', async () => {
      server.use(
        http.post(`${API_URL}/api/auth/login`, () => {
          return new HttpResponse('Invalid JSON{', {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          });
        })
      );

      await expect(auth.login('test@example.com', 'password')).rejects.toThrow();
    });

    it('handles timeout errors', async () => {
      server.use(
        http.post(`${API_URL}/api/auth/login`, async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.error();
        })
      );

      await expect(auth.login('test@example.com', 'password')).rejects.toThrow();
    });

    it('handles empty responses', async () => {
      server.use(
        http.get(`${API_URL}/api/auth/me`, () => {
          return new HttpResponse(null, { status: 200 });
        })
      );

      await expect(auth.me()).rejects.toThrow();
    });
  });
});
