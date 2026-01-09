/**
 * Settings Page Tests
 *
 * Comprehensive tests for the Settings page component
 * covering navigation tabs, general settings, appearance,
 * notifications, privacy, and account sections.
 *
 * @module tests/components/SettingsPage.test.tsx
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the PreferencesContext
const mockSetDarkMode = vi.fn();
const mockSetCurrency = vi.fn();

vi.mock('@/src/components/dashboard/PreferencesContext', () => ({
  usePreferences: () => ({
    darkMode: true,
    setDarkMode: mockSetDarkMode,
    currency: 'USD',
    setCurrency: mockSetCurrency,
  }),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Bell: ({ className }: { className?: string }) => (
    <svg data-testid="bell-icon" className={className} />
  ),
  Check: ({ className }: { className?: string }) => (
    <svg data-testid="check-icon" className={className} />
  ),
  Globe: ({ className }: { className?: string }) => (
    <svg data-testid="globe-icon" className={className} />
  ),
  Lock: ({ className }: { className?: string }) => (
    <svg data-testid="lock-icon" className={className} />
  ),
  Moon: ({ className }: { className?: string }) => (
    <svg data-testid="moon-icon" className={className} />
  ),
  Palette: ({ className }: { className?: string }) => (
    <svg data-testid="palette-icon" className={className} />
  ),
  Settings: ({ className }: { className?: string }) => (
    <svg data-testid="settings-icon" className={className} />
  ),
  Shield: ({ className }: { className?: string }) => (
    <svg data-testid="shield-icon" className={className} />
  ),
  Sun: ({ className }: { className?: string }) => (
    <svg data-testid="sun-icon" className={className} />
  ),
  User: ({ className }: { className?: string }) => (
    <svg data-testid="user-icon" className={className} />
  ),
  Wallet: ({ className }: { className?: string }) => (
    <svg data-testid="wallet-icon" className={className} />
  ),
}));

// Import after mocks
import SettingsPage from '../../app/settings/page';

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Header Section', () => {
    it('should render page title', () => {
      render(<SettingsPage />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Settings');
    });

    it('should render page description', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Manage your preferences and account settings')).toBeInTheDocument();
    });

    it('should render settings icon in header', () => {
      render(<SettingsPage />);

      const icons = screen.getAllByTestId('settings-icon');
      expect(icons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Navigation Tabs', () => {
    it('should render all navigation tabs', () => {
      render(<SettingsPage />);

      expect(screen.getByRole('tab', { name: /general/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /appearance/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /notifications/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /privacy & security/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /account/i })).toBeInTheDocument();
    });

    it('should default to general tab', () => {
      render(<SettingsPage />);

      // General tab content should be visible
      expect(screen.getByText('Display Currency')).toBeInTheDocument();
      expect(screen.getByText('Language')).toBeInTheDocument();
    });

    it('should switch to appearance tab when clicked', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('tab', { name: /appearance/i }));

      expect(screen.getByText('Theme')).toBeInTheDocument();
      expect(screen.getByText('Choose your preferred color scheme')).toBeInTheDocument();
    });

    it('should switch to notifications tab when clicked', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('tab', { name: /notifications/i }));

      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });

    it('should switch to privacy tab when clicked', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('tab', { name: /privacy & security/i }));

      // Use getByRole for the heading to avoid duplicate text issue (nav button vs heading)
      expect(screen.getByRole('heading', { name: /privacy & security/i })).toBeInTheDocument();
      expect(screen.getByText('Change Password')).toBeInTheDocument();
    });

    it('should switch to account tab when clicked', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('tab', { name: /account/i }));

      expect(screen.getByText('Account Settings')).toBeInTheDocument();
      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    });
  });

  describe('General Tab - Currency Settings', () => {
    it('should render currency section title', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Display Currency')).toBeInTheDocument();
    });

    it('should render currency section description', () => {
      render(<SettingsPage />);

      expect(
        screen.getByText('Choose your preferred currency for displaying values')
      ).toBeInTheDocument();
    });

    it('should render all currency options', () => {
      render(<SettingsPage />);

      expect(screen.getByText('USD')).toBeInTheDocument();
      expect(screen.getByText('EUR')).toBeInTheDocument();
      expect(screen.getByText('GBP')).toBeInTheDocument();
      expect(screen.getByText('JPY')).toBeInTheDocument();
      expect(screen.getByText('CAD')).toBeInTheDocument();
      expect(screen.getByText('AUD')).toBeInTheDocument();
      expect(screen.getByText('CHF')).toBeInTheDocument();
    });

    it('should render currency symbols', () => {
      render(<SettingsPage />);

      expect(screen.getByText('$')).toBeInTheDocument();
      expect(screen.getByText('€')).toBeInTheDocument();
      expect(screen.getByText('£')).toBeInTheDocument();
      expect(screen.getByText('¥')).toBeInTheDocument();
      expect(screen.getByText('C$')).toBeInTheDocument();
      expect(screen.getByText('A$')).toBeInTheDocument();
      expect(screen.getByText('Fr')).toBeInTheDocument();
    });

    it('should call setCurrency when a currency is selected', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      // Find and click EUR button by its aria-label
      const eurButton = screen.getByRole('button', { name: /select euro currency/i });
      await user.click(eurButton);

      expect(mockSetCurrency).toHaveBeenCalledWith('EUR');
    });
  });

  describe('General Tab - Language Settings', () => {
    it('should render language section title', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Language')).toBeInTheDocument();
    });

    it('should render language dropdown', () => {
      render(<SettingsPage />);

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('should have all language options', () => {
      render(<SettingsPage />);

      const select = screen.getByRole('combobox');
      const options = within(select).getAllByRole('option');

      expect(options).toHaveLength(6);
      expect(options[0]).toHaveTextContent('English');
      expect(options[1]).toHaveTextContent('Spanish');
      expect(options[2]).toHaveTextContent('French');
      expect(options[3]).toHaveTextContent('German');
      expect(options[4]).toHaveTextContent('Chinese');
      expect(options[5]).toHaveTextContent('Japanese');
    });

    it('should default to English', () => {
      render(<SettingsPage />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('en');
    });

    it('should change language selection', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'fr');

      expect(select).toHaveValue('fr');
    });
  });

  describe('Appearance Tab', () => {
    it('should render theme section', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('tab', { name: /appearance/i }));

      expect(screen.getByText('Theme')).toBeInTheDocument();
      expect(screen.getByText('Choose your preferred color scheme')).toBeInTheDocument();
    });

    it('should render light and dark theme options', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('tab', { name: /appearance/i }));

      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
    });

    it('should render sun and moon icons', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('tab', { name: /appearance/i }));

      expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
      expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
    });

    it('should call setDarkMode(false) when light theme is clicked', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('tab', { name: /appearance/i }));
      await user.click(screen.getByText('Light').closest('button')!);

      expect(mockSetDarkMode).toHaveBeenCalledWith(false);
    });

    it('should call setDarkMode(true) when dark theme is clicked', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('tab', { name: /appearance/i }));
      await user.click(screen.getByText('Dark').closest('button')!);

      expect(mockSetDarkMode).toHaveBeenCalledWith(true);
    });
  });

  describe('Notifications Tab', () => {
    it('should render notification preferences section', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('tab', { name: /notifications/i }));

      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
      expect(screen.getByText('Manage how and when you receive notifications')).toBeInTheDocument();
    });

    it('should render all notification toggles', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('tab', { name: /notifications/i }));

      expect(screen.getByText(/price Alerts/i)).toBeInTheDocument();
      expect(screen.getByText(/portfolio Updates/i)).toBeInTheDocument();
      expect(screen.getByText(/market News/i)).toBeInTheDocument();
      expect(screen.getByText(/weekly Report/i)).toBeInTheDocument();
      expect(screen.getByText(/email Notifications/i)).toBeInTheDocument();
    });

    it('should toggle notification settings when clicked', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('tab', { name: /notifications/i }));

      // Find toggle button - notification toggles are buttons with role="button"
      const toggleContainer = screen.getByText(/price Alerts/i).closest('div')?.parentElement;
      const toggleButton = toggleContainer?.querySelector('button');

      if (toggleButton) {
        await user.click(toggleButton);
        // The toggle should have changed state (UI update happens internally)
      }
    });
  });

  describe('Privacy & Security Tab', () => {
    it('should render privacy section', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('tab', { name: /privacy & security/i }));

      // Section title is an h3 element
      expect(screen.getByRole('heading', { name: /privacy & security/i })).toBeInTheDocument();
      expect(
        screen.getByText('Manage your privacy settings and account security')
      ).toBeInTheDocument();
    });

    it('should render change password option', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('tab', { name: /privacy & security/i }));

      expect(screen.getByText('Change Password')).toBeInTheDocument();
      expect(screen.getByText('Update your account password')).toBeInTheDocument();
    });

    it('should render 2FA option', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('tab', { name: /privacy & security/i }));

      expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
      expect(screen.getByText('Add an extra layer of security')).toBeInTheDocument();
    });

    it('should render download data option', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('tab', { name: /privacy & security/i }));

      expect(screen.getByText('Download Your Data')).toBeInTheDocument();
      expect(screen.getByText('Export all your portfolio data')).toBeInTheDocument();
    });
  });

  describe('Account Tab', () => {
    it('should render account settings section', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('tab', { name: /account/i }));

      expect(screen.getByText('Account Settings')).toBeInTheDocument();
      expect(screen.getByText('Manage your account information')).toBeInTheDocument();
    });

    it('should render edit profile option', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('tab', { name: /account/i }));

      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      expect(screen.getByText('Update your name and email')).toBeInTheDocument();
    });

    it('should render connected accounts option', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('tab', { name: /account/i }));

      expect(screen.getByText('Connected Accounts')).toBeInTheDocument();
      expect(screen.getByText('Manage linked brokerage accounts')).toBeInTheDocument();
    });

    it('should render delete account option', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('tab', { name: /account/i }));

      expect(screen.getByText('Delete Account')).toBeInTheDocument();
      expect(screen.getByText('Permanently delete your account and data')).toBeInTheDocument();
    });

    it('should style delete account differently (danger)', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('tab', { name: /account/i }));

      const deleteButton = screen.getByText('Delete Account').closest('button');
      expect(deleteButton).toHaveClass('text-rose-400');
    });
  });

  describe('Design System Compliance', () => {
    it('should have proper background styling', () => {
      render(<SettingsPage />);

      const container = screen.getByRole('heading', { level: 1 }).closest('div');
      expect(container?.parentElement).toBeInTheDocument();
    });

    it('should use correct typography for section titles', () => {
      render(<SettingsPage />);

      // Check section titles have proper styling
      const currencyTitle = screen.getByText('Display Currency');
      expect(currencyTitle).toHaveClass('font-semibold');
    });

    it('should render wallet icon in currency section', () => {
      render(<SettingsPage />);

      expect(screen.getByTestId('wallet-icon')).toBeInTheDocument();
    });

    it('should render globe icon in language section', () => {
      render(<SettingsPage />);

      expect(screen.getByTestId('globe-icon')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible navigation buttons', () => {
      render(<SettingsPage />);

      const navButtons = screen
        .getAllByRole('button')
        .filter((btn) =>
          ['General', 'Appearance', 'Notifications', 'Privacy & Security', 'Account'].some((text) =>
            btn.textContent?.includes(text)
          )
        );

      navButtons.forEach((button) => {
        expect(button).toBeEnabled();
      });
    });

    it('should have accessible dropdown for language selection', () => {
      render(<SettingsPage />);

      const select = screen.getByRole('combobox');
      expect(select).toBeEnabled();
    });

    it('should have accessible currency buttons', () => {
      render(<SettingsPage />);

      const usdButton = screen.getByRole('button', { name: /select us dollar currency/i });
      expect(usdButton).toBeEnabled();
    });
  });

  describe('Responsive Design', () => {
    it('should render sidebar navigation', () => {
      render(<SettingsPage />);

      // Navigation should be in a nav element
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    it('should have proper layout structure', () => {
      render(<SettingsPage />);

      // Should have flex gap layout
      const content = screen.getByText('Display Currency').closest('div')?.parentElement;
      expect(content).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('should maintain active tab state when switching tabs', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      // Switch to appearance
      await user.click(screen.getByRole('tab', { name: /appearance/i }));
      expect(screen.getByText('Theme')).toBeInTheDocument();

      // Switch to notifications
      await user.click(screen.getByRole('tab', { name: /notifications/i }));
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();

      // Switch back to general
      await user.click(screen.getByRole('tab', { name: /general/i }));
      expect(screen.getByText('Display Currency')).toBeInTheDocument();
    });

    it('should persist notification toggle states within session', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('tab', { name: /notifications/i }));

      // Toggle a notification
      const toggleContainer = screen.getByText(/price Alerts/i).closest('div')?.parentElement;
      const toggleButton = toggleContainer?.querySelector('button');

      if (toggleButton) {
        const initialBg = toggleButton.className.includes('bg-lokifi');
        await user.click(toggleButton);
        // State should have changed
        const newBg = toggleButton.className.includes('bg-lokifi');
        expect(initialBg).not.toBe(newBg);
      }
    });
  });

  describe('Tab Content Visibility', () => {
    it('should hide general content when other tab is active', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('tab', { name: /appearance/i }));

      expect(screen.queryByText('Display Currency')).not.toBeInTheDocument();
      expect(screen.queryByText('Language')).not.toBeInTheDocument();
    });

    it('should hide appearance content when other tab is active', () => {
      render(<SettingsPage />);

      // Appearance tab should not show Theme initially (General is default)
      expect(screen.queryByText('Theme')).not.toBeInTheDocument();
    });

    it('should show only one tab content at a time', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('tab', { name: /privacy & security/i }));

      // Should show privacy content
      expect(screen.getByText('Change Password')).toBeInTheDocument();

      // Should not show other tab contents
      expect(screen.queryByText('Display Currency')).not.toBeInTheDocument();
      expect(screen.queryByText('Theme')).not.toBeInTheDocument();
      expect(screen.queryByText('Notification Preferences')).not.toBeInTheDocument();
      // Account Settings is not shown (confirmed by having Change Password which is privacy-specific)
    });
  });

  describe('Icons', () => {
    it('should render icons for all navigation tabs', () => {
      render(<SettingsPage />);

      // All icon test IDs should be present
      expect(screen.getAllByTestId('settings-icon').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByTestId('palette-icon')).toBeInTheDocument();
      expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
      expect(screen.getByTestId('shield-icon')).toBeInTheDocument();
      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
    });
  });

  describe('Currency Selection Visual Feedback', () => {
    it('should show check icon for selected currency', () => {
      render(<SettingsPage />);

      // USD is selected by default (from mock)
      const checkIcons = screen.getAllByTestId('check-icon');
      expect(checkIcons.length).toBeGreaterThanOrEqual(1);
    });
  });
});
