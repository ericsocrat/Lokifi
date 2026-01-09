/**
 * NotificationPreferencesPage Tests
 *
 * Tests for the notification preferences settings page component.
 * Covers authentication states, preference loading/saving, form controls, and UI.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationPreferencesPage from '../../app/notifications/preferences/page';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon">ArrowLeft</div>,
  Bell: () => <div data-testid="bell-icon">Bell</div>,
  RefreshCw: () => <div data-testid="refresh-icon">RefreshCw</div>,
  Save: () => <div data-testid="save-icon">Save</div>,
  Settings: () => <div data-testid="settings-icon">Settings</div>,
}));

// Mock useAuth hook
const mockUseAuth = vi.fn();
vi.mock('../../src/components/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock localStorage
const localStorageStore: Record<string, string> = {};
const mockGetItem = vi.fn((key: string) => localStorageStore[key] || null);
const mockSetItem = vi.fn((key: string, value: string) => {
  localStorageStore[key] = value;
});

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: mockGetItem,
    setItem: mockSetItem,
    removeItem: vi.fn((key: string) => {
      delete localStorageStore[key];
    }),
    clear: vi.fn(() => {
      Object.keys(localStorageStore).forEach((key) => delete localStorageStore[key]);
    }),
  },
  writable: true,
});

const mockPreferences = {
  id: 'pref-1',
  user_id: 'user-1',
  email_enabled: true,
  push_enabled: false,
  in_app_enabled: true,
  type_preferences: {
    follow_notifications: true,
    dm_notifications: true,
    ai_reply_notifications: false,
    mention_notifications: true,
    system_notifications: true,
  },
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
  timezone: 'America/New_York',
  daily_digest_enabled: true,
  weekly_digest_enabled: false,
  digest_time: '09:00',
};

describe('NotificationPreferencesPage', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageStore['token'] = 'test-token';
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('Unauthenticated State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: null });
    });

    it('shows access required message when not logged in', () => {
      render(<NotificationPreferencesPage />);

      expect(screen.getByText('Access Required')).toBeInTheDocument();
    });

    it('shows login prompt description', () => {
      render(<NotificationPreferencesPage />);

      expect(
        screen.getByText('Please log in to manage your notification preferences.')
      ).toBeInTheDocument();
    });

    it('renders Bell icon for unauthenticated state', () => {
      render(<NotificationPreferencesPage />);

      expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
    });

    it('provides link to login page', () => {
      render(<NotificationPreferencesPage />);

      const loginLink = screen.getByRole('link', { name: 'Log In' });
      expect(loginLink).toHaveAttribute('href', '/login');
    });
  });

  describe('Authenticated State - Page Header', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { id: 'user-1', username: 'testuser' } });
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockPreferences,
      });
    });

    it('renders page title', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
      });
    });

    it('renders page description', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(
          screen.getByText('Customize how and when you receive notifications.')
        ).toBeInTheDocument();
      });
    });

    it('displays Settings icon in header', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
      });
    });

    it('provides back link to notifications page', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        const backLink = screen.getByTestId('arrow-left-icon').closest('a');
        expect(backLink).toHaveAttribute('href', '/notifications');
      });
    });
  });

  describe('Loading State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { id: 'user-1', username: 'testuser' } });
      // Delay the response to show loading state
      fetchSpy.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => mockPreferences,
              });
            }, 100);
          })
      );
    });

    it('shows loading message while fetching preferences', () => {
      render(<NotificationPreferencesPage />);

      expect(screen.getByText('Loading preferences...')).toBeInTheDocument();
    });

    it('shows loading spinner', () => {
      const { container } = render(<NotificationPreferencesPage />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('General Settings Section', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { id: 'user-1', username: 'testuser' } });
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockPreferences,
      });
    });

    it('renders General Settings heading', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(screen.getByText('General Settings')).toBeInTheDocument();
      });
    });

    it('renders In-App Notifications toggle', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(screen.getByText('In-App Notifications')).toBeInTheDocument();
        expect(screen.getByText('Show notifications in the application')).toBeInTheDocument();
      });
    });

    it('renders Push Notifications toggle', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(screen.getByText('Push Notifications')).toBeInTheDocument();
        expect(
          screen.getByText('Browser push notifications when app is closed')
        ).toBeInTheDocument();
      });
    });

    it('renders Email Notifications toggle', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(screen.getByText('Email Notifications')).toBeInTheDocument();
        expect(screen.getByText('Send notifications to your email')).toBeInTheDocument();
      });
    });
  });

  describe('Notification Types Section', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { id: 'user-1', username: 'testuser' } });
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockPreferences,
      });
    });

    it('renders Notification Types heading', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(screen.getByText('Notification Types')).toBeInTheDocument();
      });
    });

    it('renders Follow Notifications toggle', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(screen.getByText('Follow Notifications')).toBeInTheDocument();
        expect(screen.getByText('When someone starts following you')).toBeInTheDocument();
      });
    });

    it('renders Direct Messages toggle', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(screen.getByText('Direct Messages')).toBeInTheDocument();
        expect(screen.getByText('When you receive a direct message')).toBeInTheDocument();
      });
    });

    it('renders AI Responses toggle', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(screen.getByText('AI Responses')).toBeInTheDocument();
        expect(screen.getByText('When AI assistant completes a response')).toBeInTheDocument();
      });
    });

    it('renders Mentions toggle', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(screen.getByText('Mentions')).toBeInTheDocument();
        expect(screen.getByText('When someone mentions you')).toBeInTheDocument();
      });
    });

    it('renders System Notifications toggle', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(screen.getByText('System Notifications')).toBeInTheDocument();
        expect(screen.getByText('Important system announcements')).toBeInTheDocument();
      });
    });
  });

  describe('Digest Settings Section', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { id: 'user-1', username: 'testuser' } });
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockPreferences,
      });
    });

    it('renders Digest Settings heading', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(screen.getByText('Digest Settings')).toBeInTheDocument();
      });
    });

    it('renders Daily Digest toggle', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(screen.getByText('Daily Digest')).toBeInTheDocument();
        expect(screen.getByText('Receive a daily summary of notifications')).toBeInTheDocument();
      });
    });

    it('renders Weekly Digest toggle', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(screen.getByText('Weekly Digest')).toBeInTheDocument();
        expect(screen.getByText('Receive a weekly summary of notifications')).toBeInTheDocument();
      });
    });

    it('shows Digest Time input when digest is enabled', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(screen.getByText('Digest Time')).toBeInTheDocument();
      });
    });
  });

  describe('Quiet Hours Section', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { id: 'user-1', username: 'testuser' } });
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockPreferences,
      });
    });

    it('renders Quiet Hours heading', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(screen.getByText('Quiet Hours')).toBeInTheDocument();
      });
    });

    it('renders Start Time input', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(screen.getByText('Start Time')).toBeInTheDocument();
      });
    });

    it('renders End Time input', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(screen.getByText('End Time')).toBeInTheDocument();
      });
    });

    it('shows quiet hours description', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(
          screen.getByText('During quiet hours, only urgent notifications will be delivered.')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Save Button', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { id: 'user-1', username: 'testuser' } });
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockPreferences,
      });
    });

    it('renders Save Preferences button', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /save notification preferences/i })
        ).toBeInTheDocument();
      });
    });

    it('displays Save icon in button', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('save-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Preference Toggle Interactions', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { id: 'user-1', username: 'testuser' } });
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockPreferences,
      });
    });

    it('allows toggling In-App Notifications', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(screen.getByText('In-App Notifications')).toBeInTheDocument();
      });

      // Find checkbox by its proximity to the label
      const checkboxes = screen.getAllByRole('checkbox');
      const inAppCheckbox = checkboxes[0]; // First checkbox is In-App Notifications

      expect(inAppCheckbox).toBeChecked();
      fireEvent.click(inAppCheckbox);
      expect(inAppCheckbox).not.toBeChecked();
    });

    it('allows toggling Push Notifications', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(screen.getByText('Push Notifications')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      const pushCheckbox = checkboxes[1]; // Second checkbox is Push Notifications

      expect(pushCheckbox).not.toBeChecked();
      fireEvent.click(pushCheckbox);
      expect(pushCheckbox).toBeChecked();
    });
  });

  describe('Save Preferences Flow', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { id: 'user-1', username: 'testuser' } });
    });

    it('calls save API when clicking save button', async () => {
      fetchSpy
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPreferences,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPreferences,
        });

      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(screen.getByText('Save Preferences')).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save notification preferences/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledTimes(2); // Load + Save
      });
    });

    it('shows success message after saving', async () => {
      fetchSpy
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPreferences,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPreferences,
        });

      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(screen.getByText('Save Preferences')).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save notification preferences/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Preferences saved successfully!')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { id: 'user-1', username: 'testuser' } });
    });

    it('shows error message when load fails', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
      });

      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(screen.getByText('HTTP 500')).toBeInTheDocument();
      });
    });

    it('shows error when no token available', async () => {
      delete localStorageStore['token'];

      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        expect(screen.getByText('No authentication token found')).toBeInTheDocument();
      });
    });
  });

  describe('UI Structure', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { id: 'user-1', username: 'testuser' } });
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockPreferences,
      });
    });

    it('has proper page layout with max-width container', async () => {
      const { container } = render(<NotificationPreferencesPage />);

      await waitFor(() => {
        const maxWidthContainer = container.querySelector('.max-w-4xl');
        expect(maxWidthContainer).toBeInTheDocument();
      });
    });

    it('renders sections with rounded card styling', async () => {
      const { container } = render(<NotificationPreferencesPage />);

      await waitFor(() => {
        const cards = container.querySelectorAll('.rounded-xl');
        expect(cards.length).toBeGreaterThan(0);
      });
    });

    it('has proper spacing between sections', async () => {
      const { container } = render(<NotificationPreferencesPage />);

      await waitFor(() => {
        const spacedContainer = container.querySelector('.space-y-8');
        expect(spacedContainer).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { id: 'user-1', username: 'testuser' } });
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockPreferences,
      });
    });

    it('has responsive grid for quiet hours inputs', async () => {
      const { container } = render(<NotificationPreferencesPage />);

      await waitFor(() => {
        const responsiveGrid = container.querySelector('.md\\:grid-cols-2');
        expect(responsiveGrid).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { id: 'user-1', username: 'testuser' } });
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockPreferences,
      });
    });

    it('has proper heading hierarchy', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1 });
        expect(h1).toHaveTextContent('Notification Preferences');
      });
    });

    it('has section headings at h2 level', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        const h2s = screen.getAllByRole('heading', { level: 2 });
        expect(h2s.length).toBe(4); // General, Types, Digest, Quiet Hours
      });
    });

    it('renders all checkboxes with proper role', async () => {
      render(<NotificationPreferencesPage />);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });
    });
  });
});
