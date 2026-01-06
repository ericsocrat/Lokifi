/**
 * @fileoverview Tests for DrawingStylePanel component
 *
 * DrawingStylePanel allows users to modify styles of selected drawing objects.
 * It provides controls for color, width, opacity, line style, fill, and text.
 *
 * Test categories:
 * 1. Rendering - Panel title, color palette, input controls
 * 2. Color Selection - Clicking palette colors to apply
 * 3. Width Control - Range slider for stroke width
 * 4. Opacity Control - Range slider for transparency
 * 5. Line Style - Select dropdown for solid/dash/dot
 * 6. Fill Control - Text input for fill color
 * 7. Text Input - Edit text for text drawings
 * 8. Selection Display - Shows count of selected drawings
 * 9. Integration - Multiple style changes
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DrawingStylePanel from '@/components/DrawingStylePanel';
import { PALETTE } from '@/lib/utils/styles';
import { useChartStore } from '@/state/store';

// Mock the store module
vi.mock('@/state/store', async () => {
  const { create } = await import('zustand');

  // Create a mock store
  const createMockStore = () => {
    const store = create<{
      selection: Set<string>;
      setStyleForSelection: (patch: Record<string, unknown>) => void;
      setTextForSelection: (text: string) => void;
    }>()((_set) => ({
      selection: new Set<string>(),
      setStyleForSelection: vi.fn(),
      setTextForSelection: vi.fn(),
    }));

    return store;
  };

  const mockStore = createMockStore();

  return {
    useChartStore: Object.assign(mockStore, {
      getState: mockStore.getState,
      setState: mockStore.setState,
      subscribe: mockStore.subscribe,
    }),
  };
});

describe('DrawingStylePanel', () => {
  const user = userEvent.setup();

  // Helper to get mock functions from store
  const getSetStyle = () =>
    useChartStore.getState().setStyleForSelection as ReturnType<typeof vi.fn>;
  const getSetText = () => useChartStore.getState().setTextForSelection as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    act(() => {
      useChartStore.setState({
        selection: new Set<string>(),
        setStyleForSelection: vi.fn(),
        setTextForSelection: vi.fn(),
      });
    });
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('rendering', () => {
    it('should render the panel title', () => {
      render(<DrawingStylePanel />);
      expect(screen.getByText('Drawing Style')).toBeInTheDocument();
    });

    it('should render color label', () => {
      render(<DrawingStylePanel />);
      expect(screen.getByText('Color')).toBeInTheDocument();
    });

    it('should render color palette buttons', () => {
      render(<DrawingStylePanel />);
      const colorButtons = screen.getAllByRole('button');
      expect(colorButtons).toHaveLength(PALETTE.length);
    });

    it('should render each palette color as a button', () => {
      render(<DrawingStylePanel />);
      PALETTE.forEach((color) => {
        const button = screen.getByTitle(color);
        expect(button).toBeInTheDocument();
        expect(button).toHaveStyle({ background: color });
      });
    });

    it('should render width slider', () => {
      render(<DrawingStylePanel />);
      expect(screen.getByText('Width')).toBeInTheDocument();
      const slider = screen.getByRole('slider', { name: /width/i });
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveAttribute('min', '1');
      expect(slider).toHaveAttribute('max', '8');
    });

    it('should render opacity slider', () => {
      render(<DrawingStylePanel />);
      expect(screen.getByText('Opacity')).toBeInTheDocument();
      const slider = screen.getByRole('slider', { name: /opacity/i });
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveAttribute('min', '0');
      expect(slider).toHaveAttribute('max', '1');
      expect(slider).toHaveAttribute('step', '0.05');
    });

    it('should render line style dropdown', () => {
      render(<DrawingStylePanel />);
      expect(screen.getByText('Line style')).toBeInTheDocument();
      const select = screen.getByRole('combobox', { name: /line style/i });
      expect(select).toBeInTheDocument();
    });

    it('should render line style options', () => {
      render(<DrawingStylePanel />);
      expect(screen.getByRole('option', { name: 'Solid' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Dash' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Dot' })).toBeInTheDocument();
    });

    it('should render fill input', () => {
      render(<DrawingStylePanel />);
      expect(screen.getByText('Fill (rect)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('transparent or #hex')).toBeInTheDocument();
    });

    it('should render text input', () => {
      render(<DrawingStylePanel />);
      expect(screen.getByText('Text (for text drawings)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Edit text...')).toBeInTheDocument();
    });

    it('should show "Select a drawing to edit" when nothing selected', () => {
      render(<DrawingStylePanel />);
      expect(screen.getByText('Select a drawing to edit.')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Color Selection Tests
  // ==========================================================================

  describe('color selection', () => {
    it('should call setStyleForSelection when clicking a color', async () => {
      render(<DrawingStylePanel />);
      const setStyle = getSetStyle();

      const blueButton = screen.getByTitle('#60a5fa');
      await user.click(blueButton);

      expect(setStyle).toHaveBeenCalledWith({ color: '#60a5fa' });
    });

    it('should call setStyleForSelection for each color clicked', async () => {
      render(<DrawingStylePanel />);
      const setStyle = getSetStyle();

      const greenButton = screen.getByTitle('#22c55e');
      await user.click(greenButton);

      expect(setStyle).toHaveBeenCalledWith({ color: '#22c55e' });

      const redButton = screen.getByTitle('#ef4444');
      await user.click(redButton);

      expect(setStyle).toHaveBeenCalledWith({ color: '#ef4444' });
      expect(setStyle).toHaveBeenCalledTimes(2);
    });

    it('should apply all palette colors when clicked', async () => {
      render(<DrawingStylePanel />);
      const setStyle = getSetStyle();

      for (const color of PALETTE) {
        const button = screen.getByTitle(color);
        await user.click(button);
        expect(setStyle).toHaveBeenCalledWith({ color });
      }

      expect(setStyle).toHaveBeenCalledTimes(PALETTE.length);
    });
  });

  // ==========================================================================
  // Width Control Tests
  // ==========================================================================

  describe('width control', () => {
    it('should have default width of 2', () => {
      render(<DrawingStylePanel />);
      const slider = screen.getByRole('slider', { name: /width/i });
      expect(slider).toHaveValue('2');
    });

    it('should call setStyleForSelection when width changes', () => {
      render(<DrawingStylePanel />);
      const setStyle = getSetStyle();

      const slider = screen.getByRole('slider', { name: /width/i });
      fireEvent.change(slider, { target: { value: '5' } });

      expect(setStyle).toHaveBeenCalledWith({ width: 5 });
    });

    it('should update local state when width changes', () => {
      render(<DrawingStylePanel />);
      const slider = screen.getByRole('slider', { name: /width/i });

      fireEvent.change(slider, { target: { value: '7' } });

      expect(slider).toHaveValue('7');
    });

    it('should handle minimum width value', () => {
      render(<DrawingStylePanel />);
      const setStyle = getSetStyle();

      const slider = screen.getByRole('slider', { name: /width/i });
      fireEvent.change(slider, { target: { value: '1' } });

      expect(setStyle).toHaveBeenCalledWith({ width: 1 });
      expect(slider).toHaveValue('1');
    });

    it('should handle maximum width value', () => {
      render(<DrawingStylePanel />);
      const setStyle = getSetStyle();

      const slider = screen.getByRole('slider', { name: /width/i });
      fireEvent.change(slider, { target: { value: '8' } });

      expect(setStyle).toHaveBeenCalledWith({ width: 8 });
      expect(slider).toHaveValue('8');
    });
  });

  // ==========================================================================
  // Opacity Control Tests
  // ==========================================================================

  describe('opacity control', () => {
    it('should have default opacity of 1', () => {
      render(<DrawingStylePanel />);
      const slider = screen.getByRole('slider', { name: /opacity/i });
      expect(slider).toHaveValue('1');
    });

    it('should call setStyleForSelection when opacity changes', () => {
      render(<DrawingStylePanel />);
      const setStyle = getSetStyle();

      const slider = screen.getByRole('slider', { name: /opacity/i });
      fireEvent.change(slider, { target: { value: '0.5' } });

      expect(setStyle).toHaveBeenCalledWith({ opacity: 0.5 });
    });

    it('should update local state when opacity changes', () => {
      render(<DrawingStylePanel />);
      const slider = screen.getByRole('slider', { name: /opacity/i });

      fireEvent.change(slider, { target: { value: '0.75' } });

      expect(slider).toHaveValue('0.75');
    });

    it('should handle zero opacity', () => {
      render(<DrawingStylePanel />);
      const setStyle = getSetStyle();

      const slider = screen.getByRole('slider', { name: /opacity/i });
      fireEvent.change(slider, { target: { value: '0' } });

      expect(setStyle).toHaveBeenCalledWith({ opacity: 0 });
    });

    it('should handle full opacity', () => {
      render(<DrawingStylePanel />);
      const setStyle = getSetStyle();

      const slider = screen.getByRole('slider', { name: /opacity/i });
      // First change to lower value, then back to 1
      fireEvent.change(slider, { target: { value: '0.5' } });
      fireEvent.change(slider, { target: { value: '1' } });

      expect(setStyle).toHaveBeenLastCalledWith({ opacity: 1 });
    });

    it('should handle step increments', () => {
      render(<DrawingStylePanel />);
      const setStyle = getSetStyle();

      const slider = screen.getByRole('slider', { name: /opacity/i });
      fireEvent.change(slider, { target: { value: '0.35' } });

      expect(setStyle).toHaveBeenCalledWith({ opacity: 0.35 });
    });
  });

  // ==========================================================================
  // Line Style Tests
  // ==========================================================================

  describe('line style', () => {
    it('should have default line style of solid', () => {
      render(<DrawingStylePanel />);
      const select = screen.getByRole('combobox', { name: /line style/i });
      expect(select).toHaveValue('solid');
    });

    it('should call setStyleForSelection when line style changes to dash', async () => {
      render(<DrawingStylePanel />);
      const setStyle = getSetStyle();

      const select = screen.getByRole('combobox', { name: /line style/i });
      await user.selectOptions(select, 'dash');

      expect(setStyle).toHaveBeenCalledWith({ lineStyle: 'dash' });
    });

    it('should call setStyleForSelection when line style changes to dot', async () => {
      render(<DrawingStylePanel />);
      const setStyle = getSetStyle();

      const select = screen.getByRole('combobox', { name: /line style/i });
      await user.selectOptions(select, 'dot');

      expect(setStyle).toHaveBeenCalledWith({ lineStyle: 'dot' });
    });

    it('should update local state when line style changes', async () => {
      render(<DrawingStylePanel />);
      const select = screen.getByRole('combobox', { name: /line style/i });

      await user.selectOptions(select, 'dash');
      expect(select).toHaveValue('dash');

      await user.selectOptions(select, 'dot');
      expect(select).toHaveValue('dot');

      await user.selectOptions(select, 'solid');
      expect(select).toHaveValue('solid');
    });
  });

  // ==========================================================================
  // Fill Control Tests
  // ==========================================================================

  describe('fill control', () => {
    it('should have default fill of transparent', () => {
      render(<DrawingStylePanel />);
      const input = screen.getByPlaceholderText('transparent or #hex');
      expect(input).toHaveValue('transparent');
    });

    it('should call setStyleForSelection when fill changes', () => {
      render(<DrawingStylePanel />);
      const setStyle = getSetStyle();

      const input = screen.getByPlaceholderText('transparent or #hex');
      // Use fireEvent to directly set the value (simulating user typing)
      fireEvent.change(input, { target: { value: '#ff0000' } });

      expect(setStyle).toHaveBeenCalledWith({ fill: '#ff0000' });
    });

    it('should default to transparent when fill is cleared', async () => {
      render(<DrawingStylePanel />);
      const setStyle = getSetStyle();

      const input = screen.getByPlaceholderText('transparent or #hex');
      await user.type(input, 'blue');
      await user.clear(input);

      // After clearing, it should default to 'transparent'
      expect(setStyle).toHaveBeenLastCalledWith({ fill: 'transparent' });
    });

    it('should allow entering transparent as fill', () => {
      render(<DrawingStylePanel />);
      const setStyle = getSetStyle();

      const input = screen.getByPlaceholderText('transparent or #hex');
      // Change to a different value first
      fireEvent.change(input, { target: { value: 'rgba(0,0,0,0.5)' } });
      // Then back to transparent
      fireEvent.change(input, { target: { value: 'transparent' } });

      expect(setStyle).toHaveBeenLastCalledWith({ fill: 'transparent' });
    });

    it('should allow entering hex color as fill', () => {
      render(<DrawingStylePanel />);
      const setStyle = getSetStyle();

      const input = screen.getByPlaceholderText('transparent or #hex');
      fireEvent.change(input, { target: { value: '#00ff00' } });

      expect(setStyle).toHaveBeenCalledWith({ fill: '#00ff00' });
    });
  });

  // ==========================================================================
  // Text Input Tests
  // ==========================================================================

  describe('text input', () => {
    it('should have empty text by default', () => {
      render(<DrawingStylePanel />);
      const input = screen.getByPlaceholderText('Edit text...');
      expect(input).toHaveValue('');
    });

    it('should update local state when typing', async () => {
      render(<DrawingStylePanel />);
      const input = screen.getByPlaceholderText('Edit text...');

      await user.type(input, 'Hello World');

      expect(input).toHaveValue('Hello World');
    });

    it('should call setTextForSelection on blur', async () => {
      render(<DrawingStylePanel />);
      const setText = getSetText();

      const input = screen.getByPlaceholderText('Edit text...');
      await user.type(input, 'Test Label');
      await user.tab(); // Blur the input

      expect(setText).toHaveBeenCalledWith('Test Label');
    });

    it('should not call setTextForSelection while typing', async () => {
      render(<DrawingStylePanel />);
      const setText = getSetText();

      const input = screen.getByPlaceholderText('Edit text...');
      await user.type(input, 'Some text');

      // setTextForSelection should not be called until blur
      expect(setText).not.toHaveBeenCalled();
    });

    it('should call setTextForSelection with empty string on blur if cleared', async () => {
      render(<DrawingStylePanel />);
      const setText = getSetText();

      const input = screen.getByPlaceholderText('Edit text...');
      await user.type(input, 'Text to clear');
      await user.clear(input);
      await user.tab();

      expect(setText).toHaveBeenCalledWith('');
    });
  });

  // ==========================================================================
  // Selection Display Tests
  // ==========================================================================

  describe('selection display', () => {
    it('should show "Select a drawing to edit" when selection is empty', () => {
      act(() => {
        useChartStore.setState({ selection: new Set<string>() });
      });

      render(<DrawingStylePanel />);
      expect(screen.getByText('Select a drawing to edit.')).toBeInTheDocument();
    });

    it('should show "1 selected" when one drawing is selected', () => {
      act(() => {
        useChartStore.setState({ selection: new Set(['draw-1']) });
      });

      render(<DrawingStylePanel />);
      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });

    it('should show "2 selected" when two drawings are selected', () => {
      act(() => {
        useChartStore.setState({ selection: new Set(['draw-1', 'draw-2']) });
      });

      render(<DrawingStylePanel />);
      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });

    it('should show "5 selected" when five drawings are selected', () => {
      act(() => {
        useChartStore.setState({
          selection: new Set(['draw-1', 'draw-2', 'draw-3', 'draw-4', 'draw-5']),
        });
      });

      render(<DrawingStylePanel />);
      expect(screen.getByText('5 selected')).toBeInTheDocument();
    });

    it('should update selection count when selection changes', () => {
      act(() => {
        useChartStore.setState({ selection: new Set(['draw-1']) });
      });

      const { rerender } = render(<DrawingStylePanel />);
      expect(screen.getByText('1 selected')).toBeInTheDocument();

      act(() => {
        useChartStore.setState({ selection: new Set(['draw-1', 'draw-2', 'draw-3']) });
      });

      rerender(<DrawingStylePanel />);
      expect(screen.getByText('3 selected')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('integration', () => {
    it('should allow multiple style changes in sequence', async () => {
      render(<DrawingStylePanel />);
      const setStyle = getSetStyle();

      // Change color
      const colorButton = screen.getByTitle('#ef4444');
      await user.click(colorButton);
      expect(setStyle).toHaveBeenCalledWith({ color: '#ef4444' });

      // Change width
      const widthSlider = screen.getByRole('slider', { name: /width/i });
      fireEvent.change(widthSlider, { target: { value: '4' } });
      expect(setStyle).toHaveBeenCalledWith({ width: 4 });

      // Change opacity
      const opacitySlider = screen.getByRole('slider', { name: /opacity/i });
      fireEvent.change(opacitySlider, { target: { value: '0.7' } });
      expect(setStyle).toHaveBeenCalledWith({ opacity: 0.7 });

      // Change line style
      const lineSelect = screen.getByRole('combobox', { name: /line style/i });
      await user.selectOptions(lineSelect, 'dash');
      expect(setStyle).toHaveBeenCalledWith({ lineStyle: 'dash' });

      expect(setStyle).toHaveBeenCalledTimes(4);
    });

    it('should allow text editing with other style changes', async () => {
      render(<DrawingStylePanel />);
      const setStyle = getSetStyle();
      const setText = getSetText();

      // Change color first
      await user.click(screen.getByTitle('#22c55e'));
      expect(setStyle).toHaveBeenCalledWith({ color: '#22c55e' });

      // Then edit text
      const textInput = screen.getByPlaceholderText('Edit text...');
      await user.type(textInput, 'Label');
      await user.tab();

      expect(setText).toHaveBeenCalledWith('Label');
    });

    it('should maintain local state across renders', () => {
      const { rerender } = render(<DrawingStylePanel />);

      // Change width
      const widthSlider = screen.getByRole('slider', { name: /width/i });
      fireEvent.change(widthSlider, { target: { value: '6' } });

      // Change line style
      const lineSelect = screen.getByRole('combobox', { name: /line style/i });
      fireEvent.change(lineSelect, { target: { value: 'dot' } });

      // Rerender
      rerender(<DrawingStylePanel />);

      // Local state should be preserved
      expect(screen.getByRole('slider', { name: /width/i })).toHaveValue('6');
      expect(screen.getByRole('combobox', { name: /line style/i })).toHaveValue('dot');
    });

    it('should work with selected drawings', async () => {
      act(() => {
        useChartStore.setState({
          selection: new Set(['draw-1', 'draw-2']),
        });
      });

      render(<DrawingStylePanel />);
      const setStyle = getSetStyle();

      expect(screen.getByText('2 selected')).toBeInTheDocument();

      // Style change should apply to selection
      await user.click(screen.getByTitle('#a78bfa'));
      expect(setStyle).toHaveBeenCalledWith({ color: '#a78bfa' });
    });
  });
});
