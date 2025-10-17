import { EmptyState } from '@/components/markets/EmptyState';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('EmptyState', () => {
  describe('Basic Rendering', () => {
    it('should render with search type', () => {
      render(
        <EmptyState type="search" title="No results" description="Try different search terms" />
      );

      expect(screen.getByText('No results')).toBeInTheDocument();
      expect(screen.getByText('Try different search terms')).toBeInTheDocument();
    });

    it('should render with error type', () => {
      render(<EmptyState type="error" title="Error occurred" description="Something went wrong" />);

      expect(screen.getByText('Error occurred')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should render with no-data type', () => {
      render(
        <EmptyState
          type="no-data"
          title="No data available"
          description="No market data to display"
        />
      );

      expect(screen.getByText('No data available')).toBeInTheDocument();
      expect(screen.getByText('No market data to display')).toBeInTheDocument();
    });

    it('should render title as h3 heading', () => {
      render(<EmptyState type="search" title="Test Title" description="Test Description" />);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Test Title');
    });

    it('should render description as paragraph', () => {
      const { container } = render(
        <EmptyState type="search" title="Title" description="Description text" />
      );

      const description = screen.getByText('Description text');
      expect(description.tagName).toBe('P');
    });
  });

  describe('Icon Rendering', () => {
    it('should render search icon for search type', () => {
      const { container } = render(
        <EmptyState type="search" title="Title" description="Description" />
      );

      // lucide-react icons render as SVG elements
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render error icon for error type', () => {
      const { container } = render(
        <EmptyState type="error" title="Title" description="Description" />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render no-data icon for no-data type', () => {
      const { container } = render(
        <EmptyState type="no-data" title="Title" description="Description" />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should have icon wrapper with correct styling', () => {
      const { container } = render(
        <EmptyState type="search" title="Title" description="Description" />
      );

      const iconWrapper = container.querySelector('.rounded-full');
      expect(iconWrapper).toBeInTheDocument();
    });
  });

  describe('Action Button', () => {
    it('should not render button when action is not provided', () => {
      render(<EmptyState type="search" title="Title" description="Description" />);

      const button = screen.queryByRole('button');
      expect(button).not.toBeInTheDocument();
    });

    it('should render button when action is provided', () => {
      const mockAction = vi.fn();
      render(
        <EmptyState
          type="search"
          title="Title"
          description="Description"
          action={{ label: 'Click me', onClick: mockAction }}
        />
      );

      const button = screen.getByRole('button', { name: 'Click me' });
      expect(button).toBeInTheDocument();
    });

    it('should call onClick when button is clicked', () => {
      const mockAction = vi.fn();
      render(
        <EmptyState
          type="search"
          title="Title"
          description="Description"
          action={{ label: 'Action', onClick: mockAction }}
        />
      );

      const button = screen.getByRole('button', { name: 'Action' });
      fireEvent.click(button);

      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it('should call onClick multiple times', () => {
      const mockAction = vi.fn();
      render(
        <EmptyState
          type="search"
          title="Title"
          description="Description"
          action={{ label: 'Action', onClick: mockAction }}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(mockAction).toHaveBeenCalledTimes(3);
    });

    it('should render button with correct label', () => {
      const mockAction = vi.fn();
      render(
        <EmptyState
          type="search"
          title="Title"
          description="Description"
          action={{ label: 'Custom Label', onClick: mockAction }}
        />
      );

      expect(screen.getByText('Custom Label')).toBeInTheDocument();
    });
  });

  describe('Props Updates', () => {
    it('should update when type changes', () => {
      const { rerender } = render(
        <EmptyState type="search" title="Title" description="Description" />
      );

      rerender(<EmptyState type="error" title="Title" description="Description" />);

      // Both types should render (icons are different internally)
      expect(screen.getByText('Title')).toBeInTheDocument();
    });

    it('should update when title changes', () => {
      const { rerender } = render(
        <EmptyState type="search" title="Initial Title" description="Description" />
      );

      expect(screen.getByText('Initial Title')).toBeInTheDocument();

      rerender(<EmptyState type="search" title="Updated Title" description="Description" />);

      expect(screen.queryByText('Initial Title')).not.toBeInTheDocument();
      expect(screen.getByText('Updated Title')).toBeInTheDocument();
    });

    it('should update when description changes', () => {
      const { rerender } = render(
        <EmptyState type="search" title="Title" description="Initial description" />
      );

      expect(screen.getByText('Initial description')).toBeInTheDocument();

      rerender(<EmptyState type="search" title="Title" description="Updated description" />);

      expect(screen.queryByText('Initial description')).not.toBeInTheDocument();
      expect(screen.getByText('Updated description')).toBeInTheDocument();
    });

    it('should add action button when action is added', () => {
      const mockAction = vi.fn();
      const { rerender } = render(
        <EmptyState type="search" title="Title" description="Description" />
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();

      rerender(
        <EmptyState
          type="search"
          title="Title"
          description="Description"
          action={{ label: 'New Action', onClick: mockAction }}
        />
      );

      expect(screen.getByRole('button', { name: 'New Action' })).toBeInTheDocument();
    });

    it('should remove action button when action is removed', () => {
      const mockAction = vi.fn();
      const { rerender } = render(
        <EmptyState
          type="search"
          title="Title"
          description="Description"
          action={{ label: 'Action', onClick: mockAction }}
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(<EmptyState type="search" title="Title" description="Description" />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should update action label', () => {
      const mockAction = vi.fn();
      const { rerender } = render(
        <EmptyState
          type="search"
          title="Title"
          description="Description"
          action={{ label: 'First Label', onClick: mockAction }}
        />
      );

      expect(screen.getByText('First Label')).toBeInTheDocument();

      rerender(
        <EmptyState
          type="search"
          title="Title"
          description="Description"
          action={{ label: 'Second Label', onClick: mockAction }}
        />
      );

      expect(screen.queryByText('First Label')).not.toBeInTheDocument();
      expect(screen.getByText('Second Label')).toBeInTheDocument();
    });

    it('should update action onClick handler', () => {
      const mockAction1 = vi.fn();
      const mockAction2 = vi.fn();

      const { rerender } = render(
        <EmptyState
          type="search"
          title="Title"
          description="Description"
          action={{ label: 'Action', onClick: mockAction1 }}
        />
      );

      let button = screen.getByRole('button');
      fireEvent.click(button);
      expect(mockAction1).toHaveBeenCalledTimes(1);
      expect(mockAction2).toHaveBeenCalledTimes(0);

      rerender(
        <EmptyState
          type="search"
          title="Title"
          description="Description"
          action={{ label: 'Action', onClick: mockAction2 }}
        />
      );

      button = screen.getByRole('button');
      fireEvent.click(button);
      expect(mockAction1).toHaveBeenCalledTimes(1); // Still 1
      expect(mockAction2).toHaveBeenCalledTimes(1); // Now called
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long titles', () => {
      const longTitle = 'A'.repeat(200);
      render(<EmptyState type="search" title={longTitle} description="Description" />);

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('should handle very long descriptions', () => {
      const longDesc = 'B'.repeat(500);
      render(<EmptyState type="search" title="Title" description={longDesc} />);

      expect(screen.getByText(longDesc)).toBeInTheDocument();
    });

    it('should handle empty strings', () => {
      render(<EmptyState type="search" title="" description="" />);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
      expect(heading.textContent).toBe('');
    });

    it('should handle special characters in title', () => {
      render(<EmptyState type="search" title="Title <>& special" description="Description" />);

      expect(screen.getByText(/Title.*special/)).toBeInTheDocument();
    });

    it('should handle unicode characters', () => {
      render(
        <EmptyState type="search" title="Title 你好 🎉" description="Description العربية ®" />
      );

      expect(screen.getByText(/Title 你好 🎉/)).toBeInTheDocument();
      expect(screen.getByText(/Description العربية ®/)).toBeInTheDocument();
    });

    it('should handle newlines in description', () => {
      render(
        <EmptyState
          type="search"
          title="Title"
          description="Line 1
Line 2
Line 3"
        />
      );

      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
    });

    it('should handle action with empty label', () => {
      const mockAction = vi.fn();
      render(
        <EmptyState
          type="search"
          title="Title"
          description="Description"
          action={{ label: '', onClick: mockAction }}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button.textContent).toBe('');
    });
  });

  describe('Structure and Accessibility', () => {
    it('should have proper container structure', () => {
      const { container } = render(
        <EmptyState type="search" title="Title" description="Description" />
      );

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer.className).toContain('flex');
      expect(mainContainer.className).toContain('flex-col');
    });

    it('should have heading with proper hierarchy', () => {
      render(<EmptyState type="search" title="Main Heading" description="Description" />);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Main Heading');
    });

    it('should have accessible button when action is provided', () => {
      const mockAction = vi.fn();
      render(
        <EmptyState
          type="search"
          title="Title"
          description="Description"
          action={{ label: 'Accessible Action', onClick: mockAction }}
        />
      );

      const button = screen.getByRole('button', { name: 'Accessible Action' });
      expect(button).toBeInTheDocument();
    });

    it('should render multiple EmptyStates independently', () => {
      render(
        <>
          <EmptyState type="search" title="First Empty State" description="First description" />
          <EmptyState type="error" title="Second Empty State" description="Second description" />
        </>
      );

      expect(screen.getByText('First Empty State')).toBeInTheDocument();
      expect(screen.getByText('Second Empty State')).toBeInTheDocument();
      expect(screen.getByText('First description')).toBeInTheDocument();
      expect(screen.getByText('Second description')).toBeInTheDocument();
    });
  });
});
