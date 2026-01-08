import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import {
  Badge,
  BadgeGroup,
  StatusBadge,
  CountBadge,
  PriorityBadge,
  type BadgeVariant,
  type BadgeSize,
  type StatusType,
  type PriorityLevel,
} from '@/components/ui/Badge';

// ============================================================================
// Badge Tests
// ============================================================================

describe('Badge', () => {
  describe('Basic Rendering', () => {
    it('renders with children', () => {
      render(<Badge>Test Badge</Badge>);
      expect(screen.getByText('Test Badge')).toBeInTheDocument();
    });

    it('renders with data-badge attribute', () => {
      render(<Badge>Test</Badge>);
      expect(screen.getByText('Test')).toHaveAttribute('data-badge');
    });

    it('applies custom className', () => {
      render(<Badge className="custom-class">Test</Badge>);
      expect(screen.getByText('Test')).toHaveClass('custom-class');
    });

    it('forwards ref', () => {
      const ref = vi.fn();
      render(<Badge ref={ref}>Test</Badge>);
      expect(ref).toHaveBeenCalled();
    });

    it('passes through additional props', () => {
      render(<Badge data-testid="custom-badge">Test</Badge>);
      expect(screen.getByTestId('custom-badge')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    const variants: BadgeVariant[] = [
      'default',
      'primary',
      'secondary',
      'success',
      'warning',
      'danger',
      'info',
      'outline',
    ];

    variants.forEach((variant) => {
      it(`renders ${variant} variant`, () => {
        render(<Badge variant={variant}>{variant}</Badge>);
        expect(screen.getByText(variant)).toHaveAttribute('data-variant', variant);
      });
    });

    it('uses default variant when not specified', () => {
      render(<Badge>Default</Badge>);
      expect(screen.getByText('Default')).toHaveAttribute('data-variant', 'default');
    });

    it('applies correct classes for primary variant', () => {
      render(<Badge variant="primary">Primary</Badge>);
      expect(screen.getByText('Primary')).toHaveClass('bg-lokifi-100');
    });

    it('applies correct classes for success variant', () => {
      render(<Badge variant="success">Success</Badge>);
      expect(screen.getByText('Success')).toHaveClass('bg-green-100');
    });

    it('applies correct classes for danger variant', () => {
      render(<Badge variant="danger">Danger</Badge>);
      expect(screen.getByText('Danger')).toHaveClass('bg-red-100');
    });

    it('applies correct classes for outline variant', () => {
      render(<Badge variant="outline">Outline</Badge>);
      expect(screen.getByText('Outline')).toHaveClass('border', 'bg-transparent');
    });
  });

  describe('Sizes', () => {
    const sizes: BadgeSize[] = ['xs', 'sm', 'md', 'lg'];

    sizes.forEach((size) => {
      it(`renders ${size} size`, () => {
        render(<Badge size={size}>{size}</Badge>);
        expect(screen.getByText(size)).toHaveAttribute('data-size', size);
      });
    });

    it('uses md size by default', () => {
      render(<Badge>Default Size</Badge>);
      expect(screen.getByText('Default Size')).toHaveAttribute('data-size', 'md');
    });

    it('applies correct padding for xs size', () => {
      render(<Badge size="xs">XS</Badge>);
      expect(screen.getByText('XS')).toHaveClass('px-1.5');
    });

    it('applies correct padding for lg size', () => {
      render(<Badge size="lg">LG</Badge>);
      expect(screen.getByText('LG')).toHaveClass('px-3');
    });
  });

  describe('Pill Shape', () => {
    it('applies rounded-md by default', () => {
      render(<Badge>Default</Badge>);
      expect(screen.getByText('Default')).toHaveClass('rounded-md');
    });

    it('applies rounded-full when pill is true', () => {
      render(<Badge pill>Pill</Badge>);
      expect(screen.getByText('Pill')).toHaveClass('rounded-full');
    });
  });

  describe('Icons', () => {
    it('renders icon before text', () => {
      const icon = <span data-testid="start-icon">★</span>;
      render(<Badge icon={icon}>With Icon</Badge>);
      expect(screen.getByTestId('start-icon')).toBeInTheDocument();
      expect(screen.getByText('With Icon')).toBeInTheDocument();
    });

    it('renders end icon after text', () => {
      const endIcon = <span data-testid="end-icon">→</span>;
      render(<Badge endIcon={endIcon}>With End Icon</Badge>);
      expect(screen.getByTestId('end-icon')).toBeInTheDocument();
    });

    it('renders both icons', () => {
      const icon = <span data-testid="start-icon">★</span>;
      const endIcon = <span data-testid="end-icon">→</span>;
      render(
        <Badge icon={icon} endIcon={endIcon}>
          Both Icons
        </Badge>
      );
      expect(screen.getByTestId('start-icon')).toBeInTheDocument();
      expect(screen.getByTestId('end-icon')).toBeInTheDocument();
    });

    it('wraps icon in data-badge-icon container', () => {
      const icon = <span>★</span>;
      render(<Badge icon={icon}>Badge</Badge>);
      expect(document.querySelector('[data-badge-icon]')).toBeInTheDocument();
    });

    it('wraps end icon in data-badge-end-icon container', () => {
      const endIcon = <span>→</span>;
      render(<Badge endIcon={endIcon}>Badge</Badge>);
      expect(document.querySelector('[data-badge-end-icon]')).toBeInTheDocument();
    });
  });

  describe('Dot Indicator', () => {
    it('shows dot when dot prop is true', () => {
      render(<Badge dot>With Dot</Badge>);
      expect(document.querySelector('[data-badge-dot]')).toBeInTheDocument();
    });

    it('hides dot by default', () => {
      render(<Badge>No Dot</Badge>);
      expect(document.querySelector('[data-badge-dot]')).not.toBeInTheDocument();
    });

    it('applies correct color for green dot', () => {
      render(<Badge dot dotColor="green">Green Dot</Badge>);
      expect(document.querySelector('[data-badge-dot]')).toHaveClass('bg-green-500');
    });

    it('applies correct color for red dot', () => {
      render(<Badge dot dotColor="red">Red Dot</Badge>);
      expect(document.querySelector('[data-badge-dot]')).toHaveClass('bg-red-500');
    });

    it('applies correct color for yellow dot', () => {
      render(<Badge dot dotColor="yellow">Yellow Dot</Badge>);
      expect(document.querySelector('[data-badge-dot]')).toHaveClass('bg-yellow-500');
    });

    it('uses gray dot color by default', () => {
      render(<Badge dot>Default Dot</Badge>);
      expect(document.querySelector('[data-badge-dot]')).toHaveClass('bg-gray-500');
    });

    it('dot has aria-hidden', () => {
      render(<Badge dot>Dot</Badge>);
      expect(document.querySelector('[data-badge-dot]')).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Removable', () => {
    it('shows remove button when removable is true', () => {
      render(<Badge removable>Removable</Badge>);
      expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
    });

    it('hides remove button by default', () => {
      render(<Badge>Not Removable</Badge>);
      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    });

    it('calls onRemove when remove button is clicked', async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();
      render(
        <Badge removable onRemove={onRemove}>
          Removable
        </Badge>
      );

      await user.click(screen.getByRole('button', { name: /remove/i }));
      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it('stops propagation when remove button is clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      const onRemove = vi.fn();
      render(
        <Badge removable onRemove={onRemove} onClick={onClick}>
          Removable
        </Badge>
      );

      await user.click(screen.getByRole('button', { name: /remove/i }));
      expect(onRemove).toHaveBeenCalled();
      expect(onClick).not.toHaveBeenCalled();
    });

    it('remove button has data-badge-remove attribute', () => {
      render(<Badge removable>Removable</Badge>);
      expect(screen.getByRole('button', { name: /remove/i })).toHaveAttribute(
        'data-badge-remove'
      );
    });
  });

  describe('Interactive', () => {
    it('adds button role when interactive', () => {
      render(<Badge interactive>Click me</Badge>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('adds tabIndex when interactive', () => {
      render(<Badge interactive>Click me</Badge>);
      expect(screen.getByRole('button')).toHaveAttribute('tabIndex', '0');
    });

    it('does not add button role by default', () => {
      render(<Badge>Not interactive</Badge>);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('applies hover styles when interactive', () => {
      render(<Badge interactive>Interactive</Badge>);
      expect(screen.getByRole('button')).toHaveClass('cursor-pointer');
    });

    it('calls onClick when clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Badge interactive onClick={onClick}>
          Click me
        </Badge>
      );

      await user.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('handles Enter key press', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Badge interactive onClick={onClick}>
          Press Enter
        </Badge>
      );

      screen.getByRole('button').focus();
      await user.keyboard('{Enter}');
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('handles Space key press', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Badge interactive onClick={onClick}>
          Press Space
        </Badge>
      );

      screen.getByRole('button').focus();
      await user.keyboard(' ');
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('displayName', () => {
    it('has displayName', () => {
      expect(Badge.displayName).toBe('Badge');
    });
  });
});

// ============================================================================
// BadgeGroup Tests
// ============================================================================

describe('BadgeGroup', () => {
  describe('Basic Rendering', () => {
    it('renders all badges', () => {
      render(
        <BadgeGroup>
          <Badge>One</Badge>
          <Badge>Two</Badge>
          <Badge>Three</Badge>
        </BadgeGroup>
      );
      expect(screen.getByText('One')).toBeInTheDocument();
      expect(screen.getByText('Two')).toBeInTheDocument();
      expect(screen.getByText('Three')).toBeInTheDocument();
    });

    it('has data-badge-group attribute', () => {
      render(
        <BadgeGroup data-testid="group">
          <Badge>Test</Badge>
        </BadgeGroup>
      );
      expect(screen.getByTestId('group')).toHaveAttribute('data-badge-group');
    });

    it('has group role', () => {
      render(
        <BadgeGroup>
          <Badge>Test</Badge>
        </BadgeGroup>
      );
      expect(screen.getByRole('group')).toBeInTheDocument();
    });

    it('has aria-label with badge count', () => {
      render(
        <BadgeGroup>
          <Badge>One</Badge>
          <Badge>Two</Badge>
        </BadgeGroup>
      );
      expect(screen.getByRole('group')).toHaveAttribute(
        'aria-label',
        'Group of 2 badges'
      );
    });
  });

  describe('Max Badges', () => {
    it('limits visible badges when max is set', () => {
      render(
        <BadgeGroup max={2}>
          <Badge>One</Badge>
          <Badge>Two</Badge>
          <Badge>Three</Badge>
        </BadgeGroup>
      );
      expect(screen.getByText('One')).toBeInTheDocument();
      expect(screen.getByText('Two')).toBeInTheDocument();
      expect(screen.queryByText('Three')).not.toBeInTheDocument();
    });

    it('shows count of hidden badges', () => {
      render(
        <BadgeGroup max={2}>
          <Badge>One</Badge>
          <Badge>Two</Badge>
          <Badge>Three</Badge>
          <Badge>Four</Badge>
        </BadgeGroup>
      );
      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('does not show overflow badge when all are visible', () => {
      render(
        <BadgeGroup max={5}>
          <Badge>One</Badge>
          <Badge>Two</Badge>
        </BadgeGroup>
      );
      expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
    });

    it('overflow badge has data-badge-overflow attribute', () => {
      render(
        <BadgeGroup max={1}>
          <Badge>One</Badge>
          <Badge>Two</Badge>
        </BadgeGroup>
      );
      expect(document.querySelector('[data-badge-overflow]')).toBeInTheDocument();
    });
  });

  describe('Size', () => {
    it('applies size to all child badges', () => {
      render(
        <BadgeGroup size="lg">
          <Badge>One</Badge>
          <Badge>Two</Badge>
        </BadgeGroup>
      );
      expect(screen.getByText('One')).toHaveAttribute('data-size', 'lg');
      expect(screen.getByText('Two')).toHaveAttribute('data-size', 'lg');
    });

    it('child badge size overrides group size', () => {
      render(
        <BadgeGroup size="lg">
          <Badge size="sm">Small</Badge>
          <Badge>Large</Badge>
        </BadgeGroup>
      );
      expect(screen.getByText('Small')).toHaveAttribute('data-size', 'sm');
      expect(screen.getByText('Large')).toHaveAttribute('data-size', 'lg');
    });

    it('uses md as default size', () => {
      render(
        <BadgeGroup>
          <Badge>Test</Badge>
        </BadgeGroup>
      );
      expect(screen.getByText('Test')).toHaveAttribute('data-size', 'md');
    });
  });

  describe('Variant', () => {
    it('applies variant to all child badges', () => {
      render(
        <BadgeGroup variant="success">
          <Badge>One</Badge>
          <Badge>Two</Badge>
        </BadgeGroup>
      );
      expect(screen.getByText('One')).toHaveAttribute('data-variant', 'success');
      expect(screen.getByText('Two')).toHaveAttribute('data-variant', 'success');
    });

    it('child badge variant overrides group variant', () => {
      render(
        <BadgeGroup variant="success">
          <Badge variant="danger">Danger</Badge>
          <Badge>Success</Badge>
        </BadgeGroup>
      );
      expect(screen.getByText('Danger')).toHaveAttribute('data-variant', 'danger');
      expect(screen.getByText('Success')).toHaveAttribute('data-variant', 'success');
    });
  });

  describe('Gap', () => {
    it('applies default gap', () => {
      render(
        <BadgeGroup data-testid="group">
          <Badge>Test</Badge>
        </BadgeGroup>
      );
      expect(screen.getByTestId('group')).toHaveClass('gap-1.5');
    });

    it('applies xs gap', () => {
      render(
        <BadgeGroup gap="xs" data-testid="group">
          <Badge>Test</Badge>
        </BadgeGroup>
      );
      expect(screen.getByTestId('group')).toHaveClass('gap-1');
    });

    it('applies md gap', () => {
      render(
        <BadgeGroup gap="md" data-testid="group">
          <Badge>Test</Badge>
        </BadgeGroup>
      );
      expect(screen.getByTestId('group')).toHaveClass('gap-2');
    });
  });

  describe('Wrap', () => {
    it('enables wrapping by default', () => {
      render(
        <BadgeGroup data-testid="group">
          <Badge>Test</Badge>
        </BadgeGroup>
      );
      expect(screen.getByTestId('group')).toHaveClass('flex-wrap');
    });

    it('disables wrapping when wrap is false', () => {
      render(
        <BadgeGroup wrap={false} data-testid="group">
          <Badge>Test</Badge>
        </BadgeGroup>
      );
      expect(screen.getByTestId('group')).not.toHaveClass('flex-wrap');
    });
  });

  describe('displayName', () => {
    it('has displayName', () => {
      expect(BadgeGroup.displayName).toBe('BadgeGroup');
    });
  });
});

// ============================================================================
// StatusBadge Tests
// ============================================================================

describe('StatusBadge', () => {
  describe('Status Types', () => {
    const statuses: StatusType[] = ['online', 'offline', 'busy', 'away', 'pending', 'active', 'inactive'];

    statuses.forEach((status) => {
      it(`renders ${status} status`, () => {
        render(<StatusBadge status={status} />);
        expect(document.querySelector('[data-status-badge]')).toHaveAttribute('data-status', status);
      });
    });
  });

  describe('Status Display', () => {
    it('shows status text by default', () => {
      render(<StatusBadge status="online" />);
      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('hides status text when showText is false', () => {
      render(<StatusBadge status="online" showText={false} />);
      expect(screen.queryByText('Online')).not.toBeInTheDocument();
    });

    it('shows custom children instead of status text', () => {
      render(<StatusBadge status="online">Custom Text</StatusBadge>);
      expect(screen.getByText('Custom Text')).toBeInTheDocument();
      expect(screen.queryByText('Online')).not.toBeInTheDocument();
    });
  });

  describe('Status Colors', () => {
    it('shows green dot for online status', () => {
      render(<StatusBadge status="online" />);
      expect(document.querySelector('[data-badge-dot]')).toHaveClass('bg-green-500');
    });

    it('shows red dot for busy status', () => {
      render(<StatusBadge status="busy" />);
      expect(document.querySelector('[data-badge-dot]')).toHaveClass('bg-red-500');
    });

    it('shows yellow dot for away status', () => {
      render(<StatusBadge status="away" />);
      expect(document.querySelector('[data-badge-dot]')).toHaveClass('bg-yellow-500');
    });

    it('shows gray dot for offline status', () => {
      render(<StatusBadge status="offline" />);
      expect(document.querySelector('[data-badge-dot]')).toHaveClass('bg-gray-500');
    });
  });

  describe('Status Variants', () => {
    it('applies success variant for online', () => {
      render(<StatusBadge status="online" />);
      expect(document.querySelector('[data-status-badge]')).toHaveAttribute('data-variant', 'success');
    });

    it('applies danger variant for busy', () => {
      render(<StatusBadge status="busy" />);
      expect(document.querySelector('[data-status-badge]')).toHaveAttribute('data-variant', 'danger');
    });

    it('applies warning variant for away', () => {
      render(<StatusBadge status="away" />);
      expect(document.querySelector('[data-status-badge]')).toHaveAttribute('data-variant', 'warning');
    });

    it('applies default variant for offline', () => {
      render(<StatusBadge status="offline" />);
      expect(document.querySelector('[data-status-badge]')).toHaveAttribute('data-variant', 'default');
    });
  });

  describe('displayName', () => {
    it('has displayName', () => {
      expect(StatusBadge.displayName).toBe('StatusBadge');
    });
  });
});

// ============================================================================
// CountBadge Tests
// ============================================================================

describe('CountBadge', () => {
  describe('Count Display', () => {
    it('shows count', () => {
      render(<CountBadge count={5} />);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('shows zero count when showZero is true', () => {
      render(<CountBadge count={0} showZero />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('hides zero count by default', () => {
      render(<CountBadge count={0} />);
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('returns null when count is zero and showZero is false', () => {
      const { container } = render(<CountBadge count={0} />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('Max Count', () => {
    it('shows count up to max', () => {
      render(<CountBadge count={50} max={99} />);
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('shows max+ when count exceeds max', () => {
      render(<CountBadge count={150} max={99} />);
      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('uses 99 as default max', () => {
      render(<CountBadge count={100} />);
      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('shows exact count at max threshold', () => {
      render(<CountBadge count={99} max={99} />);
      expect(screen.getByText('99')).toBeInTheDocument();
    });

    it('handles custom max values', () => {
      render(<CountBadge count={10} max={9} />);
      expect(screen.getByText('9+')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('uses pill shape by default', () => {
      render(<CountBadge count={5} />);
      expect(screen.getByText('5')).toHaveClass('rounded-full');
    });

    it('uses xs size by default', () => {
      render(<CountBadge count={5} />);
      expect(screen.getByText('5')).toHaveAttribute('data-size', 'xs');
    });

    it('allows custom size', () => {
      render(<CountBadge count={5} size="lg" />);
      expect(screen.getByText('5')).toHaveAttribute('data-size', 'lg');
    });
  });

  describe('Data Attributes', () => {
    it('has data-count-badge attribute', () => {
      render(<CountBadge count={5} />);
      expect(document.querySelector('[data-count-badge]')).toBeInTheDocument();
    });
  });

  describe('displayName', () => {
    it('has displayName', () => {
      expect(CountBadge.displayName).toBe('CountBadge');
    });
  });
});

// ============================================================================
// PriorityBadge Tests
// ============================================================================

describe('PriorityBadge', () => {
  describe('Priority Levels', () => {
    const priorities: PriorityLevel[] = ['critical', 'high', 'medium', 'low', 'none'];

    priorities.forEach((priority) => {
      it(`renders ${priority} priority`, () => {
        render(<PriorityBadge priority={priority} />);
        expect(document.querySelector('[data-priority-badge]')).toHaveAttribute(
          'data-priority',
          priority
        );
      });
    });
  });

  describe('Priority Display', () => {
    it('shows priority text by default', () => {
      render(<PriorityBadge priority="high" />);
      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('hides priority text when showText is false', () => {
      render(<PriorityBadge priority="high" showText={false} />);
      expect(screen.queryByText('High')).not.toBeInTheDocument();
    });

    it('shows custom children instead of priority text', () => {
      render(<PriorityBadge priority="high">Urgent</PriorityBadge>);
      expect(screen.getByText('Urgent')).toBeInTheDocument();
      expect(screen.queryByText('High')).not.toBeInTheDocument();
    });
  });

  describe('Priority Variants', () => {
    it('applies danger variant for critical', () => {
      render(<PriorityBadge priority="critical" />);
      expect(document.querySelector('[data-priority-badge]')).toHaveAttribute('data-variant', 'danger');
    });

    it('applies warning variant for high', () => {
      render(<PriorityBadge priority="high" />);
      expect(document.querySelector('[data-priority-badge]')).toHaveAttribute('data-variant', 'warning');
    });

    it('applies info variant for medium', () => {
      render(<PriorityBadge priority="medium" />);
      expect(document.querySelector('[data-priority-badge]')).toHaveAttribute('data-variant', 'info');
    });

    it('applies success variant for low', () => {
      render(<PriorityBadge priority="low" />);
      expect(document.querySelector('[data-priority-badge]')).toHaveAttribute('data-variant', 'success');
    });

    it('applies default variant for none', () => {
      render(<PriorityBadge priority="none" />);
      expect(document.querySelector('[data-priority-badge]')).toHaveAttribute('data-variant', 'default');
    });
  });

  describe('Priority Icons', () => {
    it('shows icon for critical priority', () => {
      render(<PriorityBadge priority="critical" />);
      expect(document.querySelector('[data-badge-icon]')).toBeInTheDocument();
    });

    it('shows icon for high priority', () => {
      render(<PriorityBadge priority="high" />);
      expect(document.querySelector('[data-badge-icon]')).toBeInTheDocument();
    });

    it('shows icon for medium priority', () => {
      render(<PriorityBadge priority="medium" />);
      expect(document.querySelector('[data-badge-icon]')).toBeInTheDocument();
    });

    it('shows icon for low priority', () => {
      render(<PriorityBadge priority="low" />);
      expect(document.querySelector('[data-badge-icon]')).toBeInTheDocument();
    });

    it('does not show icon for none priority', () => {
      render(<PriorityBadge priority="none" />);
      expect(document.querySelector('[data-badge-icon]')).not.toBeInTheDocument();
    });
  });

  describe('displayName', () => {
    it('has displayName', () => {
      expect(PriorityBadge.displayName).toBe('PriorityBadge');
    });
  });
});

// ============================================================================
// Financial Dashboard Use Cases
// ============================================================================

describe('Financial Dashboard Use Cases', () => {
  it('displays portfolio status badge', () => {
    render(<StatusBadge status="active">Portfolio Active</StatusBadge>);
    expect(screen.getByText('Portfolio Active')).toBeInTheDocument();
    expect(document.querySelector('[data-badge-dot]')).toHaveClass('bg-green-500');
  });

  it('displays trade priority badge', () => {
    render(<PriorityBadge priority="critical">Urgent Trade</PriorityBadge>);
    expect(screen.getByText('Urgent Trade')).toBeInTheDocument();
  });

  it('displays notification count badge', () => {
    render(<CountBadge count={12} variant="danger" />);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('displays tag group for asset categories', () => {
    render(
      <BadgeGroup max={3}>
        <Badge variant="primary">Stocks</Badge>
        <Badge variant="secondary">Bonds</Badge>
        <Badge variant="success">ETFs</Badge>
        <Badge variant="info">Crypto</Badge>
        <Badge variant="warning">Commodities</Badge>
      </BadgeGroup>
    );
    expect(screen.getByText('Stocks')).toBeInTheDocument();
    expect(screen.getByText('Bonds')).toBeInTheDocument();
    expect(screen.getByText('ETFs')).toBeInTheDocument();
    expect(screen.queryByText('Crypto')).not.toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('displays removable watchlist tags', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(
      <Badge removable onRemove={onRemove} variant="primary">
        AAPL
      </Badge>
    );
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /remove/i }));
    expect(onRemove).toHaveBeenCalled();
  });

  it('displays account status indicators', () => {
    render(
      <div>
        <StatusBadge status="online">Connected</StatusBadge>
        <StatusBadge status="pending">Syncing</StatusBadge>
        <StatusBadge status="offline">Disconnected</StatusBadge>
      </div>
    );
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('Syncing')).toBeInTheDocument();
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('displays interactive filter badges', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <BadgeGroup>
        <Badge interactive onClick={onClick} variant="primary">
          Active
        </Badge>
        <Badge interactive variant="outline">
          Pending
        </Badge>
        <Badge interactive variant="outline">
          Closed
        </Badge>
      </BadgeGroup>
    );
    await user.click(screen.getByText('Active'));
    expect(onClick).toHaveBeenCalled();
  });

  it('displays risk level badge with dot', () => {
    render(
      <Badge dot dotColor="red" variant="danger">
        High Risk
      </Badge>
    );
    expect(screen.getByText('High Risk')).toBeInTheDocument();
    expect(document.querySelector('[data-badge-dot]')).toHaveClass('bg-red-500');
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  it('handles empty children gracefully', () => {
    render(<Badge>{''}</Badge>);
    expect(document.querySelector('[data-badge]')).toBeInTheDocument();
  });

  it('handles undefined children in BadgeGroup', () => {
    render(
      <BadgeGroup>
        <Badge>One</Badge>
        {undefined}
        <Badge>Two</Badge>
      </BadgeGroup>
    );
    expect(screen.getByText('One')).toBeInTheDocument();
    expect(screen.getByText('Two')).toBeInTheDocument();
  });

  it('handles very long badge text', () => {
    render(<Badge>This is a very long badge text that might overflow</Badge>);
    expect(
      screen.getByText('This is a very long badge text that might overflow')
    ).toBeInTheDocument();
  });

  it('handles special characters in badge text', () => {
    render(<Badge>+150% ↑ $1,234.56</Badge>);
    expect(screen.getByText('+150% ↑ $1,234.56')).toBeInTheDocument();
  });

  it('handles large count numbers', () => {
    render(<CountBadge count={999999} max={99999} />);
    expect(screen.getByText('99999+')).toBeInTheDocument();
  });

  it('handles negative counts', () => {
    render(<CountBadge count={-5} />);
    expect(screen.getByText('-5')).toBeInTheDocument();
  });

  it('handles non-Badge children in BadgeGroup', () => {
    render(
      <BadgeGroup>
        <Badge>Badge</Badge>
        <span>Not a badge</span>
      </BadgeGroup>
    );
    expect(screen.getByText('Badge')).toBeInTheDocument();
    expect(screen.getByText('Not a badge')).toBeInTheDocument();
  });

  it('handles zero max as no limit in BadgeGroup', () => {
    // When max is 0, it's treated as falsy (no limit), showing all badges
    render(
      <BadgeGroup max={0}>
        <Badge>One</Badge>
        <Badge>Two</Badge>
      </BadgeGroup>
    );
    expect(screen.getByText('One')).toBeInTheDocument();
    expect(screen.getByText('Two')).toBeInTheDocument();
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });
});

// ============================================================================
// Accessibility
// ============================================================================

describe('Accessibility', () => {
  it('badge is accessible to screen readers', () => {
    render(<Badge>Status: Active</Badge>);
    expect(screen.getByText('Status: Active')).toBeInTheDocument();
  });

  it('remove button has accessible name', () => {
    render(<Badge removable>Removable</Badge>);
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('badge group has accessible label', () => {
    render(
      <BadgeGroup>
        <Badge>One</Badge>
        <Badge>Two</Badge>
      </BadgeGroup>
    );
    expect(screen.getByRole('group')).toHaveAccessibleName('Group of 2 badges');
  });

  it('interactive badge is keyboard accessible', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Badge interactive onClick={onClick}>
        Clickable
      </Badge>
    );

    const badge = screen.getByRole('button');
    badge.focus();
    expect(badge).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalled();
  });

  it('dot indicator is hidden from screen readers', () => {
    render(<Badge dot>With Dot</Badge>);
    expect(document.querySelector('[data-badge-dot]')).toHaveAttribute('aria-hidden', 'true');
  });

  it('icon in priority badge is hidden from screen readers', () => {
    render(<PriorityBadge priority="critical" />);
    const svg = document.querySelector('[data-badge-icon] svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
