/**
 * Tests for useNotifications Hook
 *
 * Tests cover:
 * - Initial state and loading behavior
 * - Notification fetching (with/without authentication)
 * - CRUD operations (markAsRead, markAllAsRead, dismiss, clearAll)
 * - Load more / pagination
 * - Error handling
 * - Auto-refresh intervals
 * - Statistics fetching
 *
 * NOTE: WebSocket-specific tests are skipped because MSW v2 intercepts WebSocket
 * connections in a way that conflicts with manual WebSocket mocking. The hook's
 * WebSocket connection logic is verified at a basic level.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useNotifications,
  type NotificationData,
  type NotificationStats,
} from '../../src/hooks/useNotifications';
import { server } from '../mocks/server';

// Mock the logger
vi.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock localStorage
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

// Mock document.cookie
let cookieStore = '';
Object.defineProperty(document, 'cookie', {
  get: () => cookieStore,
  set: (value: string) => {
    cookieStore = value;
  },
  configurable: true,
});

// Mock Notification API
const mockNotificationPermission = { value: 'default' as NotificationPermission };
const mockNotificationRequestPermission = vi.fn().mockResolvedValue('granted');
Object.defineProperty(window, 'Notification', {
  value: {
    permission: mockNotificationPermission.value,
    requestPermission: mockNotificationRequestPermission,
  },
  configurable: true,
  writable: true,
});

// Helper to create mock notification data
function createMockNotification(overrides: Partial<NotificationData> = {}): NotificationData {
  return {
    id: `notif-${Math.random().toString(36).substr(2, 9)}`,
    user_id: 'user-123',
    type: 'price_alert',
    priority: 'medium',
    title: 'Test Notification',
    message: 'This is a test notification',
    created_at: new Date().toISOString(),
    is_read: false,
    is_delivered: true,
    is_dismissed: false,
    is_archived: false,
    age_seconds: 60,
    is_expired: false,
    ...overrides,
  };
}

// Helper to create mock stats
function createMockStats(overrides: Partial<NotificationStats> = {}): NotificationStats {
  return {
    total_notifications: 10,
    unread_count: 5,
    read_count: 5,
    dismissed_count: 0,
    delivered_count: 10,
    clicked_count: 2,
    by_type: { price_alert: 6, system: 4 },
    by_priority: { high: 2, medium: 5, low: 3 },
    avg_read_time_seconds: 120,
    ...overrides,
  };
}

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorageMock.clear();
    localStorageStore = {};
    cookieStore = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    server.resetHandlers();
  });

  describe('Initial State', () => {
    it('should return initial state with empty notifications', async () => {
      // No auth token - should handle gracefully
      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.error).toBeNull();
      expect(result.current.hasMore).toBe(true);
      expect(result.current.isConnected).toBe(false);
    });

    it('should provide all required action functions', () => {
      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      expect(typeof result.current.refreshNotifications).toBe('function');
      expect(typeof result.current.loadMore).toBe('function');
      expect(typeof result.current.markAsRead).toBe('function');
      expect(typeof result.current.markAllAsRead).toBe('function');
      expect(typeof result.current.dismissNotification).toBe('function');
      expect(typeof result.current.clearAllNotifications).toBe('function');
      expect(typeof result.current.getStats).toBe('function');
      expect(typeof result.current.connectWebSocket).toBe('function');
      expect(typeof result.current.disconnectWebSocket).toBe('function');
    });
  });

  describe('Authentication', () => {
    it('should not fetch notifications without auth token', async () => {
      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      // Wait for initial load attempt
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Should not have made fetch call due to missing token
      // The hook returns early when no token is found
      expect(result.current.notifications).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('should fetch notifications with localStorage token', async () => {
      const mockNotifications = [
        createMockNotification({ id: 'notif-1' }),
        createMockNotification({ id: 'notif-2' }),
      ];

      server.use(
        http.get('/api/notifications/', () => {
          return HttpResponse.json({
            notifications: mockNotifications,
            unread_count: 1,
            total_count: 2,
            has_more: false,
          });
        })
      );

      // Set token in localStorage
      localStorageStore['token'] = 'test-auth-token';

      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(2);
      });

      expect(result.current.unreadCount).toBe(1);
      expect(result.current.totalCount).toBe(2);
      expect(result.current.hasMore).toBe(false);
    });

    it('should fetch notifications with cookie token', async () => {
      const mockNotifications = [createMockNotification({ id: 'notif-1' })];

      server.use(
        http.get('/api/notifications/', () => {
          return HttpResponse.json({
            notifications: mockNotifications,
            unread_count: 0,
            total_count: 1,
            has_more: false,
          });
        })
      );

      // Set token in cookie
      cookieStore = 'access_token=cookie-auth-token';

      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1);
      });
    });
  });

  describe('Notification CRUD Operations', () => {
    const setupAuthenticatedHook = async () => {
      const mockNotifications = [
        createMockNotification({ id: 'notif-1', is_read: false }),
        createMockNotification({ id: 'notif-2', is_read: false }),
        createMockNotification({ id: 'notif-3', is_read: true }),
      ];

      server.use(
        http.get('/api/notifications/', () => {
          return HttpResponse.json({
            notifications: mockNotifications,
            unread_count: 2,
            total_count: 3,
            has_more: false,
          });
        })
      );

      localStorageStore['token'] = 'test-token';

      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(3);
      });

      return result;
    };

    it('should mark a single notification as read', async () => {
      server.use(
        http.post('/api/notifications/:id/read', () => {
          return HttpResponse.json({ success: true });
        })
      );

      const result = await setupAuthenticatedHook();

      await act(async () => {
        await result.current.markAsRead('notif-1');
      });

      await waitFor(() => {
        const notification = result.current.notifications.find((n) => n.id === 'notif-1');
        expect(notification?.is_read).toBe(true);
      });

      expect(result.current.unreadCount).toBe(1);
    });

    it('should mark all notifications as read', async () => {
      server.use(
        http.post('/api/notifications/mark-read', () => {
          return HttpResponse.json({ success: true, marked_count: 2 });
        })
      );

      const result = await setupAuthenticatedHook();

      await act(async () => {
        await result.current.markAllAsRead();
      });

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(0);
      });

      // All notifications should be marked as read
      result.current.notifications.forEach((n) => {
        expect(n.is_read).toBe(true);
      });
    });

    it('should dismiss a notification', async () => {
      server.use(
        http.post('/api/notifications/:id/dismiss', () => {
          return HttpResponse.json({ success: true });
        })
      );

      const result = await setupAuthenticatedHook();
      const initialCount = result.current.notifications.length;

      await act(async () => {
        await result.current.dismissNotification('notif-1');
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(initialCount - 1);
      });

      // Notification should be removed from list
      const dismissed = result.current.notifications.find((n) => n.id === 'notif-1');
      expect(dismissed).toBeUndefined();

      // Unread count should decrease (notif-1 was unread)
      expect(result.current.unreadCount).toBe(1);
    });

    it('should clear all notifications', async () => {
      server.use(
        http.delete('/api/notifications/clear-all', () => {
          return HttpResponse.json({ success: true, cleared_count: 3 });
        })
      );

      const result = await setupAuthenticatedHook();

      await act(async () => {
        await result.current.clearAllNotifications();
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(0);
      });

      expect(result.current.unreadCount).toBe(0);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.hasMore).toBe(false);
    });
  });

  describe('Pagination - Load More', () => {
    it('should load more notifications when hasMore is true', async () => {
      let requestCount = 0;

      server.use(
        http.get('/api/notifications/', ({ request }) => {
          requestCount++;
          const url = new URL(request.url);
          const offset = parseInt(url.searchParams.get('offset') || '0');

          if (offset === 0) {
            return HttpResponse.json({
              notifications: [
                createMockNotification({ id: 'notif-1' }),
                createMockNotification({ id: 'notif-2' }),
              ],
              unread_count: 5,
              total_count: 4,
              has_more: true,
            });
          } else {
            return HttpResponse.json({
              notifications: [
                createMockNotification({ id: 'notif-3' }),
                createMockNotification({ id: 'notif-4' }),
              ],
              unread_count: 5,
              total_count: 4,
              has_more: false,
            });
          }
        })
      );

      localStorageStore['token'] = 'test-token';

      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(2);
      });

      expect(result.current.hasMore).toBe(true);

      // Load more
      await act(async () => {
        await result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(4);
      });

      expect(result.current.hasMore).toBe(false);
      expect(requestCount).toBe(2);
    });

    it('should not load more when hasMore is false', async () => {
      let requestCount = 0;

      server.use(
        http.get('/api/notifications/', () => {
          requestCount++;
          return HttpResponse.json({
            notifications: [createMockNotification({ id: 'notif-1' })],
            unread_count: 0,
            total_count: 1,
            has_more: false,
          });
        })
      );

      localStorageStore['token'] = 'test-token';

      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1);
      });

      // Attempt to load more - should not make another request
      await act(async () => {
        await result.current.loadMore();
      });

      expect(requestCount).toBe(1);
    });
  });

  describe('Statistics', () => {
    it('should fetch notification statistics', async () => {
      const mockStats = createMockStats();

      server.use(
        http.get('/api/notifications/', () => {
          return HttpResponse.json({
            notifications: [],
            unread_count: 5,
            total_count: 10,
            has_more: false,
          });
        }),
        http.get('/api/notifications/stats', () => {
          return HttpResponse.json(mockStats);
        })
      );

      localStorageStore['token'] = 'test-token';

      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let stats: NotificationStats | null = null;
      await act(async () => {
        stats = await result.current.getStats();
      });

      expect(stats).toEqual(mockStats);
      expect(result.current.stats).toEqual(mockStats);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      server.use(
        http.get('/api/notifications/', () => {
          return HttpResponse.json({ detail: 'Server error' }, { status: 500 });
        })
      );

      localStorageStore['token'] = 'test-token';

      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      await waitFor(() => {
        expect(result.current.error).toBe('Server error');
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should handle mark as read errors', async () => {
      server.use(
        http.get('/api/notifications/', () => {
          return HttpResponse.json({
            notifications: [createMockNotification({ id: 'notif-1' })],
            unread_count: 1,
            total_count: 1,
            has_more: false,
          });
        }),
        http.post('/api/notifications/:id/read', () => {
          return HttpResponse.json({ detail: 'Notification not found' }, { status: 404 });
        })
      );

      localStorageStore['token'] = 'test-token';

      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1);
      });

      await act(async () => {
        await result.current.markAsRead('notif-1');
      });

      expect(result.current.error).toBe('Notification not found');
    });

    it('should handle dismiss errors', async () => {
      server.use(
        http.get('/api/notifications/', () => {
          return HttpResponse.json({
            notifications: [createMockNotification({ id: 'notif-1' })],
            unread_count: 1,
            total_count: 1,
            has_more: false,
          });
        }),
        http.post('/api/notifications/:id/dismiss', () => {
          return HttpResponse.json({ detail: 'Cannot dismiss' }, { status: 400 });
        })
      );

      localStorageStore['token'] = 'test-token';

      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1);
      });

      await act(async () => {
        await result.current.dismissNotification('notif-1');
      });

      expect(result.current.error).toBe('Cannot dismiss');
    });

    it('should handle clear all errors', async () => {
      server.use(
        http.get('/api/notifications/', () => {
          return HttpResponse.json({
            notifications: [createMockNotification({ id: 'notif-1' })],
            unread_count: 1,
            total_count: 1,
            has_more: false,
          });
        }),
        http.delete('/api/notifications/clear-all', () => {
          return HttpResponse.json({ detail: 'Clear failed' }, { status: 500 });
        })
      );

      localStorageStore['token'] = 'test-token';

      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1);
      });

      await act(async () => {
        await result.current.clearAllNotifications();
      });

      expect(result.current.error).toBe('Clear failed');
    });

    it('should handle stats fetch errors', async () => {
      server.use(
        http.get('/api/notifications/', () => {
          return HttpResponse.json({
            notifications: [],
            unread_count: 0,
            total_count: 0,
            has_more: false,
          });
        }),
        http.get('/api/notifications/stats', () => {
          return HttpResponse.json({ detail: 'Stats unavailable' }, { status: 503 });
        })
      );

      localStorageStore['token'] = 'test-token';

      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let stats: NotificationStats | null = null;
      await act(async () => {
        stats = await result.current.getStats();
      });

      expect(stats).toBeNull();
    });
  });

  describe('Auto Refresh', () => {
    it('should auto-refresh notifications at specified interval', async () => {
      let requestCount = 0;

      server.use(
        http.get('/api/notifications/', () => {
          requestCount++;
          return HttpResponse.json({
            notifications: [createMockNotification({ id: `notif-${requestCount}` })],
            unread_count: requestCount,
            total_count: requestCount,
            has_more: false,
          });
        })
      );

      localStorageStore['token'] = 'test-token';

      renderHook(() =>
        useNotifications({
          autoRefresh: true,
          refreshInterval: 1000,
          realTimeEnabled: false,
        })
      );

      // Initial load
      await waitFor(() => {
        expect(requestCount).toBe(1);
      });

      // Advance timer by refresh interval
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      await waitFor(() => {
        expect(requestCount).toBe(2);
      });

      // Another interval
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      await waitFor(() => {
        expect(requestCount).toBe(3);
      });
    });

    it('should not auto-refresh when autoRefresh is false', async () => {
      let requestCount = 0;

      server.use(
        http.get('/api/notifications/', () => {
          requestCount++;
          return HttpResponse.json({
            notifications: [],
            unread_count: 0,
            total_count: 0,
            has_more: false,
          });
        })
      );

      localStorageStore['token'] = 'test-token';

      renderHook(() =>
        useNotifications({
          autoRefresh: false,
          refreshInterval: 1000,
          realTimeEnabled: false,
        })
      );

      await waitFor(() => {
        expect(requestCount).toBe(1);
      });

      // Advance timer - should not trigger refresh
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(requestCount).toBe(1);
    });

    it('should stop auto-refresh on unmount', async () => {
      let requestCount = 0;

      server.use(
        http.get('/api/notifications/', () => {
          requestCount++;
          return HttpResponse.json({
            notifications: [],
            unread_count: 0,
            total_count: 0,
            has_more: false,
          });
        })
      );

      localStorageStore['token'] = 'test-token';

      const { unmount } = renderHook(() =>
        useNotifications({
          autoRefresh: true,
          refreshInterval: 1000,
          realTimeEnabled: false,
        })
      );

      // Initial load
      await waitFor(() => {
        expect(requestCount).toBe(1);
      });

      // Unmount
      unmount();

      // Advance timer - should not trigger refresh after unmount
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });

      expect(requestCount).toBe(1);
    });
  });

  describe('Refresh Notifications', () => {
    it('should refresh and reset notifications list', async () => {
      let callNumber = 0;

      server.use(
        http.get('/api/notifications/', () => {
          callNumber++;
          return HttpResponse.json({
            notifications: [createMockNotification({ id: `notif-call-${callNumber}` })],
            unread_count: callNumber,
            total_count: callNumber,
            has_more: false,
          });
        })
      );

      localStorageStore['token'] = 'test-token';

      const { result } = renderHook(() =>
        useNotifications({ autoRefresh: false, realTimeEnabled: false })
      );

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1);
      });

      expect(result.current.notifications[0].id).toBe('notif-call-1');

      // Refresh
      await act(async () => {
        await result.current.refreshNotifications();
      });

      await waitFor(() => {
        expect(result.current.notifications[0].id).toBe('notif-call-2');
      });
    });
  });

  describe('Hook Return Value Shape', () => {
    it('should return all expected properties and functions', () => {
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
      expect(result.current).toHaveProperty('isConnected');

      // Actions
      expect(result.current).toHaveProperty('refreshNotifications');
      expect(result.current).toHaveProperty('loadMore');
      expect(result.current).toHaveProperty('markAsRead');
      expect(result.current).toHaveProperty('markAllAsRead');
      expect(result.current).toHaveProperty('dismissNotification');
      expect(result.current).toHaveProperty('clearAllNotifications');
      expect(result.current).toHaveProperty('getStats');
      expect(result.current).toHaveProperty('connectWebSocket');
      expect(result.current).toHaveProperty('disconnectWebSocket');
    });

    it('should return correct types for state properties', () => {
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
});
