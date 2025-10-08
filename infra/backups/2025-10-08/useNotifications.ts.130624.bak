/**
 * J6.1 useNotifications Hook
 * Custom hook for managing notifications state and API calls
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface NotificationData {
  id: string;
  user_id: string;
  type: string;
  priority: string;
  category?: string;
  title: string;
  message?: string;
  payload?: Record<string, any>;
  created_at: string;
  read_at?: string;
  delivered_at?: string;
  clicked_at?: string;
  dismissed_at?: string;
  is_read: boolean;
  is_delivered: boolean;
  is_dismissed: boolean;
  is_archived: boolean;
  expires_at?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  age_seconds: number;
  is_expired: boolean;
}

export interface NotificationStats {
  total_notifications: number;
  unread_count: number;
  read_count: number;
  dismissed_count: number;
  delivered_count: number;
  clicked_count: number;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
  avg_read_time_seconds: number;
  most_recent?: string;
  oldest_unread?: string;
}

export interface UseNotificationsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  realTimeEnabled?: boolean;
  maxNotifications?: number;
}

export interface UseNotificationsReturn {
  notifications: NotificationData[];
  unreadCount: number;
  totalCount: number;
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  stats: NotificationStats | null;

  // Actions
  refreshNotifications: () => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissNotification: (notificationId: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  getStats: () => Promise<NotificationStats | null>;

  // Real-time
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  isConnected: boolean;
}

const API_BASE = '/api/notifications';
const getWsUrl = () => {
  if (typeof window === 'undefined') return '';
  return `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ws/notifications`;
};

export const useNotifications = (options: UseNotificationsOptions = {}): UseNotificationsReturn => {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    realTimeEnabled = true,
    maxNotifications = 100
  } = options;

  // State
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const offset = useRef(0);

  // Get auth token from cookies (where it's actually stored)
  const getAuthToken = useCallback(() => {
    // Try localStorage first (legacy)
    const localToken = localStorage.getItem('token') || localStorage.getItem('social_token');
    if (localToken) return localToken;
    
    // Check cookies (current method)
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'access_token' || name === 'token') {
        return value;
      }
    }
    return null;
  }, []);

  // API call helper
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const token = getAuthToken();
    if (!token) {
      // Don't throw error, just return null to prevent console spam
      console.warn('No authentication token found for notifications');
      return null;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: 'include', // Include cookies
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }, [getAuthToken]);

  // Load notifications
  const loadNotifications = useCallback(async (reset = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const currentOffset = reset ? 0 : offset.current;
      const limit = 50;

      const data = await apiCall(`/?limit=${limit}&offset=${currentOffset}&include_dismissed=false`);
      
      // If no token, apiCall returns null
      if (!data) {
        setNotifications([]);
        setUnreadCount(0);
        setTotalCount(0);
        setHasMore(false);
        return;
      }

      const newNotifications = data.notifications || [];

      if (reset) {
        setNotifications(newNotifications);
        offset.current = newNotifications.length;
      } else {
        setNotifications(prev => [...prev, ...newNotifications]);
        offset.current += newNotifications.length;
      }

      setUnreadCount(data.unread_count || 0);
      setTotalCount(data.total_count || 0);
      setHasMore(data.has_more || false);

    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  // Refresh notifications (reset)
  const refreshNotifications = useCallback(async () => {
    await loadNotifications(true);
  }, [loadNotifications]);

  // Load more notifications
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await loadNotifications(false);
  }, [hasMore, isLoading, loadNotifications]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const result = await apiCall(`/${notificationId}/read`, { method: 'POST' });
      if (!result) return; // No token, skip

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );

      setUnreadCount(prev => Math.max(0, prev - 1));

    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark as read');
    }
  }, [apiCall]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const result = await apiCall('/mark-read', {
        method: 'POST',
        body: JSON.stringify({})
      });
      
      if (!result) return; // No token, skip

      const now = new Date().toISOString();
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: n.read_at || now }))
      );

      setUnreadCount(0);

    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark all as read');
    }
  }, [apiCall]);

  // Dismiss notification
  const dismissNotification = useCallback(async (notificationId: string) => {
    try {
      const result = await apiCall(`/${notificationId}/dismiss`, { method: 'POST' });
      if (!result) return; // No token, skip

      setNotifications(prev =>
        prev.filter(n => n.id !== notificationId)
      );

      // Update unread count if the dismissed notification was unread
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      setTotalCount(prev => Math.max(0, prev - 1));

    } catch (err) {
      console.error('Failed to dismiss notification:', err);
      setError(err instanceof Error ? err.message : 'Failed to dismiss notification');
    }
  }, [apiCall, notifications]);

  // Clear all notifications
  const clearAllNotifications = useCallback(async () => {
    try {
      const result = await apiCall('/clear-all', { method: 'DELETE' });
      if (!result) return; // No token, skip

      setNotifications([]);
      setUnreadCount(0);
      setTotalCount(0);
      setHasMore(false);
      offset.current = 0;

    } catch (err) {
      console.error('Failed to clear all notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear notifications');
    }
  }, [apiCall]);

  // Get notification statistics
  const getStats = useCallback(async (): Promise<NotificationStats | null> => {
    try {
      const data = await apiCall('/stats');
      setStats(data);
      return data;
    } catch (err) {
      console.error('Failed to get notification stats:', err);
      return null;
    }
  }, [apiCall]);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (wsRef.current || !realTimeEnabled) return;

    try {
      const token = getAuthToken();
      if (!token) return;

      const wsUrl = getWsUrl();
      if (!wsUrl) return;

      const ws = new WebSocket(`${wsUrl}?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Notification WebSocket connected');
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'new_notification':
              const newNotification = data.data;
              setNotifications(prev => [newNotification, ...prev.slice(0, maxNotifications - 1)]);
              setUnreadCount(data.unread_count || (prev => prev + 1));
              setTotalCount(prev => prev + 1);

              // Browser notification
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(newNotification.title, {
                  body: newNotification.message,
                  icon: '/favicon.ico',
                  tag: newNotification.id
                });
              }
              break;

            case 'unread_count_update':
              setUnreadCount(data.data.unread_count);
              break;

            case 'notification_read':
              const readId = data.data.notification_id;
              setNotifications(prev =>
                prev.map(n =>
                  n.id === readId
                    ? { ...n, is_read: true, read_at: new Date().toISOString() }
                    : n
                )
              );
              break;

            case 'notification_dismissed':
              const dismissedId = data.data.notification_id;
              setNotifications(prev => prev.filter(n => n.id !== dismissedId));
              break;

            case 'keepalive':
              // Respond to keepalive
              ws.send(JSON.stringify({ type: 'pong', timestamp: data.timestamp }));
              break;
          }
        } catch (err) {
          console.error('Error processing WebSocket message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('Notification WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect if not a manual close
        if (event.code !== 1000 && realTimeEnabled) {
          setTimeout(connectWebSocket, 5000);
        }
      };

      ws.onerror = (error) => {
        console.error('Notification WebSocket error:', error);
        setError('WebSocket connection failed');
      };

    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
      setError('Failed to connect to real-time notifications');
    }
  }, [realTimeEnabled, getAuthToken, maxNotifications]);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Auto refresh effect
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(refreshNotifications, refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }

    // Return cleanup function for consistency, even if not needed
    return () => { };
  }, [autoRefresh, refreshInterval, refreshNotifications]);

  // Initial load and WebSocket connection
  useEffect(() => {
    refreshNotifications();

    if (realTimeEnabled) {
      connectWebSocket();
    }

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(console.error);
    }

    return () => {
      disconnectWebSocket();
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectWebSocket();
    };
  }, [disconnectWebSocket]);

  return {
    notifications,
    unreadCount,
    totalCount,
    isLoading,
    hasMore,
    error,
    stats,
    refreshNotifications,
    loadMore,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAllNotifications,
    getStats,
    connectWebSocket,
    disconnectWebSocket,
    isConnected,
  };
};

export default useNotifications;