/**
 * Mock user data for authentication and profile testing
 */
export const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

/**
 * Mock authentication token
 */
export const mockAuthToken = 'mock-jwt-token-12345';

/**
 * Mock user preferences
 */
export const mockUserPreferences = {
  theme: 'dark',
  defaultTimeframe: '1h',
  favoriteSymbols: ['BTC', 'ETH', 'SOL'],
  notifications: {
    email: true,
    push: false,
    priceAlerts: true,
  },
};

/**
 * Mock login credentials
 */
export const mockCredentials = {
  username: 'testuser',
  password: 'SecureP@ssw0rd123',
};

/**
 * Mock user session
 */
export const mockSession = {
  user: mockUser,
  token: mockAuthToken,
  expiresAt: '2024-12-31T23:59:59Z',
};
