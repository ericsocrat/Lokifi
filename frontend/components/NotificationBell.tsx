/**
 * J6.1 Notification Bell Icon Component
 * Displays notification bell with unread badge and dropdown
 */

import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Trash2 } from 'lucide-react';
import { useNotifications } from '../src/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

interface NotificationBellProps {
  className?: string;
  showDropdown?: boolean;
  maxNotifications?: number;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  className = '',
  showDropdown = true,
  maxNotifications = 5
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    refreshNotifications
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBellClick = () => {
    if (showDropdown) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        refreshNotifications();
      }
    }
  };

  const handleNotificationClick = async (notificationId: string) => {
    await markAsRead(notificationId);
    // Close dropdown after interaction
    setIsOpen(false);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setIsOpen(false);
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
    if (priority === 'high') return 'border-l-red-500';
    if (priority === 'urgent') return 'border-l-red-600';
    
    switch (type) {
      case 'follow':
        return 'border-l-blue-500';
      case 'dm_message_received':
        return 'border-l-green-500';
      case 'ai_reply_finished':
        return 'border-l-purple-500';
      case 'mention':
        return 'border-l-orange-500';
      default:
        return 'border-l-gray-500';
    }
  };

  const recentNotifications = notifications.slice(0, maxNotifications);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Icon with Badge */}
      <button
        onClick={handleBellClick}
        className="relative p-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-5 h-5" />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {showDropdown && isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-700">
            <h3 className="font-semibold text-white">Notifications</h3>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading && (
              <div className="p-4 text-center text-neutral-400">
                <div className="animate-spin w-5 h-5 border-2 border-neutral-600 border-t-white rounded-full mx-auto mb-2"></div>
                Loading notifications...
              </div>
            )}

            {error && (
              <div className="p-4 text-center text-red-400">
                <p>Failed to load notifications</p>
                <button
                  onClick={refreshNotifications}
                  className="text-xs text-blue-400 hover:text-blue-300 mt-1"
                >
                  Try again
                </button>
              </div>
            )}

            {!isLoading && !error && recentNotifications.length === 0 && (
              <div className="p-8 text-center text-neutral-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
              </div>
            )}

            {!isLoading && !error && recentNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-l-2 hover:bg-neutral-800 cursor-pointer transition-colors ${
                  getNotificationColor(notification.type, notification.priority)
                } ${notification.is_read ? 'opacity-75' : ''}`}
                onClick={() => handleNotificationClick(notification.id)}
              >
                <div className="flex gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 text-lg">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={`font-medium text-sm ${
                        notification.is_read ? 'text-neutral-300' : 'text-white'
                      }`}>
                        {notification.title}
                      </h4>
                      
                      {/* Actions */}
                      <div className="flex gap-1">
                        {!notification.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="text-neutral-400 hover:text-white"
                            title="Mark as read"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissNotification(notification.id);
                          }}
                          className="text-neutral-400 hover:text-red-400"
                          title="Dismiss"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {notification.message && (
                      <p className={`text-sm mt-1 ${
                        notification.is_read ? 'text-neutral-400' : 'text-neutral-300'
                      }`}>
                        {notification.message}
                      </p>
                    )}

                    {/* Timestamp */}
                    <p className="text-xs text-neutral-500 mt-2">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>

                    {/* Unread indicator */}
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full absolute top-4 right-4"></div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          {recentNotifications.length > 0 && (
            <div className="p-3 border-t border-neutral-700">
              <button
                onClick={() => {
                  // Open full notification center
                  setIsOpen(false);
                  // TODO: Navigate to full notification center
                  window.location.href = '/notifications';
                }}
                className="w-full text-center text-sm text-blue-400 hover:text-blue-300"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;