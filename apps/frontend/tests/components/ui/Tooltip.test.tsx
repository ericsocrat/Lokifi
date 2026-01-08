import { fireEvent, render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  SimpleTooltip,
} from '@/components/ui/Tooltip';

// Mock createPortal for testing
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ============================================================================
  // Basic Rendering
  // ============================================================================

  describe('Basic Rendering', () => {
    it('renders trigger element', () => {
      render(
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      );

      expect(screen.getByText('Hover me')).toBeInTheDocument();
    });

    it('hides tooltip content by default', () => {
      render(
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      );

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('shows tooltip on hover after delay', () => {
      render(
        <Tooltip delay={100}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');
      fireEvent.mouseEnter(trigger);

      // Tooltip should not be visible yet
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      // Advance timer past delay
      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    it('hides tooltip on mouse leave', () => {
      render(
        <Tooltip delay={0} delayHide={0}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');

      // Show tooltip
      fireEvent.mouseEnter(trigger);
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      // Hide tooltip
      fireEvent.mouseLeave(trigger);
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
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
          <Tooltip placement={placement} delay={0}>
            <TooltipTrigger>Hover me</TooltipTrigger>
            <TooltipContent>Tooltip at {placement}</TooltipContent>
          </Tooltip>
        );

        const trigger = screen.getByTestId('tooltip-trigger');
        fireEvent.mouseEnter(trigger);

        act(() => {
          vi.advanceTimersByTime(10);
        });

        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toHaveAttribute('data-side', placement.split('-')[0]);
      });
    });
  });

  // ============================================================================
  // Variants
  // ============================================================================

  describe('Variants', () => {
    const variants = [
      'dark',
      'light',
      'primary',
      'info',
      'success',
      'warning',
      'danger',
    ] as const;

    variants.forEach((variant) => {
      it(`renders ${variant} variant`, () => {
        render(
          <Tooltip variant={variant} delay={0}>
            <TooltipTrigger>Hover me</TooltipTrigger>
            <TooltipContent>{variant} tooltip</TooltipContent>
          </Tooltip>
        );

        const trigger = screen.getByTestId('tooltip-trigger');
        fireEvent.mouseEnter(trigger);

        act(() => {
          vi.advanceTimersByTime(10);
        });

        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Arrow
  // ============================================================================

  describe('Arrow', () => {
    it('shows arrow by default', () => {
      render(
        <Tooltip delay={0}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>With arrow</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');
      fireEvent.mouseEnter(trigger);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(screen.getByTestId('tooltip-arrow')).toBeInTheDocument();
    });

    it('hides arrow when arrow=false', () => {
      render(
        <Tooltip delay={0}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent arrow={false}>Without arrow</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');
      fireEvent.mouseEnter(trigger);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      expect(screen.queryByTestId('tooltip-arrow')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Delay
  // ============================================================================

  describe('Delay', () => {
    it('respects custom show delay', () => {
      render(
        <Tooltip delay={500}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Delayed tooltip</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');
      fireEvent.mouseEnter(trigger);

      // Should not be visible after 400ms
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      // Should be visible after 500ms
      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    it('respects custom hide delay', () => {
      render(
        <Tooltip delay={0} delayHide={200}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Delayed hide tooltip</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');

      // Show tooltip
      fireEvent.mouseEnter(trigger);
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      // Leave trigger
      fireEvent.mouseLeave(trigger);

      // Should still be visible after 100ms
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      // Should be hidden after 200ms
      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('cancels show timeout on mouse leave', () => {
      render(
        <Tooltip delay={300}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');

      // Start hover
      fireEvent.mouseEnter(trigger);

      // Leave before delay completes
      act(() => {
        vi.advanceTimersByTime(100);
      });
      fireEvent.mouseLeave(trigger);

      // Wait past original delay
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Tooltip should never have shown
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Controlled Mode
  // ============================================================================

  describe('Controlled Mode', () => {
    it('respects controlled open state', () => {
      const { rerender } = render(
        <Tooltip open={true} delay={0}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Controlled tooltip</TooltipContent>
        </Tooltip>
      );

      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      rerender(
        <Tooltip open={false} delay={0}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Controlled tooltip</TooltipContent>
        </Tooltip>
      );

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('calls onOpenChange callback', () => {
      const onOpenChange = vi.fn();

      render(
        <Tooltip delay={0} delayHide={0} onOpenChange={onOpenChange}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');

      fireEvent.mouseEnter(trigger);
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(onOpenChange).toHaveBeenCalledWith(true);

      fireEvent.mouseLeave(trigger);
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('supports defaultOpen for uncontrolled mode', () => {
      render(
        <Tooltip defaultOpen={true}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Default open tooltip</TooltipContent>
        </Tooltip>
      );

      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Interactive Mode
  // ============================================================================

  describe('Interactive Mode', () => {
    it('keeps tooltip open when hovering over content in interactive mode', () => {
      render(
        <Tooltip delay={0} delayHide={100} interactive>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Interactive tooltip</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');

      // Show tooltip
      fireEvent.mouseEnter(trigger);
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      // Leave trigger
      fireEvent.mouseLeave(trigger);

      // Enter tooltip content
      const tooltipContent = screen.getByTestId('tooltip-content');
      fireEvent.mouseEnter(tooltipContent);

      // Tooltip should remain visible
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    it('hides tooltip when leaving content in interactive mode', () => {
      render(
        <Tooltip delay={0} delayHide={50} interactive>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Interactive tooltip</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');

      // Show tooltip
      fireEvent.mouseEnter(trigger);
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      // Enter then leave tooltip content
      const tooltipContent = screen.getByTestId('tooltip-content');
      fireEvent.mouseEnter(tooltipContent);
      fireEvent.mouseLeave(tooltipContent);

      // Wait for hide delay
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Focus Behavior
  // ============================================================================

  describe('Focus Behavior', () => {
    it('shows tooltip on focus', () => {
      render(
        <Tooltip delay={0}>
          <TooltipTrigger>
            <button>Focus me</button>
          </TooltipTrigger>
          <TooltipContent>Focus tooltip</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');
      fireEvent.focus(trigger);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    it('hides tooltip on blur', () => {
      render(
        <Tooltip delay={0} delayHide={0}>
          <TooltipTrigger>
            <button>Focus me</button>
          </TooltipTrigger>
          <TooltipContent>Focus tooltip</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');

      // Show on focus
      fireEvent.focus(trigger);
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      // Hide on blur
      fireEvent.blur(trigger);
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Accessibility
  // ============================================================================

  describe('Accessibility', () => {
    it('has correct aria attributes on trigger', () => {
      render(
        <Tooltip>
          <TooltipTrigger>Accessible trigger</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');
      expect(trigger).toHaveAttribute('aria-describedby');
    });

    it('tooltip has role="tooltip"', async () => {
      render(
        <Tooltip open={true}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      );

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toBeInTheDocument();
    });

    it('links trigger to tooltip via aria-describedby', async () => {
      render(
        <Tooltip open={true}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');
      const tooltip = screen.getByRole('tooltip');

      expect(trigger.getAttribute('aria-describedby')).toBe(tooltip.id);
    });
  });

  // ============================================================================
  // Max Width
  // ============================================================================

  describe('Max Width', () => {
    it('applies default max width', () => {
      render(
        <Tooltip open={true}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      );

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip.style.maxWidth).toBe('300px');
    });

    it('applies custom max width as number', () => {
      render(
        <Tooltip open={true}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent maxWidth={500}>Tooltip content</TooltipContent>
        </Tooltip>
      );

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip.style.maxWidth).toBe('500px');
    });

    it('applies custom max width as string', () => {
      render(
        <Tooltip open={true}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent maxWidth="50vw">Tooltip content</TooltipContent>
        </Tooltip>
      );

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip.style.maxWidth).toBe('50vw');
    });
  });

  // ============================================================================
  // Force Mount
  // ============================================================================

  describe('Force Mount', () => {
    it('keeps tooltip in DOM when forceMount is true', () => {
      render(
        <Tooltip open={false}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent forceMount>Force mounted tooltip</TooltipContent>
        </Tooltip>
      );

      // With forceMount, the tooltip should be in the DOM but hidden
      const tooltip = screen.getByTestId('tooltip-content');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveAttribute('data-state', 'closed');
    });
  });

  // ============================================================================
  // Custom Offset
  // ============================================================================

  describe('Custom Offset', () => {
    it('applies custom offset', () => {
      render(
        <Tooltip offset={20} open={true}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      );

      // The offset affects positioning which is tested in the component
      // Here we just verify the tooltip renders without errors
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // SimpleTooltip
  // ============================================================================

  describe('SimpleTooltip', () => {
    it('renders simple tooltip correctly', () => {
      render(
        <SimpleTooltip content="Simple tooltip content" delay={0}>
          <span>Hover me</span>
        </SimpleTooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');
      fireEvent.mouseEnter(trigger);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(screen.getByText('Simple tooltip content')).toBeInTheDocument();
    });

    it('passes placement to SimpleTooltip', () => {
      render(
        <SimpleTooltip content="Content" placement="bottom" delay={0}>
          <span>Trigger</span>
        </SimpleTooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');
      fireEvent.mouseEnter(trigger);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(screen.getByRole('tooltip')).toHaveAttribute('data-side', 'bottom');
    });

    it('passes variant to SimpleTooltip', () => {
      render(
        <SimpleTooltip content="Content" variant="primary" delay={0}>
          <span>Trigger</span>
        </SimpleTooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');
      fireEvent.mouseEnter(trigger);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    it('passes arrow prop to SimpleTooltip', () => {
      render(
        <SimpleTooltip content="Content" arrow={false} delay={0}>
          <span>Trigger</span>
        </SimpleTooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');
      fireEvent.mouseEnter(trigger);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(screen.queryByTestId('tooltip-arrow')).not.toBeInTheDocument();
    });

    it('passes maxWidth to SimpleTooltip', () => {
      render(
        <SimpleTooltip content="Content" maxWidth={200} delay={0}>
          <span>Trigger</span>
        </SimpleTooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');
      fireEvent.mouseEnter(trigger);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(screen.getByRole('tooltip').style.maxWidth).toBe('200px');
    });

    it('applies custom class names', () => {
      render(
        <SimpleTooltip
          content="Content"
          triggerClassName="custom-trigger"
          contentClassName="custom-content"
          delay={0}
        >
          <span>Trigger</span>
        </SimpleTooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');
      expect(trigger).toHaveClass('custom-trigger');

      fireEvent.mouseEnter(trigger);
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(screen.getByRole('tooltip')).toHaveClass('custom-content');
    });
  });

  // ============================================================================
  // TooltipProvider
  // ============================================================================

  describe('TooltipProvider', () => {
    it('uses provider default delay', () => {
      render(
        <TooltipProvider defaultDelay={200}>
          <Tooltip>
            <TooltipTrigger>Hover me</TooltipTrigger>
            <TooltipContent>Tooltip content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const trigger = screen.getByTestId('tooltip-trigger');
      fireEvent.mouseEnter(trigger);

      // Should not be visible after 150ms
      act(() => {
        vi.advanceTimersByTime(150);
      });
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      // Should be visible after 200ms
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    it('allows individual tooltip to override provider delay', () => {
      render(
        <TooltipProvider defaultDelay={500}>
          <Tooltip delay={50}>
            <TooltipTrigger>Hover me</TooltipTrigger>
            <TooltipContent>Tooltip content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const trigger = screen.getByTestId('tooltip-trigger');
      fireEvent.mouseEnter(trigger);

      // Should be visible after just 50ms (not 500ms)
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    it('skips delay on subsequent hover within skip duration', () => {
      render(
        <TooltipProvider defaultDelay={300} skipDelayDuration={500}>
          <Tooltip delay={300} delayHide={0}>
            <TooltipTrigger>First tooltip</TooltipTrigger>
            <TooltipContent>First content</TooltipContent>
          </Tooltip>
          <Tooltip delay={300} delayHide={0}>
            <TooltipTrigger>Second tooltip</TooltipTrigger>
            <TooltipContent>Second content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const firstTrigger = screen.getAllByTestId('tooltip-trigger')[0];
      const secondTrigger = screen.getAllByTestId('tooltip-trigger')[1];

      // Show first tooltip
      fireEvent.mouseEnter(firstTrigger);
      act(() => {
        vi.advanceTimersByTime(350);
      });

      expect(screen.getByText('First content')).toBeInTheDocument();

      // Hide first tooltip
      fireEvent.mouseLeave(firstTrigger);
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(screen.queryByText('First content')).not.toBeInTheDocument();

      // Hover second tooltip quickly (within skip duration)
      fireEvent.mouseEnter(secondTrigger);

      // Should show immediately (delay skipped)
      act(() => {
        vi.advanceTimersByTime(50);
      });

      expect(screen.getByText('Second content')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('handles rapid hover/unhover', () => {
      render(
        <Tooltip delay={100} delayHide={50}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');

      // Rapid hover/unhover
      for (let i = 0; i < 5; i++) {
        fireEvent.mouseEnter(trigger);
        act(() => {
          vi.advanceTimersByTime(30);
        });
        fireEvent.mouseLeave(trigger);
        act(() => {
          vi.advanceTimersByTime(30);
        });
      }

      // Should not crash and tooltip should not be visible
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('renders complex content in tooltip', () => {
      render(
        <Tooltip open={true}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>
            <div>
              <strong>Title</strong>
              <p>Description text</p>
              <button>Action</button>
            </div>
          </TooltipContent>
        </Tooltip>
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description text')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });

    it('handles empty content gracefully', () => {
      render(
        <Tooltip open={true}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent></TooltipContent>
        </Tooltip>
      );

      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    it('updates position on scroll', () => {
      render(
        <Tooltip open={true}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      );

      // Simulate scroll
      act(() => {
        window.dispatchEvent(new Event('scroll'));
      });

      // Should still be visible
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    it('updates position on resize', () => {
      render(
        <Tooltip open={true}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      );

      // Simulate resize
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      // Should still be visible
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Custom Styling
  // ============================================================================

  describe('Custom Styling', () => {
    it('applies custom className to trigger', () => {
      render(
        <Tooltip>
          <TooltipTrigger className="custom-trigger-class">
            Hover me
          </TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');
      expect(trigger).toHaveClass('custom-trigger-class');
    });

    it('applies custom className to content', () => {
      render(
        <Tooltip open={true}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent className="custom-content-class">
            Tooltip content
          </TooltipContent>
        </Tooltip>
      );

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveClass('custom-content-class');
    });

    it('spreads additional props to trigger', () => {
      render(
        <Tooltip>
          <TooltipTrigger data-custom="value">Hover me</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');
      expect(trigger).toHaveAttribute('data-custom', 'value');
    });

    it('spreads additional props to content', () => {
      render(
        <Tooltip open={true}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent data-custom="value">Tooltip content</TooltipContent>
        </Tooltip>
      );

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveAttribute('data-custom', 'value');
    });
  });

  // ============================================================================
  // Data Attributes
  // ============================================================================

  describe('Data Attributes', () => {
    it('sets data-state="open" when visible', () => {
      render(
        <Tooltip open={true}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      );

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveAttribute('data-state', 'open');
    });

    it('sets data-state="closed" when hidden but force mounted', () => {
      render(
        <Tooltip open={false}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent forceMount>Tooltip content</TooltipContent>
        </Tooltip>
      );

      // Use testid since visibility:hidden makes role queries unreliable
      const tooltip = screen.getByTestId('tooltip-content');
      expect(tooltip).toHaveAttribute('data-state', 'closed');
    });
  });
});
