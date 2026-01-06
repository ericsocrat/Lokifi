/**
 * @vitest-environment jsdom
 */
/**
 * ChartSidebar Tests
 *
 * Tests for the chart drawing tools sidebar component covering:
 * - Toggle open/close functionality
 * - Tool selection (cursor, trendline, hline, rect)
 * - Snap to OHLC toggle
 * - Undo/Redo buttons
 * - Plugin tools (when experimental flag enabled)
 * - Selection actions (delete selected)
 * - Clear all functionality
 * - Overlay click to close
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Use vi.hoisted to define mock state that can be modified in tests
// This gets hoisted along with vi.mock calls
const { mockState, mockPluginState, mockFns } = vi.hoisted(() => ({
  mockState: {
    tool: 'cursor' as 'cursor' | 'trendline' | 'hline' | 'rect',
    snap: false,
    selectedIds: [] as string[],
  },
  mockPluginState: {
    activeToolId: null as string | null,
  },
  mockFns: {
    setTool: vi.fn(),
    setSnap: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    removeSelected: vi.fn(),
    clear: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
    setActiveTool: vi.fn(),
  },
}));

// Mock the feature flags
vi.mock('@/constants/flags', () => ({
  EXPERIMENTAL_PLUGINS: true,
}));

// Mock the drawStore
vi.mock('@/stores/drawStore', () => ({
  drawStore: {
    get: () => mockState,
    subscribe: mockFns.subscribe,
    setTool: mockFns.setTool,
    setSnap: mockFns.setSnap,
    undo: mockFns.undo,
    redo: mockFns.redo,
    removeSelected: mockFns.removeSelected,
    clear: mockFns.clear,
  },
}));

// Mock the plugin manager
vi.mock('plugins/registry', () => ({
  pluginManager: {
    get activeToolId() {
      return mockPluginState.activeToolId;
    },
    setActiveTool: mockFns.setActiveTool,
  },
}));

// Import component after mocks
import ChartSidebar from '../../components/ChartSidebar';

describe('ChartSidebar', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset state before each test
    mockState.tool = 'cursor';
    mockState.snap = false;
    mockState.selectedIds = [];
    mockPluginState.activeToolId = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Toggle Functionality', () => {
    it('should render toggle button when sidebar is closed', () => {
      render(<ChartSidebar />);

      const toggleButton = screen.getByTitle('Open Toolbar');
      expect(toggleButton).toBeInTheDocument();
    });

    it('should open sidebar when toggle button is clicked', async () => {
      render(<ChartSidebar />);

      const toggleButton = screen.getByTitle('Open Toolbar');
      await user.click(toggleButton);

      // After opening, the button title changes
      expect(screen.getByTitle('Close Toolbar')).toBeInTheDocument();
    });

    it('should close sidebar when close button is clicked', async () => {
      render(<ChartSidebar />);

      // Open first
      await user.click(screen.getByTitle('Open Toolbar'));

      // Then close
      await user.click(screen.getByTitle('Close Toolbar'));

      expect(screen.getByTitle('Open Toolbar')).toBeInTheDocument();
    });

    it('should close sidebar when overlay is clicked', async () => {
      render(<ChartSidebar />);

      // Open sidebar
      await user.click(screen.getByTitle('Open Toolbar'));

      // Find and click the overlay (bg-black/20 div)
      const overlay = document.querySelector('.bg-black\\/20');
      expect(overlay).toBeInTheDocument();

      fireEvent.click(overlay!);

      await waitFor(() => {
        expect(screen.getByTitle('Open Toolbar')).toBeInTheDocument();
      });
    });
  });

  describe('Tool Selection', () => {
    it('should render all basic tools', async () => {
      render(<ChartSidebar />);

      // Open sidebar
      await user.click(screen.getByTitle('Open Toolbar'));

      expect(screen.getByText('Cursor')).toBeInTheDocument();
      expect(screen.getByText('Trendline')).toBeInTheDocument();
      expect(screen.getByText('HLine')).toBeInTheDocument();
      expect(screen.getByText('Rectangle')).toBeInTheDocument();
    });

    it('should show keyboard shortcuts for tools', async () => {
      render(<ChartSidebar />);
      await user.click(screen.getByTitle('Open Toolbar'));

      expect(screen.getByText('V')).toBeInTheDocument(); // Cursor
      expect(screen.getByText('T')).toBeInTheDocument(); // Trendline
      expect(screen.getByText('H')).toBeInTheDocument(); // HLine
      expect(screen.getByText('M')).toBeInTheDocument(); // Rectangle
    });

    it('should call setTool when a tool is clicked', async () => {
      render(<ChartSidebar />);
      await user.click(screen.getByTitle('Open Toolbar'));

      const trendlineButton = screen.getByText('Trendline').closest('button');
      await user.click(trendlineButton!);

      expect(mockFns.setTool).toHaveBeenCalledWith('trendline');
    });

    it('should highlight the active tool', async () => {
      mockState.tool = 'trendline';
      render(<ChartSidebar />);
      await user.click(screen.getByTitle('Open Toolbar'));

      const trendlineButton = screen.getByText('Trendline').closest('button');
      expect(trendlineButton).toHaveClass('bg-electric/30');
    });

    it('should call setTool for all tool types', async () => {
      render(<ChartSidebar />);
      await user.click(screen.getByTitle('Open Toolbar'));

      // Test each tool
      for (const toolName of ['Cursor', 'Trendline', 'HLine', 'Rectangle']) {
        const button = screen.getByText(toolName).closest('button');
        await user.click(button!);
      }

      expect(mockFns.setTool).toHaveBeenCalledWith('cursor');
      expect(mockFns.setTool).toHaveBeenCalledWith('trendline');
      expect(mockFns.setTool).toHaveBeenCalledWith('hline');
      expect(mockFns.setTool).toHaveBeenCalledWith('rect');
    });
  });

  describe('Snap Toggle', () => {
    it('should render snap checkbox', async () => {
      render(<ChartSidebar />);
      await user.click(screen.getByTitle('Open Toolbar'));

      expect(screen.getByText('Snap to OHLC')).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('should reflect snap state from store', async () => {
      mockState.snap = true;
      render(<ChartSidebar />);
      await user.click(screen.getByTitle('Open Toolbar'));

      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('should call setSnap when checkbox is toggled', async () => {
      render(<ChartSidebar />);
      await user.click(screen.getByTitle('Open Toolbar'));

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(mockFns.setSnap).toHaveBeenCalledWith(true);
    });
  });

  describe('Undo/Redo Actions', () => {
    it('should render undo and redo buttons', async () => {
      render(<ChartSidebar />);
      await user.click(screen.getByTitle('Open Toolbar'));

      expect(screen.getByText('Undo')).toBeInTheDocument();
      expect(screen.getByText('Redo')).toBeInTheDocument();
    });

    it('should call undo when Undo button is clicked', async () => {
      render(<ChartSidebar />);
      await user.click(screen.getByTitle('Open Toolbar'));

      await user.click(screen.getByText('Undo'));

      expect(mockFns.undo).toHaveBeenCalled();
    });

    it('should call redo when Redo button is clicked', async () => {
      render(<ChartSidebar />);
      await user.click(screen.getByTitle('Open Toolbar'));

      await user.click(screen.getByText('Redo'));

      expect(mockFns.redo).toHaveBeenCalled();
    });
  });

  describe('Plugin Tools', () => {
    it('should render plugin tools section', async () => {
      render(<ChartSidebar />);
      await user.click(screen.getByTitle('Open Toolbar'));

      expect(screen.getByText('Plugins')).toBeInTheDocument();
    });

    it('should render all plugin tools', async () => {
      render(<ChartSidebar />);
      await user.click(screen.getByTitle('Open Toolbar'));

      expect(screen.getByText('Ruler')).toBeInTheDocument();
      expect(screen.getByText('Channel')).toBeInTheDocument();
      expect(screen.getByText('Channel 3pt')).toBeInTheDocument();
      expect(screen.getByText('Fib+')).toBeInTheDocument();
    });

    it('should show plugin shortcuts', async () => {
      render(<ChartSidebar />);
      await user.click(screen.getByTitle('Open Toolbar'));

      expect(screen.getByText('R')).toBeInTheDocument(); // Ruler
      expect(screen.getByText('C')).toBeInTheDocument(); // Channel
      expect(screen.getByText('Shift+C')).toBeInTheDocument(); // Channel 3pt
      expect(screen.getByText('F')).toBeInTheDocument(); // Fib+
    });

    it('should call setActiveTool when plugin is clicked', async () => {
      render(<ChartSidebar />);
      await user.click(screen.getByTitle('Open Toolbar'));

      const rulerButton = screen.getByText('Ruler').closest('button');
      await user.click(rulerButton!);

      expect(mockFns.setActiveTool).toHaveBeenCalledWith('ruler-measure');
    });

    it('should highlight active plugin', async () => {
      mockPluginState.activeToolId = 'ruler-measure';
      render(<ChartSidebar />);
      await user.click(screen.getByTitle('Open Toolbar'));

      const rulerButton = screen.getByText('Ruler').closest('button');
      expect(rulerButton).toHaveClass('bg-electric/30');
    });
  });

  describe('Selection Actions', () => {
    it('should not show selection actions when nothing is selected', async () => {
      mockState.selectedIds = [];
      render(<ChartSidebar />);
      await user.click(screen.getByTitle('Open Toolbar'));

      expect(screen.queryByText('selected')).not.toBeInTheDocument();
    });

    it('should show selection count when items are selected', async () => {
      mockState.selectedIds = ['id1', 'id2', 'id3'];
      render(<ChartSidebar />);
      await user.click(screen.getByTitle('Open Toolbar'));

      expect(screen.getByText('3 selected')).toBeInTheDocument();
    });

    it('should show delete button when items are selected', async () => {
      mockState.selectedIds = ['id1'];
      render(<ChartSidebar />);
      await user.click(screen.getByTitle('Open Toolbar'));

      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should call removeSelected when Delete is clicked', async () => {
      mockState.selectedIds = ['id1', 'id2'];
      render(<ChartSidebar />);
      await user.click(screen.getByTitle('Open Toolbar'));

      await user.click(screen.getByText('Delete'));

      expect(mockFns.removeSelected).toHaveBeenCalled();
    });

    it('should update selection count reactively', async () => {
      mockState.selectedIds = ['id1'];
      render(<ChartSidebar />);
      await user.click(screen.getByTitle('Open Toolbar'));

      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });
  });

  describe('Clear All', () => {
    it('should render Clear All button', async () => {
      render(<ChartSidebar />);
      await user.click(screen.getByTitle('Open Toolbar'));

      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    it('should have warning styling on Clear All button', async () => {
      render(<ChartSidebar />);
      await user.click(screen.getByTitle('Open Toolbar'));

      const clearButton = screen.getByText('Clear All');
      expect(clearButton).toHaveClass('text-rose-300');
      expect(clearButton).toHaveClass('border-rose-700');
    });

    it('should call clear when Clear All is clicked', async () => {
      render(<ChartSidebar />);
      await user.click(screen.getByTitle('Open Toolbar'));

      await user.click(screen.getByText('Clear All'));

      expect(mockFns.clear).toHaveBeenCalled();
    });
  });

  describe('Section Headers', () => {
    it('should render Tools section header', async () => {
      render(<ChartSidebar />);
      await user.click(screen.getByTitle('Open Toolbar'));

      expect(screen.getByText('Tools')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button roles', async () => {
      render(<ChartSidebar />);
      await user.click(screen.getByTitle('Open Toolbar'));

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should have title attributes on tool buttons', async () => {
      render(<ChartSidebar />);
      await user.click(screen.getByTitle('Open Toolbar'));

      // Check that tool buttons have title attributes
      const cursorButton = screen.getByTitle('Cursor (V)');
      expect(cursorButton).toBeInTheDocument();

      const trendlineButton = screen.getByTitle('Trendline (T)');
      expect(trendlineButton).toBeInTheDocument();
    });

    it('should have accessible checkbox for snap toggle', async () => {
      render(<ChartSidebar />);
      await user.click(screen.getByTitle('Open Toolbar'));

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('type', 'checkbox');
    });
  });

  describe('Store Subscription', () => {
    it('should subscribe to store on mount', () => {
      render(<ChartSidebar />);

      expect(mockFns.subscribe).toHaveBeenCalled();
    });
  });
});
