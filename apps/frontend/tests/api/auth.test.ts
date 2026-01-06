import * as apiFetchModule from '@/lib/api/apiFetch';
import { authToken, googleAuth, login, logout, me, register } from '@/lib/api/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock apiFetch module
vi.mock('@/lib/api/apiFetch', () => ({
  apiFetch: vi.fn(),
  getToken: vi.fn(),
}));

const mockApiFetch = apiFetchModule.apiFetch as ReturnType<typeof vi.fn>;
const mockGetToken = apiFetchModule.getToken as ReturnType<typeof vi.fn>;

describe('auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should call apiFetch with correct parameters', async () => {
      const mockResponse = { user: { id: '1', email: 'test@example.com' } };
      mockApiFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await register('test@example.com', 'password123', 'Test User');

      expect(mockApiFetch).toHaveBeenCalledWith('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          full_name: 'Test User',
          username: undefined,
        }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should include username when provided', async () => {
      const mockResponse = { user: { id: '1', email: 'test@example.com' } };
      mockApiFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      await register('test@example.com', 'password123', 'Test User', 'testuser');

      expect(mockApiFetch).toHaveBeenCalledWith('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          full_name: 'Test User',
          username: 'testuser',
        }),
      });
    });

    it('should propagate errors from apiFetch', async () => {
      mockApiFetch.mockRejectedValue(new Error('Network error'));

      await expect(register('test@example.com', 'password', 'Test')).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('login', () => {
    it('should call apiFetch with correct parameters', async () => {
      const mockResponse = { user: { id: '1', email: 'test@example.com' } };
      mockApiFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await login('test@example.com', 'password123');

      expect(mockApiFetch).toHaveBeenCalledWith('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should propagate errors from apiFetch', async () => {
      mockApiFetch.mockRejectedValue(new Error('Invalid credentials'));

      await expect(login('test@example.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('googleAuth', () => {
    it('should call apiFetch with access token', async () => {
      const mockResponse = { user: { id: '1', email: 'test@gmail.com' } };
      mockApiFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await googleAuth('google-access-token-123');

      expect(mockApiFetch).toHaveBeenCalledWith('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ access_token: 'google-access-token-123' }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should propagate errors from apiFetch', async () => {
      mockApiFetch.mockRejectedValue(new Error('Google auth failed'));

      await expect(googleAuth('invalid-token')).rejects.toThrow('Google auth failed');
    });
  });

  describe('logout', () => {
    it('should call apiFetch with POST method', async () => {
      mockApiFetch.mockResolvedValue({});

      await logout();

      expect(mockApiFetch).toHaveBeenCalledWith('/auth/logout', { method: 'POST' });
    });

    it('should complete without returning data', async () => {
      mockApiFetch.mockResolvedValue({});

      const result = await logout();

      expect(result).toBeUndefined();
    });

    it('should propagate errors from apiFetch', async () => {
      mockApiFetch.mockRejectedValue(new Error('Logout failed'));

      await expect(logout()).rejects.toThrow('Logout failed');
    });
  });

  describe('me', () => {
    it('should call apiFetch with GET method', async () => {
      const mockProfile = { handle: 'testuser', bio: 'Hello world' };
      mockApiFetch.mockResolvedValue({
        json: () => Promise.resolve(mockProfile),
      });

      const result = await me();

      expect(mockApiFetch).toHaveBeenCalledWith('/auth/me', { method: 'GET' });
      expect(result).toEqual(mockProfile);
    });

    it('should return null/undefined for unauthenticated users', async () => {
      mockApiFetch.mockResolvedValue({
        json: () => Promise.resolve(null),
      });

      const result = await me();

      expect(result).toBeNull();
    });

    it('should propagate errors from apiFetch', async () => {
      mockApiFetch.mockRejectedValue(new Error('Unauthorized'));

      await expect(me()).rejects.toThrow('Unauthorized');
    });
  });

  describe('authToken', () => {
    it('should return token from getToken', () => {
      mockGetToken.mockReturnValue('mock-auth-token');

      const result = authToken();

      expect(mockGetToken).toHaveBeenCalled();
      expect(result).toBe('mock-auth-token');
    });

    it('should return null when no token exists', () => {
      mockGetToken.mockReturnValue(null);

      const result = authToken();

      expect(result).toBeNull();
    });

    it('should return undefined when getToken returns undefined', () => {
      mockGetToken.mockReturnValue(undefined);

      const result = authToken();

      expect(result).toBeUndefined();
    });
  });
});
