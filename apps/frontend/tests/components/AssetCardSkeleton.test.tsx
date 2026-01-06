import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AssetCardSkeleton, AssetTableRowSkeleton } from '@/components/markets/AssetCardSkeleton';

describe('AssetCardSkeleton', () => {
  describe('Rendering', () => {
    it('should render the skeleton container', () => {
      const { container } = render(<AssetCardSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should apply pulse animation', () => {
      const { container } = render(<AssetCardSkeleton />);
      expect(container.firstChild).toHaveClass('animate-pulse');
    });

    it('should render card-like structure', () => {
      const { container } = render(<AssetCardSkeleton />);
      expect(container.firstChild).toHaveClass('rounded-lg', 'p-4');
    });
  });

  describe('Skeleton Elements', () => {
    it('should render circular avatar placeholder', () => {
      const { container } = render(<AssetCardSkeleton />);
      const avatar = container.querySelector('.rounded-full');
      expect(avatar).toHaveClass('w-8', 'h-8');
    });

    it('should render multiple placeholder bars', () => {
      const { container } = render(<AssetCardSkeleton />);
      const bars = container.querySelectorAll('.bg-neutral-800');
      expect(bars.length).toBeGreaterThanOrEqual(4); // avatar + multiple bars
    });

    it('should have varying widths for text placeholders', () => {
      const { container } = render(<AssetCardSkeleton />);
      const widths = ['w-16', 'w-24', 'w-20'];
      widths.forEach((width) => {
        expect(container.querySelector(`.${width}`)).toBeInTheDocument();
      });
    });
  });

  describe('Styling', () => {
    it('should apply dark theme styling', () => {
      const { container } = render(<AssetCardSkeleton />);
      expect(container.firstChild).toHaveClass('bg-neutral-900/50', 'border-neutral-800');
    });

    it('should apply border styling', () => {
      const { container } = render(<AssetCardSkeleton />);
      expect(container.firstChild).toHaveClass('border');
    });
  });
});

describe('AssetTableRowSkeleton', () => {
  // Helper to render in table context
  const renderInTable = () => {
    return render(
      <table>
        <tbody>
          <AssetTableRowSkeleton />
        </tbody>
      </table>
    );
  };

  describe('Rendering', () => {
    it('should render a table row', () => {
      const { container } = renderInTable();
      expect(container.querySelector('tr')).toBeInTheDocument();
    });

    it('should apply pulse animation', () => {
      const { container } = renderInTable();
      expect(container.querySelector('tr')).toHaveClass('animate-pulse');
    });

    it('should render 5 table cells', () => {
      const { container } = renderInTable();
      expect(container.querySelectorAll('td').length).toBe(5);
    });
  });

  describe('Skeleton Elements', () => {
    it('should render avatar placeholder in first cell', () => {
      const { container } = renderInTable();
      const firstCell = container.querySelector('td');
      expect(firstCell?.querySelector('.rounded-full')).toBeInTheDocument();
    });

    it('should render placeholder bars in all cells', () => {
      const { container } = renderInTable();
      container.querySelectorAll('td').forEach((cell) => {
        expect(cell.querySelector('.bg-neutral-800')).toBeInTheDocument();
      });
    });

    it('should have varying heights for different content types', () => {
      const { container } = renderInTable();
      expect(container.querySelector('.h-5')).toBeInTheDocument();
      expect(container.querySelector('.h-4')).toBeInTheDocument();
      expect(container.querySelector('.h-3')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply border styling to row', () => {
      const { container } = renderInTable();
      expect(container.querySelector('tr')).toHaveClass('border-b', 'border-neutral-800/50');
    });

    it('should apply padding to cells', () => {
      const { container } = renderInTable();
      container.querySelectorAll('td').forEach((cell) => {
        expect(cell).toHaveClass('py-4', 'px-4');
      });
    });
  });

  describe('Layout', () => {
    it('should have flex layout in first cell', () => {
      const { container } = renderInTable();
      const firstCell = container.querySelector('td');
      expect(firstCell?.querySelector('.flex')).toBeInTheDocument();
    });

    it('should have gap between avatar and text', () => {
      const { container } = renderInTable();
      const flexContainer = container.querySelector('.flex.items-center');
      expect(flexContainer).toHaveClass('gap-3');
    });
  });
});
