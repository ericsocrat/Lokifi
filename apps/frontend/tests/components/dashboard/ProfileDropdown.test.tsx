import { ProfileDropdown } from '@/components/dashboard/ProfileDropdown';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  User: () => <div data-testid="user-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  LogOut: () => <div data-testid="logout-icon" />,
  ChevronDown: ({ className }: { className?: string }) => (
    <div data-testid="chevron-icon" className={className} />
  ),
}));

describe('ProfileDropdown', () => {
  const mockOnLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render the dropdown trigger button', () => {
      render(<ProfileDropdown />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should display user initial in avatar', () => {
      render(<ProfileDropdown userName="John Doe" />);
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('should use default userName when not provided', () => {
      render(<ProfileDropdown />);
      expect(screen.getByText('U')).toBeInTheDocument(); // "User" default
    });

    it('should display ChevronDown icon', () => {
      render(<ProfileDropdown />);
      expect(screen.getByTestId('chevron-icon')).toBeInTheDocument();
    });

    it('should not show dropdown menu initially', () => {
      render(<ProfileDropdown />);
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });
  });

  describe('Opening Dropdown', () => {
    it('should open dropdown when trigger button is clicked', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown userName="Alice" userEmail="alice@example.com" />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    });

    it('should display all menu items when open', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Log out')).toBeInTheDocument();
    });

    it('should display user name and email in header', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown userName="Bob Smith" userEmail="bob@test.com" />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.getByText('bob@test.com')).toBeInTheDocument();
    });

    it('should rotate chevron icon when open', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown />);

      const chevron = screen.getByTestId('chevron-icon');
      expect(chevron).not.toHaveClass('rotate-180');

      await user.click(screen.getByRole('button'));

      expect(chevron).toHaveClass('rotate-180');
    });

    it('should display icons for each menu item', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
      expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
      expect(screen.getByTestId('logout-icon')).toBeInTheDocument();
    });
  });

  describe('Closing Dropdown', () => {
    it('should close dropdown when trigger button is clicked again', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown />);

      const button = screen.getByRole('button');

      // Open
      await user.click(button);
      expect(screen.getByText('Profile')).toBeInTheDocument();

      // Close
      await user.click(button);
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });

    it('should close dropdown when Profile item is clicked', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown />);

      await user.click(screen.getByRole('button'));

      const profileButton = screen.getByText('Profile');
      await user.click(profileButton);

      await waitFor(() => {
        expect(screen.queryByText('Settings')).not.toBeInTheDocument();
      });
    });

    it('should close dropdown when Settings item is clicked', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown />);

      await user.click(screen.getByRole('button'));

      const settingsButton = screen.getByText('Settings');
      await user.click(settingsButton);

      await waitFor(() => {
        expect(screen.queryByText('Profile')).not.toBeInTheDocument();
      });
    });

    it('should restore chevron rotation when closed', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown />);

      const button = screen.getByRole('button');
      const chevron = screen.getByTestId('chevron-icon');

      // Open
      await user.click(button);
      expect(chevron).toHaveClass('rotate-180');

      // Close
      await user.click(button);
      expect(chevron).not.toHaveClass('rotate-180');
    });
  });

  describe('Click Outside Behavior', () => {
    it('should close dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <div>
          <ProfileDropdown />
          <div data-testid="outside-element">Outside</div>
        </div>
      );

      // Open dropdown
      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Profile')).toBeInTheDocument();

      // Click outside
      const outsideElement = screen.getByTestId('outside-element');
      await user.click(outsideElement);

      await waitFor(() => {
        expect(screen.queryByText('Profile')).not.toBeInTheDocument();
      });
    });

    it('should not close when clicking inside dropdown', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown userName="Test User" />);

      // Open dropdown
      await user.click(screen.getByRole('button'));

      // Click on user name inside dropdown
      const userName = screen.getByText('Test User');
      await user.click(userName);

      // Dropdown should still be open (menu items visible)
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('should cleanup event listener on unmount', async () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      const { unmount } = render(<ProfileDropdown />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
    });
  });

  describe('Logout Functionality', () => {
    it('should call onLogout when Log out is clicked', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown onLogout={mockOnLogout} />);

      // Open dropdown
      await user.click(screen.getByRole('button'));

      // Click logout
      const logoutButton = screen.getByText('Log out');
      await user.click(logoutButton);

      expect(mockOnLogout).toHaveBeenCalledTimes(1);
    });

    it('should close dropdown after logout is clicked', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown onLogout={mockOnLogout} />);

      await user.click(screen.getByRole('button'));

      const logoutButton = screen.getByText('Log out');
      await user.click(logoutButton);

      await waitFor(() => {
        expect(screen.queryByText('Settings')).not.toBeInTheDocument();
      });
    });

    it('should not error if onLogout is not provided', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown />);

      await user.click(screen.getByRole('button'));

      const logoutButton = screen.getByText('Log out');

      // Should not throw error
      await expect(user.click(logoutButton)).resolves.not.toThrow();
    });
  });

  describe('User Information Display', () => {
    it('should display custom user name', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown userName="Jane Cooper" />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Jane Cooper')).toBeInTheDocument();
    });

    it('should display custom user email', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown userEmail="jane.cooper@company.com" />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('jane.cooper@company.com')).toBeInTheDocument();
    });

    it('should use default email when not provided', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown userName="Test User" />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    it('should extract first letter from userName for avatar', () => {
      render(<ProfileDropdown userName="Michael Jordan" />);
      expect(screen.getByText('M')).toBeInTheDocument();
    });

    it('should uppercase the first letter in avatar', () => {
      render(<ProfileDropdown userName="alice wonderland" />);
      expect(screen.getByText('A')).toBeInTheDocument();
    });
  });

  describe('Styling and CSS Classes', () => {
    it('should apply correct avatar styling', () => {
      render(<ProfileDropdown userName="Test" />);
      const avatar = screen.getByText('T');
      expect(avatar).toHaveClass('w-8', 'h-8', 'rounded-full', 'bg-blue-600');
    });

    it('should apply hover effect to trigger button', () => {
      render(<ProfileDropdown />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:bg-gray-100', 'dark:hover:bg-gray-800');
    });

    it('should have correct dropdown menu positioning', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown />);

      await user.click(screen.getByRole('button'));

      const dropdown = screen.getByText('Profile').closest('div');
      expect(dropdown).toHaveClass('absolute', 'right-0');
    });

    it('should apply red color to logout button', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown />);

      await user.click(screen.getByRole('button'));

      const logoutButton = screen.getByText('Log out');
      expect(logoutButton).toHaveClass('text-red-600', 'dark:text-red-400');
    });
  });

  describe('Accessibility', () => {
    it('should have proper button role for trigger', () => {
      render(<ProfileDropdown />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should have multiple clickable buttons when open', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown />);

      await user.click(screen.getByRole('button'));

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(4); // Trigger + Profile + Settings + Logout
    });

    it('should have proper z-index for dropdown overlay', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown />);

      await user.click(screen.getByRole('button'));

      const dropdown = screen.getByText('Profile').closest('div');
      expect(dropdown).toHaveClass('z-50');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty userName gracefully', () => {
      render(<ProfileDropdown userName="" />);

      // Should render button and not crash
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should handle very long user names', async () => {
      const user = userEvent.setup();
      const longName = 'A'.repeat(100);
      render(<ProfileDropdown userName={longName} />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it('should handle rapid open/close clicks', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown />);

      const button = screen.getByRole('button');

      // Rapid clicks
      await user.click(button);
      await user.click(button);
      await user.click(button);

      // Should be closed after odd number of clicks (3)
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('should maintain state across multiple interactions', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown userName="Consistent User" />);

      const button = screen.getByRole('button');

      // Open -> Close -> Open
      await user.click(button);
      await user.click(button);
      await user.click(button);

      // User name should still be correct
      expect(screen.getByText('Consistent User')).toBeInTheDocument();
    });
  });
});
