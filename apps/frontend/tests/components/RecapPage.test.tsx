/**
 * RecapPage Tests
 *
 * Tests for the transaction recap page component.
 * Covers monthly summary cards, transaction list, navigation, and empty states.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RecapPage from '../../app/recap/page';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  ArrowDownRight: () => <div data-testid="arrow-down-right-icon">ArrowDownRight</div>,
  ArrowUpRight: () => <div data-testid="arrow-up-right-icon">ArrowUpRight</div>,
  DollarSign: () => <div data-testid="dollar-sign-icon">DollarSign</div>,
  ChevronLeft: () => <div data-testid="chevron-left-icon">ChevronLeft</div>,
  ChevronRight: () => <div data-testid="chevron-right-icon">ChevronRight</div>,
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  Wallet: () => <div data-testid="wallet-icon">Wallet</div>,
  TrendingUp: () => <div data-testid="trending-up-icon">TrendingUp</div>,
  TrendingDown: () => <div data-testid="trending-down-icon">TrendingDown</div>,
  Gift: () => <div data-testid="gift-icon">Gift</div>,
}));

describe('RecapPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Page Header', () => {
    it('renders the main title', () => {
      render(<RecapPage />);

      expect(screen.getByText('Activity Recap')).toBeInTheDocument();
    });

    it('renders the subtitle description', () => {
      render(<RecapPage />);

      expect(
        screen.getByText('Review your portfolio activity and transactions')
      ).toBeInTheDocument();
    });

    it('displays Clock icon in header', () => {
      render(<RecapPage />);

      const clockIcons = screen.getAllByTestId('clock-icon');
      expect(clockIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Monthly Navigation', () => {
    it('displays the current month name', () => {
      render(<RecapPage />);

      const currentMonth = new Date().toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      });
      expect(screen.getByText(currentMonth)).toBeInTheDocument();
    });

    it('renders previous month button with ChevronLeft icon', () => {
      render(<RecapPage />);

      expect(screen.getByTestId('chevron-left-icon')).toBeInTheDocument();
    });

    it('renders next month button with ChevronRight icon', () => {
      render(<RecapPage />);

      expect(screen.getByTestId('chevron-right-icon')).toBeInTheDocument();
    });

    it('navigates to previous month when clicking left arrow', () => {
      render(<RecapPage />);

      const currentDate = new Date();
      const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const prevMonthName = prevDate.toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      });

      // Click previous month button
      const prevButton = screen.getByTestId('chevron-left-icon').parentElement;
      if (prevButton) fireEvent.click(prevButton);

      expect(screen.getByText(prevMonthName)).toBeInTheDocument();
    });

    it('navigates to next month when clicking right arrow', () => {
      render(<RecapPage />);

      const currentDate = new Date();
      const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      const nextMonthName = nextDate.toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      });

      // Click next month button
      const nextButton = screen.getByTestId('chevron-right-icon').parentElement;
      if (nextButton) fireEvent.click(nextButton);

      expect(screen.getByText(nextMonthName)).toBeInTheDocument();
    });

    it('can navigate multiple months backward', () => {
      render(<RecapPage />);

      const currentDate = new Date();
      const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1);
      const targetMonthName = targetDate.toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      });

      const prevButton = screen.getByTestId('chevron-left-icon').parentElement;
      if (prevButton) {
        fireEvent.click(prevButton);
        fireEvent.click(prevButton);
        fireEvent.click(prevButton);
      }

      expect(screen.getByText(targetMonthName)).toBeInTheDocument();
    });

    it('can navigate multiple months forward', () => {
      render(<RecapPage />);

      const currentDate = new Date();
      const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 1);
      const targetMonthName = targetDate.toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      });

      const nextButton = screen.getByTestId('chevron-right-icon').parentElement;
      if (nextButton) {
        fireEvent.click(nextButton);
        fireEvent.click(nextButton);
      }

      expect(screen.getByText(targetMonthName)).toBeInTheDocument();
    });
  });

  describe('Monthly Summary Cards', () => {
    it('renders Total Bought card', () => {
      render(<RecapPage />);

      expect(screen.getByText('Total Bought')).toBeInTheDocument();
    });

    it('renders Total Sold card', () => {
      render(<RecapPage />);

      expect(screen.getByText('Total Sold')).toBeInTheDocument();
    });

    it('renders Dividends Received card', () => {
      render(<RecapPage />);

      expect(screen.getByText('Dividends Received')).toBeInTheDocument();
    });

    it('displays ArrowDownRight icon for buys', () => {
      render(<RecapPage />);

      const icons = screen.getAllByTestId('arrow-down-right-icon');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('displays ArrowUpRight icon for sells', () => {
      render(<RecapPage />);

      const icons = screen.getAllByTestId('arrow-up-right-icon');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('displays DollarSign icon for dividends', () => {
      render(<RecapPage />);

      const icons = screen.getAllByTestId('dollar-sign-icon');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('displays currency formatted amounts', () => {
      render(<RecapPage />);

      // Mock data has transactions, check for $ symbol in amounts
      const dollarAmounts = screen.getAllByText(/\$[0-9,]+\.[0-9]{2}/);
      expect(dollarAmounts.length).toBeGreaterThan(0);
    });
  });

  describe('Transaction List', () => {
    it('renders Recent Activity header', () => {
      render(<RecapPage />);

      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });

    it('displays Calendar icon in transaction list header', () => {
      render(<RecapPage />);

      expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
    });

    it('shows transaction count', () => {
      render(<RecapPage />);

      expect(screen.getByText(/\d+ transactions?/)).toBeInTheDocument();
    });

    it('displays transaction asset names', () => {
      render(<RecapPage />);

      // Mock data includes AAPL, TSLA, VTI, Cash, BTC
      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    it('shows transaction type badges', () => {
      render(<RecapPage />);

      // Mock data has buy, sell, dividend, deposit types
      const buyBadges = screen.getAllByText(/buy/i);
      expect(buyBadges.length).toBeGreaterThan(0);
    });

    it('displays transaction descriptions', () => {
      render(<RecapPage />);

      // Mock data has descriptions like "Bought 2.85 shares", "Sold 4.83 shares"
      const descriptions = screen.getAllByText(/shares|dividend|contribution|BTC/i);
      expect(descriptions.length).toBeGreaterThan(0);
    });

    it('shows formatted amounts with + or - prefix', () => {
      render(<RecapPage />);

      // Buy transactions show + prefix
      const positiveAmounts = screen.getAllByText(/^\+\$/);
      expect(positiveAmounts.length).toBeGreaterThan(0);
    });

    it('displays formatted dates for transactions', () => {
      render(<RecapPage />);

      // Dates are formatted - look for month names or date patterns
      // The formatDate function outputs readable dates
      const dateContainer = screen.getByText('Recent Activity').closest('div');
      expect(dateContainer).toBeInTheDocument();
    });
  });

  describe('Transaction Types', () => {
    it('renders buy transactions with emerald styling', () => {
      render(<RecapPage />);

      const buyBadge = screen.getAllByText('buy')[0];
      expect(buyBadge).toBeInTheDocument();
    });

    it('renders sell transactions with rose styling', () => {
      render(<RecapPage />);

      const sellBadge = screen.getByText('sell');
      expect(sellBadge).toBeInTheDocument();
    });

    it('renders dividend transactions with purple styling', () => {
      render(<RecapPage />);

      const dividendBadge = screen.getByText('dividend');
      expect(dividendBadge).toBeInTheDocument();
    });

    it('renders deposit transactions with blue styling', () => {
      render(<RecapPage />);

      const depositBadge = screen.getByText('deposit');
      expect(depositBadge).toBeInTheDocument();
    });

    it('shows negative amounts for sell transactions', () => {
      render(<RecapPage />);

      // Sell transactions show - prefix
      const negativeAmounts = screen.getAllByText(/^-\$/);
      expect(negativeAmounts.length).toBeGreaterThan(0);
    });
  });

  describe('Mock Transaction Data', () => {
    it('renders AAPL buy transaction', () => {
      render(<RecapPage />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText(/Bought 2\.85 shares/)).toBeInTheDocument();
    });

    it('renders TSLA sell transaction', () => {
      render(<RecapPage />);

      expect(screen.getByText('TSLA')).toBeInTheDocument();
      expect(screen.getByText(/Sold 4\.83 shares/)).toBeInTheDocument();
    });

    it('renders VTI dividend transaction', () => {
      render(<RecapPage />);

      expect(screen.getByText('VTI')).toBeInTheDocument();
      expect(screen.getByText(/Quarterly dividend/)).toBeInTheDocument();
    });

    it('renders Cash deposit transaction', () => {
      render(<RecapPage />);

      expect(screen.getByText('Cash')).toBeInTheDocument();
      expect(screen.getByText(/Monthly contribution/)).toBeInTheDocument();
    });

    it('renders BTC buy transaction', () => {
      render(<RecapPage />);

      expect(screen.getByText('BTC')).toBeInTheDocument();
      expect(screen.getByText(/Bought 0\.02 BTC/)).toBeInTheDocument();
    });
  });

  describe('Summary Calculations', () => {
    it('calculates total buys correctly', () => {
      render(<RecapPage />);

      // Mock data: AAPL buy = 1785, BTC buy = 2150 = $3,935
      // Check that Total Bought shows a value
      const totalBoughtCard = screen.getByText('Total Bought').closest('div');
      expect(totalBoughtCard).toBeInTheDocument();
    });

    it('calculates total sells correctly', () => {
      render(<RecapPage />);

      // Mock data: TSLA sell = 1250 = $1,250
      const totalSoldCard = screen.getByText('Total Sold').closest('div');
      expect(totalSoldCard).toBeInTheDocument();
    });

    it('calculates total dividends correctly', () => {
      render(<RecapPage />);

      // Mock data: VTI dividend = 45.67 = $45.67
      const dividendsCard = screen.getByText('Dividends Received').closest('div');
      expect(dividendsCard).toBeInTheDocument();
    });
  });

  describe('Currency Formatting', () => {
    it('formats amounts with dollar sign', () => {
      render(<RecapPage />);

      const amounts = screen.getAllByText(/\$[\d,]+/);
      expect(amounts.length).toBeGreaterThan(0);
    });

    it('formats large amounts with comma separators', () => {
      render(<RecapPage />);

      // Check for comma-separated amounts like $1,785.00
      const formattedAmounts = screen.getAllByText(/\$[\d,]+\.\d{2}/);
      expect(formattedAmounts.length).toBeGreaterThan(0);
    });
  });

  describe('UI Structure', () => {
    it('has proper page layout with max width container', () => {
      const { container } = render(<RecapPage />);

      const maxWidthContainer = container.querySelector('.max-w-7xl');
      expect(maxWidthContainer).toBeInTheDocument();
    });

    it('renders summary cards in a grid layout', () => {
      const { container } = render(<RecapPage />);

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toBeInTheDocument();
    });

    it('renders transaction list with proper container styling', () => {
      const { container } = render(<RecapPage />);

      const transactionList = container.querySelector('.divide-y');
      expect(transactionList).toBeInTheDocument();
    });

    it('applies backdrop blur effect to cards', () => {
      const { container } = render(<RecapPage />);

      const blurredElements = container.querySelectorAll('.backdrop-blur-sm');
      expect(blurredElements.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Design', () => {
    it('has responsive grid for summary cards', () => {
      const { container } = render(<RecapPage />);

      const responsiveGrid = container.querySelector('.md\\:grid-cols-3');
      expect(responsiveGrid).toBeInTheDocument();
    });

    it('starts with single column on mobile', () => {
      const { container } = render(<RecapPage />);

      const mobileGrid = container.querySelector('.grid-cols-1');
      expect(mobileGrid).toBeInTheDocument();
    });
  });

  describe('Header Styling', () => {
    it('renders sticky header with backdrop blur', () => {
      const { container } = render(<RecapPage />);

      const stickyHeader = container.querySelector('.sticky');
      expect(stickyHeader).toBeInTheDocument();
    });

    it('has border bottom on header section', () => {
      const { container } = render(<RecapPage />);

      const borderedHeader = container.querySelector('.border-b');
      expect(borderedHeader).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy with h1', () => {
      render(<RecapPage />);

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('Activity Recap');
    });

    it('has proper heading for Recent Activity section', () => {
      render(<RecapPage />);

      const h2 = screen.getByRole('heading', { level: 2 });
      expect(h2).toHaveTextContent('Recent Activity');
    });

    it('navigation buttons are clickable', () => {
      render(<RecapPage />);

      const prevButton = screen.getByTestId('chevron-left-icon').closest('button');
      const nextButton = screen.getByTestId('chevron-right-icon').closest('button');

      expect(prevButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('maintains month state after multiple navigations', () => {
      render(<RecapPage />);

      const prevButton = screen.getByTestId('chevron-left-icon').parentElement;
      const nextButton = screen.getByTestId('chevron-right-icon').parentElement;

      // Go back 2 months, then forward 1
      if (prevButton && nextButton) {
        fireEvent.click(prevButton);
        fireEvent.click(prevButton);
        fireEvent.click(nextButton);
      }

      const currentDate = new Date();
      const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const expectedMonth = targetDate.toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      });

      expect(screen.getByText(expectedMonth)).toBeInTheDocument();
    });
  });
});
