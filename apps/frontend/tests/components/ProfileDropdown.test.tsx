import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProfileDropdown } from '@/components/dashboard/ProfileDropdown';

describe('ProfileDropdown', () => {
  const defaultProps = {
    userName: 'John Doe',
    userEmail: 'john@example.com',
    onLogout: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the trigger button', () => {
      render(<ProfileDropdown {...defaultProps} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should show user initial on avatar', () => {
      render(<ProfileDropdown {...defaultProps} />);
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('should use uppercase for initial', () => {
      render(<ProfileDropdown userName="john" />);
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('should use default userName when not provided', () => {
      render(<ProfileDropdown />);
      expect(screen.getByText('U')).toBeInTheDocument(); // 'User' default
    });

    it('should not show dropdown by default', () => {
      render(<ProfileDropdown {...defaultProps} />);
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });
  });

  describe('Dropdown Toggle', () => {
    it('should open dropdown when clicking trigger', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown {...defaultProps} />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('should close dropdown when clicking trigger again', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown {...defaultProps} />);

      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Profile')).toBeInTheDocument();

      await user.click(screen.getAllByRole('button')[0]);
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });

    it('should rotate chevron when open', async () => {
      const user = userEvent.setup();
      const { container } = render(<ProfileDropdown {...defaultProps} />);

      const chevron = container.querySelector('.lucide-chevron-down');
      expect(chevron).not.toHaveClass('rotate-180');

      await user.click(screen.getByRole('button'));
      expect(chevron).toHaveClass('rotate-180');
    });
  });

  describe('Dropdown Content', () => {
    it('should display user name in dropdown', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown {...defaultProps} />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should display user email in dropdown', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown {...defaultProps} />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should display default email when not provided', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    it('should show Profile menu item', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown {...defaultProps} />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('should show Settings menu item', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown {...defaultProps} />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should show Log out menu item', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown {...defaultProps} />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Log out')).toBeInTheDocument();
    });
  });

  describe('Menu Actions', () => {
    it('should close dropdown when clicking Profile', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown {...defaultProps} />);

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Profile'));

      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });

    it('should close dropdown when clicking Settings', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown {...defaultProps} />);

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Settings'));

      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    it('should call onLogout when clicking Log out', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown {...defaultProps} />);

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Log out'));

      expect(defaultProps.onLogout).toHaveBeenCalledTimes(1);
    });

    it('should close dropdown when clicking Log out', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown {...defaultProps} />);

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Log out'));

      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });

    it('should handle missing onLogout callback', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown userName="Test" userEmail="test@test.com" />);

      await user.click(screen.getByRole('button'));
      // Should not throw when onLogout is not provided
      await user.click(screen.getByText('Log out'));
    });
  });

  describe('Click Outside', () => {
    it('should close dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <ProfileDropdown {...defaultProps} />
          <button data-testid="outside">Outside</button>
        </div>
      );

      await user.click(screen.getAllByRole('button')[0]);
      expect(screen.getByText('Profile')).toBeInTheDocument();

      // Simulate mousedown outside
      fireEvent.mouseDown(screen.getByTestId('outside'));

      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });

    it('should not close dropdown when clicking inside', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown {...defaultProps} />);

      await user.click(screen.getByRole('button'));

      // Click on user name (inside dropdown)
      const userName = screen.getByText('John Doe');
      fireEvent.mouseDown(userName);

      // Dropdown should still be open
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });
  });

  describe('Visual Elements', () => {
    it('should render User icon', async () => {
      const user = userEvent.setup();
      const { container } = render(<ProfileDropdown {...defaultProps} />);

      await user.click(screen.getByRole('button'));

      expect(container.querySelector('.lucide-user')).toBeInTheDocument();
    });

    it('should render Settings icon', async () => {
      const user = userEvent.setup();
      const { container } = render(<ProfileDropdown {...defaultProps} />);

      await user.click(screen.getByRole('button'));

      expect(container.querySelector('.lucide-settings')).toBeInTheDocument();
    });

    it('should render LogOut icon', async () => {
      const user = userEvent.setup();
      const { container } = render(<ProfileDropdown {...defaultProps} />);

      await user.click(screen.getByRole('button'));

      expect(container.querySelector('.lucide-log-out')).toBeInTheDocument();
    });

    it('should render ChevronDown icon', () => {
      const { container } = render(<ProfileDropdown {...defaultProps} />);
      expect(container.querySelector('.lucide-chevron-down')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply blue background to avatar', () => {
      render(<ProfileDropdown {...defaultProps} />);
      const avatar = screen.getByText('J').closest('div');
      expect(avatar).toHaveClass('bg-blue-600');
    });

    it('should apply red color to Log out button', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown {...defaultProps} />);

      await user.click(screen.getByRole('button'));

      const logoutButton = screen.getByText('Log out').closest('button');
      expect(logoutButton).toHaveClass('text-red-400');
    });

    it('should apply rounded styling to dropdown', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown {...defaultProps} />);

      await user.click(screen.getByRole('button'));

      // Find the dropdown menu (the container with shadow-lg)
      const triggerButton = screen.getAllByRole('button')[0];
      const dropdown = triggerButton.nextElementSibling;
      expect(dropdown).toHaveClass('rounded-lg');
    });

    it('should position dropdown absolutely', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown {...defaultProps} />);

      await user.click(screen.getByRole('button'));

      const triggerButton = screen.getAllByRole('button')[0];
      const dropdown = triggerButton.nextElementSibling;
      expect(dropdown).toHaveClass('absolute');
    });

    it('should apply z-50 for proper stacking', async () => {
      const user = userEvent.setup();
      render(<ProfileDropdown {...defaultProps} />);

      await user.click(screen.getByRole('button'));

      const triggerButton = screen.getAllByRole('button')[0];
      const dropdown = triggerButton.nextElementSibling;
      expect(dropdown).toHaveClass('z-50');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single character name', () => {
      render(<ProfileDropdown userName="A" />);
      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('should handle empty string name', () => {
      render(<ProfileDropdown userName="" />);
      // Empty string first char is empty, so avatar shows nothing or default
      const avatar = screen.getByRole('button').querySelector('.bg-blue-600');
      expect(avatar).toBeInTheDocument();
    });

    it('should handle name with special characters', () => {
      render(<ProfileDropdown userName="@user" />);
      expect(screen.getByText('@')).toBeInTheDocument();
    });

    it('should handle lowercase name', () => {
      render(<ProfileDropdown userName="jane" />);
      expect(screen.getByText('J')).toBeInTheDocument(); // Should uppercase
    });
  });

  describe('Cleanup', () => {
    it('should remove event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      const { unmount } = render(<ProfileDropdown {...defaultProps} />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });
  });
});
