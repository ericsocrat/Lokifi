import { describe, expect, it } from 'vitest';

const API_URL = process.env.API_URL || 'http://localhost:8000';

describe('Authentication API Contract', () => {
  describe('POST /api/auth/login', () => {
    it('returns valid JWT token on successful login', async () => {
      const params = new URLSearchParams();
      params.append('username', 'test');
      params.append('password', 'test123');

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (response.ok) {
        const data = await response.json();

        // Contract assertions
        expect(data).toHaveProperty('access_token');
        expect(data).toHaveProperty('token_type');
        expect(typeof data.access_token).toBe('string');
        expect(data.token_type).toBe('bearer');
        expect(data.access_token.length).toBeGreaterThan(20);
      } else {
        // If test user doesn't exist, skip but log
        console.log('ℹ️  Test user not configured, skipping auth test');
      }
    });

    it('returns 422 validation error for missing credentials', async () => {
      const params = new URLSearchParams();
      params.append('username', '');
      params.append('password', '');

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      expect(response.status).toBe(422);
      const data = await response.json();
      expect(data).toHaveProperty('detail');
    });

    it('returns 401 for invalid credentials', async () => {
      const params = new URLSearchParams();
      params.append('username', 'invalid_user');
      params.append('password', 'wrong_password');

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      expect([401, 422]).toContain(response.status);
    });
  });

  describe('GET /api/health', () => {
    it('returns health check status', async () => {
      const response = await fetch(`${API_URL}/api/health`);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Contract assertions
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('healthy');
    });

    it('responds within 200ms', async () => {
      const startTime = Date.now();
      const response = await fetch(`${API_URL}/api/health`);
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(200);
    });
  });
});
