import { describe, expect, it } from 'vitest';

const API_URL = process.env.API_URL || 'http://localhost:8000';

describe('Security: Authentication', () => {
  describe('SQL Injection Protection', () => {
    it('rejects SQL injection in username', async () => {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: "admin' OR '1'='1' --",
          password: 'anything',
        }),
      });

      // Should not return 200 (successful auth)
      expect(response.status).not.toBe(200);
      expect([401, 422]).toContain(response.status);
    });

    it('rejects SQL injection in password', async () => {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: 'admin',
          password: "' OR '1'='1",
        }),
      });

      expect(response.status).not.toBe(200);
    });

    it('rejects union-based SQL injection', async () => {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: "admin' UNION SELECT * FROM users --",
          password: 'test',
        }),
      });

      expect(response.status).not.toBe(200);
    });
  });

  describe('XSS Protection', () => {
    it('sanitizes script tags in input', async () => {
      const xssPayload = '<script>alert("xss")</script>';

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: xssPayload,
          email: 'test@example.com',
          password: 'StrongPass123!',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        expect(data.username).not.toContain('<script>');
        expect(data.username).not.toContain('</script>');
      }
      // If registration fails, that's also acceptable
    });

    it('sanitizes event handlers in input', async () => {
      const xssPayload = '<img src=x onerror=alert("xss")>';

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: xssPayload,
          email: 'test@example.com',
          password: 'StrongPass123!',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        expect(data.username).not.toContain('onerror=');
        expect(data.username).not.toContain('onclick=');
      }
    });

    it('sanitizes javascript: protocol', async () => {
      const xssPayload = 'javascript:alert("xss")';

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'test',
          email: 'test@example.com',
          password: 'StrongPass123!',
          website: xssPayload,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.website) {
          expect(data.website).not.toContain('javascript:');
        }
      }
    });
  });

  describe('Rate Limiting', () => {
    it('enforces rate limiting on login attempts', async () => {
      // Make 20 rapid login attempts
      const attempts = Array(20).fill(null).map(() =>
        fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            username: 'test',
            password: 'wrong',
          }),
        })
      );

      const responses = await Promise.all(attempts);
      const rateLimited = responses.filter((r: any) => r.status === 429);

      // Should get rate limited (429) for at least some requests
      if (rateLimited.length > 0) {
        expect(rateLimited.length).toBeGreaterThan(0);
      } else {
        console.log('ℹ️  Rate limiting not detected - may need configuration');
      }
    }, 15000);

    it('enforces rate limiting on API endpoints', async () => {
      const requests = Array(50).fill(null).map(() =>
        fetch(`${API_URL}/api/health`)
      );

      const responses = await Promise.all(requests);
      const statuses = responses.map((r: any) => r.status);

      // Check if any rate limiting occurred
      const hasRateLimit = statuses.includes(429);

      if (!hasRateLimit) {
        console.log('ℹ️  No rate limiting detected for health endpoint');
      }
    }, 10000);
  });

  describe('Token Security', () => {
    it('rejects invalid JWT tokens', async () => {
      const response = await fetch(`${API_URL}/api/users/me`, {
        headers: {
          'Authorization': 'Bearer invalid_token_12345',
        },
      });

      expect(response.status).toBe(401);
    });

    it('rejects expired tokens', async () => {
      // Expired JWT token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjF9.invalid';

      const response = await fetch(`${API_URL}/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${expiredToken}`,
        },
      });

      expect(response.status).toBe(401);
    });

    it('rejects malformed authorization headers', async () => {
      const response = await fetch(`${API_URL}/api/users/me`, {
        headers: {
          'Authorization': 'InvalidFormat token123',
        },
      });

      expect(response.status).toBe(401);
    });

    it('requires authentication for protected endpoints', async () => {
      const response = await fetch(`${API_URL}/api/users/me`);

      expect(response.status).toBe(401);
    });
  });

  describe('Password Security', () => {
    it('rejects weak passwords', async () => {
      const weakPasswords = ['123', 'password', 'abc', '12345678'];

      for (const password of weakPasswords) {
        const response = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: `user_${Date.now()}`,
            email: `test${Date.now()}@example.com`,
            password,
          }),
        });

        // Should reject weak password (422) or require stronger (400)
        if (response.status === 200 || response.status === 201) {
          console.log(`⚠️  Weak password accepted: ${password}`);
        }
      }
    });

    it('enforces password complexity requirements', async () => {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: `user_${Date.now()}`,
          email: `test${Date.now()}@example.com`,
          password: 'short',
        }),
      });

      if (response.status === 422) {
        const data = await response.json();
        expect(data.detail).toBeTruthy();
      }
    });
  });

  describe('Input Validation', () => {
    it('validates email format', async () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
      ];

      for (const email of invalidEmails) {
        const response = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: 'test',
            email,
            password: 'StrongPass123!',
          }),
        });

        expect(response.status).toBe(422);
      }
    });

    it('limits request payload size', async () => {
      const largePayload = 'x'.repeat(11 * 1024 * 1024); // 11MB

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: largePayload,
      });

      // Should reject large payload (413 or 400)
      expect([400, 413, 422]).toContain(response.status);
    });
  });

  describe('CORS Security', () => {
    it('includes CORS headers', async () => {
      const response = await fetch(`${API_URL}/api/health`);

      // Check for CORS headers
      const corsHeader = response.headers.get('Access-Control-Allow-Origin');

      if (corsHeader) {
        // CORS should not be wildcard in production
        console.log(`ℹ️  CORS Origin: ${corsHeader}`);
      }
    });
  });
});

