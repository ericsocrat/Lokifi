/**
 * @vitest-environment jsdom
 */
import { KeyboardShortcuts } from '@/components/markets/KeyboardShortcuts';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Keyboard: () => <div data-testid="keyboard-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

describe('KeyboardShortcuts', () => {
  beforeEach(() => {
    // Clear any existing event listeners
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any lingering modals
    document.body.innerHTML = '';
  });

  describe('Initial Render', () => {
    it('should render the floating button when closed', () => {
      render(<KeyboardShortcuts />);

      const button = screen.getByRole('button', { name: /keyboard shortcuts/i });
      expect(button).toBeInTheDocument();
      expect(screen.getByTestId('keyboard-icon')).toBeInTheDocument();
    });

    it('should not render the modal initially', () => {
      render(<KeyboardShortcuts />);

      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
      expect(screen.queryByTestId('x-icon')).not.toBeInTheDocument();
    });

    it('should have correct button title attribute', () => {
      render(<KeyboardShortcuts />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Keyboard Shortcuts (Press ?)');
    });
  });

  describe('Opening Modal', () => {
    it('should open modal when button is clicked', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcuts />);

      const button = screen.getByRole('button', { name: /keyboard shortcuts/i });
      await user.click(button);

      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });

    it('should open modal when ? key is pressed', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcuts />);

      await user.keyboard('?');

      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });

    it('should not open modal when ? is pressed if already open', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcuts />);

      // Open modal
      await user.keyboard('?');
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();

      // Try to open again
      await user.keyboard('?');

      // Should still only have one modal
      const modals = screen.getAllByText('Keyboard Shortcuts');
      expect(modals).toHaveLength(1);
    });

    it('should hide floating button when modal is open', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcuts />);

      const button = screen.getByRole('button', { name: /keyboard shortcuts/i });
      await user.click(button);

      // Original button should be gone
      expect(screen.queryByTitle('Keyboard Shortcuts (Press ?)')).not.toBeInTheDocument();
    });
  });

  describe('Closing Modal', () => {
    it('should close modal when X button is clicked', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcuts />);

      // Open modal
      await user.keyboard('?');
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();

      // Click close button
      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find((btn) => btn.querySelector('[data-testid="x-icon"]'));
      if (xButton) await user.click(xButton);

      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
    });

    it('should close modal when Escape key is pressed', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcuts />);

      // Open modal
      await user.keyboard('?');
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();

      // Close with Escape
      await user.keyboard('{Escape}');

      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
    });

    it('should show floating button after closing modal', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcuts />);

      // Open and close modal
      await user.keyboard('?');
      await user.keyboard('{Escape}');

      // Floating button should be back
      expect(screen.getByRole('button', { name: /keyboard shortcuts/i })).toBeInTheDocument();
    });
  });

  describe('Modal Content - Navigation Section', () => {
    it('should display Navigation section', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcuts />);

      await user.keyboard('?');

      expect(screen.getByText('Navigation')).toBeInTheDocument();
    });

    it('should display Focus search shortcut', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcuts />);

      await user.keyboard('?');

      expect(screen.getByText('Focus search')).toBeInTheDocument();
      expect(screen.getByText('/')).toBeInTheDocument();
    });

    it('should display Clear search / Close modal shortcut', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcuts />);

      await user.keyboard('?');

      expect(screen.getByText('Clear search / Close modal')).toBeInTheDocument();
      const escElements = screen.getAllByText('Esc');
      expect(escElements.length).toBeGreaterThanOrEqual(1);
    });
    it('should display Show keyboard shortcuts shortcut', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcuts />);

      await user.keyboard('?');

      expect(screen.getByText('Show keyboard shortcuts')).toBeInTheDocument();
      // ? appears in multiple places
      const questionMarks = screen.getAllByText('?');
      expect(questionMarks.length).toBeGreaterThan(0);
    });
  });

  describe('Modal Content - Actions Section', () => {
    it('should display Actions section', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcuts />);

      await user.keyboard('?');

      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('should display Refresh data shortcut', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcuts />);

      await user.keyboard('?');

      expect(screen.getByText('Refresh data')).toBeInTheDocument();
      expect(screen.getByText('R')).toBeInTheDocument();
    });

    it('should display Export to CSV shortcut', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcuts />);

      await user.keyboard('?');

      expect(screen.getByText('Export to CSV')).toBeInTheDocument();
      expect(screen.getByText('E')).toBeInTheDocument();
    });

    it('should display Toggle watchlist shortcut', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcuts />);

      await user.keyboard('?');

      expect(screen.getByText('Toggle watchlist')).toBeInTheDocument();
      expect(screen.getByText('W')).toBeInTheDocument();
    });
  });

  describe('Modal Content - Sorting Section', () => {
    it('should display Sorting section', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcuts />);

      await user.keyboard('?');

      expect(screen.getByText('Sorting')).toBeInTheDocument();
    });

    it('should display Sort by symbol shortcut', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcuts />);

      await user.keyboard('?');

      expect(screen.getByText('Sort by symbol')).toBeInTheDocument();
      expect(screen.getByText('S')).toBeInTheDocument();
    });

    it('should display Sort by price shortcut', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcuts />);

      await user.keyboard('?');

      expect(screen.getByText('Sort by price')).toBeInTheDocument();
      expect(screen.getByText('P')).toBeInTheDocument();
    });

    it('should display Sort by change % shortcut', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcuts />);

      await user.keyboard('?');

      expect(screen.getByText('Sort by change %')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();
    });

    it('should display Sort by market cap shortcut', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcuts />);

      await user.keyboard('?');

      expect(screen.getByText('Sort by market cap')).toBeInTheDocument();
      expect(screen.getByText('M')).toBeInTheDocument();
    });
  });

  describe('Modal Footer', () => {
    it('should display footer with close hint', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcuts />);

      await user.keyboard('?');

      expect(screen.getByText(/Press.*to close/i)).toBeInTheDocument();
    });

    it('should display Esc key in footer', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcuts />);

      await user.keyboard('?');

      // Esc appears in both the shortcuts list and the footer
      const escKeys = screen.getAllByText('Esc');
      expect(escKeys.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Keyboard Event Handling', () => {
    it('should only respond to ? when modal is closed', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcuts />);

      // Modal is closed, ? should open it
      await user.keyboard('?');
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });

    it('should only respond to Escape when modal is open', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcuts />);

      // Try Escape when closed (should do nothing)
      await user.keyboard('{Escape}');
      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();

      // Open modal
      await user.keyboard('?');
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();

      // Now Escape should close it
      await user.keyboard('{Escape}');
      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
    });

    it('should not interfere with other keyboard events', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcuts />);

      // Type other keys (should not open/close modal)
      await user.keyboard('abc123');

      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /keyboard shortcuts/i })).toBeInTheDocument();
    });
  });

  describe('Event Listener Cleanup', () => {
    it('should cleanup event listeners on unmount', () => {
      const { unmount } = render(<KeyboardShortcuts />);

      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });

  describe('Accessibility', () => {
    it('should have proper button role for floating button', () => {
      render(<KeyboardShortcuts />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should have keyboard icon in floating button', () => {
      render(<KeyboardShortcuts />);

      expect(screen.getByTestId('keyboard-icon')).toBeInTheDocument();
    });

    it('should render all kbd elements for shortcuts', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcuts />);

      await user.keyboard('?');

      // Should have multiple kbd elements for all shortcuts
      const kbdElements = document.querySelectorAll('kbd');
      expect(kbdElements.length).toBeGreaterThan(10); // At least 11 shortcuts listed
    });
  });
});
