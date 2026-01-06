/**
 * Tests for useKeyboardShortcuts hook
 *
 * Tests keyboard shortcuts for drawing tools, including:
 * - Basic tool shortcuts (v, t, h, r, c, a, n, f, p, g, e)
 * - Shift+key shortcuts (Shift+H, Shift+F, Shift+P)
 * - Escape key behavior (cancel drawing)
 * - Delete/Backspace key behavior (delete selected objects)
 * - Input field filtering (don't trigger in inputs/textareas)
 */

import { useDrawingStore } from '@/lib/stores/drawingStore';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useContextMenu, useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

// Helper to create and dispatch keyboard events
const dispatchKeyEvent = (
  key: string,
  options: { shiftKey?: boolean; target?: EventTarget } = {}
) => {
  const event = new KeyboardEvent('keydown', {
    key,
    shiftKey: options.shiftKey || false,
    bubbles: true,
    cancelable: true,
  });

  // If target specified, dispatch on that element; otherwise on document
  if (options.target) {
    Object.defineProperty(event, 'target', { value: options.target });
  }

  document.dispatchEvent(event);
  return event;
};

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    // Reset the drawing store state before each test
    const store = useDrawingStore.getState();
    store.setActiveTool('cursor');
    store.cancelDrawing();
    store.clearSelection();

    // Clear all objects
    const objects = store.objects;
    objects.forEach((obj) => store.deleteObject(obj.id));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Tool Shortcuts', () => {
    const toolShortcuts = [
      { key: 'v', expectedTool: 'cursor' },
      { key: 't', expectedTool: 'trendline' },
      { key: 'h', expectedTool: 'hline' },
      { key: 'r', expectedTool: 'rectangle' },
      { key: 'c', expectedTool: 'circle' },
      { key: 'a', expectedTool: 'arrow' },
      { key: 'n', expectedTool: 'textNote' },
      { key: 'f', expectedTool: 'fibonacciRetracement' },
      { key: 'p', expectedTool: 'parallelChannel' },
      { key: 'g', expectedTool: 'gannFan' },
      { key: 'e', expectedTool: 'elliottWave' },
    ];

    it.each(toolShortcuts)(
      'should set tool to "$expectedTool" when "$key" is pressed',
      ({ key, expectedTool }) => {
        const { unmount } = renderHook(() => useKeyboardShortcuts());

        act(() => {
          dispatchKeyEvent(key);
        });

        const { activeTool } = useDrawingStore.getState();
        expect(activeTool).toBe(expectedTool);

        unmount();
      }
    );

    it('should handle uppercase keys the same as lowercase', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts());

      act(() => {
        dispatchKeyEvent('T'); // Uppercase T
      });

      const { activeTool } = useDrawingStore.getState();
      expect(activeTool).toBe('trendline');

      unmount();
    });
  });

  describe('Shift+Key Shortcuts', () => {
    const shiftShortcuts = [
      { key: 'h', expectedTool: 'vline', description: 'vertical line' },
      { key: 'f', expectedTool: 'fibonacciExtension', description: 'fib extension' },
      { key: 'p', expectedTool: 'pitchfork', description: 'pitchfork' },
    ];

    it.each(shiftShortcuts)(
      'should set tool to "$expectedTool" ($description) when Shift+$key is pressed',
      ({ key, expectedTool }) => {
        const { unmount } = renderHook(() => useKeyboardShortcuts());

        act(() => {
          dispatchKeyEvent(key, { shiftKey: true });
        });

        const { activeTool } = useDrawingStore.getState();
        expect(activeTool).toBe(expectedTool);

        unmount();
      }
    );

    it('should prioritize Shift shortcuts over regular shortcuts', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts());

      // H without shift = hline
      act(() => {
        dispatchKeyEvent('h');
      });
      expect(useDrawingStore.getState().activeTool).toBe('hline');

      // H with shift = vline
      act(() => {
        dispatchKeyEvent('h', { shiftKey: true });
      });
      expect(useDrawingStore.getState().activeTool).toBe('vline');

      unmount();
    });
  });

  describe('Escape Key Behavior', () => {
    it('should cancel drawing when Escape is pressed during active drawing', () => {
      // Render the hook first
      const { unmount, rerender } = renderHook(() => useKeyboardShortcuts());

      // Start a drawing through the store
      const store = useDrawingStore.getState();
      act(() => {
        store.setActiveTool('trendline');
        store.startDrawing('test-pane', { x: 100, y: 100, price: 100, time: 1000 });
      });

      // Verify drawing started
      expect(useDrawingStore.getState().isDrawing).toBe(true);

      // Re-render to pick up the new isDrawing value in the hook's closure
      rerender();

      // Now dispatch Escape
      act(() => {
        dispatchKeyEvent('Escape');
      });

      expect(useDrawingStore.getState().isDrawing).toBe(false);
      expect(useDrawingStore.getState().currentDrawing).toBeNull();

      unmount();
    });

    it('should not throw when Escape is pressed with no active drawing', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts());

      expect(useDrawingStore.getState().isDrawing).toBe(false);

      // Should not throw
      act(() => {
        dispatchKeyEvent('Escape');
      });

      expect(useDrawingStore.getState().isDrawing).toBe(false);

      unmount();
    });
  });

  describe('Delete/Backspace Key Behavior', () => {
    it('should call deleteSelectedObjects when Delete is pressed', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts());

      // Add and select an object
      const store = useDrawingStore.getState();
      store.addObject({
        id: 'test-obj-1',
        type: 'trendline',
        points: [
          { x: 0, y: 0, price: 100, time: 1000 },
          { x: 100, y: 100, price: 110, time: 2000 },
        ],
        properties: { color: '#000', lineWidth: 2 },
        isVisible: true,
        isLocked: false,
        zIndex: 0,
      });

      store.selectObject('test-obj-1');
      expect(useDrawingStore.getState().selectedObjectId).toBe('test-obj-1');

      act(() => {
        dispatchKeyEvent('Delete');
      });

      // Selected object should be deleted
      expect(useDrawingStore.getState().objects.find((o) => o.id === 'test-obj-1')).toBeUndefined();

      unmount();
    });

    it('should call deleteSelectedObjects when Backspace is pressed', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts());

      // Add and select an object
      const store = useDrawingStore.getState();
      store.addObject({
        id: 'test-obj-2',
        type: 'rectangle',
        points: [
          { x: 0, y: 0, price: 100, time: 1000 },
          { x: 100, y: 100, price: 110, time: 2000 },
        ],
        properties: { color: '#000', lineWidth: 2 },
        isVisible: true,
        isLocked: false,
        zIndex: 0,
      });

      store.selectObject('test-obj-2');

      act(() => {
        dispatchKeyEvent('Backspace');
      });

      // Selected object should be deleted
      expect(useDrawingStore.getState().objects.find((o) => o.id === 'test-obj-2')).toBeUndefined();

      unmount();
    });

    it('should not throw when Delete is pressed with no selection', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts());

      expect(useDrawingStore.getState().selectedObjectId).toBeNull();

      // Should not throw
      act(() => {
        dispatchKeyEvent('Delete');
      });

      unmount();
    });
  });

  describe('Input Field Filtering', () => {
    it('should not trigger shortcuts when typing in an input element', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts());

      // Set initial tool
      useDrawingStore.getState().setActiveTool('cursor');

      // Create a mock input element
      const inputElement = document.createElement('input');
      document.body.appendChild(inputElement);

      act(() => {
        dispatchKeyEvent('t', { target: inputElement });
      });

      // Tool should NOT have changed
      expect(useDrawingStore.getState().activeTool).toBe('cursor');

      document.body.removeChild(inputElement);
      unmount();
    });

    it('should not trigger shortcuts when typing in a textarea element', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts());

      // Set initial tool
      useDrawingStore.getState().setActiveTool('cursor');

      // Create a mock textarea element
      const textareaElement = document.createElement('textarea');
      document.body.appendChild(textareaElement);

      act(() => {
        dispatchKeyEvent('r', { target: textareaElement });
      });

      // Tool should NOT have changed
      expect(useDrawingStore.getState().activeTool).toBe('cursor');

      document.body.removeChild(textareaElement);
      unmount();
    });

    it('should trigger shortcuts when focus is on a non-input element', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts());

      // Set initial tool
      useDrawingStore.getState().setActiveTool('cursor');

      // Create a mock div element
      const divElement = document.createElement('div');
      document.body.appendChild(divElement);

      act(() => {
        dispatchKeyEvent('t', { target: divElement });
      });

      // Tool SHOULD have changed
      expect(useDrawingStore.getState().activeTool).toBe('trendline');

      document.body.removeChild(divElement);
      unmount();
    });
  });

  describe('Unknown Keys', () => {
    it('should ignore keys that are not mapped to tools', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts());

      // Set initial tool
      useDrawingStore.getState().setActiveTool('cursor');

      act(() => {
        dispatchKeyEvent('x'); // Not a mapped key
      });

      // Tool should NOT have changed
      expect(useDrawingStore.getState().activeTool).toBe('cursor');

      unmount();
    });

    it('should ignore Shift+key combinations that are not mapped', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts());

      // Set initial tool
      useDrawingStore.getState().setActiveTool('cursor');

      act(() => {
        dispatchKeyEvent('x', { shiftKey: true }); // Not a mapped Shift combo
      });

      // Tool should NOT have changed
      expect(useDrawingStore.getState().activeTool).toBe('cursor');

      unmount();
    });
  });

  describe('Hook Cleanup', () => {
    it('should remove event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = renderHook(() => useKeyboardShortcuts());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });

    it('should not respond to keys after unmount', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts());

      // Set initial tool
      useDrawingStore.getState().setActiveTool('cursor');

      // Unmount the hook
      unmount();

      // Dispatch key event after unmount
      dispatchKeyEvent('t');

      // Tool should NOT have changed (listener removed)
      expect(useDrawingStore.getState().activeTool).toBe('cursor');
    });
  });
});

