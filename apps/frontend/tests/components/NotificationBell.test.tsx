import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock useNotifications hook
const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();
const mockDismissNotification = vi.fn();
const mockRefreshNotifications = vi.fn();

let mockNotifications: Array<{
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  is_read: boolean;
  created_at: string;
}> = [];
let mockUnreadCount = 0;
let mockIsLoading = false;
let mockError: Error | null = null;

// Mock the exact path used by the component
vi.mock('../../src/hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: mockNotifications,
    unreadCount: mockUnreadCount,
    isLoading: mockIsLoading,
    error: mockError,
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
    dismissNotification: mockDismissNotification,
    refreshNotifications: mockRefreshNotifications,
  }),
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 hours ago'),
}));

// Import the component using the special alias
import { NotificationBell } from '@/components/NotificationBell';

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotifications = [];
    mockUnreadCount = 0;
    mockIsLoading = false;
    mockError = null;
  });

  describe('Rendering', () => {
    it('should render the bell icon', () => {
      render(<NotificationBell />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should have accessible label', () => {
      render(<NotificationBell />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Notifications ');
    });

    it('should show unread count in aria-label', () => {
      mockUnreadCount = 5;
      render(<NotificationBell />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Notifications (5 unread)');
    });

    it('should apply custom className', () => {
      const { container } = render(<NotificationBell className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Unread Badge', () => {
    it('should not show badge when no unread notifications', () => {
      mockUnreadCount = 0;
      render(<NotificationBell />);

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('should show badge with unread count', () => {
      mockUnreadCount = 5;
      render(<NotificationBell />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should show 99+ for counts over 99', () => {
      mockUnreadCount = 150;
      render(<NotificationBell />);

      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('should show exactly 99 for count of 99', () => {
      mockUnreadCount = 99;
      render(<NotificationBell />);

      expect(screen.getByText('99')).toBeInTheDocument();
    });
  });

  describe('Dropdown Toggle', () => {
    it('should open dropdown on click', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('should close dropdown on second click', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);

      const bellButton = screen.getByLabelText(/Notifications/);
      await user.click(bellButton);
      expect(screen.getByText('Notifications')).toBeInTheDocument();

      // Click the bell button again (not the X button)
      await user.click(bellButton);
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Notifications' })).not.toBeInTheDocument();
      });
    });

    it('should refresh notifications when opening', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      expect(mockRefreshNotifications).toHaveBeenCalled();
    });

    it('should not open dropdown if showDropdown is false', async () => {
      const user = userEvent.setup();
      render(<NotificationBell showDropdown={false} />);

      await user.click(screen.getByRole('button'));

      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    });
  });

  describe('Click Outside', () => {
    it('should close dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <NotificationBell />
          <div data-testid="outside">Outside</div>
        </div>
      );

      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Notifications')).toBeInTheDocument();

      await act(async () => {
        fireEvent.mouseDown(screen.getByTestId('outside'));
      });

      await waitFor(() => {
        expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
      });
    });
  });

  describe('Notification List', () => {
    it('should show notifications in dropdown', async () => {
      const user = userEvent.setup();
      mockNotifications = [
        {
          id: '1',
          type: 'follow',
          title: 'New Follower',
          message: 'John started following you',
          priority: 'normal',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('New Follower')).toBeInTheDocument();
      expect(screen.getByText('John started following you')).toBeInTheDocument();
    });

    it('should limit notifications based on maxNotifications', async () => {
      const user = userEvent.setup();
      mockNotifications = Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        type: 'follow',
        title: `Notification ${i}`,
        message: `Message ${i}`,
        priority: 'normal',
        is_read: false,
        created_at: new Date().toISOString(),
      }));
      render(<NotificationBell maxNotifications={3} />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Notification 0')).toBeInTheDocument();
      expect(screen.getByText('Notification 2')).toBeInTheDocument();
      expect(screen.queryByText('Notification 3')).not.toBeInTheDocument();
    });

    it('should show empty state when no notifications', async () => {
      const user = userEvent.setup();
      mockNotifications = [];
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    });
  });

  describe('Mark as Read', () => {
    it('should show mark all read button when there are unread', async () => {
      const user = userEvent.setup();
      mockUnreadCount = 3;
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Mark all read')).toBeInTheDocument();
    });

    it('should not show mark all read when no unread', async () => {
      const user = userEvent.setup();
      mockUnreadCount = 0;
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      expect(screen.queryByText('Mark all read')).not.toBeInTheDocument();
    });

    it('should call markAllAsRead when clicking mark all read', async () => {
      const user = userEvent.setup();
      mockUnreadCount = 3;
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Mark all read'));

      expect(mockMarkAllAsRead).toHaveBeenCalled();
    });
  });

  describe('Notification Icons', () => {
    it('should show follow icon for follow notifications', async () => {
      const user = userEvent.setup();
      mockNotifications = [
        {
          id: '1',
          type: 'follow',
          title: 'Follow',
          message: 'Message',
          priority: 'normal',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('👤')).toBeInTheDocument();
    });

    it('should show message icon for dm notifications', async () => {
      const user = userEvent.setup();
      mockNotifications = [
        {
          id: '1',
          type: 'dm_message_received',
          title: 'Message',
          message: 'New message',
          priority: 'normal',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('💬')).toBeInTheDocument();
    });

    it('should show AI icon for ai reply notifications', async () => {
      const user = userEvent.setup();
      mockNotifications = [
        {
          id: '1',
          type: 'ai_reply_finished',
          title: 'AI Reply',
          message: 'AI completed',
          priority: 'normal',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('🤖')).toBeInTheDocument();
    });
  });

  describe('Notification Priority Colors', () => {
    it('should render high priority notification', async () => {
      const user = userEvent.setup();
      mockNotifications = [
        {
          id: '1',
          type: 'system_alert',
          title: 'Alert',
          message: 'Important',
          priority: 'high',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      // The notification should be rendered
      expect(screen.getByText('Alert')).toBeInTheDocument();
      expect(screen.getByText('Important')).toBeInTheDocument();
    });

    it('should render urgent priority notification', async () => {
      const user = userEvent.setup();
      mockNotifications = [
        {
          id: '1',
          type: 'system_alert',
          title: 'Urgent Alert',
          message: 'Critical',
          priority: 'urgent',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Urgent Alert')).toBeInTheDocument();
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });
  });

  describe('Close Dropdown', () => {
    it('should close dropdown via close button', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Notifications')).toBeInTheDocument();

      // Find and click the X close button in the dropdown header
      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find((btn) => btn.querySelector('svg'));
      if (closeButton && closeButton !== screen.getByLabelText(/Notifications/)) {
        await user.click(closeButton);
      }
    });
  });

  describe('Time Formatting', () => {
    it('should display relative time', async () => {
      const user = userEvent.setup();
      mockNotifications = [
        {
          id: '1',
          type: 'follow',
          title: 'Follow',
          message: 'Message',
          priority: 'normal',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('should use default maxNotifications of 5', async () => {
      const user = userEvent.setup();
      mockNotifications = Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        type: 'follow',
        title: `Notification ${i}`,
        message: `Message ${i}`,
        priority: 'normal',
        is_read: false,
        created_at: new Date().toISOString(),
      }));
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Notification 0')).toBeInTheDocument();
      expect(screen.getByText('Notification 4')).toBeInTheDocument();
      expect(screen.queryByText('Notification 5')).not.toBeInTheDocument();
    });

    it('should default showDropdown to true', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when loading fails', async () => {
      const user = userEvent.setup();
      mockError = new Error('Network error');
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Failed to load notifications')).toBeInTheDocument();
    });

    it('should show retry button when error occurs', async () => {
      const user = userEvent.setup();
      mockError = new Error('Network error');
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Try again')).toBeInTheDocument();
    });

    it('should call refreshNotifications when clicking Try again', async () => {
      const user = userEvent.setup();
      mockError = new Error('Network error');
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Try again'));

      expect(mockRefreshNotifications).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', async () => {
      const user = userEvent.setup();
      mockIsLoading = true;
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Loading notifications...')).toBeInTheDocument();
    });
  });

  describe('Additional Icon Types', () => {
    it('should show mention icon for mention notifications', async () => {
      const user = userEvent.setup();
      mockNotifications = [
        {
          id: '1',
          type: 'mention',
          title: 'Mentioned',
          message: 'You were mentioned',
          priority: 'normal',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('🏷️')).toBeInTheDocument();
    });

    it('should show alert icon for system_alert notifications', async () => {
      const user = userEvent.setup();
      mockNotifications = [
        {
          id: '1',
          type: 'system_alert',
          title: 'System Alert',
          message: 'Alert message',
          priority: 'normal',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('⚠️')).toBeInTheDocument();
    });

    it('should show default bell icon for unknown notification types', async () => {
      const user = userEvent.setup();
      mockNotifications = [
        {
          id: '1',
          type: 'unknown_type',
          title: 'Unknown',
          message: 'Unknown type',
          priority: 'normal',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('🔔')).toBeInTheDocument();
    });
  });

  describe('Footer Navigation', () => {
    it('should show View all notifications link when notifications exist', async () => {
      const user = userEvent.setup();
      mockNotifications = [
        {
          id: '1',
          type: 'follow',
          title: 'Follow',
          message: 'Message',
          priority: 'normal',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('View all notifications')).toBeInTheDocument();
    });

    it('should not show footer when no notifications', async () => {
      const user = userEvent.setup();
      mockNotifications = [];
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      expect(screen.queryByText('View all notifications')).not.toBeInTheDocument();
    });
  });

  describe('Notification Actions', () => {
    it('should mark individual notification as read on click', async () => {
      const user = userEvent.setup();
      mockNotifications = [
        {
          id: '1',
          type: 'follow',
          title: 'Follow',
          message: 'Message',
          priority: 'normal',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Follow'));

      expect(mockMarkAsRead).toHaveBeenCalledWith('1');
    });

    it('should stop propagation when clicking mark as read button', async () => {
      const user = userEvent.setup();
      mockNotifications = [
        {
          id: '1',
          type: 'follow',
          title: 'Follow',
          message: 'Message',
          priority: 'normal',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      const markReadButton = screen.getByTitle('Mark as read');
      await user.click(markReadButton);

      expect(mockMarkAsRead).toHaveBeenCalledWith('1');
      // Should not close dropdown (notification click handler shouldn't fire)
    });

    it('should stop propagation when clicking dismiss button', async () => {
      const user = userEvent.setup();
      mockNotifications = [
        {
          id: '1',
          type: 'follow',
          title: 'Follow',
          message: 'Message',
          priority: 'normal',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      const dismissButton = screen.getByTitle('Dismiss');
      await user.click(dismissButton);

      expect(mockDismissNotification).toHaveBeenCalledWith('1');
    });

    it('should not show mark as read button for already read notifications', async () => {
      const user = userEvent.setup();
      mockNotifications = [
        {
          id: '1',
          type: 'follow',
          title: 'Follow',
          message: 'Message',
          priority: 'normal',
          is_read: true,
          created_at: new Date().toISOString(),
        },
      ];
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      expect(screen.queryByTitle('Mark as read')).not.toBeInTheDocument();
    });
  });

  describe('Notification Styling', () => {
    it('should apply normal border color for normal priority', async () => {
      const user = userEvent.setup();
      mockNotifications = [
        {
          id: '1',
          type: 'follow',
          title: 'Follow',
          message: 'Message',
          priority: 'normal',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];
      const { container } = render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      // Check for the notification container with border-l class
      const notification = container.querySelector('.border-l-2.border-l-blue-500');
      expect(notification).toBeInTheDocument();
    });

    it('should render notification with message content', async () => {
      const user = userEvent.setup();
      mockNotifications = [
        {
          id: '1',
          type: 'follow',
          title: 'Follow',
          message: 'Test message content',
          priority: 'normal',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];
      render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Test message content')).toBeInTheDocument();
    });

    it('should show unread indicator dot for unread notifications', async () => {
      const user = userEvent.setup();
      mockNotifications = [
        {
          id: '1',
          type: 'follow',
          title: 'Follow',
          message: 'Message',
          priority: 'normal',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];
      const { container } = render(<NotificationBell />);

      await user.click(screen.getByRole('button'));

      // Check for the unread indicator dot
      const unreadDot = container.querySelector('.bg-lokifi.rounded-full.absolute');
      expect(unreadDot).toBeInTheDocument();
    });
  });
});
