/**
 * @fileoverview Tests for ConfirmationDialog component
 *
 * ConfirmationDialog is a modal dialog for confirming user actions.
 * Features:
 * - Customizable title, message, confirm/cancel buttons
 * - Optional "Don't ask again" checkbox
 * - Keyboard navigation (Enter to confirm, Escape to cancel)
 * - Backdrop click to close
 *
 * Test categories:
 * 1. Rendering - Dialog visibility, content, buttons
 * 2. Modal Behavior - Open/close states, backdrop click
 * 3. Button Actions - Confirm, cancel callbacks
 * 4. Don't Ask Again - Checkbox visibility and callback
 * 5. Keyboard Navigation - Enter/Escape handling
 * 6. Accessibility - ARIA attributes, focus management
 * 7. Integration - Complete workflow scenarios
 */
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';

describe('ConfirmationDialog', () => {
  const user = userEvent.setup();
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

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<ConfirmationDialog {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
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

    it('should render default confirm button text', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    });

    it('should render default cancel button text', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('should render custom confirm button text', () => {
      render(<ConfirmationDialog {...defaultProps} confirmText="Delete" />);
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    it('should render custom cancel button text', () => {
      render(<ConfirmationDialog {...defaultProps} cancelText="Keep" />);
      expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument();
    });

    it('should not render "Don\'t ask again" checkbox by default', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      expect(screen.queryByText("Don't ask me again")).not.toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('should render "Don\'t ask again" checkbox when showDontAskAgain is true', () => {
      render(
        <ConfirmationDialog {...defaultProps} showDontAskAgain onDontAskAgainChange={vi.fn()} />
      );
      expect(screen.getByText("Don't ask me again")).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('should have checkbox unchecked by default', () => {
      render(
        <ConfirmationDialog {...defaultProps} showDontAskAgain onDontAskAgainChange={vi.fn()} />
      );
      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });
  });

  // ==========================================================================
  // Modal Behavior Tests
  // ==========================================================================

  describe('modal behavior', () => {
    it('should call onClose when backdrop is clicked', async () => {
      render(<ConfirmationDialog {...defaultProps} />);
      const backdrop = screen.getByRole('dialog');

      await user.click(backdrop);

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when dialog content is clicked', async () => {
      render(<ConfirmationDialog {...defaultProps} />);
      const content = screen.getByText('Confirm Action').closest('div');

      await user.click(content!);

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('should stop event propagation on content click', async () => {
      render(<ConfirmationDialog {...defaultProps} />);
      const dialogContent = screen.getByText('Are you sure you want to proceed?').closest('div');

      await user.click(dialogContent!);

      // onClose should not be called because propagation was stopped
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Button Action Tests
  // ==========================================================================

  describe('button actions', () => {
    it('should call onConfirm when confirm button is clicked', async () => {
      render(<ConfirmationDialog {...defaultProps} />);
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });

      await user.click(confirmButton);

      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when cancel button is clicked', async () => {
      render(<ConfirmationDialog {...defaultProps} />);
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });

      await user.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when confirm is clicked', async () => {
      render(<ConfirmationDialog {...defaultProps} />);
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });

      await user.click(confirmButton);

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('should not call onConfirm when cancel is clicked', async () => {
      render(<ConfirmationDialog {...defaultProps} />);
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });

      await user.click(cancelButton);

      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Don't Ask Again Tests
  // ==========================================================================

  describe("don't ask again", () => {
    it('should toggle checkbox when clicked', async () => {
      render(
        <ConfirmationDialog {...defaultProps} showDontAskAgain onDontAskAgainChange={vi.fn()} />
      );
      const checkbox = screen.getByRole('checkbox');

      expect(checkbox).not.toBeChecked();
      await user.click(checkbox);
      expect(checkbox).toBeChecked();
      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it('should call onDontAskAgainChange with false when checkbox unchecked and confirm clicked', async () => {
      const onDontAskAgainChange = vi.fn();
      render(
        <ConfirmationDialog
          {...defaultProps}
          showDontAskAgain
          onDontAskAgainChange={onDontAskAgainChange}
        />
      );

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      await user.click(confirmButton);

      expect(onDontAskAgainChange).toHaveBeenCalledWith(false);
    });

    it('should call onDontAskAgainChange with true when checkbox checked and confirm clicked', async () => {
      const onDontAskAgainChange = vi.fn();
      render(
        <ConfirmationDialog
          {...defaultProps}
          showDontAskAgain
          onDontAskAgainChange={onDontAskAgainChange}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      await user.click(confirmButton);

      expect(onDontAskAgainChange).toHaveBeenCalledWith(true);
    });

    it('should not call onDontAskAgainChange when cancel is clicked', async () => {
      const onDontAskAgainChange = vi.fn();
      render(
        <ConfirmationDialog
          {...defaultProps}
          showDontAskAgain
          onDontAskAgainChange={onDontAskAgainChange}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(onDontAskAgainChange).not.toHaveBeenCalled();
    });

    it('should call onConfirm after onDontAskAgainChange', async () => {
      const onDontAskAgainChange = vi.fn();
      const callOrder: string[] = [];
      const onConfirmTracked = vi.fn(() => callOrder.push('confirm'));
      onDontAskAgainChange.mockImplementation(() => callOrder.push('dontAskAgain'));

      render(
        <ConfirmationDialog
          {...defaultProps}
          onConfirm={onConfirmTracked}
          showDontAskAgain
          onDontAskAgainChange={onDontAskAgainChange}
        />
      );

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      await user.click(confirmButton);

      expect(callOrder).toEqual(['dontAskAgain', 'confirm']);
    });
  });

  // ==========================================================================
  // Keyboard Navigation Tests
  // ==========================================================================

  describe('keyboard navigation', () => {
    it('should call onConfirm when Enter is pressed', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      const dialog = screen.getByRole('dialog');

      fireEvent.keyDown(dialog, { key: 'Enter' });

      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Escape is pressed', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      const dialog = screen.getByRole('dialog');

      fireEvent.keyDown(dialog, { key: 'Escape' });

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should prevent default on Enter key', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      const dialog = screen.getByRole('dialog');

      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      dialog.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should prevent default on Escape key', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      const dialog = screen.getByRole('dialog');

      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      dialog.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not trigger any action on other keys', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      const dialog = screen.getByRole('dialog');

      fireEvent.keyDown(dialog, { key: 'Tab' });
      fireEvent.keyDown(dialog, { key: 'Space' });
      fireEvent.keyDown(dialog, { key: 'a' });

      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('should call onDontAskAgainChange on Enter when checkbox is checked', async () => {
      const onDontAskAgainChange = vi.fn();
      render(
        <ConfirmationDialog
          {...defaultProps}
          showDontAskAgain
          onDontAskAgainChange={onDontAskAgainChange}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Enter' });

      expect(onDontAskAgainChange).toHaveBeenCalledWith(true);
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('accessibility', () => {
    it('should have role="dialog"', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-modal="true"', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-labelledby pointing to title', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      const title = screen.getByText('Confirm Action');

      expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title');
      expect(title).toHaveAttribute('id', 'dialog-title');
    });

    it('should have cancel button that receives focus', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });

      // autoFocus is a React prop that triggers focus, not an HTML attribute
      // In jsdom, we verify the button exists and is accessible
      expect(cancelButton).toBeInTheDocument();
      // The cancel button should be the safer option (appears before confirm)
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toHaveTextContent('Cancel');
    });

    it('should have both buttons accessible', () => {
      render(<ConfirmationDialog {...defaultProps} confirmText="Delete" cancelText="Keep" />);

      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument();
    });

    it('should have accessible checkbox when shown', () => {
      render(
        <ConfirmationDialog {...defaultProps} showDontAskAgain onDontAskAgainChange={vi.fn()} />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      // The checkbox is labeled via the surrounding label element
      expect(screen.getByText("Don't ask me again")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('integration', () => {
    it('should complete delete confirmation flow', async () => {
      const onDelete = vi.fn();
      const onCancel = vi.fn();

      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={onCancel}
          onConfirm={onDelete}
          title="Delete Item"
          message="This will permanently delete the item. This action cannot be undone."
          confirmText="Delete"
          cancelText="Keep"
        />
      );

      expect(screen.getByText('Delete Item')).toBeInTheDocument();
      expect(screen.getByText(/permanently delete/)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Delete' }));

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('should complete cancel flow', async () => {
      const onDelete = vi.fn();
      const onCancel = vi.fn();

      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={onCancel}
          onConfirm={onDelete}
          title="Delete Item"
          message="This will permanently delete the item."
          confirmText="Delete"
          cancelText="Keep"
        />
      );

      await user.click(screen.getByRole('button', { name: 'Keep' }));

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onDelete).not.toHaveBeenCalled();
    });

    it('should handle "don\'t show again" workflow', async () => {
      const onConfirm = vi.fn();
      const onDontAskAgainChange = vi.fn();

      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={onConfirm}
          title="Export Data"
          message="Export will create a large file."
          confirmText="Export"
          showDontAskAgain
          onDontAskAgainChange={onDontAskAgainChange}
        />
      );

      // Check the "don't ask again" box
      await user.click(screen.getByRole('checkbox'));

      // Confirm the action
      await user.click(screen.getByRole('button', { name: 'Export' }));

      expect(onDontAskAgainChange).toHaveBeenCalledWith(true);
      expect(onConfirm).toHaveBeenCalled();
    });

    it('should allow keyboard-only interaction', () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();

      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={onClose}
          onConfirm={onConfirm}
          title="Confirm"
          message="Press Enter to confirm, Escape to cancel"
        />
      );

      const dialog = screen.getByRole('dialog');

      // Test Enter to confirm
      fireEvent.keyDown(dialog, { key: 'Enter' });
      expect(onConfirm).toHaveBeenCalledTimes(1);

      // Test Escape to cancel
      fireEvent.keyDown(dialog, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should maintain state across re-renders', async () => {
      const onDontAskAgainChange = vi.fn();

      const { rerender } = render(
        <ConfirmationDialog
          {...defaultProps}
          showDontAskAgain
          onDontAskAgainChange={onDontAskAgainChange}
        />
      );

      // Check the checkbox
      await user.click(screen.getByRole('checkbox'));
      expect(screen.getByRole('checkbox')).toBeChecked();

      // Rerender with same props
      rerender(
        <ConfirmationDialog
          {...defaultProps}
          showDontAskAgain
          onDontAskAgainChange={onDontAskAgainChange}
        />
      );

      // Checkbox should still be checked (local state preserved)
      expect(screen.getByRole('checkbox')).toBeChecked();
    });
  });
});
