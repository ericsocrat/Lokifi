/**
 * @vitest-environment jsdom
 */
/**
 * NewsList Tests
 *
 * Tests for the news list component that displays crypto/stock news.
 * Features:
 * - Fetches news from API using SWR
 * - Displays news items with title, source, and date
 * - Supports different symbols via prop
 */

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the API constant
vi.mock('@/lib/api', () => ({
  API: 'http://test-api.com',
}));

// Mock SWR with configurable data - define mock data inside hoisted block
const { mockSwrData, mockNewsData } = vi.hoisted(() => {
  const newsData = [
    {
      id: '1',
      symbol: 'BTC',
      source: 'CoinDesk',
      title: 'Bitcoin Reaches New High',
      url: 'https://example.com/news/1',
      published_at: '2024-01-15T10:00:00Z',
    },
    {
      id: '2',
      symbol: 'BTC',
      source: 'Bloomberg',
      title: 'Crypto Market Analysis',
      url: 'https://example.com/news/2',
      published_at: '2024-01-15T09:00:00Z',
    },
  ];
  return {
    mockNewsData: newsData,
    mockSwrData: { current: newsData as typeof newsData | undefined },
  };
});

vi.mock('swr', () => ({
  default: vi.fn(() => ({
    data: mockSwrData.current,
    error: undefined,
    isLoading: false,
  })),
}));

// Import component and SWR after mocks
import useSWR from 'swr';
import NewsList from '../../components/NewsList';

describe('NewsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSwrData.current = mockNewsData;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render the news container', () => {
      render(<NewsList />);

      expect(screen.getByText('News')).toBeInTheDocument();
    });

    it('should have proper container styling', () => {
      const { container } = render(<NewsList />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('rounded-2xl', 'border', 'border-neutral-800', 'p-3');
    });

    it('should render news items', () => {
      render(<NewsList />);

      expect(screen.getByText('Bitcoin Reaches New High')).toBeInTheDocument();
      expect(screen.getByText('Crypto Market Analysis')).toBeInTheDocument();
    });

    it('should render news source and date', () => {
      render(<NewsList />);

      // Check for source names
      expect(screen.getByText(/CoinDesk/)).toBeInTheDocument();
      expect(screen.getByText(/Bloomberg/)).toBeInTheDocument();
    });

    it('should render news items as links', () => {
      render(<NewsList />);

      const links = screen.getAllByRole('link');
      expect(links.length).toBe(2);

      expect(links[0]).toHaveAttribute('href', 'https://example.com/news/1');
      expect(links[1]).toHaveAttribute('href', 'https://example.com/news/2');
    });

    it('should open links in new tab', () => {
      render(<NewsList />);

      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noreferrer');
      });
    });
  });

  describe('API Integration', () => {
    it('should fetch news for default BTC symbol', () => {
      render(<NewsList />);

      expect(useSWR).toHaveBeenCalledWith('http://test-api.com/news?symbol=BTC&limit=10');
    });

    it('should fetch news for custom symbol', () => {
      render(<NewsList symbol="ETH" />);

      expect(useSWR).toHaveBeenCalledWith('http://test-api.com/news?symbol=ETH&limit=10');
    });
  });

  describe('Empty State', () => {
    it('should render empty list when no data', () => {
      mockSwrData.current = undefined;

      render(<NewsList />);

      // Should still render container with News header
      expect(screen.getByText('News')).toBeInTheDocument();

      // But no news items
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('should render empty list when data is empty array', () => {
      mockSwrData.current = [];

      render(<NewsList />);

      expect(screen.getByText('News')).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('should display formatted date', () => {
      render(<NewsList />);

      // The date should be formatted using toLocaleString()
      // This will vary by locale, so just check it contains date elements
      const dateElements = screen.getAllByText(/·/);
      expect(dateElements.length).toBe(2);
    });
  });

  describe('Different Symbols', () => {
    it('should support AAPL symbol', () => {
      render(<NewsList symbol="AAPL" />);

      expect(useSWR).toHaveBeenCalledWith('http://test-api.com/news?symbol=AAPL&limit=10');
    });

    it('should support lowercase symbol', () => {
      render(<NewsList symbol="btc" />);

      // Component uses the symbol as-is
      expect(useSWR).toHaveBeenCalledWith('http://test-api.com/news?symbol=btc&limit=10');
    });
  });

  describe('Accessibility', () => {
    it('should have list structure', () => {
      render(<NewsList />);

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();

      const items = screen.getAllByRole('listitem');
      expect(items.length).toBe(2);
    });

    it('should have semantic link elements', () => {
      render(<NewsList />);

      const links = screen.getAllByRole('link');
      expect(links.length).toBe(2);

      // Each link should have the news title as text
      expect(links[0]).toHaveTextContent('Bitcoin Reaches New High');
      expect(links[1]).toHaveTextContent('Crypto Market Analysis');
    });
  });
});
