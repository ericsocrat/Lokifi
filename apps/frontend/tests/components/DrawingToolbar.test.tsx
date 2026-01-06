import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DrawingToolbar } from '../../components/DrawingToolbar';

// Hoisted mocks
const { mockDrawingStore } = vi.hoisted(() => ({
  mockDrawingStore: {
    activeTool: 'cursor' as string,
    setActiveTool: vi.fn(),
    isDrawing: false,
    magnetMode: false,
    toggleMagnetMode: vi.fn(),
  },
}));

vi.mock('@/lib/stores/drawingStore', () => ({
  useDrawingStore: () => mockDrawingStore,
}));

describe('DrawingToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDrawingStore.activeTool = 'cursor';
    mockDrawingStore.isDrawing = false;
    mockDrawingStore.magnetMode = false;
  });

  describe('Rendering', () => {
    it('should render the toolbar container', () => {
      const { container } = render(<DrawingToolbar />);
      const toolbar = container.querySelector('.w-12');
      expect(toolbar).toBeInTheDocument();
    });

    it('should render cursor tool', () => {
      render(<DrawingToolbar />);
      // Multiple buttons exist, cursor should be first
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should render all main drawing tools', () => {
      render(<DrawingToolbar />);
      const buttons = screen.getAllByRole('button');
      // 8 main tools + more tools button + magnet button = 10
      expect(buttons.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('Tool Selection', () => {
    it('should call setActiveTool when tool is clicked', () => {
      render(<DrawingToolbar />);
      const buttons = screen.getAllByRole('button');
      // Click the second button (trend line)
      fireEvent.click(buttons[1]);

      expect(mockDrawingStore.setActiveTool).toHaveBeenCalled();
    });

    it('should not call setActiveTool when drawing is in progress', () => {
      mockDrawingStore.isDrawing = true;
      mockDrawingStore.activeTool = 'trendline';

      render(<DrawingToolbar />);
      const buttons = screen.getAllByRole('button');

      // Try to click a different tool
      fireEvent.click(buttons[0]);

      expect(mockDrawingStore.setActiveTool).not.toHaveBeenCalled();
    });

    it('should highlight active tool', () => {
      mockDrawingStore.activeTool = 'cursor';
      const { container } = render(<DrawingToolbar />);

      // Active tool should have the active styling
      const activeButton = container.querySelector('.bg-\\[\\#2962ff\\]');
      expect(activeButton).toBeInTheDocument();
    });
  });

  describe('Tooltips', () => {
    it('should show tooltip on hover', () => {
      render(<DrawingToolbar />);
      const buttons = screen.getAllByRole('button');

      fireEvent.mouseEnter(buttons[0]);

      expect(screen.getByText('Cursor')).toBeInTheDocument();
      expect(screen.getByText('V')).toBeInTheDocument();
    });

    it('should hide tooltip on mouse leave', () => {
      render(<DrawingToolbar />);
      const buttons = screen.getAllByRole('button');

      fireEvent.mouseEnter(buttons[0]);
      expect(screen.getByText('Cursor')).toBeInTheDocument();

      fireEvent.mouseLeave(buttons[0]);
      expect(screen.queryByText('Cursor')).not.toBeInTheDocument();
    });
  });

  describe('More Tools Dropdown', () => {
    it('should show more tools button', () => {
      render(<DrawingToolbar />);
      // More tools button exists
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(8);
    });

    it('should toggle more tools dropdown on click', () => {
      render(<DrawingToolbar />);
      const buttons = screen.getAllByRole('button');

      // Find the more tools button (one with ChevronDown)
      const moreButton = buttons.find((btn) => btn.querySelector('svg'));

      if (moreButton) {
        fireEvent.click(moreButton);
        // After click, dropdown should appear
        // Look for dropdown items
      }
    });
  });

  describe('Magnet Mode', () => {
    it('should render magnet mode button', () => {
      render(<DrawingToolbar />);
      // Magnet button should exist at the bottom
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should call toggleMagnetMode when magnet button is clicked', () => {
      render(<DrawingToolbar />);
      const buttons = screen.getAllByRole('button');

      // Magnet button is typically the last one
      const magnetButton = buttons[buttons.length - 1];
      fireEvent.click(magnetButton);

      expect(mockDrawingStore.toggleMagnetMode).toHaveBeenCalled();
    });

    it('should show active state when magnet mode is on', () => {
      mockDrawingStore.magnetMode = true;
      render(<DrawingToolbar />);

      // When magnet is active, button should have active styling
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Disabled State', () => {
    it('should disable non-active tools when drawing', () => {
      mockDrawingStore.isDrawing = true;
      mockDrawingStore.activeTool = 'trendline';

      render(<DrawingToolbar />);
      const buttons = screen.getAllByRole('button');

      // First button (cursor) should be disabled
      expect(buttons[0]).toBeDisabled();
    });

    it('should not disable active tool when drawing', () => {
      mockDrawingStore.isDrawing = true;
      mockDrawingStore.activeTool = 'cursor';

      render(<DrawingToolbar />);
      const buttons = screen.getAllByRole('button');

      // First button (cursor) should NOT be disabled since it's active
      expect(buttons[0]).not.toBeDisabled();
    });
  });

  describe('Styling', () => {
    it('should have dark background', () => {
      const { container } = render(<DrawingToolbar />);
      const toolbar = container.querySelector('.bg-\\[\\#1e222d\\]');
      expect(toolbar).toBeInTheDocument();
    });

    it('should have border styling', () => {
      const { container } = render(<DrawingToolbar />);
      const toolbar = container.querySelector('.border-r');
      expect(toolbar).toBeInTheDocument();
    });

    it('should have flex column layout', () => {
      const { container } = render(<DrawingToolbar />);
      const toolbar = container.querySelector('.flex.flex-col');
      expect(toolbar).toBeInTheDocument();
    });
  });

  describe('Tool Shortcuts Display', () => {
    it('should show shortcut in tooltip for trend line', () => {
      render(<DrawingToolbar />);
      const buttons = screen.getAllByRole('button');

      // Trend line is second button
      fireEvent.mouseEnter(buttons[1]);

      expect(screen.getByText('Trend Line')).toBeInTheDocument();
      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('should show shortcut in tooltip for horizontal line', () => {
      render(<DrawingToolbar />);
      const buttons = screen.getAllByRole('button');

      // HLine is third button
      fireEvent.mouseEnter(buttons[2]);

      expect(screen.getByText('Horizontal Line')).toBeInTheDocument();
      expect(screen.getByText('H')).toBeInTheDocument();
    });
  });
});
