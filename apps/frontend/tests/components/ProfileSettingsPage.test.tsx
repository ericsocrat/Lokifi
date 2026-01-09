/**
 * ProfileSettingsPage.test.tsx
 * Tests for profile/settings page
 *
 * Tests cover:
 * - Loading state
 * - Tab navigation (general, notifications, privacy, danger)
 * - General tab: account info form (name, timezone, language)
 * - Notifications tab: email and push notification toggles
 * - Privacy tab: data export functionality
 * - Danger zone tab: delete account warning
 * - API interactions (fetch settings, update settings)
 * - Error handling and success messages
 * - Verified badge display
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProfileSettingsPage from '../../app/profile/settings/page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/profile/settings',
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock Navbar to avoid AuthProvider dependency
vi.mock('@/src/components/Navbar', () => ({
  Navbar: () => <nav data-testid="navbar">Navbar</nav>,
}));

// Mock authToken
let authTokenValue: string | null = 'test-token';
vi.mock('@/src/lib/api/auth', () => ({
  authToken: () => authTokenValue,
}));

// Mock data
const mockUserSettings = {
  full_name: 'John Doe',
  email: 'john@example.com',
  timezone: 'America/New_York',
  language: 'en',
  is_verified: true,
  is_active: true,
};

const mockNotificationPrefs = {
  email_enabled: true,
  email_follows: true,
  email_messages: false,
  push_enabled: true,
  push_messages: true,
};

// Setup fetch mock
const mockFetch = vi.fn();

describe('ProfileSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authTokenValue = 'test-token';

    // Default successful responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/profile/settings/user')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUserSettings),
        });
      }
      if (url.includes('/api/profile/settings/notifications')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockNotificationPrefs),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Loading State', () => {
    it('shows loading spinner while fetching settings', async () => {
      // Make fetch hang
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<ProfileSettingsPage />);

      // Should show loading spinner
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('hides loading state after data loads', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });

      // Loading spinner should be gone
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });
  });

  describe('Header & Navigation', () => {
    it('renders page header with title', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });
    });

    it('renders back button linking to profile', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        const backLink = screen.getByRole('link', { name: '' });
        expect(backLink).toHaveAttribute('href', '/profile');
      });
    });

    it('renders navbar component', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('navbar')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('renders all tab buttons', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /General/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Notifications/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Privacy/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Danger Zone/i })).toBeInTheDocument();
      });
    });

    it('shows general tab by default', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Account Information')).toBeInTheDocument();
      });
    });

    it('switches to notifications tab when clicked', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Account Information')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));

      await waitFor(() => {
        expect(screen.getByText('Email Notifications')).toBeInTheDocument();
        expect(screen.getByText('Push Notifications')).toBeInTheDocument();
      });
    });

    it('switches to privacy tab when clicked', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Account Information')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Privacy/i }));

      await waitFor(() => {
        expect(screen.getByText('Data & Privacy')).toBeInTheDocument();
        expect(screen.getByText('Export Your Data')).toBeInTheDocument();
      });
    });

    it('switches to danger zone tab when clicked', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Account Information')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Danger Zone/i }));

      await waitFor(() => {
        // Find the button specifically (separate from the heading)
        expect(screen.getByRole('button', { name: /Delete Account/i })).toBeInTheDocument();
      });
    });

    it('highlights active tab', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        const generalTab = screen.getByRole('button', { name: /General/i });
        expect(generalTab).toHaveClass('bg-lokifi');
      });

      fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));

      await waitFor(() => {
        const notificationsTab = screen.getByRole('button', { name: /Notifications/i });
        expect(notificationsTab).toHaveClass('bg-lokifi');
      });
    });
  });

  describe('General Tab', () => {
    it('displays full name input with value', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('Your full name');
        expect(nameInput).toHaveValue('John Doe');
      });
    });

    it('displays email input as disabled', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        const emailInput = screen.getByDisplayValue('john@example.com');
        expect(emailInput).toBeDisabled();
      });
    });

    it('displays verified badge for verified users', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Verified')).toBeInTheDocument();
      });
    });

    it('hides verified badge for unverified users', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/profile/settings/user')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ ...mockUserSettings, is_verified: false }),
          });
        }
        if (url.includes('/api/profile/settings/notifications')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockNotificationPrefs),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
      });

      expect(screen.queryByText('Verified')).not.toBeInTheDocument();
    });

    it('displays timezone select with options', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        const timezoneSelect = screen.getByDisplayValue('Eastern Time (ET)');
        expect(timezoneSelect).toBeInTheDocument();
      });
    });

    it('displays language select with options', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        const languageSelect = screen.getByDisplayValue('English');
        expect(languageSelect).toBeInTheDocument();
      });
    });

    it('allows changing full name', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Your full name')).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText('Your full name');
      fireEvent.change(nameInput, { target: { value: 'Jane Smith' } });

      expect(nameInput).toHaveValue('Jane Smith');
    });

    it('allows changing timezone', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Eastern Time (ET)')).toBeInTheDocument();
      });

      const timezoneSelect = screen.getByDisplayValue('Eastern Time (ET)');
      fireEvent.change(timezoneSelect, { target: { value: 'America/Los_Angeles' } });

      expect(timezoneSelect).toHaveValue('America/Los_Angeles');
    });

    it('allows changing language', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('English')).toBeInTheDocument();
      });

      const languageSelect = screen.getByDisplayValue('English');
      fireEvent.change(languageSelect, { target: { value: 'es' } });

      expect(languageSelect).toHaveValue('es');
    });

    it('renders save changes button', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /save account information/i })
        ).toBeInTheDocument();
      });
    });

    it('calls update API when save is clicked', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /save account information/i })
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /save account information/i }));

      await waitFor(() => {
        const updateCall = mockFetch.mock.calls.find(
          (call) => call[0].includes('/api/profile/settings/user') && call[1]?.method === 'PUT'
        );
        expect(updateCall).toBeTruthy();
      });
    });
  });

  describe('Notifications Tab', () => {
    beforeEach(async () => {
      render(<ProfileSettingsPage />);
      await waitFor(() => {
        expect(screen.getByText('Account Information')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));
    });

    it('displays email notifications section', async () => {
      await waitFor(() => {
        expect(screen.getByText('Email Notifications')).toBeInTheDocument();
      });
    });

    it('displays push notifications section', async () => {
      await waitFor(() => {
        expect(screen.getByText('Push Notifications')).toBeInTheDocument();
      });
    });

    it('displays enable email notifications toggle', async () => {
      await waitFor(() => {
        expect(screen.getByText('Enable Email Notifications')).toBeInTheDocument();
        expect(screen.getByText('Receive notifications via email')).toBeInTheDocument();
      });
    });

    it('displays new followers toggle', async () => {
      await waitFor(() => {
        expect(screen.getByText('New Followers')).toBeInTheDocument();
        expect(screen.getByText('When someone follows you')).toBeInTheDocument();
      });
    });

    it('displays email messages toggle', async () => {
      await waitFor(() => {
        // "Messages" appears multiple times - look for the description text
        expect(screen.getByText('When you receive a message')).toBeInTheDocument();
      });
    });

    it('displays enable push notifications toggle', async () => {
      await waitFor(() => {
        expect(screen.getByText('Enable Push Notifications')).toBeInTheDocument();
        expect(screen.getByText('Receive notifications on your device')).toBeInTheDocument();
      });
    });

    it('displays push messages toggle', async () => {
      await waitFor(() => {
        expect(screen.getByText('Push notifications for messages')).toBeInTheDocument();
      });
    });

    it('renders save preferences button', async () => {
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /save notification preferences/i })
        ).toBeInTheDocument();
      });
    });

    it('allows toggling email notifications', async () => {
      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });

      const checkboxes = screen.getAllByRole('checkbox');
      const emailEnabledCheckbox = checkboxes[0];

      fireEvent.click(emailEnabledCheckbox);

      // Checkbox state should change
      expect(emailEnabledCheckbox).not.toBeChecked();
    });

    it('calls update API when save preferences is clicked', async () => {
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /save notification preferences/i })
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /save notification preferences/i }));

      await waitFor(() => {
        const updateCall = mockFetch.mock.calls.find(
          (call) =>
            call[0].includes('/api/profile/settings/notifications') && call[1]?.method === 'PUT'
        );
        expect(updateCall).toBeTruthy();
      });
    });
  });

  describe('Privacy Tab', () => {
    beforeEach(async () => {
      render(<ProfileSettingsPage />);
      await waitFor(() => {
        expect(screen.getByText('Account Information')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /Privacy/i }));
    });

    it('displays data & privacy header', async () => {
      await waitFor(() => {
        expect(screen.getByText('Data & Privacy')).toBeInTheDocument();
      });
    });

    it('displays export data option', async () => {
      await waitFor(() => {
        expect(screen.getByText('Export Your Data')).toBeInTheDocument();
        expect(screen.getByText(/Download all your profile data/i)).toBeInTheDocument();
      });
    });

    it('displays GDPR compliance note', async () => {
      await waitFor(() => {
        expect(screen.getByText(/GDPR compliant/i)).toBeInTheDocument();
      });
    });

    it('displays export button', async () => {
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Export/i })).toBeInTheDocument();
      });
    });

    it('calls export API when export button is clicked', async () => {
      // Mock URL.createObjectURL and URL.revokeObjectURL
      const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
      const mockRevokeObjectURL = vi.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      // Mock document.createElement for anchor element
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') {
          return mockAnchor as unknown as HTMLElement;
        }
        return originalCreateElement(tag);
      });

      // Mock successful export response
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/profile/enhanced/export')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: 'exported' }),
          });
        }
        if (url.includes('/api/profile/settings/user')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUserSettings),
          });
        }
        if (url.includes('/api/profile/settings/notifications')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockNotificationPrefs),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Export/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Export/i }));

      await waitFor(() => {
        const exportCall = mockFetch.mock.calls.find((call) =>
          call[0].includes('/api/profile/enhanced/export')
        );
        expect(exportCall).toBeTruthy();
      });

      vi.restoreAllMocks();
    });
  });

  describe('Danger Zone Tab', () => {
    beforeEach(async () => {
      render(<ProfileSettingsPage />);
      await waitFor(() => {
        expect(screen.getByText('Account Information')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /Danger Zone/i }));
    });

    it('displays danger zone header', async () => {
      await waitFor(() => {
        // Two elements with "Danger Zone" - header and tab
        const dangerTexts = screen.getAllByText(/Danger Zone/i);
        expect(dangerTexts.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('displays delete account section', async () => {
      await waitFor(() => {
        // Use button role to find the Delete Account button
        expect(screen.getByRole('button', { name: /Delete Account/i })).toBeInTheDocument();
      });
    });

    it('displays delete account warning message', async () => {
      await waitFor(() => {
        expect(
          screen.getByText(/Permanently delete your account and all associated data/i)
        ).toBeInTheDocument();
        expect(screen.getByText(/This action cannot be undone/i)).toBeInTheDocument();
      });
    });

    it('displays delete account button', async () => {
      await waitFor(() => {
        const deleteBtn = screen.getByRole('button', { name: /Delete Account/i });
        expect(deleteBtn).toBeInTheDocument();
      });
    });

    it('danger zone has warning styling', async () => {
      await waitFor(() => {
        const dangerContainer = document.querySelector('.bg-red-900\\/20');
        expect(dangerContainer).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error message when user settings fetch fails', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/profile/settings/user')) {
          // Throw an actual error to trigger the catch block
          return Promise.reject(new Error('Network error'));
        }
        if (url.includes('/api/profile/settings/notifications')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockNotificationPrefs),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load user settings/i)).toBeInTheDocument();
      });
    });

    it('shows error message when update fails', async () => {
      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/profile/settings/user')) {
          if (options?.method === 'PUT') {
            return Promise.resolve({
              ok: false,
              json: () => Promise.resolve({ detail: 'Update failed' }),
            });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUserSettings),
          });
        }
        if (url.includes('/api/profile/settings/notifications')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockNotificationPrefs),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /save account information/i })
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /save account information/i }));

      await waitFor(() => {
        expect(screen.getByText(/Failed to update settings/i)).toBeInTheDocument();
      });
    });

    it('shows error message when export fails', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/profile/enhanced/export')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ detail: 'Export failed' }),
          });
        }
        if (url.includes('/api/profile/settings/user')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUserSettings),
          });
        }
        if (url.includes('/api/profile/settings/notifications')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockNotificationPrefs),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Account Information')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Privacy/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Export/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Export/i }));

      await waitFor(() => {
        expect(screen.getByText(/Failed to export data/i)).toBeInTheDocument();
      });
    });

    it('displays error with red styling', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/profile/settings/user')) {
          // Throw an actual error to trigger the catch block
          return Promise.reject(new Error('Network error'));
        }
        if (url.includes('/api/profile/settings/notifications')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockNotificationPrefs),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<ProfileSettingsPage />);

      await waitFor(() => {
        // Wait for the error message to appear first
        expect(screen.getByText(/Failed to load user settings/i)).toBeInTheDocument();
      });

      // Then check for red styling
      const errorContainer = document.querySelector('.bg-red-900\\/20');
      expect(errorContainer).toBeInTheDocument();
    });
  });

  describe('Success Messages', () => {
    it('shows success message after successful update', async () => {
      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/profile/settings/user')) {
          if (options?.method === 'PUT') {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ ...mockUserSettings, message: 'Settings updated!' }),
            });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUserSettings),
          });
        }
        if (url.includes('/api/profile/settings/notifications')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockNotificationPrefs),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /save account information/i })
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /save account information/i }));

      await waitFor(() => {
        expect(screen.getByText(/Settings updated/i)).toBeInTheDocument();
      });
    });

    it('displays success message with green styling', async () => {
      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/profile/settings/user')) {
          if (options?.method === 'PUT') {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ ...mockUserSettings }),
            });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUserSettings),
          });
        }
        if (url.includes('/api/profile/settings/notifications')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockNotificationPrefs),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /save account information/i })
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /save account information/i }));

      await waitFor(() => {
        const successContainer = document.querySelector('.bg-green-900\\/20');
        expect(successContainer).toBeInTheDocument();
      });
    });
  });

  describe('Saving State', () => {
    it('shows saving state on button when saving', async () => {
      // Make update hang
      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/profile/settings/user')) {
          if (options?.method === 'PUT') {
            return new Promise(() => {}); // Never resolves
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUserSettings),
          });
        }
        if (url.includes('/api/profile/settings/notifications')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockNotificationPrefs),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /save account information/i })
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /save account information/i }));

      await waitFor(() => {
        expect(screen.getByText(/Saving.../i)).toBeInTheDocument();
      });
    });

    it('disables save button while saving', async () => {
      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/profile/settings/user')) {
          if (options?.method === 'PUT') {
            return new Promise(() => {}); // Never resolves
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUserSettings),
          });
        }
        if (url.includes('/api/profile/settings/notifications')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockNotificationPrefs),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /save account information/i })
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /save account information/i }));

      await waitFor(() => {
        // The aria-label stays the same, but button text changes to "Saving..."
        const saveButton = screen.getByRole('button', { name: /save account information/i });
        expect(saveButton).toBeDisabled();
      });
    });
  });

  describe('API Requests', () => {
    it('fetches user settings on mount', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        const userSettingsCall = mockFetch.mock.calls.find((call) =>
          call[0].includes('/api/profile/settings/user')
        );
        expect(userSettingsCall).toBeTruthy();
      });
    });

    it('fetches notification preferences on mount', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        const notificationCall = mockFetch.mock.calls.find((call) =>
          call[0].includes('/api/profile/settings/notifications')
        );
        expect(notificationCall).toBeTruthy();
      });
    });

    it('sends auth token with requests', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        const calls = mockFetch.mock.calls;
        const authCall = calls.find(
          (call) => call[1]?.headers?.Authorization === 'Bearer test-token'
        );
        expect(authCall).toBeTruthy();
      });
    });

    it('sends JSON content type for update requests', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /save account information/i })
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /save account information/i }));

      await waitFor(() => {
        const updateCall = mockFetch.mock.calls.find(
          (call) => call[0].includes('/api/profile/settings/user') && call[1]?.method === 'PUT'
        );
        expect(updateCall?.[1]?.headers?.['Content-Type']).toBe('application/json');
      });
    });
  });

  describe('Styling', () => {
    it('has dark theme background', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        const container = document.querySelector('.bg-surface-0');
        expect(container).toBeInTheDocument();
      });
    });

    it('has proper max width container', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        const container = document.querySelector('.max-w-4xl');
        expect(container).toBeInTheDocument();
      });
    });

    it('has responsive layout for tabs', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        const flexContainer = document.querySelector('.flex-col.lg\\:flex-row');
        expect(flexContainer).toBeInTheDocument();
      });
    });
  });

  describe('Form Labels', () => {
    it('displays full name label', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Full Name')).toBeInTheDocument();
      });
    });

    it('displays email address label', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Email Address')).toBeInTheDocument();
      });
    });

    it('displays timezone label', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Timezone')).toBeInTheDocument();
      });
    });

    it('displays language label', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Language')).toBeInTheDocument();
      });
    });
  });

  describe('Timezone Options', () => {
    it('displays all timezone options', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Eastern Time (ET)')).toBeInTheDocument();
        expect(screen.getByText('Central Time (CT)')).toBeInTheDocument();
        expect(screen.getByText('Mountain Time (MT)')).toBeInTheDocument();
        expect(screen.getByText('Pacific Time (PT)')).toBeInTheDocument();
        expect(screen.getByText('GMT (London)')).toBeInTheDocument();
        expect(screen.getByText('CET (Paris)')).toBeInTheDocument();
        expect(screen.getByText('JST (Tokyo)')).toBeInTheDocument();
        expect(screen.getByText('UTC')).toBeInTheDocument();
      });
    });
  });

  describe('Language Options', () => {
    it('displays all language options', async () => {
      render(<ProfileSettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Español' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Français' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Deutsch' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: '日本語' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: '中文' })).toBeInTheDocument();
      });
    });
  });
});
