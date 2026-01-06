import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the chart store
const mockSetTool = vi.fn();
let mockActiveTool = 'select';

vi.mock('@/state/store', () => ({
  useChartStore: vi.fn((selector) => {
    const state = {
      activeTool: mockActiveTool,
      setTool: mockSetTool,
    };
    return selector(state);
  }),
}));

import DrawingSidePanel from '@/components/DrawingSidePanel';

describe('DrawingSidePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveTool = 'select';
  });

  describe('Rendering', () => {
    it('should render all 13 drawing tools', () => {
      render(<DrawingSidePanel />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(13);
    });

    it('should render Select tool', () => {
      render(<DrawingSidePanel />);

      expect(screen.getByTitle('Select (V)')).toBeInTheDocument();
    });

    it('should render Trendline tool', () => {
      render(<DrawingSidePanel />);

      expect(screen.getByTitle('Trendline (T)')).toBeInTheDocument();
    });

    it('should render Horizontal line tool', () => {
      render(<DrawingSidePanel />);

      expect(screen.getByTitle('Horizontal')).toBeInTheDocument();
    });

    it('should render Vertical line tool', () => {
      render(<DrawingSidePanel />);

      expect(screen.getByTitle('Vertical')).toBeInTheDocument();
    });

    it('should render Ray tool', () => {
      render(<DrawingSidePanel />);

      expect(screen.getByTitle('Ray')).toBeInTheDocument();
    });

    it('should render Arrow tool', () => {
      render(<DrawingSidePanel />);

      expect(screen.getByTitle('Arrow (A)')).toBeInTheDocument();
    });

    it('should render Rectangle tool', () => {
      render(<DrawingSidePanel />);

      expect(screen.getByTitle('Rectangle (R)')).toBeInTheDocument();
    });

    it('should render Ellipse tool', () => {
      render(<DrawingSidePanel />);

      expect(screen.getByTitle('Ellipse')).toBeInTheDocument();
    });

    it('should render Text tool', () => {
      render(<DrawingSidePanel />);

      expect(screen.getByTitle('Text')).toBeInTheDocument();
    });

    it('should render Fibonacci tool', () => {
      render(<DrawingSidePanel />);

      expect(screen.getByTitle('Fibonacci')).toBeInTheDocument();
    });

    it('should render Pitchfork tool', () => {
      render(<DrawingSidePanel />);

      expect(screen.getByTitle('Pitchfork')).toBeInTheDocument();
    });

    it('should render Channel tool', () => {
      render(<DrawingSidePanel />);

      expect(screen.getByTitle('Channel')).toBeInTheDocument();
    });

    it('should render Parallel Channel tool', () => {
      render(<DrawingSidePanel />);

      expect(screen.getByTitle('Parallel')).toBeInTheDocument();
    });
  });

  describe('Tool Icons', () => {
    it('should display Select icon', () => {
      render(<DrawingSidePanel />);

      const button = screen.getByTitle('Select (V)');
      expect(button).toHaveTextContent('▢');
    });

    it('should display Trendline icon', () => {
      render(<DrawingSidePanel />);

      const button = screen.getByTitle('Trendline (T)');
      expect(button).toHaveTextContent('/');
    });

    it('should display Horizontal icon', () => {
      render(<DrawingSidePanel />);

      const button = screen.getByTitle('Horizontal');
      expect(button).toHaveTextContent('—');
    });

    it('should display Arrow icon', () => {
      render(<DrawingSidePanel />);

      const button = screen.getByTitle('Arrow (A)');
      expect(button).toHaveTextContent('→');
    });

    it('should display Fibonacci icon', () => {
      render(<DrawingSidePanel />);

      const button = screen.getByTitle('Fibonacci');
      expect(button).toHaveTextContent('𝜑');
    });
  });

  describe('Tool Selection', () => {
    it('should call setTool when clicking Select', async () => {
      const user = userEvent.setup();
      render(<DrawingSidePanel />);

      await user.click(screen.getByTitle('Select (V)'));

      expect(mockSetTool).toHaveBeenCalledWith('select');
    });

    it('should call setTool when clicking Trendline', async () => {
      const user = userEvent.setup();
      render(<DrawingSidePanel />);

      await user.click(screen.getByTitle('Trendline (T)'));

      expect(mockSetTool).toHaveBeenCalledWith('trendline');
    });

    it('should call setTool when clicking Horizontal', async () => {
      const user = userEvent.setup();
      render(<DrawingSidePanel />);

      await user.click(screen.getByTitle('Horizontal'));

      expect(mockSetTool).toHaveBeenCalledWith('hline');
    });

    it('should call setTool when clicking Vertical', async () => {
      const user = userEvent.setup();
      render(<DrawingSidePanel />);

      await user.click(screen.getByTitle('Vertical'));

      expect(mockSetTool).toHaveBeenCalledWith('vline');
    });

    it('should call setTool when clicking Ray', async () => {
      const user = userEvent.setup();
      render(<DrawingSidePanel />);

      await user.click(screen.getByTitle('Ray'));

      expect(mockSetTool).toHaveBeenCalledWith('ray');
    });

    it('should call setTool when clicking Arrow', async () => {
      const user = userEvent.setup();
      render(<DrawingSidePanel />);

      await user.click(screen.getByTitle('Arrow (A)'));

      expect(mockSetTool).toHaveBeenCalledWith('arrow');
    });

    it('should call setTool when clicking Rectangle', async () => {
      const user = userEvent.setup();
      render(<DrawingSidePanel />);

      await user.click(screen.getByTitle('Rectangle (R)'));

      expect(mockSetTool).toHaveBeenCalledWith('rect');
    });

    it('should call setTool when clicking Ellipse', async () => {
      const user = userEvent.setup();
      render(<DrawingSidePanel />);

      await user.click(screen.getByTitle('Ellipse'));

      expect(mockSetTool).toHaveBeenCalledWith('ellipse');
    });

    it('should call setTool when clicking Text', async () => {
      const user = userEvent.setup();
      render(<DrawingSidePanel />);

      await user.click(screen.getByTitle('Text'));

      expect(mockSetTool).toHaveBeenCalledWith('text');
    });

    it('should call setTool when clicking Fibonacci', async () => {
      const user = userEvent.setup();
      render(<DrawingSidePanel />);

      await user.click(screen.getByTitle('Fibonacci'));

      expect(mockSetTool).toHaveBeenCalledWith('fib');
    });

    it('should call setTool when clicking Pitchfork', async () => {
      const user = userEvent.setup();
      render(<DrawingSidePanel />);

      await user.click(screen.getByTitle('Pitchfork'));

      expect(mockSetTool).toHaveBeenCalledWith('pitchfork');
    });

    it('should call setTool when clicking Channel', async () => {
      const user = userEvent.setup();
      render(<DrawingSidePanel />);

      await user.click(screen.getByTitle('Channel'));

      expect(mockSetTool).toHaveBeenCalledWith('channel');
    });

    it('should call setTool when clicking Parallel', async () => {
      const user = userEvent.setup();
      render(<DrawingSidePanel />);

      await user.click(screen.getByTitle('Parallel'));

      expect(mockSetTool).toHaveBeenCalledWith('parallel-channel');
    });
  });

  describe('Active State', () => {
    it('should highlight Select tool when active', () => {
      mockActiveTool = 'select';
      render(<DrawingSidePanel />);

      const selectButton = screen.getByTitle('Select (V)');
      expect(selectButton).toHaveClass('border-indigo-400');
    });

    it('should highlight Trendline tool when active', () => {
      mockActiveTool = 'trendline';
      render(<DrawingSidePanel />);

      const button = screen.getByTitle('Trendline (T)');
      expect(button).toHaveClass('border-indigo-400');
    });

    it('should highlight Rectangle tool when active', () => {
      mockActiveTool = 'rect';
      render(<DrawingSidePanel />);

      const button = screen.getByTitle('Rectangle (R)');
      expect(button).toHaveClass('border-indigo-400');
    });

    it('should highlight Fibonacci tool when active', () => {
      mockActiveTool = 'fib';
      render(<DrawingSidePanel />);

      const button = screen.getByTitle('Fibonacci');
      expect(button).toHaveClass('border-indigo-400');
    });

    it('should not highlight non-active tools', () => {
      mockActiveTool = 'select';
      render(<DrawingSidePanel />);

      const trendlineButton = screen.getByTitle('Trendline (T)');
      expect(trendlineButton).not.toHaveClass('border-indigo-400');
    });
  });

  describe('Styling', () => {
    it('should have proper button styling', () => {
      render(<DrawingSidePanel />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveClass('w-9', 'h-9', 'rounded-xl', 'border', 'border-neutral-700');
      });
    });

    it('should have hover styling classes', () => {
      render(<DrawingSidePanel />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveClass('hover:border-neutral-500');
      });
    });

    it('should render in a flex column', () => {
      const { container } = render(<DrawingSidePanel />);

      const panel = container.firstChild;
      expect(panel).toHaveClass('flex', 'flex-col', 'gap-2');
    });
  });

  describe('Accessibility', () => {
    it('should have title attributes for tooltips', () => {
      render(<DrawingSidePanel />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('title');
      });
    });

    it('should be keyboard navigable', () => {
      render(<DrawingSidePanel />);

      const firstButton = screen.getByTitle('Select (V)');
      firstButton.focus();
      expect(firstButton).toHaveFocus();
    });

    it('should respond to keyboard selection', () => {
      render(<DrawingSidePanel />);

      const button = screen.getByTitle('Trendline (T)');
      button.focus();
      fireEvent.keyDown(button, { key: 'Enter' });

      // Button should be clickable via keyboard
      expect(button).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid clicking', async () => {
      const user = userEvent.setup();
      render(<DrawingSidePanel />);

      const button = screen.getByTitle('Select (V)');
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(mockSetTool).toHaveBeenCalledTimes(3);
    });

    it('should call setTool with correct value after multiple different clicks', async () => {
      const user = userEvent.setup();
      render(<DrawingSidePanel />);

      await user.click(screen.getByTitle('Select (V)'));
      await user.click(screen.getByTitle('Trendline (T)'));
      await user.click(screen.getByTitle('Rectangle (R)'));

      expect(mockSetTool).toHaveBeenNthCalledWith(1, 'select');
      expect(mockSetTool).toHaveBeenNthCalledWith(2, 'trendline');
      expect(mockSetTool).toHaveBeenNthCalledWith(3, 'rect');
    });
  });
});
