/**
 * @fileoverview Tests for ObjectInspector component
 *
 * ObjectInspector is a property editor panel for selected chart drawings.
 * Features:
 * - No selection state display
 * - Multi-selection support with mixed value detection
 * - Style controls: stroke color, width, dash, opacity, fill
 * - Actions: lock/unlock, show/hide, bring to front/back, group/ungroup
 * - FibEditor for Fibonacci drawings
 *
 * Test categories:
 * 1. No Selection - Empty state display
 * 2. Selection Display - Count, name input
 * 3. Style Controls - Color, width, dash, opacity, fill
 * 4. Lock/Visibility - Toggle buttons
 * 5. Ordering Actions - Bring to front/back
 * 6. Group Actions - Group/ungroup
 * 7. FibEditor - Fibonacci level editing
 */
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Drawing } from '@/lib/utils/drawings';

// Mock the store module
const mockStore = {
  selection: new Set<string>(),
  drawings: [] as Drawing[],
  drawingSettings: {
    fibDefaultLevels: [0, 0.236, 0.382, 0.5, 0.618, 1],
  },
  renameSelected: vi.fn(),
  setSelectedStyle: vi.fn(),
  toggleLockSelected: vi.fn(),
  toggleVisibilitySelected: vi.fn(),
  bringToFront: vi.fn(),
  sendToBack: vi.fn(),
  groupSelected: vi.fn(),
  ungroupSelected: vi.fn(),
  setFibLevelsForSelected: vi.fn(),
  setFibDefaultLevels: vi.fn(),
};

vi.mock('@/state/store', () => ({
  useChartStore: (selector?: (state: typeof mockStore) => unknown) => {
    if (selector) {
      return selector(mockStore);
    }
    return mockStore;
  },
}));

// Import component after mock setup
import ObjectInspector from '@/components/ObjectInspector';

// Mock drawing factory
function createMockDrawing(overrides: Partial<Drawing> = {}): Drawing {
  return {
    id: Math.random().toString(36).substring(7),
    kind: 'line',
    name: 'Test Drawing',
    locked: false,
    hidden: false,
    layerId: 'default',
    style: {
      stroke: '#ff0000',
      strokeWidth: 2,
      dash: 'solid',
      opacity: 1,
      fill: '#000000',
    },
    points: [
      { x: 100, y: 100, price: 100, time: 1000 },
      { x: 200, y: 200, price: 200, time: 2000 },
    ],
    ...overrides,
  } as Drawing;
}

// Helper to set store state
function setStoreState(state: Partial<typeof mockStore>) {
  Object.assign(mockStore, state);
}

