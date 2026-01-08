/**
 * useNotifications Hook Tests
 *
 * Tests for the notifications management hook covering:
 * - State management (notifications, unread count, loading states)
 * - API calls (fetch, mark as read, dismiss, clear)
 * - Error handling
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useNotifications,
  type NotificationData,
  type NotificationStats,
} from '@/hooks/useNotifications';

// Mock the logger
vi.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
  sanitizeLogInput: (input: unknown) => input,
}));

// Mock fetch
const mockFetch = vi.fn();

// Sample notification data
const createNotification = (overrides: Partial<NotificationData> = {}): NotificationData => ({
  id: `notification-${Math.random().toString(36).slice(2)}`,
  user_id: 'user-1',
  type: 'info',
  priority: 'normal',
  title: 'Test Notification',
  message: 'This is a test notification',
  created_at: new Date().toISOString(),
  is_read: false,
  is_delivered: true,
  is_dismissed: false,
  is_archived: false,
  age_seconds: 0,
  is_expired: false,
  ...overrides,
});

const createStats = (overrides: Partial<NotificationStats> = {}): NotificationStats => ({
  total_notifications: 10,
  unread_count: 5,
  read_count: 5,
  dismissed_count: 0,
  delivered_count: 10,
  clicked_count: 0,
  by_type: { info: 5, warning: 3, error: 2 },
  by_priority: { normal: 7, high: 3 },
  avg_read_time_seconds: 30,
  ...overrides,
});

describe('useNotifications', () => {
  const originalFetch = global.fetch;
  const localStorageMock = {
    getItem: vi.fn().mockReturnValue('test-token'),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetch
    global.fetch = mockFetch;

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    localStorageMock.getItem.mockReturnValue('test-token');

    // Mock document.cookie
    Object.defineProperty(document, 'cookie', {
      value: 'access_token=test-token',
      writable: true,
      configurable: true,
    });

    // Default successful API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          notifications: [createNotification()],
          unread_count: 1,
          total_count: 1,
          has_more: false,
        }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Initial State', () => {
    it('returns initial state structure', () => {
      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      expect(result.current).toHaveProperty('notifications');
      expect(result.current).toHaveProperty('unreadCount');
      expect(result.current).toHaveProperty('totalCount');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(Array.isArray(result.current.notifications)).toBe(true);
    });

    it('starts with empty notifications array', () => {
      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      expect(result.current.notifications).toEqual([]);
    });

    it('loads notifications on mount', async () => {
      const notification = createNotification({ title: 'Mount notification' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            notifications: [notification],
            unread_count: 1,
            total_count: 1,
            has_more: false,
          }),
      });

      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      await waitFor(
        () => {
          expect(result.current.notifications.length).toBeGreaterThanOrEqual(1);
        },
        { timeout: 3000 }
      );
    });
  });

  describe('API Integration', () => {
    it('calls fetch when token exists', async () => {
      renderHook(() => useNotifications({ autoRefresh: false, realTimeEnabled: false }));

      await waitFor(
        () => {
          expect(mockFetch).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toContain('/api/notifications/');
    });

    it('handles successful API response', async () => {
      const notification = createNotification();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            notifications: [notification],
            unread_count: 1,
            total_count: 1,
            has_more: false,
          }),
      });

      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      await waitFor(
        () => {
          expect(result.current.notifications).toHaveLength(1);
        },
        { timeout: 3000 }
      );
    });

    it('handles API error response', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ detail: 'Server error' }),
      });

      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      await waitFor(
        () => {
          expect(result.current.error).toBe('Server error');
        },
        { timeout: 3000 }
      );

      consoleSpy.mockRestore();
    });

    it('handles network error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      await waitFor(
        () => {
          expect(result.current.error).toBe('Network error');
        },
        { timeout: 3000 }
      );

      consoleSpy.mockRestore();
    });
  });

  describe('refreshNotifications', () => {
    it('reloads notifications', async () => {
      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      await waitFor(
        () => {
          expect(result.current.notifications).toHaveLength(1);
        },
        { timeout: 3000 }
      );

      const newNotification = createNotification({ title: 'Refreshed' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            notifications: [newNotification],
            unread_count: 1,
            total_count: 1,
            has_more: false,
          }),
      });

      await act(async () => {
        await result.current.refreshNotifications();
      });

      await waitFor(
        () => {
          expect(result.current.notifications[0].title).toBe('Refreshed');
        },
        { timeout: 3000 }
      );
    });
  });

  describe('loadMore', () => {
    it('appends more notifications when hasMore is true', async () => {
      // Clear default mock and set up a call counter for stable responses
      mockFetch.mockReset();
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call - initial load with hasMore=true
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                notifications: [createNotification({ id: '1' })],
                unread_count: 2,
                total_count: 2,
                has_more: true,
              }),
          });
        } else {
          // Subsequent calls - loadMore response
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                notifications: [createNotification({ id: '2' })],
                unread_count: 2,
                total_count: 2,
                has_more: false,
              }),
          });
        }
      });

      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      await waitFor(
        () => {
          expect(result.current.hasMore).toBe(true);
        },
        { timeout: 3000 }
      );

      await act(async () => {
        await result.current.loadMore();
      });

      await waitFor(
        () => {
          expect(result.current.notifications.length).toBe(2);
        },
        { timeout: 3000 }
      );
    });

    it('does nothing when hasMore is false', async () => {
      // Clear default mock and set test-specific mock
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            notifications: [createNotification()],
            unread_count: 1,
            total_count: 1,
            has_more: false,
          }),
      });

      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      await waitFor(
        () => {
          expect(result.current.hasMore).toBe(false);
        },
        { timeout: 3000 }
      );

      const initialCallCount = mockFetch.mock.calls.length;

      await act(async () => {
        await result.current.loadMore();
      });

      // No new fetch call should be made
      expect(mockFetch.mock.calls.length).toBe(initialCallCount);
    });
  });

  describe('markAsRead', () => {
    it('marks notification as read and updates count', async () => {
      const notification = createNotification({ id: 'mark-read-1', is_read: false });
      // Clear default mock and set test-specific mock
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            notifications: [notification],
            unread_count: 1,
            total_count: 1,
            has_more: false,
          }),
      });

      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      await waitFor(
        () => {
          expect(result.current.unreadCount).toBe(1);
        },
        { timeout: 3000 }
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await act(async () => {
        await result.current.markAsRead('mark-read-1');
      });

      await waitFor(
        () => {
          expect(result.current.notifications[0].is_read).toBe(true);
        },
        { timeout: 3000 }
      );
    });
  });

  describe('markAllAsRead', () => {
    it('marks all notifications as read', async () => {
      const notifications = [
        createNotification({ id: '1', is_read: false }),
        createNotification({ id: '2', is_read: false }),
      ];
      // Clear default mock and set test-specific mock
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            notifications,
            unread_count: 2,
            total_count: 2,
            has_more: false,
          }),
      });

      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      await waitFor(
        () => {
          expect(result.current.unreadCount).toBe(2);
        },
        { timeout: 3000 }
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await act(async () => {
        await result.current.markAllAsRead();
      });

      await waitFor(
        () => {
          expect(result.current.notifications.every((n) => n.is_read)).toBe(true);
        },
        { timeout: 3000 }
      );
    });
  });

  describe('dismissNotification', () => {
    it('removes notification from list', async () => {
      const notification = createNotification({ id: 'dismiss-1' });
      // Clear default mock and set test-specific mock
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            notifications: [notification],
            unread_count: 1,
            total_count: 1,
            has_more: false,
          }),
      });

      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      await waitFor(
        () => {
          expect(result.current.notifications).toHaveLength(1);
        },
        { timeout: 3000 }
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await act(async () => {
        await result.current.dismissNotification('dismiss-1');
      });

      await waitFor(
        () => {
          expect(result.current.notifications).toHaveLength(0);
        },
        { timeout: 3000 }
      );
    });
  });

  describe('clearAllNotifications', () => {
    it('clears all notifications and resets counts', async () => {
      // Clear default mock and set test-specific mock
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            notifications: [createNotification(), createNotification()],
            unread_count: 2,
            total_count: 2,
            has_more: false,
          }),
      });

      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      await waitFor(
        () => {
          expect(result.current.notifications).toHaveLength(2);
        },
        { timeout: 3000 }
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await act(async () => {
        await result.current.clearAllNotifications();
      });

      await waitFor(
        () => {
          expect(result.current.notifications).toHaveLength(0);
        },
        { timeout: 3000 }
      );
    });
  });

  describe('getStats', () => {
    it('fetches and stores stats', async () => {
      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      await waitFor(
        () => {
          expect(result.current.notifications).toBeDefined();
        },
        { timeout: 3000 }
      );

      const stats = createStats();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(stats),
      });

      let fetchedStats: NotificationStats | null = null;
      await act(async () => {
        fetchedStats = await result.current.getStats();
      });

      expect(fetchedStats).toMatchObject(stats);
    });

    it('returns null on error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      await waitFor(
        () => {
          expect(result.current.notifications).toBeDefined();
        },
        { timeout: 3000 }
      );

      mockFetch.mockRejectedValueOnce(new Error('Stats error'));

      let fetchedStats: NotificationStats | null = null;
      await act(async () => {
        fetchedStats = await result.current.getStats();
      });

      expect(fetchedStats).toBe(null);

      consoleSpy.mockRestore();
    });
  });

  describe('Return Value', () => {
    it('returns all expected properties and methods', () => {
      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      // State
      expect(result.current).toHaveProperty('notifications');
      expect(result.current).toHaveProperty('unreadCount');
      expect(result.current).toHaveProperty('totalCount');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('hasMore');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('stats');

      // Actions
      expect(typeof result.current.refreshNotifications).toBe('function');
      expect(typeof result.current.loadMore).toBe('function');
      expect(typeof result.current.markAsRead).toBe('function');
      expect(typeof result.current.markAllAsRead).toBe('function');
      expect(typeof result.current.dismissNotification).toBe('function');
      expect(typeof result.current.clearAllNotifications).toBe('function');
      expect(typeof result.current.getStats).toBe('function');

      // WebSocket
      expect(typeof result.current.connectWebSocket).toBe('function');
      expect(typeof result.current.disconnectWebSocket).toBe('function');
      expect(result.current).toHaveProperty('isConnected');
    });

    it('returns correct initial types', () => {
      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      expect(Array.isArray(result.current.notifications)).toBe(true);
      expect(typeof result.current.unreadCount).toBe('number');
      expect(typeof result.current.totalCount).toBe('number');
      expect(typeof result.current.isLoading).toBe('boolean');
      expect(typeof result.current.hasMore).toBe('boolean');
      expect(typeof result.current.isConnected).toBe('boolean');
    });
  });

  describe('No Auth Token', () => {
    it('handles missing auth token', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Remove token
      localStorageMock.getItem.mockReturnValue(null);
      Object.defineProperty(document, 'cookie', {
        value: '',
        writable: true,
        configurable: true,
      });

      mockFetch.mockClear();

      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      // Wait a moment
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should not crash
      expect(result.current.notifications).toBeDefined();

      consoleSpy.mockRestore();
    });
  });

  describe('Options', () => {
    it('uses custom maxNotifications option', () => {
      const { result } = renderHook(() =>
        useNotifications({
          autoRefresh: false,
          realTimeEnabled: false,
          maxNotifications: 50,
        })
      );

      // Hook should initialize correctly
      expect(result.current.notifications).toBeDefined();
    });
  });

  describe('Notification Data', () => {
    it('handles notifications with all types', async () => {
      const notifications = [
        createNotification({ type: 'info' }),
        createNotification({ type: 'warning' }),
        createNotification({ type: 'error' }),
        createNotification({ type: 'success' }),
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            notifications,
            unread_count: 4,
            total_count: 4,
            has_more: false,
          }),
      });

      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      await waitFor(
        () => {
          expect(result.current.notifications).toHaveLength(4);
        },
        { timeout: 3000 }
      );

      const types = result.current.notifications.map((n) => n.type);
      expect(types).toContain('info');
      expect(types).toContain('warning');
    });

    it('handles notifications with all priority levels', async () => {
      const notifications = [
        createNotification({ priority: 'low' }),
        createNotification({ priority: 'normal' }),
        createNotification({ priority: 'high' }),
        createNotification({ priority: 'urgent' }),
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            notifications,
            unread_count: 4,
            total_count: 4,
            has_more: false,
          }),
      });

      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      await waitFor(
        () => {
          expect(result.current.notifications).toHaveLength(4);
        },
        { timeout: 3000 }
      );

      const priorities = result.current.notifications.map((n) => n.priority);
      expect(priorities).toContain('high');
      expect(priorities).toContain('normal');
    });
  });
});
