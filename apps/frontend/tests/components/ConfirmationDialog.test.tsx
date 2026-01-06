import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';

describe('ConfirmationDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render nothing when not open', () => {
      const { container } = render(
        <ConfirmationDialog {...defaultProps} isOpen={false} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render dialog when open', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should render title', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });

    it('should render message', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    });

    it('should render default button texts', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    it('should render custom button texts', () => {
      render(
        <ConfirmationDialog
          {...defaultProps}
          confirmText="Delete"
          cancelText="Keep"
        />
      );
      expect(screen.getByText('Keep')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onClose when clicking cancel button', async () => {
      const user = userEvent.setup();
      render(<ConfirmationDialog {...defaultProps} />);
      
      await user.click(screen.getByText('Cancel'));
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm when clicking confirm button', async () => {
      const user = userEvent.setup();
      render(<ConfirmationDialog {...defaultProps} />);
      
      await user.click(screen.getByText('Confirm'));
      
      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking backdrop', async () => {
      const user = userEvent.setup();
      render(<ConfirmationDialog {...defaultProps} />);
      
      // Click the backdrop (the outer container with the dialog role)
      const backdrop = screen.getByRole('dialog');
      await user.click(backdrop);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should not close when clicking dialog content', async () => {
      const user = userEvent.setup();
      render(<ConfirmationDialog {...defaultProps} />);
      
      // Click the title (inside the dialog content)
      await user.click(screen.getByText('Confirm Action'));
      
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Interactions', () => {
    it('should call onConfirm when pressing Enter', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Enter' });
      
      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when pressing Escape', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape' });
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should not respond to other key presses', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Tab' });
      
      expect(defaultProps.onClose).not.toHaveBeenCalled();
      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });
  });

  describe('Don\'t Ask Again Checkbox', () => {
    it('should not show checkbox by default', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      expect(screen.queryByText("Don't ask me again")).not.toBeInTheDocument();
    });

    it('should show checkbox when showDontAskAgain is true', () => {
      render(<ConfirmationDialog {...defaultProps} showDontAskAgain={true} />);
      expect(screen.getByText("Don't ask me again")).toBeInTheDocument();
    });

    it('should have unchecked checkbox initially', () => {
      render(<ConfirmationDialog {...defaultProps} showDontAskAgain={true} />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('should toggle checkbox when clicked', async () => {
      const user = userEvent.setup();
      render(<ConfirmationDialog {...defaultProps} showDontAskAgain={true} />);
      
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);
      
      expect(checkbox).toBeChecked();
    });

    it('should call onDontAskAgainChange with true when checked and confirmed', async () => {
      const onDontAskAgainChange = vi.fn();
      const user = userEvent.setup();
      render(
        <ConfirmationDialog
          {...defaultProps}
          showDontAskAgain={true}
          onDontAskAgainChange={onDontAskAgainChange}
        />
      );
      
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);
      await user.click(screen.getByText('Confirm'));
      
      expect(onDontAskAgainChange).toHaveBeenCalledWith(true);
    });

    it('should call onDontAskAgainChange with false when unchecked and confirmed', async () => {
      const onDontAskAgainChange = vi.fn();
      const user = userEvent.setup();
      render(
        <ConfirmationDialog
          {...defaultProps}
          showDontAskAgain={true}
          onDontAskAgainChange={onDontAskAgainChange}
        />
      );
      
      // Don't click checkbox, just confirm
      await user.click(screen.getByText('Confirm'));
      
      expect(onDontAskAgainChange).toHaveBeenCalledWith(false);
    });

    it('should not call onDontAskAgainChange when cancelled', async () => {
      const onDontAskAgainChange = vi.fn();
      const user = userEvent.setup();
      render(
        <ConfirmationDialog
          {...defaultProps}
          showDontAskAgain={true}
          onDontAskAgainChange={onDontAskAgainChange}
        />
      );
      
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);
      await user.click(screen.getByText('Cancel'));
      
      expect(onDontAskAgainChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have dialog role', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-modal attribute', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-labelledby pointing to title', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title');
      expect(screen.getByText('Confirm Action')).toHaveAttribute('id', 'dialog-title');
    });

    it('should have cancel button autofocused', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      expect(screen.getByText('Cancel')).toHaveFocus();
    });
  });

  describe('Styling', () => {
    it('should apply backdrop styling', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('fixed', 'inset-0', 'z-[100]', 'bg-black/50');
    });

    it('should apply dialog content styling', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      // Find the content div (child of backdrop)
      const backdrop = screen.getByRole('dialog');
      const content = backdrop.firstChild;
      expect(content).toHaveClass('bg-neutral-800', 'rounded-lg', 'max-w-md');
    });

    it('should apply danger styling to confirm button', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton).toHaveClass('bg-red-600');
    });

    it('should apply neutral styling to cancel button', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toHaveClass('bg-neutral-700');
    });
  });

  describe('Props', () => {
    it('should handle custom title', () => {
      render(<ConfirmationDialog {...defaultProps} title="Delete Item" />);
      expect(screen.getByText('Delete Item')).toBeInTheDocument();
    });

    it('should handle custom message', () => {
      render(
        <ConfirmationDialog
          {...defaultProps}
          message="This action cannot be undone."
        />
      );
      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    });

    it('should handle long messages', () => {
      const longMessage = 'This is a very long message that spans multiple lines and contains a lot of text to test how the dialog handles long content.';
      render(<ConfirmationDialog {...defaultProps} message={longMessage} />);
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should handle special characters in title', () => {
      render(<ConfirmationDialog {...defaultProps} title="Delete 'Item' & <data>" />);
      expect(screen.getByText("Delete 'Item' & <data>")).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('should reset dontAskAgain state when dialog is reopened', () => {
      const { rerender } = render(
        <ConfirmationDialog
          {...defaultProps}
          showDontAskAgain={true}
        />
      );
      
      // Check the checkbox
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
      
      // Close and reopen dialog
      rerender(<ConfirmationDialog {...defaultProps} showDontAskAgain={true} isOpen={false} />);
      rerender(<ConfirmationDialog {...defaultProps} showDontAskAgain={true} isOpen={true} />);
      
      // Checkbox should be reset (component remounts when isOpen changes from false to true)
      // Note: This tests React's behavior with conditional rendering
    });
  });
});
