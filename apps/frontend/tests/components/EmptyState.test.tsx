import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EmptyState } from '@/components/markets/EmptyState';

describe('EmptyState', () => {
  const defaultProps = {
    type: 'search' as const,
    title: 'No Results Found',
    description: 'Try adjusting your search terms',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render title', () => {
      render(<EmptyState {...defaultProps} />);
      expect(screen.getByText('No Results Found')).toBeInTheDocument();
    });

    it('should render description', () => {
      render(<EmptyState {...defaultProps} />);
      expect(screen.getByText('Try adjusting your search terms')).toBeInTheDocument();
    });

    it('should not render action button by default', () => {
      render(<EmptyState {...defaultProps} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Type Icons', () => {
    it('should render SearchX icon for search type', () => {
      const { container } = render(<EmptyState {...defaultProps} type="search" />);
      expect(container.querySelector('.lucide-search-x')).toBeInTheDocument();
    });

    it('should render AlertCircle icon for error type', () => {
      const { container } = render(<EmptyState {...defaultProps} type="error" />);
      expect(container.querySelector('.lucide-circle-alert')).toBeInTheDocument();
    });

    it('should render TrendingUp icon for no-data type', () => {
      const { container } = render(<EmptyState {...defaultProps} type="no-data" />);
      expect(container.querySelector('.lucide-trending-up')).toBeInTheDocument();
    });
  });

  describe('Action Button', () => {
    it('should render action button when provided', () => {
      const action = { label: 'Try Again', onClick: vi.fn() };
      render(<EmptyState {...defaultProps} action={action} />);

      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
    });

    it('should call onClick when action button clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      const action = { label: 'Retry', onClick };
      render(<EmptyState {...defaultProps} action={action} />);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should render correct action label', () => {
      const action = { label: 'Clear Filters', onClick: vi.fn() };
      render(<EmptyState {...defaultProps} action={action} />);

      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply centered layout', () => {
      const { container } = render(<EmptyState {...defaultProps} />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
    });

    it('should apply icon container styling', () => {
      const { container } = render(<EmptyState {...defaultProps} />);
      const iconContainer = container.querySelector('.bg-neutral-900\\/50');
      expect(iconContainer).toHaveClass('rounded-full', 'p-6');
    });

    it('should apply blue styling to action button', () => {
      const action = { label: 'Action', onClick: vi.fn() };
      render(<EmptyState {...defaultProps} action={action} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-500');
    });

    it('should apply max-width to description', () => {
      const { container } = render(<EmptyState {...defaultProps} />);
      const description = container.querySelector('.max-w-md');
      expect(description).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('should handle long title', () => {
      render(
        <EmptyState
          {...defaultProps}
          title="This is a very long title that might wrap to multiple lines"
        />
      );
      expect(
        screen.getByText('This is a very long title that might wrap to multiple lines')
      ).toBeInTheDocument();
    });

    it('should handle long description', () => {
      render(
        <EmptyState
          {...defaultProps}
          description="This is a very long description that provides detailed information about what went wrong and how to fix it."
        />
      );
      expect(screen.getByText(/This is a very long description/)).toBeInTheDocument();
    });

    it('should handle special characters in title', () => {
      render(<EmptyState {...defaultProps} title="Error: Can't find <data>" />);
      expect(screen.getByText("Error: Can't find <data>")).toBeInTheDocument();
    });
  });

  describe('Type Variants', () => {
    it('should handle search type correctly', () => {
      render(
        <EmptyState
          type="search"
          title="No search results"
          description="No items match your search"
        />
      );

      expect(screen.getByText('No search results')).toBeInTheDocument();
    });

    it('should handle error type correctly', () => {
      render(
        <EmptyState
          type="error"
          title="Something went wrong"
          description="Please try again later"
          action={{ label: 'Retry', onClick: vi.fn() }}
        />
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });

    it('should handle no-data type correctly', () => {
      render(
        <EmptyState
          type="no-data"
          title="No data available"
          description="Start adding items to see them here"
        />
      );

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });
});
