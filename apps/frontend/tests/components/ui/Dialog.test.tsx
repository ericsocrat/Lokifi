import {
  ConfirmDialog,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
  SimpleDialog,
  useDialogContext,
} from '@/components/ui/Dialog';
import { act, fireEvent, render, screen } from '@testing-library/react';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ============================================================================
// Test Utilities
// ============================================================================

function TestDialog({
  defaultOpen = false,
  ...props
}: {
  defaultOpen?: boolean;
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <Dialog defaultOpen={defaultOpen} {...props}>
      <DialogTrigger>Open Dialog</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Test Title</DialogTitle>
          <DialogDescription>Test Description</DialogDescription>
        </DialogHeader>
        <div>Dialog Content</div>
        <DialogFooter>
          <DialogClose>Cancel</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

describe('Dialog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==========================================================================
  // Basic Rendering
  // ==========================================================================

  describe('Basic Rendering', () => {
    it('renders trigger button', () => {
      render(<TestDialog />);

      expect(screen.getByRole('button', { name: /open dialog/i })).toBeInTheDocument();
    });

    it('does not render content when closed', () => {
      render(<TestDialog />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
    });

    it('renders content when defaultOpen is true', () => {
      render(<TestDialog defaultOpen />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });

    it('renders all dialog parts correctly', () => {
      render(<TestDialog defaultOpen />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('Dialog Content')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('applies custom className to content', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent className="custom-class">Content</DialogContent>
        </Dialog>
      );

      expect(screen.getByRole('dialog')).toHaveClass('custom-class');
    });
  });

  // ==========================================================================
  // Open/Close Behavior
  // ==========================================================================

  describe('Open/Close Behavior', () => {
    it('opens dialog when trigger is clicked', () => {
      render(<TestDialog />);

      fireEvent.click(screen.getByRole('button', { name: /open dialog/i }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('closes dialog when cancel button is clicked', () => {
      render(<TestDialog defaultOpen />);

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes dialog when X button is clicked', () => {
      render(<TestDialog defaultOpen />);

      fireEvent.click(screen.getByRole('button', { name: /close dialog/i }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('calls onOpenChange when opened', () => {
      const handleOpenChange = vi.fn();
      render(<TestDialog onOpenChange={handleOpenChange} />);

      fireEvent.click(screen.getByRole('button', { name: /open dialog/i }));

      expect(handleOpenChange).toHaveBeenCalledWith(true);
    });

    it('calls onOpenChange when closed', () => {
      const handleOpenChange = vi.fn();
      render(<TestDialog defaultOpen onOpenChange={handleOpenChange} />);

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it('supports controlled mode', () => {
      const { rerender } = render(
        <Dialog open={false}>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>Content</DialogContent>
        </Dialog>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      rerender(
        <Dialog open={true}>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>Content</DialogContent>
        </Dialog>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Escape Key
  // ==========================================================================

  describe('Escape Key', () => {
    it('closes dialog on escape key by default', async () => {
      render(<TestDialog defaultOpen />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not close on escape when closeOnEscape is false', async () => {
      render(<TestDialog defaultOpen closeOnEscape={false} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('calls onOpenChange when escape is pressed', async () => {
      const handleOpenChange = vi.fn();
      render(<TestDialog defaultOpen onOpenChange={handleOpenChange} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });

  // ==========================================================================
  // Outside Click
  // ==========================================================================

  describe('Outside Click', () => {
    it('closes dialog when clicking outside by default', async () => {
      render(<TestDialog defaultOpen />);

      // Allow the click handler to be attached
      act(() => {
        vi.advanceTimersByTime(10);
      });

      // Click on the overlay (outside the dialog)
      fireEvent.click(document.body);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not close when closeOnOutsideClick is false', async () => {
      render(<TestDialog defaultOpen closeOnOutsideClick={false} />);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      fireEvent.click(document.body);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not close when clicking inside dialog', async () => {
      render(<TestDialog defaultOpen />);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      fireEvent.click(screen.getByText('Dialog Content'));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Sizes
  // ==========================================================================

  describe('Sizes', () => {
    it.each(['sm', 'md', 'lg', 'xl', 'full'] as const)('applies size %s', (size) => {
      render(
        <Dialog defaultOpen>
          <DialogContent size={size}>Content</DialogContent>
        </Dialog>
      );

      const dialog = screen.getByRole('dialog');
      const sizeClass = size === 'full' ? 'max-w-[calc(100vw-2rem)]' : `max-w-${size}`;
      expect(dialog.className).toContain(sizeClass);
    });

    it('defaults to md size', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>Content</DialogContent>
        </Dialog>
      );

      expect(screen.getByRole('dialog')).toHaveClass('max-w-md');
    });
  });

  // ==========================================================================
  // Close Button
  // ==========================================================================

  describe('Close Button', () => {
    it('shows close button by default', () => {
      render(<TestDialog defaultOpen />);

      expect(screen.getByRole('button', { name: /close dialog/i })).toBeInTheDocument();
    });

    it('hides close button when showCloseButton is false', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent showCloseButton={false}>Content</DialogContent>
        </Dialog>
      );

      expect(screen.queryByRole('button', { name: /close dialog/i })).not.toBeInTheDocument();
    });

    it('supports custom close button', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent closeButton={<button aria-label="Custom Close">X</button>}>
            Content
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByRole('button', { name: /custom close/i })).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility
  // ==========================================================================

  describe('Accessibility', () => {
    it('has correct ARIA attributes on trigger', () => {
      render(<TestDialog />);

      const trigger = screen.getByRole('button', { name: /open dialog/i });
      expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('updates trigger aria-expanded when open', () => {
      render(<TestDialog />);

      const trigger = screen.getByRole('button', { name: /open dialog/i });
      fireEvent.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('has correct ARIA attributes on dialog', () => {
      render(<TestDialog defaultOpen />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    it('links title and description via ARIA', () => {
      render(<TestDialog defaultOpen />);

      const dialog = screen.getByRole('dialog');
      const labelId = dialog.getAttribute('aria-labelledby');
      const descId = dialog.getAttribute('aria-describedby');

      expect(screen.getByText('Test Title')).toHaveAttribute('id', labelId);
      expect(screen.getByText('Test Description')).toHaveAttribute('id', descId);
    });

    it('focuses first focusable element when opened', () => {
      render(<TestDialog />);

      fireEvent.click(screen.getByRole('button', { name: /open dialog/i }));

      // The cancel button should be focused (first focusable in content)
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(document.activeElement).toBe(cancelButton);
    });

    it('prevents body scroll when open', () => {
      render(<TestDialog defaultOpen />);

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores body scroll when closed', () => {
      render(<TestDialog defaultOpen />);

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(document.body.style.overflow).toBe('');
    });
  });

  // ==========================================================================
  // Data Attributes
  // ==========================================================================

  describe('Data Attributes', () => {
    it('has data-state on root element', () => {
      const { container } = render(<TestDialog />);

      expect(container.querySelector('[data-state="closed"]')).toBeInTheDocument();
    });

    it('updates data-state when opened', () => {
      const { container } = render(<TestDialog />);

      fireEvent.click(screen.getByRole('button', { name: /open dialog/i }));

      expect(container.querySelector('[data-state="open"]')).toBeInTheDocument();
    });

    it('has data-state on trigger', () => {
      render(<TestDialog />);

      expect(screen.getByRole('button', { name: /open dialog/i })).toHaveAttribute(
        'data-state',
        'closed'
      );
    });

    it('has data-state on content', () => {
      render(<TestDialog defaultOpen />);

      expect(screen.getByRole('dialog')).toHaveAttribute('data-state', 'open');
    });
  });

  // ==========================================================================
  // Force Mount
  // ==========================================================================

  describe('Force Mount', () => {
    it('keeps content mounted when forceMount is true', () => {
      render(
        <Dialog open={false}>
          <DialogContent forceMount>Content</DialogContent>
        </Dialog>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('keeps overlay mounted when forceMount is true', () => {
      render(
        <Dialog open={false}>
          <DialogOverlay forceMount data-testid="overlay" />
          <DialogContent forceMount>Content</DialogContent>
        </Dialog>
      );

      expect(screen.getByTestId('overlay')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // AsChild Pattern
  // ==========================================================================

  describe('AsChild Pattern', () => {
    it('renders trigger as child element', () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <span role="button" tabIndex={0}>
              Custom Trigger
            </span>
          </DialogTrigger>
          <DialogContent>Content</DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Custom Trigger').tagName).toBe('SPAN');

      fireEvent.click(screen.getByText('Custom Trigger'));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('renders close as child element', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent showCloseButton={false}>
            <DialogClose asChild>
              <span role="button" tabIndex={0}>
                Custom Close
              </span>
            </DialogClose>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Custom Close').tagName).toBe('SPAN');

      fireEvent.click(screen.getByText('Custom Close'));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Context Hook
  // ==========================================================================

  describe('Context Hook', () => {
    it('throws error when used outside Dialog', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      function TestComponent() {
        useDialogContext();
        return null;
      }

      expect(() => render(<TestComponent />)).toThrow(
        'Dialog components must be used within a Dialog provider'
      );

      consoleError.mockRestore();
    });

    it('provides context values', () => {
      let contextValue: ReturnType<typeof useDialogContext> | undefined;

      function TestConsumer() {
        contextValue = useDialogContext();
        return null;
      }

      render(
        <Dialog defaultOpen>
          <DialogContent>
            <TestConsumer />
          </DialogContent>
        </Dialog>
      );

      expect(contextValue).toBeDefined();
      expect(contextValue?.open).toBe(true);
      expect(typeof contextValue?.onOpenChange).toBe('function');
    });
  });

  // ==========================================================================
  // Overlay
  // ==========================================================================

  describe('Overlay', () => {
    it('renders overlay when dialog is open', () => {
      render(<TestDialog defaultOpen />);

      const overlay = document.querySelector('[aria-hidden="true"]');
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveClass('bg-black/50');
    });

    it('has correct data-state on overlay', () => {
      render(<TestDialog defaultOpen />);

      const overlay = document.querySelector('[aria-hidden="true"]');
      expect(overlay).toHaveAttribute('data-state', 'open');
    });

    it('applies custom className to overlay', () => {
      render(
        <Dialog defaultOpen>
          <DialogOverlay className="custom-overlay" />
          <DialogContent>Content</DialogContent>
        </Dialog>
      );

      const overlay = document.querySelector('.custom-overlay');
      expect(overlay).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Header, Footer Components
  // ==========================================================================

  describe('Header and Footer', () => {
    it('renders header with correct styling', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogHeader data-testid="header">Header Content</DialogHeader>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByTestId('header')).toHaveClass('flex', 'flex-col');
    });

    it('renders footer with correct styling', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogFooter data-testid="footer">Footer Content</DialogFooter>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByTestId('footer')).toHaveClass('flex', 'sm:flex-row');
    });

    it('applies custom className to header', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogHeader className="custom-header">Header</DialogHeader>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Header').closest('div')).toHaveClass('custom-header');
    });

    it('applies custom className to footer', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogFooter className="custom-footer">Footer</DialogFooter>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Footer').closest('div')).toHaveClass('custom-footer');
    });
  });
});

// ============================================================================
// SimpleDialog Tests
// ============================================================================

describe('SimpleDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with title and description', () => {
    render(
      <SimpleDialog
        open={true}
        onOpenChange={() => {}}
        title="Simple Title"
        description="Simple Description"
      >
        Content
      </SimpleDialog>
    );

    expect(screen.getByText('Simple Title')).toBeInTheDocument();
    expect(screen.getByText('Simple Description')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <SimpleDialog open={true} onOpenChange={() => {}} title="Title">
        <span>Child Content</span>
      </SimpleDialog>
    );

    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    render(
      <SimpleDialog
        open={true}
        onOpenChange={() => {}}
        title="Title"
        footer={<button>Save</button>}
      >
        Content
      </SimpleDialog>
    );

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('applies custom size', () => {
    render(
      <SimpleDialog open={true} onOpenChange={() => {}} title="Title" size="lg">
        Content
      </SimpleDialog>
    );

    expect(screen.getByRole('dialog')).toHaveClass('max-w-lg');
  });

  it('hides close button when showCloseButton is false', () => {
    render(
      <SimpleDialog open={true} onOpenChange={() => {}} title="Title" showCloseButton={false}>
        Content
      </SimpleDialog>
    );

    expect(screen.queryByRole('button', { name: /close dialog/i })).not.toBeInTheDocument();
  });

  it('calls onOpenChange when escape is pressed', async () => {
    const handleOpenChange = vi.fn();
    render(
      <SimpleDialog open={true} onOpenChange={handleOpenChange} title="Title">
        Content
      </SimpleDialog>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('applies custom className', () => {
    render(
      <SimpleDialog open={true} onOpenChange={() => {}} title="Title" className="custom-class">
        Content
      </SimpleDialog>
    );

    expect(screen.getByRole('dialog')).toHaveClass('custom-class');
  });

  it('renders without description', () => {
    render(
      <SimpleDialog open={true} onOpenChange={() => {}} title="Title">
        Content
      </SimpleDialog>
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeInTheDocument();
  });
});

// ============================================================================
// ConfirmDialog Tests
// ============================================================================

describe('ConfirmDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with title and message', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        onConfirm={() => {}}
      />
    );

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
  });

  it('renders default button text', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Title"
        message="Message"
        onConfirm={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('renders custom button text', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Title"
        message="Message"
        onConfirm={() => {}}
        confirmText="Delete"
        cancelText="Keep"
      />
    );

    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /keep/i })).toBeInTheDocument();
  });

  it('calls onConfirm and closes when confirm is clicked', () => {
    const handleConfirm = vi.fn();
    const handleOpenChange = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        onOpenChange={handleOpenChange}
        title="Title"
        message="Message"
        onConfirm={handleConfirm}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(handleConfirm).toHaveBeenCalled();
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onCancel and closes when cancel is clicked', () => {
    const handleCancel = vi.fn();
    const handleOpenChange = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        onOpenChange={handleOpenChange}
        title="Title"
        message="Message"
        onConfirm={() => {}}
        onCancel={handleCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(handleCancel).toHaveBeenCalled();
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('applies danger variant styling', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Title"
        message="Message"
        onConfirm={() => {}}
        variant="danger"
      />
    );

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    expect(confirmButton).toHaveAttribute('data-variant', 'danger');
    expect(confirmButton).toHaveClass('bg-destructive');
  });

  it('shows loading state', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Title"
        message="Message"
        onConfirm={() => {}}
        loading={true}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('disables buttons when loading', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Title"
        message="Message"
        onConfirm={() => {}}
        loading={true}
      />
    );

    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    expect(screen.getByText('Loading...').closest('button')).toBeDisabled();
  });

  it('does not show close button', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Title"
        message="Message"
        onConfirm={() => {}}
      />
    );

    expect(screen.queryByRole('button', { name: /close dialog/i })).not.toBeInTheDocument();
  });

  it('uses sm size by default', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Title"
        message="Message"
        onConfirm={() => {}}
      />
    );

    expect(screen.getByRole('dialog')).toHaveClass('max-w-sm');
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('handles rapid open/close', () => {
    render(<TestDialog />);

    const trigger = screen.getByRole('button', { name: /open dialog/i });

    // Rapidly click - odd clicks from closed = open
    fireEvent.click(trigger);
    fireEvent.click(trigger);
    fireEvent.click(trigger);

    // Should end in open state (3 clicks from closed = open)
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('handles unmount while open', () => {
    const { unmount } = render(<TestDialog defaultOpen />);

    expect(document.body.style.overflow).toBe('hidden');

    unmount();

    expect(document.body.style.overflow).toBe('');
  });

  it('maintains focus management with multiple dialogs', () => {
    function MultiDialog() {
      const [open1, setOpen1] = React.useState(false);
      const [open2, setOpen2] = React.useState(false);

      return (
        <>
          <Dialog open={open1} onOpenChange={setOpen1}>
            <DialogTrigger>Open First</DialogTrigger>
            <DialogContent>
              <button onClick={() => setOpen2(true)}>Open Second</button>
            </DialogContent>
          </Dialog>
          <Dialog open={open2} onOpenChange={setOpen2}>
            <DialogContent>
              <DialogClose>Close Second</DialogClose>
            </DialogContent>
          </Dialog>
        </>
      );
    }

    render(<MultiDialog />);

    fireEvent.click(screen.getByRole('button', { name: /open first/i }));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: /open second/i }));
    expect(screen.getAllByRole('dialog')).toHaveLength(2);
  });

  it('handles trigger click event propagation', () => {
    const handleClick = vi.fn();

    render(
      <Dialog>
        <DialogTrigger onClick={handleClick}>Open</DialogTrigger>
        <DialogContent>Content</DialogContent>
      </Dialog>
    );

    fireEvent.click(screen.getByRole('button', { name: /open/i }));

    expect(handleClick).toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('spreads additional props to trigger', () => {
    render(
      <Dialog>
        <DialogTrigger data-custom="value" id="custom-trigger">
          Open
        </DialogTrigger>
        <DialogContent>Content</DialogContent>
      </Dialog>
    );

    const trigger = screen.getByRole('button', { name: /open/i });
    expect(trigger).toHaveAttribute('data-custom', 'value');
    expect(trigger).toHaveAttribute('id', 'custom-trigger');
  });

  it('spreads additional props to content', () => {
    render(
      <Dialog defaultOpen>
        <DialogContent data-custom="value">Content</DialogContent>
      </Dialog>
    );

    expect(screen.getByRole('dialog')).toHaveAttribute('data-custom', 'value');
  });

  it('handles aria-label on root', () => {
    const { container } = render(
      <Dialog aria-label="Custom Dialog Label">
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>Content</DialogContent>
      </Dialog>
    );

    expect(container.querySelector('[aria-label="Custom Dialog Label"]')).toBeInTheDocument();
  });
});
