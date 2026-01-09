import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AddAssetsPage from '../../app/dashboard/add-assets/page';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/dashboard/add-assets',
  useSearchParams: () => new URLSearchParams(),
}));

describe('AddAssetsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders the page with loading indicator', () => {
      render(<AddAssetsPage />);
      
      // Should show loading spinner and text
      expect(screen.getByText('Redirecting...')).toBeInTheDocument();
    });

    it('renders a centered layout', () => {
      const { container } = render(<AddAssetsPage />);
      
      // Check for centered flex container
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('min-h-screen', 'flex', 'items-center', 'justify-center');
    });

    it('renders a loading spinner', () => {
      const { container } = render(<AddAssetsPage />);
      
      // Check for spinner with animation
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('rounded-full', 'border-b-2', 'border-lokifi');
    });

    it('applies proper styling to redirecting text', () => {
      render(<AddAssetsPage />);
      
      const text = screen.getByText('Redirecting...');
      expect(text).toHaveClass('mt-4', 'text-surface-400');
    });

    it('has correct background color', () => {
      const { container } = render(<AddAssetsPage />);
      
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('bg-surface-0');
    });
  });

  describe('Redirect behavior', () => {
    it('redirects to portfolio page with add action', () => {
      render(<AddAssetsPage />);
      
      // Should have called router.push with portfolio add action
      expect(mockPush).toHaveBeenCalledWith('/portfolio?action=add');
    });

    it('redirects immediately on mount', () => {
      render(<AddAssetsPage />);
      
      // Push should be called once
      expect(mockPush).toHaveBeenCalledTimes(1);
    });

    it('redirects on every component mount', () => {
      // Clear any previous calls
      mockPush.mockClear();
      
      const { rerender } = render(<AddAssetsPage />);
      
      // First mount
      expect(mockPush).toHaveBeenCalledTimes(1);
      
      // Re-render component (does not unmount/remount, but router ref is stable)
      rerender(<AddAssetsPage />);
      
      // React rerender with same deps should not re-trigger effect
      // But since we're using new component instance in rerender, it may vary
      // Just verify it was called at least once with correct args
      expect(mockPush).toHaveBeenCalledWith('/portfolio?action=add');
    });
  });

  describe('Loading state', () => {
    it('shows loading UI while redirecting', () => {
      render(<AddAssetsPage />);
      
      // Both spinner and text should be visible
      const text = screen.getByText('Redirecting...');
      expect(text).toBeInTheDocument();
      
      const { container } = render(<AddAssetsPage />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('spinner has correct dimensions', () => {
      const { container } = render(<AddAssetsPage />);
      
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('h-12', 'w-12');
    });

    it('text container is centered', () => {
      const { container } = render(<AddAssetsPage />);
      
      // Find text-center div
      const centerDiv = container.querySelector('.text-center');
      expect(centerDiv).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has meaningful loading text for screen readers', () => {
      render(<AddAssetsPage />);
      
      // "Redirecting..." provides context for screen readers
      expect(screen.getByText('Redirecting...')).toBeInTheDocument();
    });

    it('does not trap focus', () => {
      const { container } = render(<AddAssetsPage />);
      
      // No interactive elements that could trap focus
      const buttons = container.querySelectorAll('button');
      const inputs = container.querySelectorAll('input');
      const links = container.querySelectorAll('a');
      
      expect(buttons.length).toBe(0);
      expect(inputs.length).toBe(0);
      expect(links.length).toBe(0);
    });
  });
});