describe('useContextMenu', () => {
  beforeEach(() => {
    // Reset the drawing store state before each test
    const store = useDrawingStore.getState();
    store.clearSelection();

    // Clear all objects
    const objects = store.objects;
    objects.forEach((obj) => store.deleteObject(obj.id));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return showContextMenu function', () => {
    const { result } = renderHook(() => useContextMenu());

    expect(result.current.showContextMenu).toBeDefined();
    expect(typeof result.current.showContextMenu).toBe('function');
  });

  it('should select the object when showContextMenu is called', () => {
    const { result } = renderHook(() => useContextMenu());

    // Add an object to select
    const store = useDrawingStore.getState();
    store.addObject({
      id: 'context-menu-obj',
      type: 'trendline',
      points: [
        { x: 0, y: 0, price: 100, time: 1000 },
        { x: 100, y: 100, price: 110, time: 2000 },
      ],
      properties: { color: '#000', lineWidth: 2 },
      isVisible: true,
      isLocked: false,
      zIndex: 0,
    });

    expect(useDrawingStore.getState().selectedObjectId).toBeNull();

    act(() => {
      result.current.showContextMenu('context-menu-obj', 100, 200);
    });

    expect(useDrawingStore.getState().selectedObjectId).toBe('context-menu-obj');
  });

  it('should accept x and y coordinates (reserved for future use)', () => {
    const { result } = renderHook(() => useContextMenu());

    // Add an object
    const store = useDrawingStore.getState();
    store.addObject({
      id: 'pos-test-obj',
      type: 'circle',
      points: [{ x: 50, y: 50, price: 100, time: 1000 }],
      properties: { color: '#000', lineWidth: 2 },
      isVisible: true,
      isLocked: false,
      zIndex: 0,
    });

    // Should not throw with any x, y values
    expect(() => {
      result.current.showContextMenu('pos-test-obj', 0, 0);
      result.current.showContextMenu('pos-test-obj', 500, 300);
      result.current.showContextMenu('pos-test-obj', -10, -20);
    }).not.toThrow();
  });
});
