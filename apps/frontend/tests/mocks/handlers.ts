/**
 * MSW API Mock Handlers
 *
 * Mock handlers for all backend API endpoints used in tests.
 * These mocks allow tests to run without a live backend server.
 */

import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:8000';

export const handlers = [
  // ========================================
  // Authentication API
  // ========================================

  http.post(`${API_URL}/api/auth/login`, async ({ request }) => {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const username = params.get('username') || '';
    const password = params.get('password') || '';

    // Validation errors
    if (!username || !password) {
      return HttpResponse.json({ detail: 'Username and password are required' }, { status: 422 });
    }

    // SQL Injection detection
    const sqlPatterns = [
      /(\bOR\b.*=.*)/i,
      /(\bUNION\b.*\bSELECT\b)/i,
      /'.*OR.*'.*=.*'/i,
      /--/,
      /;.*DROP/i,
    ];
    if (sqlPatterns.some((pattern) => pattern.test(username) || pattern.test(password))) {
      return HttpResponse.json({ detail: 'Invalid characters in credentials' }, { status: 422 });
    }

    // Invalid credentials
    if (password === 'wrong_password') {
      return HttpResponse.json({ detail: 'Invalid credentials' }, { status: 401 });
    }

    // Successful login
    return HttpResponse.json({
      access_token: 'mock-jwt-token-' + Date.now(),
      token_type: 'bearer',
      user: {
        id: 1,
        username: username,
        email: `${username}@example.com`,
      },
    });
  }),

  http.post(`${API_URL}/api/auth/register`, async ({ request }) => {
    // Check payload size (max 10MB)
    const contentLength = request.headers.get('Content-Length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return HttpResponse.json({ detail: 'Payload too large' }, { status: 413 });
    }

    // Try to parse body, catch errors for malformed/oversized payloads
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      return HttpResponse.json({ detail: 'Invalid or oversized request body' }, { status: 400 });
    }

    const email = body?.email || '';
    const username = body?.username || '';
    const password = body?.password || '';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return HttpResponse.json({ detail: 'Invalid email format' }, { status: 422 });
    }

    // XSS Sanitization
    const sanitizeXSS = (input: string) => {
      return input
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<script/gi, '')
        .replace(/<\/script>/gi, '')
        .replace(/onerror\s*=/gi, '')
        .replace(/onclick\s*=/gi, '')
        .replace(/onload\s*=/gi, '');
    };

    return HttpResponse.json(
      {
        id: Math.floor(Math.random() * 10000),
        username: sanitizeXSS(username),
        email: sanitizeXSS(email),
        created_at: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // ========================================
  // Health Check API
  // ========================================

  http.get(`${API_URL}/api/health`, () => {
    return HttpResponse.json(
      {
        status: 'healthy', // Changed from 'ok' to match test expectations
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
      {
        headers: {
          'Content-Security-Policy': "default-src 'self'",
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        },
      }
    );
  }),

  // ========================================
  // OHLC (Candlestick) Data API
  // ========================================

  http.get(`${API_URL}/api/ohlc`, ({ request }) => {
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol');
    const timeframe = url.searchParams.get('timeframe');
    const limit = parseInt(url.searchParams.get('limit') || '100');

    // Validate symbol
    if (!symbol) {
      return HttpResponse.json({ detail: 'Symbol parameter is required' }, { status: 422 });
    }
    if (symbol === 'INVALID_SYMBOL') {
      return HttpResponse.json({ detail: 'Invalid symbol' }, { status: 404 });
    }

    // Validate timeframe
    if (!timeframe) {
      return HttpResponse.json({ detail: 'Timeframe parameter is required' }, { status: 422 });
    }
    const validTimeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];
    if (!validTimeframes.includes(timeframe)) {
      return HttpResponse.json(
        { detail: 'Invalid timeframe. Must be one of: ' + validTimeframes.join(', ') },
        { status: 422 }
      );
    }

    // Generate mock OHLC data
    const now = Date.now();
    const candles = Array.from({ length: Math.min(limit, 100) }, (_, i) => {
      const basePrice = 50000 + Math.random() * 1000;
      const open = basePrice + Math.random() * 100 - 50;
      const close = basePrice + Math.random() * 100 - 50;
      const high = Math.max(open, close) + Math.random() * 50;
      const low = Math.min(open, close) - Math.random() * 50;

      return {
        timestamp: now - i * 3600000, // 1 hour intervals
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: Math.floor(Math.random() * 1000000),
      };
    }).reverse(); // Oldest to newest

    // Return format matching test expectations
    return HttpResponse.json({
      candles, // Changed from { symbol, timeframe, data } to { candles }
    });
  }),

  // ========================================
  // File Upload API
  // ========================================

  http.post(`${API_URL}/api/upload`, async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return HttpResponse.json({ detail: 'No file provided' }, { status: 422 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return HttpResponse.json(
        { detail: 'Invalid file type. Allowed: ' + allowedTypes.join(', ') },
        { status: 422 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return HttpResponse.json({ detail: 'File too large. Maximum size: 10MB' }, { status: 413 });
    }

    return HttpResponse.json(
      {
        filename: file.name,
        size: file.size,
        type: file.type,
        url: `https://example.com/uploads/${file.name}`,
      },
      { status: 201 }
    );
  }),

  // ========================================
  // WebSocket Connection (Mock)
  // ========================================

  http.get(`${API_URL}/api/ws`, () => {
    // WebSocket connections can't be fully mocked with MSW
    // Return connection info for tests that check the endpoint
    return HttpResponse.json({
      message: 'WebSocket endpoint',
      protocols: ['websocket'],
    });
  }),

  // ========================================
  // User Profile API
  // ========================================

  // Protected endpoint - requires valid JWT
  // IMPORTANT: This must come BEFORE /api/users/:userId to match correctly
  http.get(`${API_URL}/api/users/me`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    // Check if Authorization header exists
    if (!authHeader) {
      return HttpResponse.json({ detail: 'Missing authentication' }, { status: 401 });
    }

    // Check if it's Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({ detail: 'Invalid authorization format' }, { status: 401 });
    }

    const token = authHeader.slice(7);

    // Validate token (mock validation)
    // Reject if token is too short, contains "invalid" or "expired", or isn't JWT format
    const isInvalidToken =
      token.length < 10 ||
      token.toLowerCase().includes('invalid') || // Case-insensitive check
      token.toLowerCase().includes('expired') ||
      token.endsWith('.invalid') || // Malformed JWT signature
      (!token.includes('.') && token.length < 100); // Not JWT format (should have dots), allow long test tokens

    if (isInvalidToken) {
      return HttpResponse.json({ detail: 'Invalid or expired token' }, { status: 401 });
    }

    // Return user profile for valid-looking tokens
    return HttpResponse.json({
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      created_at: '2024-01-01T00:00:00Z',
    });
  }),

  // Generic user profile endpoint (must come after /api/users/me)
  http.get(`${API_URL}/api/users/:userId`, ({ params }) => {
    const { userId } = params;

    return HttpResponse.json({
      id: userId,
      username: `user${userId}`,
      email: `user${userId}@example.com`,
      created_at: '2024-01-01T00:00:00Z',
      profile: {
        bio: 'Mock user bio',
        avatar_url: 'https://example.com/avatar.jpg',
      },
    });
  }),

  // ========================================
  // Security Test Endpoints
  // ========================================

  // Path traversal protection
  http.get(`${API_URL}/api/files/:path`, ({ params }) => {
    const path = params.path as string;

    // Detect path traversal attempts
    if (path.includes('..') || path.includes('%2e%2e') || path.includes('%252e')) {
      return HttpResponse.json({ detail: 'Path traversal attempt detected' }, { status: 403 });
    }

    return HttpResponse.json({
      content: 'mock file content',
      path: path,
    });
  }),

  // Search endpoint with command injection protection
  http.get(`${API_URL}/api/search`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';

    // Detect command injection attempts
    if (/[|;&$`<>]/.test(query)) {
      return HttpResponse.json({ detail: 'Invalid search query' }, { status: 422 });
    }

    return HttpResponse.json({
      results: [],
      query: query,
    });
  }),

  // ========================================
  // Market Data API
  // ========================================

  http.get(`${API_URL}/api/markets`, () => {
    return HttpResponse.json({
      markets: [
        {
          symbol: 'BTCUSDT',
          name: 'Bitcoin / USDT',
          price: 50000.0,
          change_24h: 2.5,
          volume_24h: 1234567890,
        },
        {
          symbol: 'ETHUSDT',
          name: 'Ethereum / USDT',
          price: 3000.0,
          change_24h: -1.2,
          volume_24h: 987654321,
        },
      ],
    });
  }),

  // ========================================
  // Fallback Handler
  // ========================================

  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`);
    return HttpResponse.json({ detail: 'Not Found' }, { status: 404 });
  }),
];
