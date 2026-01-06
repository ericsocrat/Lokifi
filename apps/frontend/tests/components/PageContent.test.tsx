import { PageContent } from '@/components/layout/PageContent';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('PageContent', () => {
  describe('rendering', () => {
    it('should render children content', () => {
      render(
        <PageContent>
          <div data-testid="child">Test content</div>
        </PageContent>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should render without title or description', () => {
      render(
        <PageContent>
          <span>Content only</span>
        </PageContent>
      );

      expect(screen.getByText('Content only')).toBeInTheDocument();
    });

    it('should render with title', () => {
      render(
        <PageContent title="Page Title">
          <span>Content</span>
        </PageContent>
      );

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Page Title');
    });

    it('should render with description', () => {
      render(
        <PageContent description="Page description text">
          <span>Content</span>
        </PageContent>
      );

      expect(screen.getByText('Page description text')).toBeInTheDocument();
    });

    it('should render with both title and description', () => {
      render(
        <PageContent title="My Title" description="My Description">
          <span>Content</span>
        </PageContent>
      );

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('My Title');
      expect(screen.getByText('My Description')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply default padding class', () => {
      const { container } = render(
        <PageContent>
          <span>Content</span>
        </PageContent>
      );

      expect(container.firstChild).toHaveClass('p-6');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <PageContent className="custom-class">
          <span>Content</span>
        </PageContent>
      );

      expect(container.firstChild).toHaveClass('p-6');
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should apply title styling', () => {
      render(
        <PageContent title="Styled Title">
          <span>Content</span>
        </PageContent>
      );

      const title = screen.getByRole('heading', { level: 1 });
      expect(title).toHaveClass('text-2xl');
      expect(title).toHaveClass('font-bold');
    });

    it('should apply description styling', () => {
      render(
        <PageContent description="Styled description">
          <span>Content</span>
        </PageContent>
      );

      const description = screen.getByText('Styled description');
      expect(description).toHaveClass('text-gray-600');
    });

    it('should have margin on header section when title exists', () => {
      const { container } = render(
        <PageContent title="Title">
          <span>Content</span>
        </PageContent>
      );

      const headerDiv = container.querySelector('.mb-6');
      expect(headerDiv).toBeInTheDocument();
    });
  });

  describe('conditional rendering', () => {
    it('should not render header section without title and description', () => {
      const { container } = render(
        <PageContent>
          <span>Content</span>
        </PageContent>
      );

      const headerDiv = container.querySelector('.mb-6');
      expect(headerDiv).not.toBeInTheDocument();
    });

    it('should render header section with only title', () => {
      const { container } = render(
        <PageContent title="Only Title">
          <span>Content</span>
        </PageContent>
      );

      const headerDiv = container.querySelector('.mb-6');
      expect(headerDiv).toBeInTheDocument();
      expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
    });

    it('should render header section with only description', () => {
      const { container } = render(
        <PageContent description="Only description">
          <span>Content</span>
        </PageContent>
      );

      const headerDiv = container.querySelector('.mb-6');
      expect(headerDiv).toBeInTheDocument();
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });
  });

  describe('content types', () => {
    it('should render complex nested children', () => {
      render(
        <PageContent title="Complex Page">
          <div>
            <section data-testid="section-1">Section 1</section>
            <section data-testid="section-2">Section 2</section>
          </div>
        </PageContent>
      );

      expect(screen.getByTestId('section-1')).toBeInTheDocument();
      expect(screen.getByTestId('section-2')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <PageContent>
          <span data-testid="child-1">Child 1</span>
          <span data-testid="child-2">Child 2</span>
          <span data-testid="child-3">Child 3</span>
        </PageContent>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });

    it('should render text children directly', () => {
      render(<PageContent>Plain text content</PageContent>);

      expect(screen.getByText('Plain text content')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should use h1 for title (semantic heading)', () => {
      render(
        <PageContent title="Accessible Title">
          <span>Content</span>
        </PageContent>
      );

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
    });

    it('should render description as paragraph', () => {
      render(
        <PageContent description="Accessible description">
          <span>Content</span>
        </PageContent>
      );

      const paragraph = screen.getByText('Accessible description');
      expect(paragraph.tagName).toBe('P');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string title', () => {
      const { container } = render(
        <PageContent title="">
          <span>Content</span>
        </PageContent>
      );

      // Empty string is falsy, so no header should render
      const headerDiv = container.querySelector('.mb-6');
      expect(headerDiv).not.toBeInTheDocument();
    });

    it('should handle empty string description', () => {
      const { container } = render(
        <PageContent description="">
          <span>Content</span>
        </PageContent>
      );

      // Empty string is falsy, so no header should render
      const headerDiv = container.querySelector('.mb-6');
      expect(headerDiv).not.toBeInTheDocument();
    });

    it('should handle empty className', () => {
      const { container } = render(
        <PageContent className="">
          <span>Content</span>
        </PageContent>
      );

      expect(container.firstChild).toHaveClass('p-6');
    });

    it('should handle long title text', () => {
      const longTitle = 'A'.repeat(100);
      render(
        <PageContent title={longTitle}>
          <span>Content</span>
        </PageContent>
      );

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(longTitle);
    });

    it('should handle special characters in title', () => {
      const specialTitle = "Special <chars> & 'quotes'";
      render(
        <PageContent title={specialTitle}>
          <span>Content</span>
        </PageContent>
      );

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(specialTitle);
    });
  });
});
