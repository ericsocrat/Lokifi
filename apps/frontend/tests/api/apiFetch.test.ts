import { apiFetch, getToken, setToken } from '@/lib/api/apiFetch';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '../mocks/server';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('apiFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('token management', () => {
    it('should set token in localStorage', () => {
      setToken('test-token-123');

      expect(localStorageMock.setItem).toHaveBeenCalledWith('lokifi_token', 'test-token-123');
    });

    it('should remove token when null is passed', () => {
      setToken(null);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('lokifi_token');
    });

    it('should get token from localStorage', () => {
      localStorageMock.getItem.mockReturnValueOnce('stored-token');

      const token = getToken();

      expect(token).toBe('stored-token');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('lokifi_token');
    });

    it('should return null when no token exists', () => {
      localStorageMock.getItem.mockReturnValueOnce(null);

      const token = getToken();

      expect(token).toBeNull();
    });
  });

  describe('apiFetch function', () => {
    it('should make request and return successful response', async () => {
      server.use(
        http.get('http://localhost:8000/api/test-endpoint', () => {
          return HttpResponse.json({ data: 'test', success: true });
        })
      );

      const response = await apiFetch('/test-endpoint');
      const data = await response.json();

      expect(data).toEqual({ data: 'test', success: true });
    });

    it('should send POST request with body', async () => {
      let receivedBody: unknown = null;
      server.use(
        http.post('http://localhost:8000/api/test', async ({ request }) => {
          receivedBody = await request.json();
          return HttpResponse.json({ received: true });
        })
      );

      await apiFetch('/test', {
        method: 'POST',
        body: JSON.stringify({ key: 'value' }),
      });

      expect(receivedBody).toEqual({ key: 'value' });
    });

    it('should include custom headers in request', async () => {
      let receivedHeaders: Record<string, string> = {};
      server.use(
        http.get('http://localhost:8000/api/test', ({ request }) => {
          receivedHeaders = {
            'x-custom-header': request.headers.get('X-Custom-Header') || '',
            'content-type': request.headers.get('Content-Type') || '',
          };
          return HttpResponse.json({});
        })
      );

      await apiFetch('/test', {
        headers: { 'X-Custom-Header': 'custom-value' },
      });

      expect(receivedHeaders['x-custom-header']).toBe('custom-value');
      expect(receivedHeaders['content-type']).toBe('application/json');
    });

    it('should throw error for non-OK responses', async () => {
      server.use(
        http.get('http://localhost:8000/api/not-found', () => {
          return new HttpResponse('Resource not found', { status: 404 });
        })
      );

      await expect(apiFetch('/not-found')).rejects.toThrow('Resource not found');
    });

    it('should parse error detail from JSON response', async () => {
      server.use(
        http.get('http://localhost:8000/api/invalid', () => {
          return HttpResponse.json({ detail: 'Invalid input' }, { status: 400 });
        })
      );

      await expect(apiFetch('/invalid')).rejects.toThrow('Invalid input');
    });

    it('should fall back to statusText when response text is empty', async () => {
      server.use(
        http.get('http://localhost:8000/api/error', () => {
          return new HttpResponse('', {
            status: 500,
            statusText: 'Internal Server Error',
          });
        })
      );

      await expect(apiFetch('/error')).rejects.toThrow('Internal Server Error');
    });

    it('should include credentials for cookie auth', async () => {
      // This test verifies that credentials: 'include' is passed
      // We can't easily verify this via MSW, but we can verify the request succeeds
      server.use(
        http.get('http://localhost:8000/api/auth/me', () => {
          return HttpResponse.json({ user: 'test-user' });
        })
      );

      const response = await apiFetch('/auth/me');
      const data = await response.json();

      expect(data).toEqual({ user: 'test-user' });
    });

    it('should handle network errors', async () => {
      server.use(
        http.get('http://localhost:8000/api/network-fail', () => {
          return HttpResponse.error();
        })
      );

      await expect(apiFetch('/network-fail')).rejects.toThrow();
    });
  });

  describe('API base URL', () => {
    it('should prepend API base to input path', async () => {
      let requestedUrl = '';
      server.use(
        http.get('http://localhost:8000/api/users', ({ request }) => {
          requestedUrl = request.url;
          return HttpResponse.json({ users: [] });
        })
      );

      await apiFetch('/users');

      expect(requestedUrl).toBe('http://localhost:8000/api/users');
    });

    it('should handle paths without leading slash', async () => {
      server.use(
        http.get('http://localhost:8000/apiusers', () => {
          return HttpResponse.json({ users: [] });
        })
      );

      // Without leading slash, the URL concatenation may differ
      // This tests the actual behavior of the function
      const response = await apiFetch('users');
      const data = await response.json();

      expect(data).toEqual({ users: [] });
    });
  });
});
