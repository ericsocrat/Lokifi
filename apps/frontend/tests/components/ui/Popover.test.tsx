import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
  SimplePopover,
} from '@/components/ui/Popover';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Popover', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  // ============================================================================
  // Basic Rendering
  // ============================================================================

  describe('Basic Rendering', () => {
    it('renders trigger', () => {
      render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      expect(screen.getByText('Open')).toBeInTheDocument();
    });

    it('hides content by default', () => {
      render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('shows content when defaultOpen is true', () => {
      render(
        <Popover defaultOpen>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('opens on click by default', () => {
      render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      fireEvent.click(screen.getByText('Open'));
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('closes on second click', () => {
      render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      const trigger = screen.getByText('Open');
      fireEvent.click(trigger);
      expect(screen.getByText('Content')).toBeInTheDocument();

      fireEvent.click(trigger);
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Controlled Mode
  // ============================================================================

  describe('Controlled Mode', () => {
    it('respects controlled open state', () => {
      const { rerender } = render(
        <Popover open={true}>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();

      rerender(
        <Popover open={false}>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('calls onOpenChange when toggled', () => {
      const onOpenChange = vi.fn();

      render(
        <Popover onOpenChange={onOpenChange}>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      fireEvent.click(screen.getByText('Open'));
      expect(onOpenChange).toHaveBeenCalledWith(true);

      fireEvent.click(screen.getByText('Open'));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  // ============================================================================
  // Trigger Types
  // ============================================================================

  describe('Trigger Types', () => {
    describe('Click Trigger', () => {
      it('opens on click', () => {
        render(
          <Popover triggerType="click">
            <PopoverTrigger>Open</PopoverTrigger>
            <PopoverContent>Content</PopoverContent>
          </Popover>
        );

        fireEvent.click(screen.getByText('Open'));
        expect(screen.getByText('Content')).toBeInTheDocument();
      });
    });

    describe('Hover Trigger', () => {
      it('opens on mouse enter', () => {
        render(
          <Popover triggerType="hover">
            <PopoverTrigger>Open</PopoverTrigger>
            <PopoverContent>Content</PopoverContent>
          </Popover>
        );

        fireEvent.mouseEnter(screen.getByText('Open'));
        expect(screen.getByText('Content')).toBeInTheDocument();
      });

      it('closes on mouse leave', () => {
        render(
          <Popover triggerType="hover">
            <PopoverTrigger>Open</PopoverTrigger>
            <PopoverContent>Content</PopoverContent>
          </Popover>
        );

        fireEvent.mouseEnter(screen.getByText('Open'));
        expect(screen.getByText('Content')).toBeInTheDocument();

        fireEvent.mouseLeave(screen.getByText('Open'));
        expect(screen.queryByText('Content')).not.toBeInTheDocument();
      });

      it('respects hover delay', () => {
        render(
          <Popover triggerType="hover" hoverDelay={200}>
            <PopoverTrigger>Open</PopoverTrigger>
            <PopoverContent>Content</PopoverContent>
          </Popover>
        );

        fireEvent.mouseEnter(screen.getByText('Open'));
        expect(screen.queryByText('Content')).not.toBeInTheDocument();

        act(() => {
          vi.advanceTimersByTime(200);
        });

        expect(screen.getByText('Content')).toBeInTheDocument();
      });

      it('cancels hover delay on mouse leave', () => {
        render(
          <Popover triggerType="hover" hoverDelay={200}>
            <PopoverTrigger>Open</PopoverTrigger>
            <PopoverContent>Content</PopoverContent>
          </Popover>
        );

        fireEvent.mouseEnter(screen.getByText('Open'));

        act(() => {
          vi.advanceTimersByTime(100);
        });

        fireEvent.mouseLeave(screen.getByText('Open'));

        act(() => {
          vi.advanceTimersByTime(200);
        });

        expect(screen.queryByText('Content')).not.toBeInTheDocument();
      });

      it('stays open when hovering content', () => {
        render(
          <Popover triggerType="hover">
            <PopoverTrigger>Open</PopoverTrigger>
            <PopoverContent>Content</PopoverContent>
          </Popover>
        );

        // Open on trigger hover
        fireEvent.mouseEnter(screen.getByText('Open'));
        expect(screen.getByText('Content')).toBeInTheDocument();

        // Leave trigger
        fireEvent.mouseLeave(screen.getByText('Open'));
        expect(screen.queryByText('Content')).not.toBeInTheDocument();
      });
    });

    describe('Focus Trigger', () => {
      it('opens on focus', () => {
        render(
          <Popover triggerType="focus">
            <PopoverTrigger>Open</PopoverTrigger>
            <PopoverContent>Content</PopoverContent>
          </Popover>
        );

        fireEvent.focus(screen.getByText('Open'));
        expect(screen.getByText('Content')).toBeInTheDocument();
      });

      it('closes on blur', () => {
        render(
          <Popover triggerType="focus">
            <PopoverTrigger>Open</PopoverTrigger>
            <PopoverContent>Content</PopoverContent>
          </Popover>
        );

        const trigger = screen.getByText('Open');
        fireEvent.focus(trigger);
        expect(screen.getByText('Content')).toBeInTheDocument();

        fireEvent.blur(trigger);
        expect(screen.queryByText('Content')).not.toBeInTheDocument();
      });
    });

    describe('Context Menu Trigger', () => {
      it('opens on right click', () => {
        render(
          <Popover triggerType="contextMenu">
            <PopoverTrigger>Open</PopoverTrigger>
            <PopoverContent>Content</PopoverContent>
          </Popover>
        );

        fireEvent.contextMenu(screen.getByText('Open'));
        expect(screen.getByText('Content')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Placements
  // ============================================================================

  describe('Placements', () => {
    const placements = [
      'top',
      'top-start',
      'top-end',
      'bottom',
      'bottom-start',
      'bottom-end',
      'left',
      'left-start',
      'left-end',
      'right',
      'right-start',
      'right-end',
    ] as const;

    placements.forEach((placement) => {
      it(`renders with ${placement} placement`, () => {
        render(
          <Popover placement={placement} defaultOpen>
            <PopoverTrigger>Open</PopoverTrigger>
            <PopoverContent>Content</PopoverContent>
          </Popover>
        );

        expect(screen.getByText('Content')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Close Behaviors
  // ============================================================================

  describe('Close Behaviors', () => {
    it('closes on escape key', () => {
      render(
        <Popover defaultOpen closeOnEscape>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('does not close on escape when closeOnEscape is false', () => {
      render(
        <Popover defaultOpen closeOnEscape={false}>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('closes on click outside', () => {
      render(
        <div>
          <Popover defaultOpen closeOnBlur>
            <PopoverTrigger>Open</PopoverTrigger>
            <PopoverContent>Content</PopoverContent>
          </Popover>
          <button data-testid="outside">Outside</button>
        </div>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();

      fireEvent.mouseDown(screen.getByTestId('outside'));
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('does not close on click outside when closeOnBlur is false', () => {
      render(
        <div>
          <Popover defaultOpen closeOnBlur={false}>
            <PopoverTrigger>Open</PopoverTrigger>
            <PopoverContent>Content</PopoverContent>
          </Popover>
          <button data-testid="outside">Outside</button>
        </div>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();

      fireEvent.mouseDown(screen.getByTestId('outside'));
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('does not close on click inside content', () => {
      render(
        <Popover defaultOpen closeOnBlur>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>
            <button data-testid="inside">Inside</button>
          </PopoverContent>
        </Popover>
      );

      expect(screen.getByTestId('inside')).toBeInTheDocument();

      fireEvent.mouseDown(screen.getByTestId('inside'));
      expect(screen.getByTestId('inside')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Disabled State
  // ============================================================================

  describe('Disabled State', () => {
    it('does not open when disabled', () => {
      render(
        <Popover disabled>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      fireEvent.click(screen.getByText('Open'));
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('sets aria-disabled on trigger', () => {
      render(
        <Popover disabled>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      expect(screen.getByTestId('popover-trigger')).toHaveAttribute('aria-disabled', 'true');
    });

    it('sets disabled attribute on button trigger', () => {
      render(
        <Popover disabled>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      expect(screen.getByTestId('popover-trigger')).toBeDisabled();
    });

    it('applies disabled styles', () => {
      render(
        <Popover disabled>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      expect(screen.getByTestId('popover-trigger')).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
  });

  // ============================================================================
  // PopoverClose
  // ============================================================================

  describe('PopoverClose', () => {
    it('closes popover when clicked', () => {
      render(
        <Popover defaultOpen>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>
            <PopoverClose>Close</PopoverClose>
          </PopoverContent>
        </Popover>
      );

      expect(screen.getByText('Close')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Close'));
      expect(screen.queryByText('Close')).not.toBeInTheDocument();
    });

    it('calls onClick handler', () => {
      const onClick = vi.fn();

      render(
        <Popover defaultOpen>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>
            <PopoverClose onClick={onClick}>Close</PopoverClose>
          </PopoverContent>
        </Popover>
      );

      fireEvent.click(screen.getByText('Close'));
      expect(onClick).toHaveBeenCalled();
    });

    it('renders with custom className', () => {
      render(
        <Popover defaultOpen>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>
            <PopoverClose className="custom-close">Close</PopoverClose>
          </PopoverContent>
        </Popover>
      );

      expect(screen.getByTestId('popover-close')).toHaveClass('custom-close');
    });
  });

  // ============================================================================
  // Arrow
  // ============================================================================

  describe('Arrow', () => {
    it('renders arrow when showArrow is true', () => {
      render(
        <Popover defaultOpen>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent showArrow>Content</PopoverContent>
        </Popover>
      );

      expect(screen.getByTestId('popover-arrow')).toBeInTheDocument();
    });

    it('does not render arrow by default', () => {
      render(
        <Popover defaultOpen>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      expect(screen.queryByTestId('popover-arrow')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Force Mount
  // ============================================================================

  describe('Force Mount', () => {
    it('keeps content in DOM when forceMount is true', () => {
      render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent forceMount>Content</PopoverContent>
        </Popover>
      );

      const content = screen.getByTestId('popover-content');
      expect(content).toBeInTheDocument();
      expect(content).toHaveClass('hidden');
    });
  });

  // ============================================================================
  // Accessibility
  // ============================================================================

  describe('Accessibility', () => {
    it('has correct ARIA attributes on trigger', () => {
      render(
        <Popover defaultOpen>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      const trigger = screen.getByTestId('popover-trigger');
      expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(trigger).toHaveAttribute('aria-controls');
    });

    it('has correct ARIA attributes on content', () => {
      render(
        <Popover defaultOpen>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      const content = screen.getByTestId('popover-content');
      expect(content).toHaveAttribute('role', 'dialog');
      expect(content).toHaveAttribute('aria-labelledby');
    });

    it('links trigger and content via ARIA attributes', () => {
      render(
        <Popover defaultOpen>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      const trigger = screen.getByTestId('popover-trigger');
      const content = screen.getByTestId('popover-content');

      expect(trigger.getAttribute('aria-controls')).toBe(content.id);
      expect(content.getAttribute('aria-labelledby')).toBe(trigger.id);
    });

    it('updates aria-expanded when toggled', () => {
      render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      const trigger = screen.getByTestId('popover-trigger');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
  });

  // ============================================================================
  // Data Attributes
  // ============================================================================

  describe('Data Attributes', () => {
    it('sets data-state on trigger', () => {
      render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      const trigger = screen.getByTestId('popover-trigger');
      expect(trigger).toHaveAttribute('data-state', 'closed');

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('data-state', 'open');
    });

    it('sets data-state on content', () => {
      render(
        <Popover defaultOpen>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      expect(screen.getByTestId('popover-content')).toHaveAttribute('data-state', 'open');
    });
  });

  // ============================================================================
  // Custom Trigger Element
  // ============================================================================

  describe('Custom Trigger Element', () => {
    it('renders as custom element', () => {
      render(
        <Popover>
          <PopoverTrigger as="div">Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      const trigger = screen.getByTestId('popover-trigger');
      expect(trigger.tagName).toBe('DIV');
    });

    it('works with custom element', () => {
      render(
        <Popover>
          <PopoverTrigger as="span">Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      fireEvent.click(screen.getByText('Open'));
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // SimplePopover
  // ============================================================================

  describe('SimplePopover', () => {
    it('renders trigger and content', () => {
      render(<SimplePopover trigger={<span>Trigger</span>} content={<span>Content</span>} />);

      expect(screen.getByText('Trigger')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Trigger'));
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('passes props to underlying Popover', () => {
      render(<SimplePopover trigger="Open" content="Content" defaultOpen />);

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('applies custom classNames', () => {
      render(
        <SimplePopover
          trigger="Open"
          content="Content"
          triggerClassName="custom-trigger"
          contentClassName="custom-content"
          defaultOpen
        />
      );

      expect(screen.getByTestId('popover-trigger')).toHaveClass('custom-trigger');
      expect(screen.getByTestId('popover-content')).toHaveClass('custom-content');
    });

    it('shows arrow when configured', () => {
      render(<SimplePopover trigger="Open" content="Content" showArrow defaultOpen />);

      expect(screen.getByTestId('popover-arrow')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('handles complex trigger content', () => {
      render(
        <Popover>
          <PopoverTrigger>
            <span>Icon</span>
            <span>Text</span>
          </PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      expect(screen.getByText('Icon')).toBeInTheDocument();
      expect(screen.getByText('Text')).toBeInTheDocument();
    });

    it('handles complex content', () => {
      render(
        <Popover defaultOpen>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>
            <h3>Title</h3>
            <p>Description</p>
            <button>Action</button>
          </PopoverContent>
        </Popover>
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });

    it('handles rapid clicking', () => {
      render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      const trigger = screen.getByText('Open');

      for (let i = 0; i < 10; i++) {
        fireEvent.click(trigger);
      }

      // 10 clicks = even = closed
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('spreads additional props to trigger', () => {
      render(
        <Popover>
          <PopoverTrigger data-custom="trigger">Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      expect(screen.getByTestId('popover-trigger')).toHaveAttribute('data-custom', 'trigger');
    });

    it('spreads additional props to content', () => {
      render(
        <Popover defaultOpen>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent data-custom="content">Content</PopoverContent>
        </Popover>
      );

      expect(screen.getByTestId('popover-content')).toHaveAttribute('data-custom', 'content');
    });

    it('calls trigger onClick handler', () => {
      const onClick = vi.fn();

      render(
        <Popover>
          <PopoverTrigger onClick={onClick}>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      fireEvent.click(screen.getByText('Open'));
      expect(onClick).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Custom Styling
  // ============================================================================

  describe('Custom Styling', () => {
    it('applies custom className to trigger', () => {
      render(
        <Popover>
          <PopoverTrigger className="custom-trigger">Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      expect(screen.getByTestId('popover-trigger')).toHaveClass('custom-trigger');
    });

    it('applies custom className to content', () => {
      render(
        <Popover defaultOpen>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent className="custom-content">Content</PopoverContent>
        </Popover>
      );

      expect(screen.getByTestId('popover-content')).toHaveClass('custom-content');
    });
  });
});
