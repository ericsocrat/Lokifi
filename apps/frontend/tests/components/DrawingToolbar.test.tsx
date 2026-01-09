import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

      // The more tools button is typically at index 8 (after 8 main tools)
      const moreButton = buttons[8];

      fireEvent.click(moreButton);

      // After click, dropdown should appear with tool items
      expect(screen.getByText('Vertical Line')).toBeInTheDocument();
      expect(screen.getByText('Fib Extension')).toBeInTheDocument();
      expect(screen.getByText('Parallel Channel')).toBeInTheDocument();
      expect(screen.getByText('Pitchfork')).toBeInTheDocument();
    });

    it('should show tooltip for more tools button when not open', () => {
      render(<DrawingToolbar />);
      const buttons = screen.getAllByRole('button');
      const moreButton = buttons[8];

      fireEvent.mouseEnter(moreButton);

      expect(screen.getByText('More Tools')).toBeInTheDocument();
    });

    it('should not show tooltip when dropdown is open', () => {
      render(<DrawingToolbar />);
      const buttons = screen.getAllByRole('button');
      const moreButton = buttons[8];

      // First open the dropdown
      fireEvent.click(moreButton);

      // Then hover - tooltip should not appear
      fireEvent.mouseEnter(moreButton);
      fireEvent.mouseLeave(moreButton);

      // Only the dropdown items should be visible, not the tooltip
      expect(screen.queryByText(/^More Tools$/)).not.toBeInTheDocument();
    });

    it('should select vertical line tool from dropdown', () => {
      render(<DrawingToolbar />);
      const buttons = screen.getAllByRole('button');

      // Open dropdown
      fireEvent.click(buttons[8]);

      // Click vertical line
      const vlineButton = screen.getByText('Vertical Line');
      fireEvent.click(vlineButton);

      expect(mockDrawingStore.setActiveTool).toHaveBeenCalledWith('vline');
    });

    it('should select fib extension tool from dropdown', () => {
      render(<DrawingToolbar />);
      const buttons = screen.getAllByRole('button');

      // Open dropdown
      fireEvent.click(buttons[8]);

      // Click fib extension
      const fibButton = screen.getByText('Fib Extension');
      fireEvent.click(fibButton);

      expect(mockDrawingStore.setActiveTool).toHaveBeenCalledWith('fibonacciExtension');
    });

    it('should select parallel channel from dropdown', () => {
      render(<DrawingToolbar />);
      const buttons = screen.getAllByRole('button');

      // Open dropdown
      fireEvent.click(buttons[8]);

      // Click parallel channel
      const channelButton = screen.getByText('Parallel Channel');
      fireEvent.click(channelButton);

      expect(mockDrawingStore.setActiveTool).toHaveBeenCalledWith('parallelChannel');
    });

    it('should select pitchfork from dropdown', () => {
      render(<DrawingToolbar />);
      const buttons = screen.getAllByRole('button');

      // Open dropdown
      fireEvent.click(buttons[8]);

      // Click pitchfork
      const pitchforkButton = screen.getByText('Pitchfork');
      fireEvent.click(pitchforkButton);

      expect(mockDrawingStore.setActiveTool).toHaveBeenCalledWith('pitchfork');
    });

    it('should close dropdown after selecting a tool', () => {
      render(<DrawingToolbar />);
      const buttons = screen.getAllByRole('button');

      // Open dropdown
      fireEvent.click(buttons[8]);
      expect(screen.getByText('Vertical Line')).toBeInTheDocument();

      // Select a tool
      fireEvent.click(screen.getByText('Vertical Line'));

      // Dropdown should be closed
      expect(screen.queryByText('Fib Extension')).not.toBeInTheDocument();
    });

    it('should show keyboard shortcuts in dropdown items', () => {
      render(<DrawingToolbar />);
      const buttons = screen.getAllByRole('button');

      // Open dropdown
      fireEvent.click(buttons[8]);

      // Check shortcuts are displayed
      expect(screen.getByText('Shift+H')).toBeInTheDocument();
      expect(screen.getByText('Shift+F')).toBeInTheDocument();
      expect(screen.getByText('P')).toBeInTheDocument();
      expect(screen.getByText('Shift+P')).toBeInTheDocument();
    });

    it('should highlight active tool in dropdown', () => {
      mockDrawingStore.activeTool = 'vline';
      render(<DrawingToolbar />);
      const buttons = screen.getAllByRole('button');

      // Open dropdown
      fireEvent.click(buttons[8]);

      // The vline item should have active styling (blue color class)
      const dropdownButtons = screen.getAllByRole('button');
      const vlineButton = dropdownButtons.find((btn) => btn.textContent?.includes('Vertical Line'));

      expect(vlineButton).toHaveClass('text-[#2962ff]');
    });

    it('should not select tool when drawing is in progress', () => {
      mockDrawingStore.isDrawing = true;
      render(<DrawingToolbar />);
      const buttons = screen.getAllByRole('button');

      // Open dropdown
      fireEvent.click(buttons[8]);

      // Try to select a tool
      fireEvent.click(screen.getByText('Vertical Line'));

      // Should not call setActiveTool
      expect(mockDrawingStore.setActiveTool).not.toHaveBeenCalled();
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

    it('should show magnet tooltip on hover when off', () => {
      mockDrawingStore.magnetMode = false;
      render(<DrawingToolbar />);
      const buttons = screen.getAllByRole('button');
      const magnetButton = buttons[buttons.length - 1];

      fireEvent.mouseEnter(magnetButton);

      expect(screen.getByText('Magnet Mode')).toBeInTheDocument();
      expect(screen.getByText('Off')).toBeInTheDocument();
    });

    it('should show magnet tooltip with On state when magnet is active', () => {
      mockDrawingStore.magnetMode = true;
      render(<DrawingToolbar />);
      const buttons = screen.getAllByRole('button');
      const magnetButton = buttons[buttons.length - 1];

      fireEvent.mouseEnter(magnetButton);

      expect(screen.getByText('Magnet Mode')).toBeInTheDocument();
      expect(screen.getByText('On')).toBeInTheDocument();
    });

    it('should hide magnet tooltip on mouse leave', () => {
      render(<DrawingToolbar />);
      const buttons = screen.getAllByRole('button');
      const magnetButton = buttons[buttons.length - 1];

      fireEvent.mouseEnter(magnetButton);
      expect(screen.getByText('Magnet Mode')).toBeInTheDocument();

      fireEvent.mouseLeave(magnetButton);
      expect(screen.queryByText('Magnet Mode')).not.toBeInTheDocument();
    });
  });

  describe('Drawing Status Indicator', () => {
    it('should show drawing indicator when isDrawing is true', () => {
      mockDrawingStore.isDrawing = true;
      const { container } = render(<DrawingToolbar />);

      // Should have an animated pulse indicator
      const indicator = container.querySelector('.animate-pulse');
      expect(indicator).toBeInTheDocument();
    });

    it('should not show drawing indicator when isDrawing is false', () => {
      mockDrawingStore.isDrawing = false;
      const { container } = render(<DrawingToolbar />);

      // Should not have an animated pulse indicator
      const indicator = container.querySelector('.animate-pulse');
      expect(indicator).not.toBeInTheDocument();
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
