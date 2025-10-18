import { PageContent } from '@/components/layout/PageContent';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('PageContent', () => {
  describe('Basic Rendering', () => {
    it('should render children', () => {
      render(
        <PageContent>
          <div>Test Content</div>
        </PageContent>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render with title', () => {
      render(
        <PageContent title="Test Title">
          <div>Content</div>
        </PageContent>
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test Title');
    });

    it('should render with description', () => {
      render(
        <PageContent description="Test Description">
          <div>Content</div>
        </PageContent>
      );

      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });

    it('should render with both title and description', () => {
      render(
        <PageContent title="Test Title" description="Test Description">
          <div>Content</div>
        </PageContent>
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });

    it('should not render header section without title or description', () => {
      const { container } = render(
        <PageContent>
          <div>Content Only</div>
        </PageContent>
      );

      // Should only have the main container and children, no header section
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
      expect(screen.getByText('Content Only')).toBeInTheDocument();
    });
  });

  describe('ClassName Handling', () => {
    it('should apply default p-6 class', () => {
      const { container } = render(
        <PageContent>
          <div>Content</div>
        </PageContent>
      );

      const pageContent = container.firstChild as HTMLElement;
      expect(pageContent.className).toContain('p-6');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <PageContent className="custom-class">
          <div>Content</div>
        </PageContent>
      );

      const pageContent = container.firstChild as HTMLElement;
      expect(pageContent.className).toContain('custom-class');
      expect(pageContent.className).toContain('p-6');
    });

    it('should combine multiple custom classes', () => {
      const { container } = render(
        <PageContent className="class-1 class-2 class-3">
          <div>Content</div>
        </PageContent>
      );

      const pageContent = container.firstChild as HTMLElement;
      expect(pageContent.className).toContain('class-1');
      expect(pageContent.className).toContain('class-2');
      expect(pageContent.className).toContain('class-3');
      expect(pageContent.className).toContain('p-6');
    });

    it('should handle empty className prop', () => {
      const { container } = render(
        <PageContent className="">
          <div>Content</div>
        </PageContent>
      );

      const pageContent = container.firstChild as HTMLElement;
      expect(pageContent.className).toContain('p-6');
    });
  });

  describe('Props Updates', () => {
    it('should update when title changes', () => {
      const { rerender } = render(
        <PageContent title="Initial Title">
          <div>Content</div>
        </PageContent>
      );

      expect(screen.getByText('Initial Title')).toBeInTheDocument();

      rerender(
        <PageContent title="Updated Title">
          <div>Content</div>
        </PageContent>
      );

      expect(screen.queryByText('Initial Title')).not.toBeInTheDocument();
      expect(screen.getByText('Updated Title')).toBeInTheDocument();
    });

    it('should update when description changes', () => {
      const { rerender } = render(
        <PageContent description="Initial Desc">
          <div>Content</div>
        </PageContent>
      );

      expect(screen.getByText('Initial Desc')).toBeInTheDocument();

      rerender(
        <PageContent description="Updated Desc">
          <div>Content</div>
        </PageContent>
      );

      expect(screen.queryByText('Initial Desc')).not.toBeInTheDocument();
      expect(screen.getByText('Updated Desc')).toBeInTheDocument();
    });

    it('should add title when initially absent', () => {
      const { rerender } = render(
        <PageContent>
          <div>Content</div>
        </PageContent>
      );

      expect(screen.queryByRole('heading')).not.toBeInTheDocument();

      rerender(
        <PageContent title="New Title">
          <div>Content</div>
        </PageContent>
      );

      expect(screen.getByText('New Title')).toBeInTheDocument();
    });

    it('should remove header when title and description are removed', () => {
      const { rerender } = render(
        <PageContent title="Title" description="Description">
          <div>Content</div>
        </PageContent>
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();

      rerender(
        <PageContent>
          <div>Content</div>
        </PageContent>
      );

      expect(screen.queryByText('Title')).not.toBeInTheDocument();
      expect(screen.queryByText('Description')).not.toBeInTheDocument();
    });

    it('should update children', () => {
      const { rerender } = render(
        <PageContent>
          <div>Original Child</div>
        </PageContent>
      );

      expect(screen.getByText('Original Child')).toBeInTheDocument();

      rerender(
        <PageContent>
          <div>Updated Child</div>
        </PageContent>
      );

      expect(screen.queryByText('Original Child')).not.toBeInTheDocument();
      expect(screen.getByText('Updated Child')).toBeInTheDocument();
    });
  });

  describe('Children Variations', () => {
    it('should render multiple children', () => {
      render(
        <PageContent>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </PageContent>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
      expect(screen.getByText('Child 3')).toBeInTheDocument();
    });

    it('should render nested components', () => {
      render(
        <PageContent title="Parent Title">
          <PageContent title="Nested Title">
            <div>Nested Content</div>
          </PageContent>
        </PageContent>
      );

      expect(screen.getByText('Parent Title')).toBeInTheDocument();
      expect(screen.getByText('Nested Title')).toBeInTheDocument();
      expect(screen.getByText('Nested Content')).toBeInTheDocument();
    });

    it('should render complex children structures', () => {
      render(
        <PageContent>
          <div>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </div>
        </PageContent>
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('should handle text children', () => {
      render(<PageContent>Plain text content</PageContent>);

      expect(screen.getByText('Plain text content')).toBeInTheDocument();
    });

    it('should handle empty children', () => {
      const { container } = render(<PageContent>{null}</PageContent>);

      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long titles', () => {
      const longTitle = 'A'.repeat(200);
      render(
        <PageContent title={longTitle}>
          <div>Content</div>
        </PageContent>
      );

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('should handle very long descriptions', () => {
      const longDesc = 'B'.repeat(500);
      render(
        <PageContent description={longDesc}>
          <div>Content</div>
        </PageContent>
      );

      expect(screen.getByText(longDesc)).toBeInTheDocument();
    });

    it('should handle special characters in title', () => {
      render(
        <PageContent title="Title with <>& special chars">
          <div>Content</div>
        </PageContent>
      );

      expect(screen.getByText(/Title with.*special chars/)).toBeInTheDocument();
    });

    it('should handle unicode in title and description', () => {
      render(
        <PageContent title="Title 你好 🎉" description="Description العربية ®">
          <div>Content</div>
        </PageContent>
      );

      expect(screen.getByText(/Title 你好 🎉/)).toBeInTheDocument();
      expect(screen.getByText(/Description العربية ®/)).toBeInTheDocument();
    });

    it('should handle whitespace-only className', () => {
      const { container } = render(
        <PageContent className="   ">
          <div>Content</div>
        </PageContent>
      );

      const pageContent = container.firstChild as HTMLElement;
      expect(pageContent.className).toContain('p-6');
    });

    it('should preserve title case and formatting', () => {
      render(
        <PageContent title="CamelCase Title With CAPS">
          <div>Content</div>
        </PageContent>
      );

      expect(screen.getByText('CamelCase Title With CAPS')).toBeInTheDocument();
    });

    it('should handle description with line breaks', () => {
      render(
        <PageContent
          description="Line 1
Line 2
Line 3"
        >
          <div>Content</div>
        </PageContent>
      );

      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(
        <PageContent title="Main Title">
          <div>Content</div>
        </PageContent>
      );

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Main Title');
    });

    it('should have semantic paragraph for description', () => {
      const { container } = render(
        <PageContent description="Description text">
          <div>Content</div>
        </PageContent>
      );

      const paragraph = container.querySelector('p');
      expect(paragraph).toBeInTheDocument();
      expect(paragraph).toHaveTextContent('Description text');
    });

    it('should maintain proper DOM structure', () => {
      const { container } = render(
        <PageContent title="Title" description="Description">
          <div>Content</div>
        </PageContent>
      );

      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.tagName).toBe('DIV');

      // Should have header section and children
      const divs = outerDiv.querySelectorAll(':scope > div');
      expect(divs.length).toBeGreaterThanOrEqual(1);
    });
  });
});
