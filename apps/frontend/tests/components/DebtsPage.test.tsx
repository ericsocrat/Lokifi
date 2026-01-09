/**
 * @fileoverview Comprehensive tests for Debts page
 * Tests debt tracking, summary cards, and debt list
 */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Import component
import DebtsPage from '../../app/debts/page';

describe('DebtsPage Tests', () => {
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
      render(<DebtsPage />);

      expect(screen.getByText('Debts & Liabilities')).toBeInTheDocument();
    });

    it('renders page subtitle', () => {
      render(<DebtsPage />);

      expect(screen.getByText('Track and manage your outstanding debts')).toBeInTheDocument();
    });

    it('renders add debt button', () => {
      render(<DebtsPage />);

      expect(screen.getByRole('button', { name: /add debt/i })).toBeInTheDocument();
    });

    it('has sticky header', () => {
      const { container } = render(<DebtsPage />);

      const header = container.querySelector('.sticky.top-16');
      expect(header).toBeInTheDocument();
    });
  });

  // ============================================
  // SUMMARY CARDS TESTS
  // ============================================
  describe('Summary Cards', () => {
    it('renders Total Debt card', () => {
      render(<DebtsPage />);

      expect(screen.getByText('Total Debt')).toBeInTheDocument();
    });

    it('renders Monthly Payments card', () => {
      render(<DebtsPage />);

      expect(screen.getByText('Monthly Payments')).toBeInTheDocument();
    });

    it('renders Highest Interest Rate card', () => {
      render(<DebtsPage />);

      expect(screen.getByText('Highest Interest Rate')).toBeInTheDocument();
    });

    it('shows formatted total debt amount', () => {
      render(<DebtsPage />);

      // Mock total: 285000 + 32500 + 18200 + 4800 = $340,500
      expect(screen.getByText('$340,500')).toBeInTheDocument();
    });

    it('shows formatted monthly payments', () => {
      render(<DebtsPage />);

      // Mock total: 1850 + 650 + 280 + 150 = $2,930
      expect(screen.getByText('$2,930')).toBeInTheDocument();
    });

    it('shows highest interest rate', () => {
      render(<DebtsPage />);

      // Mock highest: 19.99%
      expect(screen.getByText('19.99%')).toBeInTheDocument();
    });

    it('has responsive grid layout', () => {
      const { container } = render(<DebtsPage />);

      const grid = container.querySelector('.grid.grid-cols-1.md\\:grid-cols-3');
      expect(grid).toBeInTheDocument();
    });
  });

  // ============================================
  // DEBTS LIST TESTS
  // ============================================
  describe('Debts List', () => {
    it('renders Your Debts section header', () => {
      render(<DebtsPage />);

      expect(screen.getByText('Your Debts')).toBeInTheDocument();
    });

    it('renders all mock debts', () => {
      render(<DebtsPage />);

      expect(screen.getByText('Home Mortgage')).toBeInTheDocument();
      expect(screen.getByText('Car Loan - Tesla')).toBeInTheDocument();
      expect(screen.getByText('Student Loan')).toBeInTheDocument();
      expect(screen.getByText('Credit Card - Chase')).toBeInTheDocument();
    });

    it('shows debt balances', () => {
      render(<DebtsPage />);

      expect(screen.getByText('$285,000')).toBeInTheDocument();
      expect(screen.getByText('$32,500')).toBeInTheDocument();
      expect(screen.getByText('$18,200')).toBeInTheDocument();
      expect(screen.getByText('$4,800')).toBeInTheDocument();
    });

    it('shows interest rates for each debt', () => {
      render(<DebtsPage />);

      expect(screen.getByText(/4\.5% APR/)).toBeInTheDocument();
      expect(screen.getByText(/5\.9% APR/)).toBeInTheDocument();
      expect(screen.getByText(/3\.2% APR/)).toBeInTheDocument();
      expect(screen.getByText(/19\.99% APR/)).toBeInTheDocument();
    });

    it('shows due dates for each debt', () => {
      render(<DebtsPage />);

      expect(screen.getByText(/Due on 15th/)).toBeInTheDocument();
      expect(screen.getByText(/Due on 1st/)).toBeInTheDocument();
      expect(screen.getByText(/Due on 25th/)).toBeInTheDocument();
      expect(screen.getByText(/Due on 20th/)).toBeInTheDocument();
    });

    it('shows minimum payments for each debt', () => {
      render(<DebtsPage />);

      expect(screen.getByText('Min: $1,850/mo')).toBeInTheDocument();
      expect(screen.getByText('Min: $650/mo')).toBeInTheDocument();
      expect(screen.getByText('Min: $280/mo')).toBeInTheDocument();
      expect(screen.getByText('Min: $150/mo')).toBeInTheDocument();
    });

    it('has hover effect on debt rows', () => {
      const { container } = render(<DebtsPage />);

      const rows = container.querySelectorAll('.hover\\:bg-surface-200\\/50');
      expect(rows.length).toBeGreaterThan(0);
    });

    it('has cursor pointer on debt rows', () => {
      const { container } = render(<DebtsPage />);

      const rows = container.querySelectorAll('.cursor-pointer');
      expect(rows.length).toBe(4); // 4 mock debts
    });
  });

  // ============================================
  // DEBT TYPE ICONS TESTS
  // ============================================
  describe('Debt Type Icons', () => {
    it('renders icons for each debt type', () => {
      const { container } = render(<DebtsPage />);

      // Each debt has an icon container with gradient
      const iconContainers = container.querySelectorAll('.w-12.h-12.rounded-xl');
      expect(iconContainers.length).toBe(4);
    });

    it('applies gradient colors to debt icons', () => {
      const { container } = render(<DebtsPage />);

      // Check for gradient classes
      expect(container.querySelector('.from-blue-500')).toBeInTheDocument(); // mortgage
      expect(container.querySelector('.from-emerald-500')).toBeInTheDocument(); // car
      expect(container.querySelector('.from-purple-500')).toBeInTheDocument(); // student
      expect(container.querySelector('.from-rose-500')).toBeInTheDocument(); // credit-card
    });
  });

  // ============================================
  // LAYOUT TESTS
  // ============================================
  describe('Layout', () => {
    it('has full-screen container', () => {
      const { container } = render(<DebtsPage />);

      expect(container.firstChild).toHaveClass('min-h-screen');
    });

    it('has max-width container', () => {
      const { container } = render(<DebtsPage />);

      const maxWidthContainers = container.querySelectorAll('.max-w-7xl');
      expect(maxWidthContainers.length).toBeGreaterThan(0);
    });

    it('has proper spacing between sections', () => {
      const { container } = render(<DebtsPage />);

      const spacingContainer = container.querySelector('.space-y-8');
      expect(spacingContainer).toBeInTheDocument();
    });
  });

  // ============================================
  // STYLING TESTS
  // ============================================
  describe('Styling', () => {
    it('applies dark background', () => {
      const { container } = render(<DebtsPage />);

      expect(container.firstChild).toHaveClass('bg-surface-0');
    });

    it('has backdrop blur on header', () => {
      const { container } = render(<DebtsPage />);

      const header = container.querySelector('.backdrop-blur-xl');
      expect(header).toBeInTheDocument();
    });

    it('has styled add button with gradient', () => {
      render(<DebtsPage />);

      const addButton = screen.getByRole('button', { name: /add debt/i });
      expect(addButton).toHaveClass('bg-linear-to-r');
    });

    it('has rounded cards', () => {
      const { container } = render(<DebtsPage />);

      const roundedCards = container.querySelectorAll('.rounded-2xl');
      expect(roundedCards.length).toBeGreaterThan(0);
    });

    it('applies rose color theme to total debt card', () => {
      const { container } = render(<DebtsPage />);

      const roseCard = container.querySelector('.from-rose-500\\/10');
      expect(roseCard).toBeInTheDocument();
    });

    it('applies amber color theme to highest interest card', () => {
      const { container } = render(<DebtsPage />);

      const amberCard = container.querySelector('.from-amber-500\\/10');
      expect(amberCard).toBeInTheDocument();
    });
  });

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================
  describe('Accessibility', () => {
    it('has accessible page heading', () => {
      render(<DebtsPage />);

      expect(screen.getByRole('heading', { name: /Debts & Liabilities/i })).toBeInTheDocument();
    });

    it('has accessible section heading for debts list', () => {
      render(<DebtsPage />);

      expect(screen.getByRole('heading', { name: /Your Debts/i })).toBeInTheDocument();
    });

    it('add button is accessible', () => {
      render(<DebtsPage />);

      const button = screen.getByRole('button', { name: /add debt/i });
      expect(button).toBeEnabled();
    });
  });

  // ============================================
  // CURRENCY FORMATTING TESTS
  // ============================================
  describe('Currency Formatting', () => {
    it('formats large amounts with commas', () => {
      render(<DebtsPage />);

      // $285,000 has comma formatting
      expect(screen.getByText('$285,000')).toBeInTheDocument();
    });

    it('formats amounts without decimal places', () => {
      render(<DebtsPage />);

      // Should show $4,800 not $4,800.00
      expect(screen.getByText('$4,800')).toBeInTheDocument();
    });
  });

  // ============================================
  // INTEREST RATE FORMATTING TESTS
  // ============================================
  describe('Interest Rate Formatting', () => {
    it('formats interest rates with two decimal places', () => {
      render(<DebtsPage />);

      // 19.99% should be shown
      expect(screen.getByText('19.99%')).toBeInTheDocument();
    });
  });

  // ============================================
  // DATE SUFFIX TESTS
  // ============================================
  describe('Due Date Suffixes', () => {
    it('shows "st" suffix for 1st', () => {
      render(<DebtsPage />);

      expect(screen.getByText(/Due on 1st/)).toBeInTheDocument();
    });

    it('shows "th" suffix for 15th', () => {
      render(<DebtsPage />);

      expect(screen.getByText(/Due on 15th/)).toBeInTheDocument();
    });

    it('shows "th" suffix for 20th', () => {
      render(<DebtsPage />);

      expect(screen.getByText(/Due on 20th/)).toBeInTheDocument();
    });

    it('shows "th" suffix for 25th', () => {
      render(<DebtsPage />);

      expect(screen.getByText(/Due on 25th/)).toBeInTheDocument();
    });
  });

  // ============================================
  // DEBT TYPE CLASSIFICATION TESTS
  // ============================================
  describe('Debt Types', () => {
    it('renders mortgage debt', () => {
      render(<DebtsPage />);

      expect(screen.getByText('Home Mortgage')).toBeInTheDocument();
    });

    it('renders car loan debt', () => {
      render(<DebtsPage />);

      expect(screen.getByText('Car Loan - Tesla')).toBeInTheDocument();
    });

    it('renders student loan debt', () => {
      render(<DebtsPage />);

      expect(screen.getByText('Student Loan')).toBeInTheDocument();
    });

    it('renders credit card debt', () => {
      render(<DebtsPage />);

      expect(screen.getByText('Credit Card - Chase')).toBeInTheDocument();
    });
  });
});
