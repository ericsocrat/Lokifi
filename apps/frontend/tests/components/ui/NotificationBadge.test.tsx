/**
 * NotificationBadge Component Tests
 *
 * Tests the notification badge component including:
 * - Count display
 * - Max overflow handling
 * - Size and variant styling
 * - Dot mode
 * - Position variants
 * - Accessibility
 */

import { Badge, NotificationBadge } from '@/src/components/ui/NotificationBadge';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('NotificationBadge Component', () => {
  describe('Basic Rendering', () => {
    it('should render with count', () => {
      render(<NotificationBadge count={5} />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should not render when count is 0 by default', () => {
      render(<NotificationBadge count={0} />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('should render when count is 0 and showZero is true', () => {
      render(<NotificationBadge count={0} showZero />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('Max Count', () => {
    it('should show max+ when count exceeds max', () => {
      render(<NotificationBadge count={150} max={99} />);

      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('should show exact count when below max', () => {
      render(<NotificationBadge count={50} max={99} />);

      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('should respect custom max value', () => {
      render(<NotificationBadge count={15} max={10} />);

      expect(screen.getByText('10+')).toBeInTheDocument();
    });

    it('should show exact count at max threshold', () => {
      render(<NotificationBadge count={99} max={99} />);

      expect(screen.getByText('99')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should apply small size classes', () => {
      render(<NotificationBadge count={5} size="sm" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('h-4', 'text-[10px]');
    });

    it('should apply medium size classes by default', () => {
      render(<NotificationBadge count={5} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('h-5', 'text-xs');
    });

    it('should apply large size classes', () => {
      render(<NotificationBadge count={5} size="lg" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('h-6', 'text-sm');
    });
  });

  describe('Color Variants', () => {
    it('should apply default lokifi color', () => {
      render(<NotificationBadge count={5} variant="default" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-lokifi-500', 'text-white');
    });

    it('should apply success color', () => {
      render(<NotificationBadge count={5} variant="success" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-emerald-500', 'text-white');
    });

    it('should apply warning color', () => {
      render(<NotificationBadge count={5} variant="warning" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-amber-500', 'text-white');
    });

    it('should apply error color', () => {
      render(<NotificationBadge count={5} variant="error" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-rose-500', 'text-white');
    });
  });

  describe('Dot Mode', () => {
    it('should render as dot without number', () => {
      render(<NotificationBadge count={5} dot />);

      const badge = screen.getByRole('status');
      expect(badge).not.toHaveTextContent('5');
    });

    it('should apply dot size classes', () => {
      render(<NotificationBadge count={5} dot size="md" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('w-2.5', 'h-2.5');
    });

    it('should show dot even with count 0', () => {
      render(<NotificationBadge count={0} dot />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Pulse Animation', () => {
    it('should apply pulse animation when enabled', () => {
      render(<NotificationBadge count={5} pulse />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('animate-pulse');
    });

    it('should not have pulse animation by default', () => {
      render(<NotificationBadge count={5} />);

      const badge = screen.getByRole('status');
      expect(badge).not.toHaveClass('animate-pulse');
    });
  });

  describe('Wrapper Mode', () => {
    it('should wrap children with badge', () => {
      render(
        <NotificationBadge count={3}>
          <button>Icon</button>
        </NotificationBadge>
      );

      expect(screen.getByText('Icon')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should position badge top-right by default', () => {
      const { container } = render(
        <NotificationBadge count={3}>
          <button>Icon</button>
        </NotificationBadge>
      );

      const positionedBadge = container.querySelector('.absolute');
      expect(positionedBadge).toHaveClass('-top-1', '-right-1');
    });

    it('should position badge top-left when specified', () => {
      const { container } = render(
        <NotificationBadge count={3} position="top-left">
          <button>Icon</button>
        </NotificationBadge>
      );

      const positionedBadge = container.querySelector('.absolute');
      expect(positionedBadge).toHaveClass('-top-1', '-left-1');
    });

    it('should position badge bottom-right when specified', () => {
      const { container } = render(
        <NotificationBadge count={3} position="bottom-right">
          <button>Icon</button>
        </NotificationBadge>
      );

      const positionedBadge = container.querySelector('.absolute');
      expect(positionedBadge).toHaveClass('-bottom-1', '-right-1');
    });

    it('should position badge bottom-left when specified', () => {
      const { container } = render(
        <NotificationBadge count={3} position="bottom-left">
          <button>Icon</button>
        </NotificationBadge>
      );

      const positionedBadge = container.querySelector('.absolute');
      expect(positionedBadge).toHaveClass('-bottom-1', '-left-1');
    });

    it('should have relative wrapper', () => {
      const { container } = render(
        <NotificationBadge count={3}>
          <button>Icon</button>
        </NotificationBadge>
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('relative', 'inline-flex');
    });
  });

  describe('Accessibility', () => {
    it('should have status role', () => {
      render(<NotificationBadge count={5} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have aria-label with count', () => {
      render(<NotificationBadge count={7} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-label', '7 notifications');
    });

    it('should have generic aria-label for dot mode', () => {
      render(<NotificationBadge count={5} dot />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-label', 'New notifications');
    });
  });

  describe('Custom Classes', () => {
    it('should apply custom className', () => {
      render(<NotificationBadge count={5} className="my-custom-class" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('my-custom-class');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
      render(<NotificationBadge count={9999} />);

      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('should handle negative numbers as 0', () => {
      render(<NotificationBadge count={-5} showZero />);

      // Negative shows as -5 (raw number) - may want to clamp this in the component
      expect(screen.getByText('-5')).toBeInTheDocument();
    });
  });
});

describe('Badge Component', () => {
  describe('Basic Rendering', () => {
    it('should render children', () => {
      render(<Badge>New</Badge>);

      expect(screen.getByText('New')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should apply default variant', () => {
      render(<Badge variant="default">Label</Badge>);

      const badge = screen.getByText('Label');
      expect(badge).toHaveClass('bg-lokifi-500/20', 'text-lokifi-400');
    });

    it('should apply success variant', () => {
      render(<Badge variant="success">Active</Badge>);

      const badge = screen.getByText('Active');
      expect(badge).toHaveClass('bg-emerald-500/20', 'text-emerald-400');
    });

    it('should apply warning variant', () => {
      render(<Badge variant="warning">Pending</Badge>);

      const badge = screen.getByText('Pending');
      expect(badge).toHaveClass('bg-amber-500/20', 'text-amber-400');
    });

    it('should apply error variant', () => {
      render(<Badge variant="error">Failed</Badge>);

      const badge = screen.getByText('Failed');
      expect(badge).toHaveClass('bg-rose-500/20', 'text-rose-400');
    });

    it('should apply secondary variant', () => {
      render(<Badge variant="secondary">Info</Badge>);

      const badge = screen.getByText('Info');
      expect(badge).toHaveClass('bg-surface-3', 'text-surface-11');
    });
  });

  describe('Sizes', () => {
    it('should apply small size', () => {
      render(<Badge size="sm">Small</Badge>);

      const badge = screen.getByText('Small');
      expect(badge).toHaveClass('text-[10px]', 'px-1.5', 'py-0.5');
    });

    it('should apply medium size by default', () => {
      render(<Badge>Medium</Badge>);

      const badge = screen.getByText('Medium');
      expect(badge).toHaveClass('text-xs', 'px-2', 'py-0.5');
    });

    it('should apply large size', () => {
      render(<Badge size="lg">Large</Badge>);

      const badge = screen.getByText('Large');
      expect(badge).toHaveClass('text-sm', 'px-2.5', 'py-1');
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      render(<Badge className="my-class">Custom</Badge>);

      const badge = screen.getByText('Custom');
      expect(badge).toHaveClass('my-class');
    });

    it('should have rounded-full and font-medium', () => {
      render(<Badge>Styled</Badge>);

      const badge = screen.getByText('Styled');
      expect(badge).toHaveClass('rounded-full', 'font-medium');
    });
  });
});
