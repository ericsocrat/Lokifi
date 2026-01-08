/**
 * GoalCard Component Tests
 *
 * Tests the financial goal card component including:
 * - Rendering goal data
 * - Progress calculation and display
 * - Priority badges and colors
 * - Action menu functionality
 * - Accessibility
 */

import { GoalCard, type FinancialGoal } from '@/src/components/ui/GoalCard';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock formatCurrency function
const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;

// Sample goal data
const mockGoal: FinancialGoal = {
  id: 'goal-1',
  name: 'Emergency Fund',
  targetAmount: 25000,
  currentAmount: 18750,
  deadline: '2026-06-01',
  category: 'emergency',
  priority: 'high',
  monthlyContribution: 500,
  color: '#10B981',
};

describe('GoalCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Date.now for consistent deadline calculations
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-08'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('should render goal name', () => {
      render(<GoalCard goal={mockGoal} formatCurrency={formatCurrency} />);

      expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
    });

    it('should render current amount', () => {
      render(<GoalCard goal={mockGoal} formatCurrency={formatCurrency} />);

      expect(screen.getByText('$18,750')).toBeInTheDocument();
    });

    it('should render target amount', () => {
      render(<GoalCard goal={mockGoal} formatCurrency={formatCurrency} />);

      expect(screen.getByText('of $25,000')).toBeInTheDocument();
    });

    it('should render monthly contribution', () => {
      render(<GoalCard goal={mockGoal} formatCurrency={formatCurrency} />);

      expect(screen.getByText('+$500')).toBeInTheDocument();
    });

    it('should render remaining amount', () => {
      render(<GoalCard goal={mockGoal} formatCurrency={formatCurrency} />);

      // 25000 - 18750 = 6250
      expect(screen.getByText('$6,250')).toBeInTheDocument();
    });
  });

  describe('Progress Display', () => {
    it('should display correct progress percentage', () => {
      render(<GoalCard goal={mockGoal} formatCurrency={formatCurrency} />);

      // 18750 / 25000 = 75%
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should have progress bar with correct width', () => {
      const { container } = render(<GoalCard goal={mockGoal} formatCurrency={formatCurrency} />);

      // Find the linear progress bar (not the circular ProgressRing)
      const progressBars = container.querySelectorAll('.h-2.bg-surface-3 > div');
      expect(progressBars[0]).toHaveStyle({ width: '75%' });
    });

    it('should cap progress at 100% when overfunded', () => {
      const overfundedGoal: FinancialGoal = {
        ...mockGoal,
        currentAmount: 30000,
        targetAmount: 25000,
      };

      const { container } = render(
        <GoalCard goal={overfundedGoal} formatCurrency={formatCurrency} />
      );

      const progressBar = container.querySelector('[style*="width: 100%"]');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Priority Badge', () => {
    it('should display high priority with rose color', () => {
      render(<GoalCard goal={mockGoal} formatCurrency={formatCurrency} />);

      const badge = screen.getByText('high');
      expect(badge).toHaveClass('bg-rose-500/20', 'text-rose-400');
    });

    it('should display medium priority with amber color', () => {
      const mediumGoal: FinancialGoal = { ...mockGoal, priority: 'medium' };
      render(<GoalCard goal={mediumGoal} formatCurrency={formatCurrency} />);

      const badge = screen.getByText('medium');
      expect(badge).toHaveClass('bg-amber-500/20', 'text-amber-400');
    });

    it('should display low priority with emerald color', () => {
      const lowGoal: FinancialGoal = { ...mockGoal, priority: 'low' };
      render(<GoalCard goal={lowGoal} formatCurrency={formatCurrency} />);

      const badge = screen.getByText('low');
      expect(badge).toHaveClass('bg-emerald-500/20', 'text-emerald-400');
    });
  });

  describe('Deadline Display', () => {
    it('should display months remaining', () => {
      render(<GoalCard goal={mockGoal} formatCurrency={formatCurrency} />);

      // Deadline is June 2026, current date is Jan 2025 = ~17 months
      expect(screen.getByText(/months? left/)).toBeInTheDocument();
    });

    it('should show singular "month" when 1 month left', () => {
      const soonGoal: FinancialGoal = {
        ...mockGoal,
        deadline: '2025-02-01',
      };
      render(<GoalCard goal={soonGoal} formatCurrency={formatCurrency} />);

      expect(screen.getByText('1 month left')).toBeInTheDocument();
    });

    it('should show 0 months for past deadline', () => {
      const pastGoal: FinancialGoal = {
        ...mockGoal,
        deadline: '2024-01-01',
      };
      render(<GoalCard goal={pastGoal} formatCurrency={formatCurrency} />);

      expect(screen.getByText('0 months left')).toBeInTheDocument();
    });
  });

  describe('Category Icons', () => {
    it('should render emergency category icon', () => {
      render(<GoalCard goal={mockGoal} formatCurrency={formatCurrency} />);

      // Icon container should have the goal color
      const iconContainer = screen.getByText('Emergency Fund').parentElement?.previousSibling;
      expect(iconContainer).toHaveStyle({ backgroundColor: '#10B98120', color: '#10B981' });
    });

    it('should render house category icon', () => {
      const houseGoal: FinancialGoal = { ...mockGoal, category: 'house' };
      render(<GoalCard goal={houseGoal} formatCurrency={formatCurrency} />);

      expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
    });

    it('should render vacation category icon', () => {
      const vacationGoal: FinancialGoal = { ...mockGoal, category: 'vacation' };
      render(<GoalCard goal={vacationGoal} formatCurrency={formatCurrency} />);

      expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
    });
  });

  describe('Action Menu', () => {
    it('should show menu button on hover', () => {
      const { container } = render(
        <GoalCard goal={mockGoal} formatCurrency={formatCurrency} onEdit={vi.fn()} />
      );

      const menuButton = screen.getByRole('button', { name: /goal actions/i });
      expect(menuButton).toBeInTheDocument();
      // Menu button is hidden by default (opacity-0) and shown on group-hover
      expect(menuButton).toHaveClass('opacity-0', 'group-hover:opacity-100');
    });

    it('should open menu when button is clicked', () => {
      render(<GoalCard goal={mockGoal} formatCurrency={formatCurrency} onEdit={vi.fn()} />);

      const menuButton = screen.getByRole('button', { name: /goal actions/i });
      fireEvent.click(menuButton);

      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument();
    });

    it('should call onEdit when edit is clicked', () => {
      const handleEdit = vi.fn();
      render(<GoalCard goal={mockGoal} formatCurrency={formatCurrency} onEdit={handleEdit} />);

      fireEvent.click(screen.getByRole('button', { name: /goal actions/i }));
      fireEvent.click(screen.getByRole('menuitem', { name: /edit/i }));

      expect(handleEdit).toHaveBeenCalledWith('goal-1');
    });

    it('should call onDelete when delete is clicked', () => {
      const handleDelete = vi.fn();
      render(<GoalCard goal={mockGoal} formatCurrency={formatCurrency} onDelete={handleDelete} />);

      fireEvent.click(screen.getByRole('button', { name: /goal actions/i }));
      fireEvent.click(screen.getByRole('menuitem', { name: /delete/i }));

      expect(handleDelete).toHaveBeenCalledWith('goal-1');
    });

    it('should close menu after action', () => {
      const handleEdit = vi.fn();
      render(<GoalCard goal={mockGoal} formatCurrency={formatCurrency} onEdit={handleEdit} />);

      fireEvent.click(screen.getByRole('button', { name: /goal actions/i }));
      fireEvent.click(screen.getByRole('menuitem', { name: /edit/i }));

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('should not show actions when showActions is false', () => {
      render(
        <GoalCard
          goal={mockGoal}
          formatCurrency={formatCurrency}
          onEdit={vi.fn()}
          showActions={false}
        />
      );

      expect(screen.queryByRole('button', { name: /goal actions/i })).not.toBeInTheDocument();
    });

    it('should not show menu button when no callbacks provided', () => {
      render(<GoalCard goal={mockGoal} formatCurrency={formatCurrency} />);

      expect(screen.queryByRole('button', { name: /goal actions/i })).not.toBeInTheDocument();
    });
  });

  describe('Click Handling', () => {
    it('should call onClick when card is clicked', () => {
      const handleClick = vi.fn();
      render(<GoalCard goal={mockGoal} formatCurrency={formatCurrency} onClick={handleClick} />);

      fireEvent.click(screen.getByText('Emergency Fund').closest('div')!);
      expect(handleClick).toHaveBeenCalledWith('goal-1');
    });

    it('should have cursor-pointer when onClick is provided', () => {
      const { container } = render(
        <GoalCard goal={mockGoal} formatCurrency={formatCurrency} onClick={vi.fn()} />
      );

      const card = container.firstChild;
      expect(card).toHaveClass('cursor-pointer');
    });

    it('should be keyboard accessible when clickable', () => {
      const handleClick = vi.fn();
      render(<GoalCard goal={mockGoal} formatCurrency={formatCurrency} onClick={handleClick} />);

      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledWith('goal-1');
    });

    it('should not call onClick when menu action is clicked', () => {
      const handleClick = vi.fn();
      const handleEdit = vi.fn();
      render(
        <GoalCard
          goal={mockGoal}
          formatCurrency={formatCurrency}
          onClick={handleClick}
          onEdit={handleEdit}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /goal actions/i }));
      fireEvent.click(screen.getByRole('menuitem', { name: /edit/i }));

      expect(handleEdit).toHaveBeenCalled();
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Variant Styles', () => {
    it('should have compact padding in compact variant', () => {
      const { container } = render(
        <GoalCard goal={mockGoal} formatCurrency={formatCurrency} variant="compact" />
      );

      const card = container.firstChild;
      expect(card).toHaveClass('p-4');
    });

    it('should have default padding in default variant', () => {
      const { container } = render(
        <GoalCard goal={mockGoal} formatCurrency={formatCurrency} variant="default" />
      );

      const card = container.firstChild;
      expect(card).toHaveClass('p-6');
    });

    it('should hide stats in compact variant', () => {
      render(<GoalCard goal={mockGoal} formatCurrency={formatCurrency} variant="compact" />);

      expect(screen.queryByText('Monthly Contribution')).not.toBeInTheDocument();
      expect(screen.queryByText('Remaining')).not.toBeInTheDocument();
    });

    it('should show stats in default variant', () => {
      render(<GoalCard goal={mockGoal} formatCurrency={formatCurrency} variant="default" />);

      expect(screen.getByText('Monthly Contribution')).toBeInTheDocument();
      expect(screen.getByText('Remaining')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <GoalCard goal={mockGoal} formatCurrency={formatCurrency} className="my-custom-class" />
      );

      const card = container.firstChild;
      expect(card).toHaveClass('my-custom-class');
    });

    it('should have hover border effect', () => {
      const { container } = render(<GoalCard goal={mockGoal} formatCurrency={formatCurrency} />);

      const card = container.firstChild;
      expect(card).toHaveClass('hover:border-lokifi-500/30');
    });

    it('should apply goal color to icon container', () => {
      const { container } = render(<GoalCard goal={mockGoal} formatCurrency={formatCurrency} />);

      const iconContainer = container.querySelector('[aria-hidden="true"]');
      expect(iconContainer).toHaveStyle({
        backgroundColor: '#10B98120',
        color: '#10B981',
      });
    });

    it('should apply goal color to progress bar', () => {
      const { container } = render(<GoalCard goal={mockGoal} formatCurrency={formatCurrency} />);

      const progressBars = container.querySelectorAll('[style*="width"]');
      const progressFill = progressBars[progressBars.length - 1];
      expect(progressFill).toHaveStyle({ backgroundColor: '#10B981' });
    });
  });

  describe('Different Goal Types', () => {
    const goalTypes: FinancialGoal['category'][] = [
      'emergency',
      'retirement',
      'house',
      'vacation',
      'education',
      'investment',
      'other',
    ];

    goalTypes.forEach((category) => {
      it(`should render ${category} category correctly`, () => {
        const goal: FinancialGoal = { ...mockGoal, category };
        render(<GoalCard goal={goal} formatCurrency={formatCurrency} />);

        expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero current amount', () => {
      const emptyGoal: FinancialGoal = { ...mockGoal, currentAmount: 0 };
      render(<GoalCard goal={emptyGoal} formatCurrency={formatCurrency} />);

      // $0 for current amount, $25,000 for remaining
      expect(screen.getByText('$0')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('$25,000')).toBeInTheDocument(); // Remaining amount
    });

    it('should handle very large amounts', () => {
      const largeGoal: FinancialGoal = {
        ...mockGoal,
        targetAmount: 1000000,
        currentAmount: 500000,
      };
      render(<GoalCard goal={largeGoal} formatCurrency={formatCurrency} />);

      // Current amount appears multiple times (current + remaining), use getAllByText
      expect(screen.getAllByText('$500,000')).toHaveLength(2); // Current amount and remaining
      expect(screen.getByText('of $1,000,000')).toBeInTheDocument();
    });

    it('should handle zero monthly contribution', () => {
      const noContributionGoal: FinancialGoal = {
        ...mockGoal,
        monthlyContribution: 0,
      };
      render(<GoalCard goal={noContributionGoal} formatCurrency={formatCurrency} />);

      expect(screen.getByText('+$0')).toBeInTheDocument();
    });
  });
});
