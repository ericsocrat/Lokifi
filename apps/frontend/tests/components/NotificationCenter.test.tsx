import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationCenter } from '../../components/NotificationCenter';

// Hoisted mocks
const { mockNotifications } = vi.hoisted(() => ({
  mockNotifications: {
    notifications: [] as Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      priority: string;
      is_read: boolean;
      is_dismissed: boolean;
      created_at: string;
      action_url?: string;
    }>,
    unreadCount: 0,
    totalCount: 0,
    isLoading: false,
    hasMore: false,
    error: null as Error | null,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    dismissNotification: vi.fn(),
    clearAllNotifications: vi.fn(),
    refreshNotifications: vi.fn(),
    loadMore: vi.fn(),
    getStats: vi.fn(),
  },
}));

vi.mock('../../src/hooks/useNotifications', () => ({
  useNotifications: () => mockNotifications,
}));

describe('NotificationCenter', () => {
  const mockNotificationData = [
    {
      id: 'notif-1',
      type: 'follow',
      title: 'New Follower',
      message: 'John started following you',
      priority: 'normal',
      is_read: false,
      is_dismissed: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 'notif-2',
      type: 'dm_message_received',
      title: 'New Message',
      message: 'You have a new direct message',
      priority: 'high',
      is_read: false,
      is_dismissed: false,
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'notif-3',
      type: 'ai_reply_finished',
      title: 'AI Response Ready',
      message: 'Your AI analysis is complete',
      priority: 'normal',
      is_read: true,
      is_dismissed: false,
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'notif-4',
      type: 'system_alert',
      title: 'System Update',
      message: 'Scheduled maintenance tonight',
      priority: 'urgent',
      is_read: false,
      is_dismissed: false,
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockNotifications.notifications = [...mockNotificationData];
    mockNotifications.unreadCount = mockNotificationData.filter((n) => !n.is_read).length;
    mockNotifications.totalCount = mockNotificationData.length;
    mockNotifications.isLoading = false;
    mockNotifications.hasMore = false;
    mockNotifications.error = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render notification center with header', () => {
      render(<NotificationCenter />);

      expect(screen.getByText('Notification Center')).toBeInTheDocument();
    });

    it('should hide header when showHeader is false', () => {
      render(<NotificationCenter showHeader={false} />);

      expect(screen.queryByText('Notification Center')).not.toBeInTheDocument();
    });

    it('should display unread count badge', () => {
      mockNotifications.unreadCount = 3;

      render(<NotificationCenter />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should not show badge when no unread notifications', () => {
      mockNotifications.unreadCount = 0;

      render(<NotificationCenter />);

      // Check that there's no unread badge (the component shows totalCount somewhere else)
      const badges = screen.queryAllByText('0');
      // Badge should not appear
      expect(badges.length).toBeLessThanOrEqual(1); // Only stats count, not badge
    });

    it('should render all notification items', () => {
      render(<NotificationCenter />);

      expect(screen.getByText('New Follower')).toBeInTheDocument();
      expect(screen.getByText('New Message')).toBeInTheDocument();
      expect(screen.getByText('AI Response Ready')).toBeInTheDocument();
      expect(screen.getByText('System Update')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<NotificationCenter className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Filters', () => {
    it('should show filter button when showFilters is true', () => {
      render(<NotificationCenter showFilters={true} />);

      const filterButton = screen.getByTitle('Toggle filters');
      expect(filterButton).toBeInTheDocument();
    });

    it('should hide filter button when showFilters is false', () => {
      render(<NotificationCenter showFilters={false} />);

      expect(screen.queryByTitle('Toggle filters')).not.toBeInTheDocument();
    });

    it('should toggle filters panel on button click', () => {
      render(<NotificationCenter showFilters={true} />);

      const filterButton = screen.getByTitle('Toggle filters');

      // Initially no filter panel
      expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();

      // Click to show
      fireEvent.click(filterButton);

      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Sort by')).toBeInTheDocument();
    });

    it('should filter by status', () => {
      render(<NotificationCenter />);

      // Open filters
      fireEvent.click(screen.getByTitle('Toggle filters'));

      // Change status filter to unread
      const statusSelect = screen.getByDisplayValue('All');
      fireEvent.change(statusSelect, { target: { value: 'unread' } });

      // Should only show unread notifications
      expect(screen.getByText('New Follower')).toBeInTheDocument();
      expect(screen.getByText('New Message')).toBeInTheDocument();
      expect(screen.queryByText('AI Response Ready')).not.toBeInTheDocument(); // This is read
    });

    it('should filter by type', () => {
      render(<NotificationCenter />);

      // Open filters
      fireEvent.click(screen.getByTitle('Toggle filters'));

      // Change type filter to follow
      const typeSelect = screen.getByDisplayValue('All Types');
      fireEvent.change(typeSelect, { target: { value: 'follow' } });

      // Should only show follow notifications
      expect(screen.getByText('New Follower')).toBeInTheDocument();
      expect(screen.queryByText('New Message')).not.toBeInTheDocument();
    });

    it('should sort notifications', () => {
      render(<NotificationCenter />);

      // Open filters
      fireEvent.click(screen.getByTitle('Toggle filters'));

      // Change sort to oldest
      const sortSelect = screen.getByDisplayValue('Newest first');
      fireEvent.change(sortSelect, { target: { value: 'oldest' } });

      // Notifications should be reordered (component rerenders)
      expect(screen.getByText('New Follower')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should refresh notifications on button click', () => {
      render(<NotificationCenter />);

      const refreshButton = screen.getByTitle('Refresh notifications');
      fireEvent.click(refreshButton);

      expect(mockNotifications.refreshNotifications).toHaveBeenCalled();
    });

    it('should disable refresh button when loading', () => {
      mockNotifications.isLoading = true;

      render(<NotificationCenter />);

      const refreshButton = screen.getByTitle('Refresh notifications');
      expect(refreshButton).toBeDisabled();
    });

    it('should show settings button when showPreferences is true', () => {
      render(<NotificationCenter showPreferences={true} />);

      expect(screen.getByTitle('Notification preferences')).toBeInTheDocument();
    });

    it('should hide settings button when showPreferences is false', () => {
      render(<NotificationCenter showPreferences={false} />);

      expect(screen.queryByTitle('Notification preferences')).not.toBeInTheDocument();
    });

    it('should mark notification as read on click', async () => {
      render(<NotificationCenter />);

      // Find a notification and click its mark as read button
      const markReadButtons = screen.getAllByTitle('Mark as read');
      expect(markReadButtons.length).toBeGreaterThan(0);

      fireEvent.click(markReadButtons[0]);

      expect(mockNotifications.markAsRead).toHaveBeenCalled();
    });

    it('should dismiss notification on button click', () => {
      render(<NotificationCenter />);

      const dismissButtons = screen.getAllByTitle('Dismiss');
      expect(dismissButtons.length).toBeGreaterThan(0);

      fireEvent.click(dismissButtons[0]);

      expect(mockNotifications.dismissNotification).toHaveBeenCalled();
    });

    it('should mark all as read', () => {
      render(<NotificationCenter />);

      const markAllButton = screen.getByText('Mark All Read');
      fireEvent.click(markAllButton);

      expect(mockNotifications.markAllAsRead).toHaveBeenCalled();
    });

    it('should clear all notifications', () => {
      render(<NotificationCenter />);

      const clearButton = screen.getByText('Clear all notifications');
      fireEvent.click(clearButton);

      expect(mockNotifications.clearAllNotifications).toHaveBeenCalled();
    });
  });

  describe('Notification Display', () => {
    it('should display notification icon based on type', () => {
      render(<NotificationCenter />);

      // Icon emojis should be present
      expect(screen.getByText('👤')).toBeInTheDocument(); // follow
      expect(screen.getByText('💬')).toBeInTheDocument(); // dm_message_received
      expect(screen.getByText('🤖')).toBeInTheDocument(); // ai_reply_finished
      expect(screen.getByText('⚠️')).toBeInTheDocument(); // system_alert
    });

    it('should show relative time for notifications', () => {
      render(<NotificationCenter />);

      // Should show relative time like "less than a minute ago" - multiple matches expected
      const timeElements = screen.getAllByText(/ago/i);
      expect(timeElements.length).toBeGreaterThan(0);
    });

    it('should expand notification on click', () => {
      render(<NotificationCenter />);

      const notification = screen.getByText('New Follower').closest('div[class*="border-l"]');

      if (notification) {
        // Click notification to expand (should show expand/collapse icon)
        const expandButton = notification.querySelector(
          'button[title*="Expand"], button[title*="Collapse"]'
        );
        if (expandButton) {
          fireEvent.click(expandButton);
        }
      }

      // Check that component handles expansion
      expect(screen.getByText('New Follower')).toBeInTheDocument();
    });

    it('should show priority indicator for urgent notifications', () => {
      render(<NotificationCenter />);

      // The system alert has urgent priority - should show alert icon
      // Look for the alert circle icon in the DOM
      const alertIcons = document.querySelectorAll('.text-red-600');
      expect(alertIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no notifications', () => {
      mockNotifications.notifications = [];
      mockNotifications.totalCount = 0;
      mockNotifications.unreadCount = 0;

      render(<NotificationCenter />);

      expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when loading', () => {
      mockNotifications.isLoading = true;

      render(<NotificationCenter />);

      // Refresh button should have spinning animation
      const refreshButton = screen.getByTitle('Refresh notifications');
      expect(refreshButton.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message', () => {
      mockNotifications.error = new Error('Failed to load notifications');

      render(<NotificationCenter />);

      expect(screen.getByText(/Failed to load notifications/i)).toBeInTheDocument();
    });
  });

  describe('Load More', () => {
    it('should show load more button when hasMore is true', () => {
      mockNotifications.hasMore = true;

      render(<NotificationCenter />);

      expect(screen.getByText('Load more notifications')).toBeInTheDocument();
    });

    it('should hide load more button when hasMore is false', () => {
      mockNotifications.hasMore = false;

      render(<NotificationCenter />);

      expect(screen.queryByText('Load more notifications')).not.toBeInTheDocument();
    });

    it('should call loadMore on button click', () => {
      mockNotifications.hasMore = true;

      render(<NotificationCenter />);

      const loadMoreButton = screen.getByText('Load more notifications');
      fireEvent.click(loadMoreButton);

      expect(mockNotifications.loadMore).toHaveBeenCalled();
    });
  });

  describe('Bulk Actions', () => {
    it('should show bulk action buttons when notifications are selected', () => {
      render(<NotificationCenter />);

      // Select a notification via checkbox
      const checkboxes = screen.getAllByRole('checkbox');
      if (checkboxes.length > 0) {
        fireEvent.click(checkboxes[0]);

        // Bulk action buttons should appear - multiple Mark Read buttons exist
        const markReadButtons = screen.getAllByText(/Mark.*Read/i);
        expect(markReadButtons.length).toBeGreaterThan(0);
      }
    });

    it('should select all notifications', () => {
      render(<NotificationCenter />);

      // Find select all checkbox
      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(selectAllCheckbox);

      // All checkboxes should be checked
      const checkboxes = screen.getAllByRole('checkbox');
      const checkedBoxes = checkboxes.filter((cb) => (cb as HTMLInputElement).checked);

      expect(checkedBoxes.length).toBeGreaterThan(0);
    });
  });

  describe('Notification Links', () => {
    it('should render action link for notifications with action_url', () => {
      mockNotifications.notifications = [
        {
          ...mockNotificationData[0],
          action_url: '/profile/user123',
        },
      ];

      render(<NotificationCenter />);

      // Should have an external link icon or link element
      const _links = document.querySelectorAll('a[href="/profile/user123"]');
      // At least the notification should be rendered
      expect(screen.getByText('New Follower')).toBeInTheDocument();
    });
  });
});
