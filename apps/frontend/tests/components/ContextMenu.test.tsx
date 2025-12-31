import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ContextMenu from '../../components/ContextMenu';

describe('ContextMenu', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders with children', () => {
      render(
        <ContextMenu x={100} y={200} onClose={mockOnClose}>
          <div>Menu Item 1</div>
          <div>Menu Item 2</div>
        </ContextMenu>
      );

      expect(screen.getByText('Menu Item 1')).toBeInTheDocument();
      expect(screen.getByText('Menu Item 2')).toBeInTheDocument();
    });

    it('renders without children', () => {
      const { container } = render(<ContextMenu x={100} y={200} onClose={mockOnClose} />);

      expect(container.querySelector('.context-menu')).toBeInTheDocument();
    });

    it('applies correct styling classes', () => {
      const { container } = render(
        <ContextMenu x={100} y={200} onClose={mockOnClose}>
          <div>Content</div>
        </ContextMenu>
      );

      const menu = container.querySelector('.context-menu');
      expect(menu).toHaveClass('absolute');
      expect(menu).toHaveClass('bg-gray-800');
      expect(menu).toHaveClass('rounded-lg');
      expect(menu).toHaveClass('shadow-lg');
      expect(menu).toHaveClass('py-1');
      expect(menu).toHaveClass('min-w-[120px]');
    });
  });

  describe('positioning', () => {
    it('positions menu at specified x,y coordinates', () => {
      const { container } = render(
        <ContextMenu x={150} y={250} onClose={mockOnClose}>
          <div>Content</div>
        </ContextMenu>
      );

      const menu = container.querySelector('.context-menu') as HTMLElement;
      expect(menu.style.left).toBe('150px');
      expect(menu.style.top).toBe('250px');
    });

    it('handles zero coordinates', () => {
      const { container } = render(
        <ContextMenu x={0} y={0} onClose={mockOnClose}>
          <div>Content</div>
        </ContextMenu>
      );

      const menu = container.querySelector('.context-menu') as HTMLElement;
      expect(menu.style.left).toBe('0px');
      expect(menu.style.top).toBe('0px');
    });

    it('handles large coordinates', () => {
      const { container } = render(
        <ContextMenu x={1920} y={1080} onClose={mockOnClose}>
          <div>Content</div>
        </ContextMenu>
      );

      const menu = container.querySelector('.context-menu') as HTMLElement;
      expect(menu.style.left).toBe('1920px');
      expect(menu.style.top).toBe('1080px');
    });

    it('handles negative coordinates', () => {
      const { container } = render(
        <ContextMenu x={-50} y={-100} onClose={mockOnClose}>
          <div>Content</div>
        </ContextMenu>
      );

      const menu = container.querySelector('.context-menu') as HTMLElement;
      expect(menu.style.left).toBe('-50px');
      expect(menu.style.top).toBe('-100px');
    });
  });

  describe('close behavior', () => {
    it('calls onClose when clicking outside the menu', () => {
      render(
        <div>
          <div data-testid="outside">Outside element</div>
          <ContextMenu x={100} y={200} onClose={mockOnClose}>
            <div>Menu Content</div>
          </ContextMenu>
        </div>
      );

      // Click outside the context menu
      fireEvent.mouseDown(screen.getByTestId('outside'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when clicking inside the menu', () => {
      render(
        <ContextMenu x={100} y={200} onClose={mockOnClose}>
          <div data-testid="inside">Menu Content</div>
        </ContextMenu>
      );

      // Click inside the context menu
      fireEvent.mouseDown(screen.getByTestId('inside'));

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('does not call onClose when clicking the menu container itself', () => {
      const { container } = render(
        <ContextMenu x={100} y={200} onClose={mockOnClose}>
          <div>Menu Content</div>
        </ContextMenu>
      );

      const menu = container.querySelector('.context-menu')!;
      fireEvent.mouseDown(menu);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('removes event listener on unmount', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = render(
        <ContextMenu x={100} y={200} onClose={mockOnClose}>
          <div>Content</div>
        </ContextMenu>
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
    });

    it('updates event listener when onClose changes', () => {
      const firstOnClose = vi.fn();
      const secondOnClose = vi.fn();

      const { rerender } = render(
        <ContextMenu x={100} y={200} onClose={firstOnClose}>
          <div>Content</div>
        </ContextMenu>
      );

      // Rerender with new onClose callback
      rerender(
        <ContextMenu x={100} y={200} onClose={secondOnClose}>
          <div>Content</div>
        </ContextMenu>
      );

      // Click outside - should call the new callback
      fireEvent.mouseDown(document.body);

      expect(firstOnClose).not.toHaveBeenCalled();
      expect(secondOnClose).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles multiple context menus', () => {
      const onClose1 = vi.fn();
      const onClose2 = vi.fn();

      render(
        <div>
          <ContextMenu x={100} y={200} onClose={onClose1}>
            <div>Menu 1</div>
          </ContextMenu>
          <ContextMenu x={300} y={400} onClose={onClose2}>
            <div>Menu 2</div>
          </ContextMenu>
          <div data-testid="outside">Outside</div>
        </div>
      );

      expect(screen.getByText('Menu 1')).toBeInTheDocument();
      expect(screen.getByText('Menu 2')).toBeInTheDocument();

      fireEvent.mouseDown(screen.getByTestId('outside'));

      expect(onClose1).toHaveBeenCalled();
      expect(onClose2).toHaveBeenCalled();
    });

    it('handles nested elements in children', () => {
      render(
        <ContextMenu x={100} y={200} onClose={mockOnClose}>
          <div>
            <button data-testid="nested-button">Click me</button>
            <span>
              <a href="#" data-testid="nested-link">
                Link
              </a>
            </span>
          </div>
        </ContextMenu>
      );

      // Click nested button - should not close
      fireEvent.mouseDown(screen.getByTestId('nested-button'));
      expect(mockOnClose).not.toHaveBeenCalled();

      // Click nested link - should not close
      fireEvent.mouseDown(screen.getByTestId('nested-link'));
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('handles rapid position changes', () => {
      const { container, rerender } = render(
        <ContextMenu x={100} y={200} onClose={mockOnClose}>
          <div>Content</div>
        </ContextMenu>
      );

      // Rapid position changes
      for (let i = 0; i < 5; i++) {
        rerender(
          <ContextMenu x={100 + i * 10} y={200 + i * 10} onClose={mockOnClose}>
            <div>Content</div>
          </ContextMenu>
        );
      }

      const menu = container.querySelector('.context-menu') as HTMLElement;
      expect(menu.style.left).toBe('140px'); // 100 + 4*10
      expect(menu.style.top).toBe('240px'); // 200 + 4*10
    });
  });
});
