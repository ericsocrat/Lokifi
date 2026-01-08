import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

describe('Card', () => {
  describe('Card component', () => {
    it('should render with children', () => {
      render(<Card>Card Content</Card>);
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('should have default card styles', () => {
      render(<Card data-testid="card">Content</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('rounded-lg');
      expect(card).toHaveClass('border');
      expect(card).toHaveClass('shadow-sm');
    });

    it('should merge custom className', () => {
      render(
        <Card className="custom-class" data-testid="card">
          Content
        </Card>
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('custom-class');
      expect(card).toHaveClass('rounded-lg');
    });

    it('should forward ref', () => {
      const ref = { current: null as HTMLDivElement | null };
      render(<Card ref={ref}>Ref Test</Card>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('should pass through HTML attributes', () => {
      render(
        <Card data-testid="custom" role="article">
          Content
        </Card>
      );
      const card = screen.getByTestId('custom');
      expect(card).toHaveAttribute('role', 'article');
    });
  });

  describe('CardHeader component', () => {
    it('should render with children', () => {
      render(<CardHeader>Header Content</CardHeader>);
      expect(screen.getByText('Header Content')).toBeInTheDocument();
    });

    it('should have default header styles', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>);
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('flex');
      expect(header).toHaveClass('flex-col');
      expect(header).toHaveClass('p-6');
    });

    it('should merge custom className', () => {
      render(
        <CardHeader className="custom-header" data-testid="header">
          Header
        </CardHeader>
      );
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('custom-header');
      expect(header).toHaveClass('p-6');
    });

    it('should forward ref', () => {
      const ref = { current: null as HTMLDivElement | null };
      render(<CardHeader ref={ref}>Header</CardHeader>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('CardTitle component', () => {
    it('should render with children', () => {
      render(<CardTitle>Title Text</CardTitle>);
      expect(screen.getByText('Title Text')).toBeInTheDocument();
    });

    it('should render as h3 heading', () => {
      render(<CardTitle>Heading</CardTitle>);
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });

    it('should have default title styles', () => {
      render(<CardTitle data-testid="title">Title</CardTitle>);
      const title = screen.getByTestId('title');
      expect(title).toHaveClass('text-2xl');
      expect(title).toHaveClass('font-semibold');
    });

    it('should merge custom className', () => {
      render(
        <CardTitle className="custom-title" data-testid="title">
          Title
        </CardTitle>
      );
      const title = screen.getByTestId('title');
      expect(title).toHaveClass('custom-title');
      expect(title).toHaveClass('text-2xl');
    });

    it('should forward ref', () => {
      const ref = { current: null as HTMLParagraphElement | null };
      render(<CardTitle ref={ref}>Title</CardTitle>);
      expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
    });
  });

  describe('CardDescription component', () => {
    it('should render with children', () => {
      render(<CardDescription>Description text</CardDescription>);
      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('should render as paragraph', () => {
      render(<CardDescription data-testid="desc">Description</CardDescription>);
      const desc = screen.getByTestId('desc');
      expect(desc.tagName).toBe('P');
    });

    it('should have default description styles', () => {
      render(<CardDescription data-testid="desc">Description</CardDescription>);
      const desc = screen.getByTestId('desc');
      expect(desc).toHaveClass('text-sm');
      expect(desc).toHaveClass('text-muted-foreground');
    });

    it('should merge custom className', () => {
      render(
        <CardDescription className="custom-desc" data-testid="desc">
          Description
        </CardDescription>
      );
      const desc = screen.getByTestId('desc');
      expect(desc).toHaveClass('custom-desc');
      expect(desc).toHaveClass('text-sm');
    });

    it('should forward ref', () => {
      const ref = { current: null as HTMLParagraphElement | null };
      render(<CardDescription ref={ref}>Description</CardDescription>);
      expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
    });
  });

  describe('CardContent component', () => {
    it('should render with children', () => {
      render(<CardContent>Content body</CardContent>);
      expect(screen.getByText('Content body')).toBeInTheDocument();
    });

    it('should have default content styles', () => {
      render(<CardContent data-testid="content">Content</CardContent>);
      const content = screen.getByTestId('content');
      expect(content).toHaveClass('p-6');
      expect(content).toHaveClass('pt-0');
    });

    it('should merge custom className', () => {
      render(
        <CardContent className="custom-content" data-testid="content">
          Content
        </CardContent>
      );
      const content = screen.getByTestId('content');
      expect(content).toHaveClass('custom-content');
      expect(content).toHaveClass('p-6');
    });

    it('should forward ref', () => {
      const ref = { current: null as HTMLDivElement | null };
      render(<CardContent ref={ref}>Content</CardContent>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('CardFooter component', () => {
    it('should render with children', () => {
      render(<CardFooter>Footer content</CardFooter>);
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });

    it('should have default footer styles', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);
      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('flex');
      expect(footer).toHaveClass('items-center');
      expect(footer).toHaveClass('p-6');
      expect(footer).toHaveClass('pt-0');
    });

    it('should merge custom className', () => {
      render(
        <CardFooter className="custom-footer" data-testid="footer">
          Footer
        </CardFooter>
      );
      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('custom-footer');
      expect(footer).toHaveClass('flex');
    });

    it('should forward ref', () => {
      const ref = { current: null as HTMLDivElement | null };
      render(<CardFooter ref={ref}>Footer</CardFooter>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('composition', () => {
    it('should render full card with all sub-components', () => {
      render(
        <Card data-testid="full-card">
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description text</CardDescription>
          </CardHeader>
          <CardContent>Main card content goes here</CardContent>
          <CardFooter>Footer actions</CardFooter>
        </Card>
      );

      expect(screen.getByTestId('full-card')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: 'Card Title' })).toBeInTheDocument();
      expect(screen.getByText('Card description text')).toBeInTheDocument();
      expect(screen.getByText('Main card content goes here')).toBeInTheDocument();
      expect(screen.getByText('Footer actions')).toBeInTheDocument();
    });

    it('should render card without header', () => {
      render(
        <Card data-testid="headerless-card">
          <CardContent>Content only</CardContent>
        </Card>
      );

      expect(screen.getByTestId('headerless-card')).toBeInTheDocument();
      expect(screen.getByText('Content only')).toBeInTheDocument();
    });

    it('should render card without footer', () => {
      render(
        <Card data-testid="footerless-card">
          <CardHeader>
            <CardTitle>No Footer</CardTitle>
          </CardHeader>
          <CardContent>Content without footer</CardContent>
        </Card>
      );

      expect(screen.getByTestId('footerless-card')).toBeInTheDocument();
      expect(screen.getByText('No Footer')).toBeInTheDocument();
      expect(screen.getByText('Content without footer')).toBeInTheDocument();
    });
  });

  describe('displayName', () => {
    it('should have Card displayName', () => {
      expect(Card.displayName).toBe('Card');
    });

    it('should have CardHeader displayName', () => {
      expect(CardHeader.displayName).toBe('CardHeader');
    });

    it('should have CardTitle displayName', () => {
      expect(CardTitle.displayName).toBe('CardTitle');
    });

    it('should have CardDescription displayName', () => {
      expect(CardDescription.displayName).toBe('CardDescription');
    });

    it('should have CardContent displayName', () => {
      expect(CardContent.displayName).toBe('CardContent');
    });

    it('should have CardFooter displayName', () => {
      expect(CardFooter.displayName).toBe('CardFooter');
    });
  });

  describe('edge cases', () => {
    it('should handle empty className', () => {
      render(<Card className="">Empty class</Card>);
      expect(screen.getByText('Empty class')).toBeInTheDocument();
    });

    it('should handle multiple cards', () => {
      render(
        <div>
          <Card data-testid="card-1">Card 1</Card>
          <Card data-testid="card-2">Card 2</Card>
        </div>
      );
      expect(screen.getByTestId('card-1')).toBeInTheDocument();
      expect(screen.getByTestId('card-2')).toBeInTheDocument();
    });

    it('should handle nested cards', () => {
      render(
        <Card data-testid="outer">
          <CardContent>
            <Card data-testid="inner">
              <CardContent>Nested content</CardContent>
            </Card>
          </CardContent>
        </Card>
      );
      expect(screen.getByTestId('outer')).toBeInTheDocument();
      expect(screen.getByTestId('inner')).toBeInTheDocument();
      expect(screen.getByText('Nested content')).toBeInTheDocument();
    });

    it('should handle conditional rendering', () => {
      const showDescription = false;
      render(
        <Card>
          <CardHeader>
            <CardTitle>Conditional</CardTitle>
            {showDescription && <CardDescription>Hidden</CardDescription>}
          </CardHeader>
        </Card>
      );
      expect(screen.getByText('Conditional')).toBeInTheDocument();
      expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    });
  });
});
