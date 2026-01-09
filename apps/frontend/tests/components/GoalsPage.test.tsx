/**
 * @fileoverview Comprehensive tests for Goals page
 * Tests financial goals tracking, filtering, sorting, and goal cards
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock preferences and currency formatter
const mockFormatCurrency = vi.fn((amount: number) => `$${amount.toLocaleString()}`);
vi.mock('@/src/components/dashboard/PreferencesContext', () => ({
  usePreferences: () => ({
    currency: 'USD',
  }),
}));

vi.mock('@/src/components/dashboard/useCurrencyFormatter', () => ({
  useCurrencyFormatter: () => ({
    formatCurrency: mockFormatCurrency,
  }),
}));

// Import after mocks
import GoalsPage from '../../app/goals/page';

describe('GoalsPage Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ============================================
  // HEADER TESTS
  // ============================================
  describe('Header', () => {
    it('renders page title', () => {
      render(<GoalsPage />);

      expect(screen.getByText('Financial Goals')).toBeInTheDocument();
    });

    it('renders page subtitle', () => {
      render(<GoalsPage />);

      expect(screen.getByText('Track your progress towards financial freedom')).toBeInTheDocument();
    });

    it('renders add new goal button', () => {
      render(<GoalsPage />);

      expect(screen.getByRole('button', { name: /add new goal/i })).toBeInTheDocument();
    });

    it('has flag icon in header', () => {
      const { container } = render(<GoalsPage />);

      // Flag icon is in the header section
      const headerIcon = container.querySelector('.bg-lokifi-500\\/20');
      expect(headerIcon).toBeInTheDocument();
    });
  });

  // ============================================
  // SUMMARY CARDS TESTS
  // ============================================
  describe('Summary Cards', () => {
    it('renders Total Target card', () => {
      render(<GoalsPage />);

      expect(screen.getByText('Total Target')).toBeInTheDocument();
    });

    it('renders Total Saved card', () => {
      render(<GoalsPage />);

      expect(screen.getByText('Total Saved')).toBeInTheDocument();
    });

    it('renders Monthly Contribution card', () => {
      render(<GoalsPage />);

      // Multiple Monthly Contribution texts: 1 summary card + 5 goal cards
      const elements = screen.getAllByText('Monthly Contribution');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('renders Active Goals card', () => {
      render(<GoalsPage />);

      expect(screen.getByText('Active Goals')).toBeInTheDocument();
    });

    it('shows correct number of active goals', () => {
      render(<GoalsPage />);

      // Mock data has 5 goals
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('shows high priority count in active goals subtitle', () => {
      render(<GoalsPage />);

      // Mock data has 3 high priority goals
      expect(screen.getByText('3 high priority')).toBeInTheDocument();
    });

    it('shows Auto-allocated subtitle for monthly contribution', () => {
      render(<GoalsPage />);

      expect(screen.getByText('Auto-allocated')).toBeInTheDocument();
    });

    it('calls formatCurrency for monetary values', () => {
      render(<GoalsPage />);

      // Should be called for summary cards and goal cards
      expect(mockFormatCurrency).toHaveBeenCalled();
    });
  });

  // ============================================
  // OVERALL PROGRESS TESTS
  // ============================================
  describe('Overall Progress', () => {
    it('renders overall progress section', () => {
      render(<GoalsPage />);

      expect(screen.getByText('Overall Progress')).toBeInTheDocument();
    });

    it('shows remaining amount to reach goals', () => {
      render(<GoalsPage />);

      expect(screen.getByText(/remaining to reach all goals/i)).toBeInTheDocument();
    });

    it('shows estimated completion date', () => {
      render(<GoalsPage />);

      expect(screen.getByText(/Est\. completion:/i)).toBeInTheDocument();
    });

    it('has progress bar', () => {
      const { container } = render(<GoalsPage />);

      const progressBar = container.querySelector('.h-4.bg-surface-3.rounded-full');
      expect(progressBar).toBeInTheDocument();
    });

    it('shows progress percentage', () => {
      render(<GoalsPage />);

      // Progress is shown with % suffix
      const percentageElements = screen.getAllByText(/%$/);
      expect(percentageElements.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // FILTER TESTS
  // ============================================
  describe('Category Filters', () => {
    it('renders All Goals filter', () => {
      render(<GoalsPage />);

      expect(screen.getByRole('button', { name: /filter by all goals/i })).toBeInTheDocument();
    });

    it('renders category filters', () => {
      render(<GoalsPage />);

      expect(screen.getByRole('button', { name: /filter by emergency/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /filter by retirement/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /filter by house/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /filter by vacation/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /filter by education/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /filter by investment/i })).toBeInTheDocument();
    });

    it('All Goals filter is active by default', () => {
      render(<GoalsPage />);

      const allGoalsButton = screen.getByRole('button', { name: /filter by all goals/i });
      expect(allGoalsButton).toHaveClass('bg-lokifi-500');
    });

    it('changes filter on click', () => {
      render(<GoalsPage />);

      const emergencyButton = screen.getByRole('button', { name: /filter by emergency/i });
      fireEvent.click(emergencyButton);

      expect(emergencyButton).toHaveClass('bg-lokifi-500');
    });

    it('filters goals by category', () => {
      render(<GoalsPage />);

      // Click on Vacation filter
      const vacationButton = screen.getByRole('button', { name: /filter by vacation/i });
      fireEvent.click(vacationButton);

      // Should only show Japan Trip (vacation category)
      expect(screen.getByText('Japan Trip 2026')).toBeInTheDocument();

      // Other goals should not be visible
      expect(screen.queryByText('Emergency Fund')).not.toBeInTheDocument();
    });

    it('shows all goals when All Goals filter is selected', () => {
      render(<GoalsPage />);

      // First filter to vacation
      fireEvent.click(screen.getByRole('button', { name: /filter by vacation/i }));

      // Then back to all
      fireEvent.click(screen.getByRole('button', { name: /filter by all goals/i }));

      // All goals should be visible
      expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
      expect(screen.getByText('Dream Home Down Payment')).toBeInTheDocument();
      expect(screen.getByText('Japan Trip 2026')).toBeInTheDocument();
    });

    it('shows empty state for category with no goals', () => {
      render(<GoalsPage />);

      // Investment category has no goals in mock data
      fireEvent.click(screen.getByRole('button', { name: /filter by investment/i }));

      expect(screen.getByText('No goals found')).toBeInTheDocument();
    });
  });

  // ============================================
  // SORT TESTS
  // ============================================
  describe('Sorting', () => {
    it('renders sort dropdown', () => {
      render(<GoalsPage />);

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('has sort by deadline option', () => {
      render(<GoalsPage />);

      expect(screen.getByRole('option', { name: 'Sort by Deadline' })).toBeInTheDocument();
    });

    it('has sort by progress option', () => {
      render(<GoalsPage />);

      expect(screen.getByRole('option', { name: 'Sort by Progress' })).toBeInTheDocument();
    });

    it('has sort by amount option', () => {
      render(<GoalsPage />);

      expect(screen.getByRole('option', { name: 'Sort by Amount' })).toBeInTheDocument();
    });

    it('deadline is default sort option', () => {
      render(<GoalsPage />);

      const sortSelect = screen.getByRole('combobox') as HTMLSelectElement;
      expect(sortSelect.value).toBe('deadline');
    });

    it('changes sort option on select', () => {
      render(<GoalsPage />);

      const sortSelect = screen.getByRole('combobox');
      fireEvent.change(sortSelect, { target: { value: 'progress' } });

      expect((sortSelect as HTMLSelectElement).value).toBe('progress');
    });
  });

  // ============================================
  // GOAL CARDS TESTS
  // ============================================
  describe('Goal Cards', () => {
    it('renders all mock goals', () => {
      render(<GoalsPage />);

      expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
      expect(screen.getByText('Dream Home Down Payment')).toBeInTheDocument();
      expect(screen.getByText('Japan Trip 2026')).toBeInTheDocument();
      expect(screen.getByText('Retirement Fund')).toBeInTheDocument();
      expect(screen.getByText('MBA Education')).toBeInTheDocument();
    });

    it('shows goal priority badges', () => {
      render(<GoalsPage />);

      const highBadges = screen.getAllByText('high');
      const mediumBadges = screen.getAllByText('medium');

      // 3 high priority, 2 medium priority goals
      expect(highBadges).toHaveLength(3);
      expect(mediumBadges).toHaveLength(2);
    });

    it('shows months left for each goal', () => {
      render(<GoalsPage />);

      // Multiple goals should show "X months left"
      const monthsLeftElements = screen.getAllByText(/months left/i);
      expect(monthsLeftElements.length).toBeGreaterThan(0);
    });

    it('shows monthly contribution for goals', () => {
      render(<GoalsPage />);

      const contributions = screen.getAllByText('Monthly Contribution');
      expect(contributions.length).toBeGreaterThan(0);
    });

    it('shows remaining amount for goals', () => {
      render(<GoalsPage />);

      const remainingElements = screen.getAllByText('Remaining');
      expect(remainingElements.length).toBeGreaterThan(0);
    });

    it('has progress rings in cards', () => {
      const { container } = render(<GoalsPage />);

      // SVG circles for progress rings
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // GOAL CARD MENU TESTS
  // ============================================
  describe('Goal Card Actions', () => {
    it('shows menu button on hover', () => {
      const { container } = render(<GoalsPage />);

      // Menu buttons exist (hidden by default, shown on hover)
      const menuButtons = container.querySelectorAll('.group-hover\\:opacity-100');
      expect(menuButtons.length).toBeGreaterThan(0);
    });

    it('deletes goal when delete is clicked', () => {
      render(<GoalsPage />);

      // Find Emergency Fund card and its menu
      const cards = screen.getAllByText('Emergency Fund');
      expect(cards).toHaveLength(1);

      // Find and click menu button in the card
      const card = cards[0].closest('.bg-surface-1');
      const menuButton = card?.querySelector('button');
      if (menuButton) {
        fireEvent.click(menuButton);
      }

      // Click delete
      const deleteButtons = screen.getAllByText('Delete');
      if (deleteButtons.length > 0) {
        fireEvent.click(deleteButtons[0]);
      }

      // Emergency Fund should be removed
      expect(screen.queryByText('Emergency Fund')).not.toBeInTheDocument();
    });
  });

  // ============================================
  // EMPTY STATE TESTS
  // ============================================
  describe('Empty State', () => {
    it('shows empty state when no goals match filter', () => {
      render(<GoalsPage />);

      fireEvent.click(screen.getByRole('button', { name: /filter by investment/i }));

      expect(screen.getByText('No goals found')).toBeInTheDocument();
    });

    it('shows category-specific message', () => {
      render(<GoalsPage />);

      fireEvent.click(screen.getByRole('button', { name: /filter by investment/i }));

      expect(screen.getByText(/No goals in the investment category/i)).toBeInTheDocument();
    });

    it('shows create goal button in empty state', () => {
      render(<GoalsPage />);

      fireEvent.click(screen.getByRole('button', { name: /filter by investment/i }));

      expect(
        screen.getByRole('button', { name: /create your first financial goal/i })
      ).toBeInTheDocument();
    });
  });

  // ============================================
  // TIPS SECTION TESTS
  // ============================================
  describe('Tips Section', () => {
    it('renders goal-setting tips section', () => {
      render(<GoalsPage />);

      expect(screen.getByText('Goal-Setting Tips')).toBeInTheDocument();
    });

    it('shows emergency fund tip', () => {
      render(<GoalsPage />);

      expect(screen.getByText(/Start with an emergency fund/i)).toBeInTheDocument();
    });

    it('shows realistic deadlines tip', () => {
      render(<GoalsPage />);

      expect(screen.getByText(/Set realistic deadlines/i)).toBeInTheDocument();
    });

    it('shows debt payoff tip', () => {
      render(<GoalsPage />);

      expect(screen.getByText(/Prioritize high-interest debt/i)).toBeInTheDocument();
    });

    it('shows quarterly review tip', () => {
      render(<GoalsPage />);

      expect(screen.getByText(/Review and adjust your goals quarterly/i)).toBeInTheDocument();
    });
  });

  // ============================================
  // LAYOUT TESTS
  // ============================================
  describe('Layout', () => {
    it('has full-screen container', () => {
      const { container } = render(<GoalsPage />);

      expect(container.firstChild).toHaveClass('min-h-screen');
    });

    it('has max-width container', () => {
      const { container } = render(<GoalsPage />);

      expect(container.querySelector('.max-w-7xl')).toBeInTheDocument();
    });

    it('has responsive grid for summary cards', () => {
      const { container } = render(<GoalsPage />);

      const summaryGrid = container.querySelector(
        '.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4'
      );
      expect(summaryGrid).toBeInTheDocument();
    });

    it('has responsive grid for goals', () => {
      const { container } = render(<GoalsPage />);

      const goalsGrid = container.querySelector(
        '.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3'
      );
      expect(goalsGrid).toBeInTheDocument();
    });
  });

  // ============================================
  // PROGRESS RING TESTS
  // ============================================
  describe('ProgressRing', () => {
    it('renders progress percentage in rings', () => {
      const { container } = render(<GoalsPage />);

      // Progress rings show percentage values
      const progressTexts = container.querySelectorAll('.text-lg.font-bold.text-white');
      expect(progressTexts.length).toBeGreaterThan(0);
    });

    it('has SVG circles for progress', () => {
      const { container } = render(<GoalsPage />);

      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // STYLING TESTS
  // ============================================
  describe('Styling', () => {
    it('applies gradient background', () => {
      const { container } = render(<GoalsPage />);

      expect(container.firstChild).toHaveClass('bg-gradient-to-br');
    });

    it('has styled add button with gradient', () => {
      render(<GoalsPage />);

      const addButton = screen.getByRole('button', { name: /add new goal/i });
      expect(addButton).toHaveClass('bg-gradient-to-r');
    });

    it('applies card styling', () => {
      const { container } = render(<GoalsPage />);

      const cards = container.querySelectorAll('.bg-surface-1.rounded-2xl');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================
  describe('Accessibility', () => {
    it('has accessible page heading', () => {
      render(<GoalsPage />);

      expect(screen.getByRole('heading', { name: /Financial Goals/i })).toBeInTheDocument();
    });

    it('has accessible sort combobox', () => {
      render(<GoalsPage />);

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('filter buttons are keyboard accessible', () => {
      render(<GoalsPage />);

      const filters = screen
        .getAllByRole('button')
        .filter((btn) =>
          [
            'All Goals',
            'Emergency',
            'Retirement',
            'House',
            'Vacation',
            'Education',
            'Investment',
          ].includes(btn.textContent || '')
        );

      expect(filters.length).toBe(7);
    });
  });
});
