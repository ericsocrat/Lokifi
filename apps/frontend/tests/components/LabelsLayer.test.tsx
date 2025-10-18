import LabelsLayer from '@/components/LabelsLayer';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock describeDrawing utility
const mockDescribeDrawing = vi.fn();
vi.mock('@/lib/utils/labels', () => ({
  describeDrawing: (...args: any[]) => mockDescribeDrawing(...args),
}));

// Mock chart store
const mockStoreState = {
  drawings: [] as any[],
  layers: [] as any[],
  autoLabels: {
    showValue: true,
    showPercent: true,
    showAngle: true,
    showRR: true,
    enabled: true,
  } as any,
};

const mockSubscribe = vi.fn();

vi.mock('@/state/store', () => ({
  useChartStore: Object.assign(() => mockStoreState, {
    subscribe: (...args: any[]) => mockSubscribe(...args),
  }),
}));

describe('LabelsLayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock state
    mockStoreState.drawings = [];
    mockStoreState.layers = [];
    mockStoreState.autoLabels = {
      showValue: true,
      showPercent: true,
      showAngle: true,
      showRR: true,
      enabled: true,
    };

    // Default: describeDrawing returns null
    mockDescribeDrawing.mockReturnValue(null);

    // Subscribe mock returns an unsubscribe function
    mockSubscribe.mockReturnValue(() => {});
  });

  describe('Initial Rendering', () => {
    it('should render container when enabled', () => {
      const { container } = render(<LabelsLayer />);

      // Should render the main container
      const labelsContainer = container.querySelector('.pointer-events-none');
      expect(labelsContainer).toBeInTheDocument();
    });

    it('should render nothing when autoLabels is disabled', () => {
      mockStoreState.autoLabels.enabled = false;
      const { container } = render(<LabelsLayer />);

      // Should return null, no container rendered
      expect(container.firstChild).toBeNull();
    });

    it('should subscribe to store changes on mount', () => {
      render(<LabelsLayer />);

      // Should subscribe to store
      expect(mockSubscribe).toHaveBeenCalled();
    });

    it('should handle missing autoLabels config', () => {
      mockStoreState.autoLabels = null as any;
      const { container } = render(<LabelsLayer />);

      // Should still render with default config
      const labelsContainer = container.querySelector('.pointer-events-none');
      expect(labelsContainer).toBeInTheDocument();
    });
  });

  describe('Drawing Labels', () => {
    it('should render label for a drawing with info', () => {
      mockStoreState.drawings = [{ id: 'drawing-1', layerId: 'layer-1' }];
      mockStoreState.layers = [{ id: 'layer-1', visible: true, opacity: 1 }];

      mockDescribeDrawing.mockReturnValue({
        anchor: { x: 100, y: 200 },
        text: 'Test Label',
      });

      render(<LabelsLayer />);

      expect(screen.getByText('Test Label')).toBeInTheDocument();
    });

    it('should render multiple labels for multiple drawings', () => {
      mockStoreState.drawings = [
        { id: 'drawing-1', layerId: 'layer-1' },
        { id: 'drawing-2', layerId: 'layer-1' },
      ];
      mockStoreState.layers = [{ id: 'layer-1', visible: true, opacity: 1 }];

      let callCount = 0;
      mockDescribeDrawing.mockImplementation(() => {
        callCount++;
        return {
          anchor: { x: 100 * callCount, y: 200 * callCount },
          text: `Label ${callCount}`,
        };
      });

      render(<LabelsLayer />);

      expect(screen.getByText('Label 1')).toBeInTheDocument();
      expect(screen.getByText('Label 2')).toBeInTheDocument();
    });

    it('should position labels correctly based on anchor', () => {
      mockStoreState.drawings = [{ id: 'drawing-1', layerId: 'layer-1' }];
      mockStoreState.layers = [{ id: 'layer-1', visible: true, opacity: 1 }];

      mockDescribeDrawing.mockReturnValue({
        anchor: { x: 150, y: 250 },
        text: 'Positioned Label',
      });

      const { container } = render(<LabelsLayer />);

      const label = container.querySelector('[style*="left"]');
      expect(label).toHaveStyle({
        left: '158px', // x + 8
        top: '242px', // y - 8
        transform: 'translateY(-100%)',
      });
    });

    it('should not render label when describeDrawing returns null', () => {
      mockStoreState.drawings = [{ id: 'drawing-1', layerId: 'layer-1' }];
      mockStoreState.layers = [{ id: 'layer-1', visible: true, opacity: 1 }];

      mockDescribeDrawing.mockReturnValue(null);

      const { container } = render(<LabelsLayer />);

      // Should not render any labels
      const labels = container.querySelectorAll('[key*="lab-"]');
      expect(labels.length).toBe(0);
    });

    it('should pass autoLabels config to describeDrawing', () => {
      mockStoreState.drawings = [{ id: 'drawing-1', layerId: 'layer-1' }];
      mockStoreState.layers = [{ id: 'layer-1', visible: true, opacity: 1 }];
      mockStoreState.autoLabels = {
        showValue: false,
        showPercent: true,
        showAngle: false,
        showRR: true,
        enabled: true,
      };

      mockDescribeDrawing.mockReturnValue({
        anchor: { x: 100, y: 200 },
        text: 'Test',
      });

      render(<LabelsLayer />);

      expect(mockDescribeDrawing).toHaveBeenCalledWith(
        mockStoreState.drawings[0],
        mockStoreState.autoLabels
      );
    });
  });

  describe('Layer Visibility', () => {
    it('should not render label when layer is not visible', () => {
      mockStoreState.drawings = [{ id: 'drawing-1', layerId: 'layer-1' }];
      mockStoreState.layers = [{ id: 'layer-1', visible: false, opacity: 1 }];

      mockDescribeDrawing.mockReturnValue({
        anchor: { x: 100, y: 200 },
        text: 'Hidden Label',
      });

      render(<LabelsLayer />);

      expect(screen.queryByText('Hidden Label')).not.toBeInTheDocument();
    });

    it('should not render label when layer opacity is 0', () => {
      mockStoreState.drawings = [{ id: 'drawing-1', layerId: 'layer-1' }];
      mockStoreState.layers = [{ id: 'layer-1', visible: true, opacity: 0 }];

      mockDescribeDrawing.mockReturnValue({
        anchor: { x: 100, y: 200 },
        text: 'Transparent Label',
      });

      render(<LabelsLayer />);

      expect(screen.queryByText('Transparent Label')).not.toBeInTheDocument();
    });

    it('should render label when layer is visible with opacity > 0', () => {
      mockStoreState.drawings = [{ id: 'drawing-1', layerId: 'layer-1' }];
      mockStoreState.layers = [{ id: 'layer-1', visible: true, opacity: 0.5 }];

      mockDescribeDrawing.mockReturnValue({
        anchor: { x: 100, y: 200 },
        text: 'Visible Label',
      });

      render(<LabelsLayer />);

      expect(screen.getByText('Visible Label')).toBeInTheDocument();
    });

    it('should default to visible when layer is not found', () => {
      mockStoreState.drawings = [{ id: 'drawing-1', layerId: 'nonexistent-layer' }];
      mockStoreState.layers = [];

      mockDescribeDrawing.mockReturnValue({
        anchor: { x: 100, y: 200 },
        text: 'Default Visible Label',
      });

      render(<LabelsLayer />);

      expect(screen.getByText('Default Visible Label')).toBeInTheDocument();
    });

    it('should handle layer without opacity property', () => {
      mockStoreState.drawings = [{ id: 'drawing-1', layerId: 'layer-1' }];
      mockStoreState.layers = [
        { id: 'layer-1', visible: true }, // No opacity property
      ];

      mockDescribeDrawing.mockReturnValue({
        anchor: { x: 100, y: 200 },
        text: 'No Opacity Label',
      });

      render(<LabelsLayer />);

      // Should default to opacity: 1 and render
      expect(screen.getByText('No Opacity Label')).toBeInTheDocument();
    });
  });

  describe('Styling and Classes', () => {
    it('should apply correct CSS classes to container', () => {
      const { container } = render(<LabelsLayer />);

      const labelsContainer = container.firstChild;
      expect(labelsContainer).toHaveClass('pointer-events-none');
      expect(labelsContainer).toHaveClass('absolute');
      expect(labelsContainer).toHaveClass('inset-0');
      expect(labelsContainer).toHaveClass('select-none');
    });

    it('should apply correct CSS classes to labels', () => {
      mockStoreState.drawings = [{ id: 'drawing-1', layerId: 'layer-1' }];
      mockStoreState.layers = [{ id: 'layer-1', visible: true, opacity: 1 }];

      mockDescribeDrawing.mockReturnValue({
        anchor: { x: 100, y: 200 },
        text: 'Styled Label',
      });

      const { container } = render(<LabelsLayer />);

      const label = screen.getByText('Styled Label');
      expect(label).toHaveClass('text-[11px]');
      expect(label).toHaveClass('leading-none');
      expect(label).toHaveClass('px-2');
      expect(label).toHaveClass('py-1');
      expect(label).toHaveClass('rounded');
      expect(label).toHaveClass('bg-black/70');
      expect(label).toHaveClass('border');
      expect(label).toHaveClass('border-white/10');
      expect(label).toHaveClass('text-white/90');
    });

    it('should have absolute positioning on labels', () => {
      mockStoreState.drawings = [{ id: 'drawing-1', layerId: 'layer-1' }];
      mockStoreState.layers = [{ id: 'layer-1', visible: true, opacity: 1 }];

      mockDescribeDrawing.mockReturnValue({
        anchor: { x: 100, y: 200 },
        text: 'Absolute Label',
      });

      const { container } = render(<LabelsLayer />);

      const label = screen.getByText('Absolute Label');
      expect(label).toHaveStyle({ position: 'absolute' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty drawings array', () => {
      mockStoreState.drawings = [];

      const { container } = render(<LabelsLayer />);

      const labelsContainer = container.firstChild;
      expect(labelsContainer).toBeInTheDocument();
      expect(labelsContainer?.childNodes.length).toBe(0);
    });

    it('should handle drawings without layerId', () => {
      mockStoreState.drawings = [
        { id: 'drawing-1' }, // No layerId
      ];

      mockDescribeDrawing.mockReturnValue({
        anchor: { x: 100, y: 200 },
        text: 'No Layer ID',
      });

      render(<LabelsLayer />);

      // Should default to visible and render
      expect(screen.getByText('No Layer ID')).toBeInTheDocument();
    });

    it('should generate unique keys for each label', () => {
      mockStoreState.drawings = [
        { id: 'drawing-1', layerId: 'layer-1' },
        { id: 'drawing-2', layerId: 'layer-1' },
      ];
      mockStoreState.layers = [{ id: 'layer-1', visible: true, opacity: 1 }];

      let callCount = 0;
      mockDescribeDrawing.mockImplementation(() => {
        callCount++;
        return {
          anchor: { x: 100, y: 200 },
          text: `Label ${callCount}`,
        };
      });

      const { container } = render(<LabelsLayer />);

      // Each label should have unique key (React handles this internally)
      const labels = container.querySelectorAll('.text-\\[11px\\]');
      expect(labels.length).toBe(2);
    });

    it('should handle zero coordinates', () => {
      mockStoreState.drawings = [{ id: 'drawing-1', layerId: 'layer-1' }];
      mockStoreState.layers = [{ id: 'layer-1', visible: true, opacity: 1 }];

      mockDescribeDrawing.mockReturnValue({
        anchor: { x: 0, y: 0 },
        text: 'Origin Label',
      });

      render(<LabelsLayer />);

      expect(screen.getByText('Origin Label')).toBeInTheDocument();
      expect(screen.getByText('Origin Label')).toHaveStyle({
        left: '8px', // 0 + 8
        top: '-8px', // 0 - 8
      });
    });

    it('should handle negative coordinates', () => {
      mockStoreState.drawings = [{ id: 'drawing-1', layerId: 'layer-1' }];
      mockStoreState.layers = [{ id: 'layer-1', visible: true, opacity: 1 }];

      mockDescribeDrawing.mockReturnValue({
        anchor: { x: -50, y: -100 },
        text: 'Negative Coords',
      });

      render(<LabelsLayer />);

      expect(screen.getByText('Negative Coords')).toBeInTheDocument();
      expect(screen.getByText('Negative Coords')).toHaveStyle({
        left: '-42px', // -50 + 8
        top: '-108px', // -100 - 8
      });
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe from store on unmount', () => {
      const mockUnsubscribe = vi.fn();
      mockSubscribe.mockReturnValue(mockUnsubscribe);

      const { unmount } = render(<LabelsLayer />);

      expect(mockSubscribe).toHaveBeenCalled();

      unmount();

      // Cleanup function should be called on unmount
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});
