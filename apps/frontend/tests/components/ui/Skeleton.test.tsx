import {
  Skeleton,
  SkeletonAvatarGroup,
  SkeletonCard,
  SkeletonCircle,
  SkeletonTable,
  SkeletonText,
} from '@/components/ui/Skeleton';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('Skeleton', () => {
  describe('Basic Rendering', () => {
    it('renders a skeleton element', () => {
      render(<Skeleton data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    });

    it('renders with custom width as number', () => {
      render(<Skeleton width={200} data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton')).toHaveStyle({ width: '200px' });
    });

    it('renders with custom width as string', () => {
      render(<Skeleton width="50%" data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton')).toHaveStyle({ width: '50%' });
    });

    it('renders with custom height as number', () => {
      render(<Skeleton height={50} data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton')).toHaveStyle({ height: '50px' });
    });

    it('renders with custom height as string', () => {
      render(<Skeleton height="2rem" data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton')).toHaveStyle({ height: '2rem' });
    });
  });

  describe('Variants', () => {
    it('renders rectangular variant (default)', () => {
      render(<Skeleton variant="rectangular" data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton')).toHaveClass('rounded-none');
    });

    it('renders circular variant', () => {
      render(<Skeleton variant="circular" data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton')).toHaveClass('rounded-full');
    });

    it('renders rounded variant', () => {
      render(<Skeleton variant="rounded" data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton')).toHaveClass('rounded-lg');
    });

    it('renders text variant', () => {
      render(<Skeleton variant="text" data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton')).toHaveClass('rounded');
    });

    it('text variant has default height of 1em', () => {
      render(<Skeleton variant="text" data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton')).toHaveStyle({ height: '1em' });
    });
  });

  describe('Animation', () => {
    it('has pulse animation by default', () => {
      render(<Skeleton data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton')).toHaveClass('animate-pulse');
    });

    it('has shimmer animation when specified', () => {
      render(<Skeleton animation="shimmer" data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton')).toHaveClass('overflow-hidden');
    });

    it('has no animation when set to none', () => {
      render(<Skeleton animation="none" data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton')).not.toHaveClass('animate-pulse');
    });

    it('has no animation when animate is false', () => {
      render(<Skeleton animate={false} data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton')).not.toHaveClass('animate-pulse');
    });
  });

  describe('Multi-line Text', () => {
    it('renders multiple lines when lines > 1', () => {
      render(<Skeleton variant="text" lines={3} data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton-line-0')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-line-1')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-line-2')).toBeInTheDocument();
    });

    it('last line is shorter (60% width)', () => {
      render(<Skeleton variant="text" lines={3} data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton-line-2')).toHaveStyle({ width: '60%' });
    });

    it('second to last line is 80% width', () => {
      render(<Skeleton variant="text" lines={3} data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton-line-1')).toHaveStyle({ width: '80%' });
    });

    it('first line is full width', () => {
      render(<Skeleton variant="text" lines={3} data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton-line-0')).toHaveStyle({ width: '100%' });
    });

    it('uses custom width when provided for all lines', () => {
      render(<Skeleton variant="text" lines={2} width="200px" data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton-line-0')).toHaveStyle({ width: '200px' });
      expect(screen.getByTestId('skeleton-line-1')).toHaveStyle({ width: '200px' });
    });
  });

  describe('Circular Variant', () => {
    it('uses width for both dimensions', () => {
      render(<Skeleton variant="circular" width={40} data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveStyle({ width: '40px', height: '40px' });
    });

    it('uses height when no width provided', () => {
      render(<Skeleton variant="circular" height={50} data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveStyle({ width: '50px', height: '50px' });
    });

    it('defaults to 40px when no size provided', () => {
      render(<Skeleton variant="circular" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveStyle({ width: '40px', height: '40px' });
    });
  });

  describe('Accessibility', () => {
    it('has role="status"', () => {
      render(<Skeleton data-testid="skeleton" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has aria-label="Loading"', () => {
      render(<Skeleton data-testid="skeleton" />);
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading');
    });

    it('has aria-busy="true"', () => {
      render(<Skeleton data-testid="skeleton" />);
      expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      render(<Skeleton className="custom-skeleton" data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton')).toHaveClass('custom-skeleton');
    });
  });
});

describe('SkeletonText', () => {
  it('renders with text variant', () => {
    render(<SkeletonText data-testid="skeleton-text" />);
    expect(screen.getByTestId('skeleton-text')).toHaveClass('rounded');
  });

  it('passes props to Skeleton', () => {
    render(<SkeletonText width="200px" data-testid="skeleton-text" />);
    expect(screen.getByTestId('skeleton-text')).toHaveStyle({ width: '200px' });
  });

  it('supports multiple lines', () => {
    render(<SkeletonText lines={2} data-testid="skeleton-text" />);
    expect(screen.getByTestId('skeleton-text-line-0')).toBeInTheDocument();
    expect(screen.getByTestId('skeleton-text-line-1')).toBeInTheDocument();
  });
});

describe('SkeletonCircle', () => {
  it('renders with circular variant', () => {
    render(<SkeletonCircle data-testid="skeleton-circle" />);
    expect(screen.getByTestId('skeleton-circle')).toHaveClass('rounded-full');
  });

  it('accepts size prop', () => {
    render(<SkeletonCircle size={60} data-testid="skeleton-circle" />);
    expect(screen.getByTestId('skeleton-circle')).toHaveStyle({
      width: '60px',
      height: '60px',
    });
  });

  it('accepts size as string', () => {
    render(<SkeletonCircle size="3rem" data-testid="skeleton-circle" />);
    expect(screen.getByTestId('skeleton-circle')).toHaveStyle({
      width: '3rem',
      height: '3rem',
    });
  });
});

describe('SkeletonCard', () => {
  it('renders card container', () => {
    render(<SkeletonCard data-testid="skeleton-card" />);
    expect(screen.getByTestId('skeleton-card')).toBeInTheDocument();
  });

  it('has role="status"', () => {
    render(<SkeletonCard data-testid="skeleton-card" />);
    expect(screen.getByTestId('skeleton-card')).toHaveAttribute('role', 'status');
  });

  it('has aria-label="Loading card"', () => {
    render(<SkeletonCard data-testid="skeleton-card" />);
    expect(screen.getByTestId('skeleton-card')).toHaveAttribute('aria-label', 'Loading card');
  });

  it('shows image placeholder by default', () => {
    const { container } = render(<SkeletonCard data-testid="skeleton-card" />);
    // Should have an image skeleton with rounded variant and height 150
    const skeletons = container.querySelectorAll('[class*="rounded-lg"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('hides image when showImage is false', () => {
    const { container } = render(<SkeletonCard showImage={false} data-testid="skeleton-card" />);
    // Count rounded-lg elements (image placeholder)
    const imageSkeletons = container.querySelectorAll('[style*="height: 150px"]');
    expect(imageSkeletons.length).toBe(0);
  });

  it('renders default 3 lines', () => {
    const { container } = render(<SkeletonCard data-testid="skeleton-card" />);
    // Should have multiple line elements
    const lines = container.querySelectorAll('[style*="height: 1em"]');
    expect(lines.length).toBe(3);
  });

  it('renders custom number of lines', () => {
    const { container } = render(<SkeletonCard lines={5} data-testid="skeleton-card" />);
    const lines = container.querySelectorAll('[style*="height: 1em"]');
    expect(lines.length).toBe(5);
  });

  it('applies custom className', () => {
    render(<SkeletonCard className="custom-card" data-testid="skeleton-card" />);
    expect(screen.getByTestId('skeleton-card')).toHaveClass('custom-card');
  });
});

describe('SkeletonAvatarGroup', () => {
  it('renders avatar group container', () => {
    render(<SkeletonAvatarGroup data-testid="avatar-group" />);
    expect(screen.getByTestId('avatar-group')).toBeInTheDocument();
  });

  it('renders 3 avatars by default', () => {
    render(<SkeletonAvatarGroup data-testid="avatar-group" />);
    expect(screen.getByTestId('avatar-group-avatar-0')).toBeInTheDocument();
    expect(screen.getByTestId('avatar-group-avatar-1')).toBeInTheDocument();
    expect(screen.getByTestId('avatar-group-avatar-2')).toBeInTheDocument();
  });

  it('renders custom count of avatars', () => {
    render(<SkeletonAvatarGroup count={5} data-testid="avatar-group" />);
    expect(screen.getByTestId('avatar-group-avatar-4')).toBeInTheDocument();
  });

  it('uses default size of 40px', () => {
    render(<SkeletonAvatarGroup data-testid="avatar-group" />);
    expect(screen.getByTestId('avatar-group-avatar-0')).toHaveStyle({
      width: '40px',
      height: '40px',
    });
  });

  it('uses custom size', () => {
    render(<SkeletonAvatarGroup size={60} data-testid="avatar-group" />);
    expect(screen.getByTestId('avatar-group-avatar-0')).toHaveStyle({
      width: '60px',
      height: '60px',
    });
  });

  it('has negative spacing for overlap effect', () => {
    render(<SkeletonAvatarGroup data-testid="avatar-group" />);
    expect(screen.getByTestId('avatar-group')).toHaveClass('-space-x-2');
  });

  it('has role="status"', () => {
    render(<SkeletonAvatarGroup data-testid="avatar-group" />);
    expect(screen.getByTestId('avatar-group')).toHaveAttribute('role', 'status');
  });

  it('has aria-label="Loading avatars"', () => {
    render(<SkeletonAvatarGroup data-testid="avatar-group" />);
    expect(screen.getByTestId('avatar-group')).toHaveAttribute('aria-label', 'Loading avatars');
  });

  it('applies custom className', () => {
    render(<SkeletonAvatarGroup className="custom-group" data-testid="avatar-group" />);
    expect(screen.getByTestId('avatar-group')).toHaveClass('custom-group');
  });
});

describe('SkeletonTable', () => {
  it('renders table container', () => {
    render(<SkeletonTable data-testid="skeleton-table" />);
    expect(screen.getByTestId('skeleton-table')).toBeInTheDocument();
  });

  it('renders 5 rows by default', () => {
    render(<SkeletonTable data-testid="skeleton-table" />);
    expect(screen.getByTestId('skeleton-table-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('skeleton-table-row-4')).toBeInTheDocument();
  });

  it('renders custom number of rows', () => {
    render(<SkeletonTable rows={3} data-testid="skeleton-table" />);
    expect(screen.getByTestId('skeleton-table-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('skeleton-table-row-2')).toBeInTheDocument();
    expect(screen.queryByTestId('skeleton-table-row-3')).not.toBeInTheDocument();
  });

  it('renders 4 columns by default', () => {
    render(<SkeletonTable data-testid="skeleton-table" />);
    expect(screen.getByTestId('skeleton-table-cell-0-0')).toBeInTheDocument();
    expect(screen.getByTestId('skeleton-table-cell-0-3')).toBeInTheDocument();
  });

  it('renders custom number of columns', () => {
    render(<SkeletonTable columns={2} data-testid="skeleton-table" />);
    expect(screen.getByTestId('skeleton-table-cell-0-0')).toBeInTheDocument();
    expect(screen.getByTestId('skeleton-table-cell-0-1')).toBeInTheDocument();
    expect(screen.queryByTestId('skeleton-table-cell-0-2')).not.toBeInTheDocument();
  });

  it('shows header row by default', () => {
    render(<SkeletonTable data-testid="skeleton-table" />);
    expect(screen.getByTestId('skeleton-table-header-0')).toBeInTheDocument();
  });

  it('hides header when showHeader is false', () => {
    render(<SkeletonTable showHeader={false} data-testid="skeleton-table" />);
    expect(screen.queryByTestId('skeleton-table-header-0')).not.toBeInTheDocument();
  });

  it('has role="status"', () => {
    render(<SkeletonTable data-testid="skeleton-table" />);
    expect(screen.getByTestId('skeleton-table')).toHaveAttribute('role', 'status');
  });

  it('has aria-label="Loading table"', () => {
    render(<SkeletonTable data-testid="skeleton-table" />);
    expect(screen.getByTestId('skeleton-table')).toHaveAttribute('aria-label', 'Loading table');
  });

  it('applies custom className', () => {
    render(<SkeletonTable className="custom-table" data-testid="skeleton-table" />);
    expect(screen.getByTestId('skeleton-table')).toHaveClass('custom-table');
  });
});