describe('ObjectInspector', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    setStoreState({
      drawings: [],
      selection: new Set<string>(),
      renameSelected: vi.fn(),
      setSelectedStyle: vi.fn(),
      toggleLockSelected: vi.fn(),
      toggleVisibilitySelected: vi.fn(),
      bringToFront: vi.fn(),
      sendToBack: vi.fn(),
      groupSelected: vi.fn(),
      ungroupSelected: vi.fn(),
      setFibLevelsForSelected: vi.fn(),
      setFibDefaultLevels: vi.fn(),
    });
  });

  // ==========================================================================
  // No Selection Tests
  // ==========================================================================

  describe('no selection', () => {
    it('should display "No selection" when nothing is selected', () => {
      render(<ObjectInspector />);
      expect(screen.getByText('No selection')).toBeInTheDocument();
    });

    it('should not display property controls when nothing selected', () => {
      render(<ObjectInspector />);
      expect(screen.queryByText('Stroke')).not.toBeInTheDocument();
      expect(screen.queryByText('Width')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Lock' })).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Selection Display Tests
  // ==========================================================================

  describe('selection display', () => {
    it('should show selection count for single selection', () => {
      const drawing = createMockDrawing();
      setStoreState({
        drawings: [drawing],
        selection: new Set([drawing.id]),
      });

      render(<ObjectInspector />);
      expect(screen.getByText('Selected (1)')).toBeInTheDocument();
    });

    it('should show selection count for multiple selections', () => {
      const drawing1 = createMockDrawing();
      const drawing2 = createMockDrawing();
      setStoreState({
        drawings: [drawing1, drawing2],
        selection: new Set([drawing1.id, drawing2.id]),
      });

      render(<ObjectInspector />);
      expect(screen.getByText('Selected (2)')).toBeInTheDocument();
    });

    it('should display name input field', () => {
      const drawing = createMockDrawing({ name: 'My Line' });
      setStoreState({
        drawings: [drawing],
        selection: new Set([drawing.id]),
      });

      render(<ObjectInspector />);
      expect(screen.getByPlaceholderText('Untitled object')).toBeInTheDocument();
    });

    it('should display drawing name in input', () => {
      const drawing = createMockDrawing({ name: 'My Line' });
      setStoreState({
        drawings: [drawing],
        selection: new Set([drawing.id]),
      });

      render(<ObjectInspector />);
      const input = screen.getByPlaceholderText('Untitled object');
      expect(input).toHaveValue('My Line');
    });

    it('should call renameSelected when name is changed', async () => {
      const drawing = createMockDrawing({ name: 'My Line' });
      const renameSelectedSpy = vi.fn();
      setStoreState({
        drawings: [drawing],
        selection: new Set([drawing.id]),
        renameSelected: renameSelectedSpy,
      });

      render(<ObjectInspector />);
      const input = screen.getByPlaceholderText('Untitled object');

      fireEvent.change(input, { target: { value: 'New Name' } });

      expect(renameSelectedSpy).toHaveBeenCalledWith('New Name');
    });
  });

  // ==========================================================================
  // Style Controls Tests
  // ==========================================================================

  describe('style controls', () => {
    beforeEach(() => {
      const drawing = createMockDrawing({
        style: {
          stroke: '#ff0000',
          strokeWidth: 2,
          dash: 'solid',
          opacity: 0.8,
          fill: '#0000ff',
        },
      });
      setStoreState({
        drawings: [drawing],
        selection: new Set([drawing.id]),
      });
    });

    it('should display stroke color control', () => {
      render(<ObjectInspector />);
      expect(screen.getByText('Stroke')).toBeInTheDocument();
    });

    it('should display stroke color value', () => {
      render(<ObjectInspector />);
      const colorInputs = document.querySelectorAll('input[type="color"]');
      expect(colorInputs[0]).toHaveValue('#ff0000');
    });

    it('should display width control', () => {
      render(<ObjectInspector />);
      expect(screen.getByText('Width')).toBeInTheDocument();
    });

    it('should display width value', () => {
      render(<ObjectInspector />);
      const widthInput = screen.getByRole('spinbutton');
      expect(widthInput).toHaveValue(2);
    });

    it('should display dash control', () => {
      render(<ObjectInspector />);
      expect(screen.getByText('Dash')).toBeInTheDocument();
    });

    it('should display dash options', () => {
      render(<ObjectInspector />);
      const dashSelect = screen.getByRole('combobox');
      expect(dashSelect).toHaveValue('solid');
    });

    it('should display opacity control', () => {
      render(<ObjectInspector />);
      expect(screen.getByText('Opacity')).toBeInTheDocument();
    });

    it('should display opacity slider', () => {
      render(<ObjectInspector />);
      const opacitySlider = screen.getByRole('slider');
      // 0.8 * 100 = 80
      expect(opacitySlider).toHaveValue('80');
    });

    it('should display fill control', () => {
      render(<ObjectInspector />);
      expect(screen.getByText('Fill (rect/ellipse/channel)')).toBeInTheDocument();
    });

    it('should call setSelectedStyle when stroke color changed', () => {
      const setSelectedStyleSpy = vi.fn();
      setStoreState({ setSelectedStyle: setSelectedStyleSpy });

      render(<ObjectInspector />);
      const colorInputs = document.querySelectorAll('input[type="color"]');
      const strokeInput = colorInputs[0];

      fireEvent.change(strokeInput, { target: { value: '#00ff00' } });

      expect(setSelectedStyleSpy).toHaveBeenCalledWith({ stroke: '#00ff00' });
    });

    it('should call setSelectedStyle when width changed', () => {
      const setSelectedStyleSpy = vi.fn();
      setStoreState({ setSelectedStyle: setSelectedStyleSpy });

      render(<ObjectInspector />);
      const widthInput = screen.getByRole('spinbutton');

      fireEvent.change(widthInput, { target: { value: '4' } });

      expect(setSelectedStyleSpy).toHaveBeenCalledWith({ strokeWidth: 4 });
    });

    it('should enforce minimum width of 1', () => {
      const setSelectedStyleSpy = vi.fn();
      setStoreState({ setSelectedStyle: setSelectedStyleSpy });

      render(<ObjectInspector />);
      const widthInput = screen.getByRole('spinbutton');

      fireEvent.change(widthInput, { target: { value: '0' } });

      expect(setSelectedStyleSpy).toHaveBeenCalledWith({ strokeWidth: 1 });
    });

    it('should call setSelectedStyle when dash changed', () => {
      const setSelectedStyleSpy = vi.fn();
      setStoreState({ setSelectedStyle: setSelectedStyleSpy });

      render(<ObjectInspector />);
      const dashSelect = screen.getByRole('combobox');

      fireEvent.change(dashSelect, { target: { value: 'dash' } });

      expect(setSelectedStyleSpy).toHaveBeenCalledWith({ dash: 'dash' });
    });

    it('should call setSelectedStyle when opacity changed', () => {
      const setSelectedStyleSpy = vi.fn();
      setStoreState({ setSelectedStyle: setSelectedStyleSpy });

      render(<ObjectInspector />);
      const opacitySlider = screen.getByRole('slider');

      fireEvent.change(opacitySlider, { target: { value: '50' } });

      expect(setSelectedStyleSpy).toHaveBeenCalledWith({ opacity: 0.5 });
    });

    it('should call setSelectedStyle when fill changed', () => {
      const setSelectedStyleSpy = vi.fn();
      setStoreState({ setSelectedStyle: setSelectedStyleSpy });

      render(<ObjectInspector />);
      const colorInputs = document.querySelectorAll('input[type="color"]');
      const fillInput = colorInputs[1]; // Second color input is fill

      fireEvent.change(fillInput, { target: { value: '#ffff00' } });

      expect(setSelectedStyleSpy).toHaveBeenCalledWith({ fill: '#ffff00' });
    });
  });

  // ==========================================================================
  // Lock/Visibility Tests
  // ==========================================================================

  describe('lock/visibility', () => {
    it('should display Lock button when not all locked', () => {
      const drawing = createMockDrawing({ locked: false });
      setStoreState({
        drawings: [drawing],
        selection: new Set([drawing.id]),
      });

      render(<ObjectInspector />);
      expect(screen.getByRole('button', { name: 'Lock' })).toBeInTheDocument();
    });

    it('should display Unlock button when all locked', () => {
      const drawing = createMockDrawing({ locked: true });
      setStoreState({
        drawings: [drawing],
        selection: new Set([drawing.id]),
      });

      render(<ObjectInspector />);
      expect(screen.getByRole('button', { name: 'Unlock' })).toBeInTheDocument();
    });

    it('should display Hide button when not all hidden', () => {
      const drawing = createMockDrawing({ hidden: false });
      setStoreState({
        drawings: [drawing],
        selection: new Set([drawing.id]),
      });

      render(<ObjectInspector />);
      expect(screen.getByRole('button', { name: 'Hide' })).toBeInTheDocument();
    });

    it('should display Show button when all hidden', () => {
      const drawing = createMockDrawing({ hidden: true });
      setStoreState({
        drawings: [drawing],
        selection: new Set([drawing.id]),
      });

      render(<ObjectInspector />);
      expect(screen.getByRole('button', { name: 'Show' })).toBeInTheDocument();
    });

    it('should call toggleLockSelected when Lock/Unlock clicked', async () => {
      const drawing = createMockDrawing({ locked: false });
      const toggleLockSelectedSpy = vi.fn();
      setStoreState({
        drawings: [drawing],
        selection: new Set([drawing.id]),
        toggleLockSelected: toggleLockSelectedSpy,
      });

      render(<ObjectInspector />);
      await user.click(screen.getByRole('button', { name: 'Lock' }));

      expect(toggleLockSelectedSpy).toHaveBeenCalled();
    });

    it('should call toggleVisibilitySelected when Show/Hide clicked', async () => {
      const drawing = createMockDrawing({ hidden: false });
      const toggleVisibilitySelectedSpy = vi.fn();
      setStoreState({
        drawings: [drawing],
        selection: new Set([drawing.id]),
        toggleVisibilitySelected: toggleVisibilitySelectedSpy,
      });

      render(<ObjectInspector />);
      await user.click(screen.getByRole('button', { name: 'Hide' }));

      expect(toggleVisibilitySelectedSpy).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Ordering Actions Tests
  // ==========================================================================

  describe('ordering actions', () => {
    beforeEach(() => {
      const drawing = createMockDrawing();
      setStoreState({
        drawings: [drawing],
        selection: new Set([drawing.id]),
      });
    });

    it('should display Bring to front button', () => {
      render(<ObjectInspector />);
      expect(screen.getByRole('button', { name: 'Bring to front' })).toBeInTheDocument();
    });

    it('should display Send to back button', () => {
      render(<ObjectInspector />);
      expect(screen.getByRole('button', { name: 'Send to back' })).toBeInTheDocument();
    });

    it('should call bringToFront when clicked', async () => {
      const bringToFrontSpy = vi.fn();
      setStoreState({ bringToFront: bringToFrontSpy });

      render(<ObjectInspector />);
      await user.click(screen.getByRole('button', { name: 'Bring to front' }));

      expect(bringToFrontSpy).toHaveBeenCalled();
    });

    it('should call sendToBack when clicked', async () => {
      const sendToBackSpy = vi.fn();
      setStoreState({ sendToBack: sendToBackSpy });

      render(<ObjectInspector />);
      await user.click(screen.getByRole('button', { name: 'Send to back' }));

      expect(sendToBackSpy).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Group Actions Tests
  // ==========================================================================

  describe('group actions', () => {
    beforeEach(() => {
      const drawing = createMockDrawing();
      setStoreState({
        drawings: [drawing],
        selection: new Set([drawing.id]),
      });
    });

    it('should display Group button', () => {
      render(<ObjectInspector />);
      expect(screen.getByRole('button', { name: 'Group' })).toBeInTheDocument();
    });

    it('should display Ungroup button', () => {
      render(<ObjectInspector />);
      expect(screen.getByRole('button', { name: 'Ungroup' })).toBeInTheDocument();
    });

    it('should call groupSelected when clicked', async () => {
      const groupSelectedSpy = vi.fn();
      setStoreState({ groupSelected: groupSelectedSpy });

      render(<ObjectInspector />);
      await user.click(screen.getByRole('button', { name: 'Group' }));

      expect(groupSelectedSpy).toHaveBeenCalled();
    });

    it('should call ungroupSelected when clicked', async () => {
      const ungroupSelectedSpy = vi.fn();
      setStoreState({ ungroupSelected: ungroupSelectedSpy });

      render(<ObjectInspector />);
      await user.click(screen.getByRole('button', { name: 'Ungroup' }));

      expect(ungroupSelectedSpy).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // FibEditor Tests
  // ==========================================================================

  describe('FibEditor', () => {
    it('should not show FibEditor for non-fib drawings', () => {
      const drawing = createMockDrawing({ kind: 'line' });
      setStoreState({
        drawings: [drawing],
        selection: new Set([drawing.id]),
      });

      render(<ObjectInspector />);
      expect(screen.queryByText('Fibonacci Levels')).not.toBeInTheDocument();
    });

    it('should show FibEditor when all selected are fib drawings', () => {
      const fibDrawing = createMockDrawing({
        kind: 'fib',
        fibLevels: [0, 0.382, 0.618, 1],
      }) as Drawing;
      setStoreState({
        drawings: [fibDrawing],
        selection: new Set([fibDrawing.id]),
        drawingSettings: {
          fibDefaultLevels: [0, 0.236, 0.382, 0.5, 0.618, 1],
        },
      });

      render(<ObjectInspector />);
      expect(screen.getByText('Fibonacci Levels')).toBeInTheDocument();
    });

    it('should display level input description', () => {
      const fibDrawing = createMockDrawing({
        kind: 'fib',
        fibLevels: [0, 0.382, 0.618, 1],
      }) as Drawing;
      setStoreState({
        drawings: [fibDrawing],
        selection: new Set([fibDrawing.id]),
        drawingSettings: {
          fibDefaultLevels: [0, 0.236, 0.382, 0.5, 0.618, 1],
        },
      });

      render(<ObjectInspector />);
      expect(screen.getByText(/Comma-separated/)).toBeInTheDocument();
    });

    it('should display Apply to selection button', () => {
      const fibDrawing = createMockDrawing({
        kind: 'fib',
        fibLevels: [0, 0.382, 0.618, 1],
      }) as Drawing;
      setStoreState({
        drawings: [fibDrawing],
        selection: new Set([fibDrawing.id]),
        drawingSettings: {
          fibDefaultLevels: [0, 0.236, 0.382, 0.5, 0.618, 1],
        },
      });

      render(<ObjectInspector />);
      expect(screen.getByRole('button', { name: 'Apply to selection' })).toBeInTheDocument();
    });

    it('should display Set as default button', () => {
      const fibDrawing = createMockDrawing({
        kind: 'fib',
        fibLevels: [0, 0.382, 0.618, 1],
      }) as Drawing;
      setStoreState({
        drawings: [fibDrawing],
        selection: new Set([fibDrawing.id]),
        drawingSettings: {
          fibDefaultLevels: [0, 0.236, 0.382, 0.5, 0.618, 1],
        },
      });

      render(<ObjectInspector />);
      expect(screen.getByRole('button', { name: 'Set as default' })).toBeInTheDocument();
    });

    it('should display Classic preset button', () => {
      const fibDrawing = createMockDrawing({
        kind: 'fib',
        fibLevels: [0, 0.382, 0.618, 1],
      }) as Drawing;
      setStoreState({
        drawings: [fibDrawing],
        selection: new Set([fibDrawing.id]),
        drawingSettings: {
          fibDefaultLevels: [0, 0.236, 0.382, 0.5, 0.618, 1],
        },
      });

      render(<ObjectInspector />);
      expect(screen.getByRole('button', { name: 'Classic' })).toBeInTheDocument();
    });

    it('should display Extended preset button', () => {
      const fibDrawing = createMockDrawing({
        kind: 'fib',
        fibLevels: [0, 0.382, 0.618, 1],
      }) as Drawing;
      setStoreState({
        drawings: [fibDrawing],
        selection: new Set([fibDrawing.id]),
        drawingSettings: {
          fibDefaultLevels: [0, 0.236, 0.382, 0.5, 0.618, 1],
        },
      });

      render(<ObjectInspector />);
      expect(screen.getByRole('button', { name: 'Extended' })).toBeInTheDocument();
    });

    it('should call setFibLevelsForSelected when Apply clicked', async () => {
      const fibDrawing = createMockDrawing({
        kind: 'fib',
        fibLevels: [0, 0.382, 0.618, 1],
      }) as Drawing;
      const setFibLevelsForSelectedSpy = vi.fn();
      setStoreState({
        drawings: [fibDrawing],
        selection: new Set([fibDrawing.id]),
        drawingSettings: {
          fibDefaultLevels: [0, 0.236, 0.382, 0.5, 0.618, 1],
        },
        setFibLevelsForSelected: setFibLevelsForSelectedSpy,
      });

      render(<ObjectInspector />);
      await user.click(screen.getByRole('button', { name: 'Apply to selection' }));

      expect(setFibLevelsForSelectedSpy).toHaveBeenCalled();
    });

    it('should call setFibDefaultLevels when Set as default clicked', async () => {
      const fibDrawing = createMockDrawing({
        kind: 'fib',
        fibLevels: [0, 0.382, 0.618, 1],
      }) as Drawing;
      const setFibDefaultLevelsSpy = vi.fn();
      setStoreState({
        drawings: [fibDrawing],
        selection: new Set([fibDrawing.id]),
        drawingSettings: {
          fibDefaultLevels: [0, 0.236, 0.382, 0.5, 0.618, 1],
        },
        setFibDefaultLevels: setFibDefaultLevelsSpy,
      });

      render(<ObjectInspector />);
      await user.click(screen.getByRole('button', { name: 'Set as default' }));

      expect(setFibDefaultLevelsSpy).toHaveBeenCalled();
    });

    it('should set Classic preset levels when clicked', async () => {
      const fibDrawing = createMockDrawing({
        kind: 'fib',
        fibLevels: [0, 1],
      }) as Drawing;
      setStoreState({
        drawings: [fibDrawing],
        selection: new Set([fibDrawing.id]),
        drawingSettings: {
          fibDefaultLevels: [0, 1],
        },
      });

      render(<ObjectInspector />);

      // Find the Fibonacci levels input - it's the input in the space-y-2 container with FibEditor
      const fibInput = screen
        .getByText('Fibonacci Levels')
        .parentElement?.querySelector('input') as HTMLInputElement;
      expect(fibInput).toBeTruthy();

      // Initial value should be the fib levels (sorted)
      expect(fibInput.value).toBe('0, 1');

      // Click Classic preset
      await user.click(screen.getByRole('button', { name: 'Classic' }));

      // Input should now have classic levels
      expect(fibInput.value).toBe('0, 0.236, 0.382, 0.5, 0.618, 1');
    });

    it('should set Extended preset levels when clicked', async () => {
      const fibDrawing = createMockDrawing({
        kind: 'fib',
        fibLevels: [0, 1],
      }) as Drawing;
      setStoreState({
        drawings: [fibDrawing],
        selection: new Set([fibDrawing.id]),
        drawingSettings: {
          fibDefaultLevels: [0, 1],
        },
      });

      render(<ObjectInspector />);

      // Find the Fibonacci levels input
      const fibInput = screen
        .getByText('Fibonacci Levels')
        .parentElement?.querySelector('input') as HTMLInputElement;
      expect(fibInput).toBeTruthy();

      // Click Extended preset
      await user.click(screen.getByRole('button', { name: 'Extended' }));

      // Input should now have extended levels
      expect(fibInput.value).toBe('0, 0.236, 0.382, 0.5, 0.618, 0.786, 1');
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('integration', () => {
    it('should handle complete drawing edit workflow', async () => {
      const drawing = createMockDrawing({ name: 'Original' });
      const renameSelectedSpy = vi.fn();
      const setSelectedStyleSpy = vi.fn();
      const toggleLockSelectedSpy = vi.fn();

      setStoreState({
        drawings: [drawing],
        selection: new Set([drawing.id]),
        renameSelected: renameSelectedSpy,
        setSelectedStyle: setSelectedStyleSpy,
        toggleLockSelected: toggleLockSelectedSpy,
      });

      render(<ObjectInspector />);

      // Rename the drawing
      const nameInput = screen.getByPlaceholderText('Untitled object');
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
      expect(renameSelectedSpy).toHaveBeenCalledWith('Updated Name');

      // Change stroke width
      const widthInput = screen.getByRole('spinbutton');
      fireEvent.change(widthInput, { target: { value: '4' } });
      expect(setSelectedStyleSpy).toHaveBeenCalledWith({ strokeWidth: 4 });

      // Lock the drawing
      await user.click(screen.getByRole('button', { name: 'Lock' }));
      expect(toggleLockSelectedSpy).toHaveBeenCalled();
    });

    it('should display all action buttons', () => {
      const drawing = createMockDrawing();
      setStoreState({
        drawings: [drawing],
        selection: new Set([drawing.id]),
      });

      render(<ObjectInspector />);

      // Verify all action buttons are present
      expect(screen.getByRole('button', { name: 'Lock' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Hide' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Bring to front' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send to back' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Group' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ungroup' })).toBeInTheDocument();
    });
  });
});
