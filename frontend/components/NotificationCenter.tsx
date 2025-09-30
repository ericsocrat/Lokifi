/**
 * J6.1 Notification Center Component
 * Full-featured notification management interface
 */

"use client";

import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertCircle,
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Filter,
  RefreshCw,
  Settings,
  Trash2
} from 'lucide-react';
import React, { useState } from 'react';
import { NotificationData, useNotifications } from '../src/hooks/useNotifications';

type FilterType = 'all' | 'unread' | 'read' | 'dismissed';
type NotificationType = 'all' | 'follow' | 'dm_message_received' | 'ai_reply_finished' | 'mention' | 'system_alert';
type SortType = 'newest' | 'oldest' | 'priority';

interface NotificationCenterProps {
  className?: string;
  showHeader?: boolean;
  showFilters?: boolean;
  showPreferences?: boolean;
  maxHeight?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  className = '',
  showHeader = true,
  showFilters = true,
  showPreferences = true,
  maxHeight = '600px'
}) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [typeFilter, setTypeFilter] = useState<NotificationType>('all');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [expandedNotification, setExpandedNotification] = useState<string | null>(null);

  const {
    notifications,
    unreadCount,
    totalCount,
    isLoading,
    hasMore,
    error,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAllNotifications,
    refreshNotifications,
    loadMore,
    getStats
  } = useNotifications();

  // Filter and sort notifications
  const filteredNotifications = React.useMemo(() => {
    let filtered = notifications;

    // Apply read/unread filter
    if (filter === 'unread') {
      filtered = filtered.filter((n: NotificationData) => !n.is_read);
    } else if (filter === 'read') {
      filtered = filtered.filter((n: NotificationData) => n.is_read);
    } else if (filter === 'dismissed') {
      filtered = filtered.filter((n: NotificationData) => n.is_dismissed);
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((n: NotificationData) => n.type === typeFilter);
    }

    // Apply sorting
    filtered.sort((a: NotificationData, b: NotificationData) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
          const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 2;
          const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 2;
          return bPriority - aPriority;
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return filtered;
  }, [notifications, filter, typeFilter, sortBy]);

  const handleSelectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map((n: NotificationData) => n.id)));
    }
  };

  const handleBulkMarkRead = async () => {
    const unreadSelected = Array.from(selectedNotifications)
      .filter(id => {
        const notification = notifications.find((n: NotificationData) => n.id === id);
        return notification && !notification.is_read;
      });

    for (const id of unreadSelected) {
      await markAsRead(id);
    }

    setSelectedNotifications(new Set());
  };

  const handleBulkDismiss = async () => {
    for (const id of selectedNotifications) {
      await dismissNotification(id);
    }

    setSelectedNotifications(new Set());
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return '👤';
      case 'dm_message_received':
        return '💬';
      case 'ai_reply_finished':
        return '🤖';
      case 'mention':
        return '🏷️';
      case 'system_alert':
        return '⚠️';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string, priority: string) => {
    if (priority === 'urgent') return 'border-l-red-600 bg-red-500/5';
    if (priority === 'high') return 'border-l-red-500 bg-red-500/5';

    switch (type) {
      case 'follow':
        return 'border-l-blue-500 bg-blue-500/5';
      case 'dm_message_received':
        return 'border-l-green-500 bg-green-500/5';
      case 'ai_reply_finished':
        return 'border-l-purple-500 bg-purple-500/5';
      case 'mention':
        return 'border-l-orange-500 bg-orange-500/5';
      default:
        return 'border-l-gray-500 bg-gray-500/5';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'high':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={`bg-neutral-900 border border-neutral-700 rounded-lg ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="p-4 border-b border-neutral-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-white" />
              <h2 className="text-lg font-semibold text-white">Notification Center</h2>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {showFilters && (
                <button
                  onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                  className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg"
                  title="Toggle filters"
                >
                  <Filter className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={refreshNotifications}
                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg"
                title="Refresh notifications"
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              {showPreferences && (
                <button
                  onClick={() => {
                    // TODO: Open notification preferences
                    window.location.href = '/notifications/preferences';
                  }}
                  className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg"
                  title="Notification preferences"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && showFiltersPanel && (
        <div className="p-4 border-b border-neutral-700 bg-neutral-800/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-xs text-neutral-400 mb-2">Status</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterType)}
                className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-sm text-white"
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-xs text-neutral-400 mb-2">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as NotificationType)}
                className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-sm text-white"
              >
                <option value="all">All Types</option>
                <option value="follow">Follows</option>
                <option value="dm_message_received">Messages</option>
                <option value="ai_reply_finished">AI Responses</option>
                <option value="mention">Mentions</option>
                <option value="system_alert">System</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div>
              <label className="block text-xs text-neutral-400 mb-2">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-sm text-white"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="priority">Priority</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedNotifications.size > 0 && (
        <div className="p-3 border-b border-neutral-700 bg-blue-500/10">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white">
              {selectedNotifications.size} notification{selectedNotifications.size > 1 ? 's' : ''} selected
            </span>

            <div className="flex gap-2">
              <button
                onClick={handleBulkMarkRead}
                className="flex items-center gap-1 px-3 py-1 text-xs bg-green-600 hover:bg-green-500 text-white rounded"
              >
                <Check className="w-3 h-3" />
                Mark Read
              </button>
              <button
                onClick={handleBulkDismiss}
                className="flex items-center gap-1 px-3 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded"
              >
                <Trash2 className="w-3 h-3" />
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="p-3 border-b border-neutral-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              {selectedNotifications.size === filteredNotifications.length ? 'Deselect All' : 'Select All'}
            </button>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
              >
                <CheckCheck className="w-3 h-3" />
                Mark All Read
              </button>
            )}
          </div>

          <div className="text-xs text-neutral-400">
            {filteredNotifications.length} of {totalCount} notifications
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto" style={{ maxHeight }}>
        {isLoading && filteredNotifications.length === 0 && (
          <div className="p-8 text-center text-neutral-400">
            <div className="animate-spin w-6 h-6 border-2 border-neutral-600 border-t-white rounded-full mx-auto mb-3"></div>
            Loading notifications...
          </div>
        )}

        {error && (
          <div className="p-8 text-center text-red-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-3" />
            <p>Failed to load notifications</p>
            <button
              onClick={refreshNotifications}
              className="text-blue-400 hover:text-blue-300 mt-2"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !error && filteredNotifications.length === 0 && (
          <div className="p-8 text-center text-neutral-400">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No notifications</p>
            <p className="text-sm">You&apos;re all caught up!</p>
          </div>
        )}

        {filteredNotifications.map((notification: NotificationData) => (
          <div
            key={notification.id}
            className={`border-l-4 hover:bg-neutral-800/50 transition-colors ${getNotificationColor(notification.type, notification.priority)
              } ${notification.is_read ? 'opacity-75' : ''} ${selectedNotifications.has(notification.id) ? 'bg-blue-500/10' : ''
              }`}
          >
            <div className="p-4">
              <div className="flex gap-3">
                {/* Selection checkbox */}
                <div className="flex-shrink-0 pt-1">
                  <input
                    type="checkbox"
                    checked={selectedNotifications.has(notification.id)}
                    onChange={(e) => {
                      const newSelection = new Set(selectedNotifications);
                      if (e.target.checked) {
                        newSelection.add(notification.id);
                      } else {
                        newSelection.delete(notification.id);
                      }
                      setSelectedNotifications(newSelection);
                    }}
                    className="rounded border-neutral-600 bg-neutral-800 text-blue-500"
                  />
                </div>

                {/* Icon */}
                <div className="flex-shrink-0 text-xl">
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-medium text-sm ${notification.is_read ? 'text-neutral-300' : 'text-white'
                          }`}>
                          {notification.title}
                        </h4>

                        {getPriorityIcon(notification.priority)}

                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>

                      {notification.message && (
                        <p className={`text-sm mb-2 ${notification.is_read ? 'text-neutral-400' : 'text-neutral-300'
                          }`}>
                          {notification.message}
                        </p>
                      )}

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-xs text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>

                        <span className="capitalize">
                          {notification.type.replace('_', ' ')}
                        </span>

                        {notification.priority !== 'normal' && (
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${notification.priority === 'urgent' ? 'bg-red-600 text-white' :
                            notification.priority === 'high' ? 'bg-red-500 text-white' :
                              'bg-neutral-600 text-neutral-300'
                            }`}>
                            {notification.priority}
                          </span>
                        )}
                      </div>

                      {/* Expand button for detailed view */}
                      {(notification.payload || notification.message) && (
                        <button
                          onClick={() => setExpandedNotification(
                            expandedNotification === notification.id ? null : notification.id
                          )}
                          className="text-xs text-blue-400 hover:text-blue-300 mt-2 flex items-center gap-1"
                        >
                          {expandedNotification === notification.id ? (
                            <>
                              <ChevronUp className="w-3 h-3" />
                              Less details
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3" />
                              More details
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1">
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-1.5 text-neutral-400 hover:text-green-400 hover:bg-green-400/10 rounded"
                          title="Mark as read"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        onClick={() => dismissNotification(notification.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-400/10 rounded"
                        title="Dismiss"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      {/* TODO: Add action button for notification-specific actions */}
                      {notification.payload?.thread_id && (
                        <button
                          onClick={() => {
                            // Navigate to thread/conversation
                            window.location.href = `/messages/${notification.payload?.thread_id}`;
                          }}
                          className="p-1.5 text-neutral-400 hover:text-blue-400 hover:bg-blue-400/10 rounded"
                          title="Open conversation"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expandedNotification === notification.id && (
                    <div className="mt-3 p-3 bg-neutral-800/50 rounded border border-neutral-600">
                      {notification.payload && (
                        <div className="text-xs">
                          <h5 className="font-medium text-neutral-300 mb-2">Details:</h5>
                          <pre className="text-neutral-400 whitespace-pre-wrap overflow-auto">
                            {JSON.stringify(notification.payload, null, 2)}
                          </pre>
                        </div>
                      )}

                      <div className="flex justify-between items-center mt-2 text-xs text-neutral-500">
                        <span>
                          Created: {format(new Date(notification.created_at), 'MMM d, yyyy h:mm a')}
                        </span>

                        {notification.read_at && (
                          <span>
                            Read: {format(new Date(notification.read_at), 'MMM d, yyyy h:mm a')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Load More */}
        {hasMore && !isLoading && (
          <div className="p-4 text-center">
            <button
              onClick={loadMore}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg"
            >
              Load more notifications
            </button>
          </div>
        )}

        {isLoading && filteredNotifications.length > 0 && (
          <div className="p-4 text-center text-neutral-400">
            <div className="animate-spin w-4 h-4 border-2 border-neutral-600 border-t-white rounded-full mx-auto"></div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-neutral-700 bg-neutral-800/30">
        <div className="flex justify-between items-center">
          <div className="text-xs text-neutral-400">
            Last updated: {format(new Date(), 'h:mm a')}
          </div>

          <button
            onClick={clearAllNotifications}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Clear all notifications
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;