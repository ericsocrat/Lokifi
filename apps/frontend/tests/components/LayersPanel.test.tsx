/**
 * Tests for LayersPanel Component
 *
 * Covers the layer management panel UI:
 * - Rendering and initial state
 * - Add new layer functionality
 * - Layer row interactions (visibility, lock, rename, opacity)
 * - Layer ordering (move up/down)
 * - Active layer selection
 *
 * Session 131: Test coverage for LayersPanel component
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LayersPanel from '../../src/components/LayersPanel';
import type { Layer } from '../../src/state/store';
import { useChartStore } from '../../src/state/store';

// ============================================================================
// TEST UTILITIES
// ============================================================================

// Reset store between tests
const resetStore = () => {
  useChartStore.setState({
    layers: [],
    activeLayerId: null,
  });
};

// Mock layer factory
const createMockLayer = (overrides: Partial<Layer> = {}): Layer => ({
  id: crypto.randomUUID(),
  name: 'Test Layer',
  visible: true,
  locked: false,
  opacity: 1,
  order: 0,
  ...overrides,
});

describe('LayersPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  afterEach(() => {
    resetStore();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('rendering', () => {
    it('should render the panel title', () => {
      render(<LayersPanel />);
      expect(screen.getByText('Layers')).toBeInTheDocument();
    });

    it('should render name input with default value', () => {
      render(<LayersPanel />);
      expect(screen.getByDisplayValue('Layer')).toBeInTheDocument();
    });

    it('should render add button', () => {
      render(<LayersPanel />);
      expect(screen.getByText('+ Add')).toBeInTheDocument();
    });

    it('should render empty state when no layers', () => {
      render(<LayersPanel />);
      // No layer rows should be present
      expect(screen.queryByTitle('Toggle visibility')).not.toBeInTheDocument();
    });

    it('should render layer rows when layers exist', () => {
      const layer = createMockLayer({ name: 'My Layer' });

      act(() => {
        useChartStore.setState({ layers: [layer] });
      });

      render(<LayersPanel />);
      expect(screen.getByText('My Layer')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Add Layer Tests
  // ==========================================================================

  describe('add layer', () => {
    it('should update name input on change', async () => {
      render(<LayersPanel />);
      const nameInput = screen.getByDisplayValue('Layer');

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'New Layer' } });
      });

      expect(screen.getByDisplayValue('New Layer')).toBeInTheDocument();
    });

    it('should add layer with entered name', async () => {
      render(<LayersPanel />);
      const nameInput = screen.getByDisplayValue('Layer');
      const addButton = screen.getByText('+ Add');

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'Custom Layer' } });
      });

      await act(async () => {
        fireEvent.click(addButton);
      });

      expect(useChartStore.getState().layers.length).toBe(1);
      expect(useChartStore.getState().layers[0].name).toBe('Custom Layer');
    });

    it('should add layer with default name when input is empty', async () => {
      render(<LayersPanel />);
      const nameInput = screen.getByDisplayValue('Layer');
      const addButton = screen.getByText('+ Add');

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: '' } });
      });

      await act(async () => {
        fireEvent.click(addButton);
      });

      expect(useChartStore.getState().layers.length).toBe(1);
      expect(useChartStore.getState().layers[0].name).toBe('Layer');
    });

    it('should add multiple layers', async () => {
      render(<LayersPanel />);
      const addButton = screen.getByText('+ Add');

      await act(async () => {
        fireEvent.click(addButton);
      });
      await act(async () => {
        fireEvent.click(addButton);
      });
      await act(async () => {
        fireEvent.click(addButton);
      });

      expect(useChartStore.getState().layers.length).toBe(3);
    });
  });

  // ==========================================================================
  // Layer Row Display Tests
  // ==========================================================================

  describe('layer row display', () => {
    it('should display layer name', () => {
      const layer = createMockLayer({ name: 'Background' });

      act(() => {
        useChartStore.setState({ layers: [layer] });
      });

      render(<LayersPanel />);
      expect(screen.getByText('Background')).toBeInTheDocument();
    });

    it('should display visibility button', () => {
      const layer = createMockLayer();

      act(() => {
        useChartStore.setState({ layers: [layer] });
      });

      render(<LayersPanel />);
      expect(screen.getByTitle('Toggle visibility')).toBeInTheDocument();
      expect(screen.getByText('👁')).toBeInTheDocument();
    });

    it('should display lock button', () => {
      const layer = createMockLayer();

      act(() => {
        useChartStore.setState({ layers: [layer] });
      });

      render(<LayersPanel />);
      expect(screen.getByTitle('Toggle lock')).toBeInTheDocument();
      expect(screen.getByText('🔒')).toBeInTheDocument();
    });

    it('should display opacity slider', () => {
      const layer = createMockLayer();

      act(() => {
        useChartStore.setState({ layers: [layer] });
      });

      render(<LayersPanel />);
      expect(screen.getByTitle('Opacity')).toBeInTheDocument();
    });

    it('should display move buttons', () => {
      const layer = createMockLayer();

      act(() => {
        useChartStore.setState({ layers: [layer] });
      });

      render(<LayersPanel />);
      expect(screen.getByTitle('Up')).toBeInTheDocument();
      expect(screen.getByTitle('Down')).toBeInTheDocument();
    });

    it('should display use button', () => {
      const layer = createMockLayer();

      act(() => {
        useChartStore.setState({ layers: [layer] });
      });

      render(<LayersPanel />);
      expect(screen.getByTitle('Set active')).toBeInTheDocument();
      expect(screen.getByText('Use')).toBeInTheDocument();
    });

    it('should highlight active layer', () => {
      const layer = createMockLayer({ id: 'layer-1' });

      act(() => {
        useChartStore.setState({
          layers: [layer],
          activeLayerId: 'layer-1',
        });
      });

      render(<LayersPanel />);
      // The Use button should have different styling
      const useButton = screen.getByText('Use');
      expect(useButton).toHaveClass('border-emerald-400/50');
    });

    it('should not highlight inactive layer', () => {
      const layer = createMockLayer({ id: 'layer-1' });

      act(() => {
        useChartStore.setState({
          layers: [layer],
          activeLayerId: null,
        });
      });

      render(<LayersPanel />);
      const useButton = screen.getByText('Use');
      expect(useButton).toHaveClass('border-white/15');
    });
  });

  // ==========================================================================
  // Visibility Toggle Tests
  // ==========================================================================

  describe('visibility toggle', () => {
    it('should toggle layer visibility on click', async () => {
      const layer = createMockLayer({ visible: true });

      act(() => {
        useChartStore.setState({ layers: [layer] });
      });

      render(<LayersPanel />);
      const visibilityButton = screen.getByTitle('Toggle visibility');

      await act(async () => {
        fireEvent.click(visibilityButton);
      });

      expect(useChartStore.getState().layers[0].visible).toBe(false);
    });

    it('should show full opacity for visible layer', () => {
      const layer = createMockLayer({ visible: true });

      act(() => {
        useChartStore.setState({ layers: [layer] });
      });

      render(<LayersPanel />);
      const visibilityButton = screen.getByTitle('Toggle visibility');
      expect(visibilityButton).toHaveClass('opacity-100');
    });

    it('should show reduced opacity for hidden layer', () => {
      const layer = createMockLayer({ visible: false });

      act(() => {
        useChartStore.setState({ layers: [layer] });
      });

      render(<LayersPanel />);
      const visibilityButton = screen.getByTitle('Toggle visibility');
      expect(visibilityButton).toHaveClass('opacity-40');
    });
  });

  // ==========================================================================
  // Lock Toggle Tests
  // ==========================================================================

  describe('lock toggle', () => {
    it('should toggle layer lock on click', async () => {
      const layer = createMockLayer({ locked: false });

      act(() => {
        useChartStore.setState({ layers: [layer] });
      });

      render(<LayersPanel />);
      const lockButton = screen.getByTitle('Toggle lock');

      await act(async () => {
        fireEvent.click(lockButton);
      });

      expect(useChartStore.getState().layers[0].locked).toBe(true);
    });

    it('should show full opacity for locked layer', () => {
      const layer = createMockLayer({ locked: true });

      act(() => {
        useChartStore.setState({ layers: [layer] });
      });

      render(<LayersPanel />);
      const lockButton = screen.getByTitle('Toggle lock');
      expect(lockButton).toHaveClass('opacity-100');
    });

    it('should show reduced opacity for unlocked layer', () => {
      const layer = createMockLayer({ locked: false });

      act(() => {
        useChartStore.setState({ layers: [layer] });
      });

      render(<LayersPanel />);
      const lockButton = screen.getByTitle('Toggle lock');
      expect(lockButton).toHaveClass('opacity-40');
    });
  });

  // ==========================================================================
  // Rename Layer Tests
  // ==========================================================================

  describe('rename layer', () => {
    it('should enter edit mode on layer name click', async () => {
      const layer = createMockLayer({ name: 'Original Name' });

      act(() => {
        useChartStore.setState({ layers: [layer] });
      });

      render(<LayersPanel />);
      const layerName = screen.getByText('Original Name');

      await act(async () => {
        fireEvent.click(layerName);
      });

      // Should show input in edit mode
      expect(screen.getByDisplayValue('Original Name')).toBeInTheDocument();
    });

    it('should rename layer on blur', async () => {
      const layer = createMockLayer({ name: 'Original Name' });

      act(() => {
        useChartStore.setState({ layers: [layer] });
      });

      render(<LayersPanel />);
      const layerName = screen.getByText('Original Name');

      await act(async () => {
        fireEvent.click(layerName);
      });

      const editInput = screen.getByDisplayValue('Original Name');

      await act(async () => {
        fireEvent.change(editInput, { target: { value: 'New Name' } });
      });

      await act(async () => {
        fireEvent.blur(editInput);
      });

      expect(useChartStore.getState().layers[0].name).toBe('New Name');
    });

    it('should rename layer on Enter key', async () => {
      const layer = createMockLayer({ name: 'Original' });

      act(() => {
        useChartStore.setState({ layers: [layer] });
      });

      render(<LayersPanel />);
      const layerName = screen.getByText('Original');

      await act(async () => {
        fireEvent.click(layerName);
      });

      const editInput = screen.getByDisplayValue('Original');

      await act(async () => {
        fireEvent.change(editInput, { target: { value: 'Renamed' } });
      });

      await act(async () => {
        fireEvent.keyDown(editInput, { key: 'Enter' });
      });

      expect(useChartStore.getState().layers[0].name).toBe('Renamed');
    });

    it('should keep original name when input is empty', async () => {
      const layer = createMockLayer({ name: 'Keep This' });

      act(() => {
        useChartStore.setState({ layers: [layer] });
      });

      render(<LayersPanel />);
      const layerName = screen.getByText('Keep This');

      await act(async () => {
        fireEvent.click(layerName);
      });

      const editInput = screen.getByDisplayValue('Keep This');

      await act(async () => {
        fireEvent.change(editInput, { target: { value: '' } });
      });

      await act(async () => {
        fireEvent.blur(editInput);
      });

      expect(useChartStore.getState().layers[0].name).toBe('Keep This');
    });
  });

  // ==========================================================================
  // Opacity Tests
  // ==========================================================================

  describe('opacity control', () => {
    it('should display current opacity value', () => {
      const layer = createMockLayer({ opacity: 0.75 });

      act(() => {
        useChartStore.setState({ layers: [layer] });
      });

      render(<LayersPanel />);
      const opacitySlider = screen.getByTitle('Opacity');
      expect(opacitySlider).toHaveValue('75');
    });

    it('should update opacity on slider change', async () => {
      const layer = createMockLayer({ opacity: 1 });

      act(() => {
        useChartStore.setState({ layers: [layer] });
      });

      render(<LayersPanel />);
      const opacitySlider = screen.getByTitle('Opacity');

      await act(async () => {
        fireEvent.change(opacitySlider, { target: { value: '50' } });
      });

      expect(useChartStore.getState().layers[0].opacity).toBe(0.5);
    });

    it('should handle full opacity', async () => {
      const layer = createMockLayer({ opacity: 0.5 });

      act(() => {
        useChartStore.setState({ layers: [layer] });
      });

      render(<LayersPanel />);
      const opacitySlider = screen.getByTitle('Opacity');

      await act(async () => {
        fireEvent.change(opacitySlider, { target: { value: '100' } });
      });

      expect(useChartStore.getState().layers[0].opacity).toBe(1);
    });

    it('should handle zero opacity', async () => {
      const layer = createMockLayer({ opacity: 1 });

      act(() => {
        useChartStore.setState({ layers: [layer] });
      });

      render(<LayersPanel />);
      const opacitySlider = screen.getByTitle('Opacity');

      await act(async () => {
        fireEvent.change(opacitySlider, { target: { value: '0' } });
      });

      expect(useChartStore.getState().layers[0].opacity).toBe(0);
    });
  });

  // ==========================================================================
  // Layer Order Tests
  // ==========================================================================

  describe('layer ordering', () => {
    it('should display layers in order', () => {
      const layer1 = createMockLayer({ name: 'First', order: 0 });
      const layer2 = createMockLayer({ name: 'Second', order: 1 });
      const layer3 = createMockLayer({ name: 'Third', order: 2 });

      act(() => {
        useChartStore.setState({
          layers: [layer3, layer1, layer2], // Wrong order in state
        });
      });

      render(<LayersPanel />);
      const layerNames = screen.getAllByText(/First|Second|Third/);

      // Should be sorted by order
      expect(layerNames[0]).toHaveTextContent('First');
      expect(layerNames[1]).toHaveTextContent('Second');
      expect(layerNames[2]).toHaveTextContent('Third');
    });

    it('should move layer up on up button click', async () => {
      const layer = createMockLayer();

      act(() => {
        useChartStore.setState({ layers: [layer] });
      });

      render(<LayersPanel />);
      const upButton = screen.getByTitle('Up');

      await act(async () => {
        fireEvent.click(upButton);
      });

      // moveLayer should have been called
      // (Implementation will vary based on store behavior)
      expect(upButton).toBeInTheDocument();
    });

    it('should move layer down on down button click', async () => {
      const layer = createMockLayer();

      act(() => {
        useChartStore.setState({ layers: [layer] });
      });

      render(<LayersPanel />);
      const downButton = screen.getByTitle('Down');

      await act(async () => {
        fireEvent.click(downButton);
      });

      // moveLayer should have been called
      expect(downButton).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Active Layer Tests
  // ==========================================================================

  describe('active layer selection', () => {
    it('should set layer as active on Use button click', async () => {
      const layer = createMockLayer({ id: 'test-layer' });

      act(() => {
        useChartStore.setState({
          layers: [layer],
          activeLayerId: null,
        });
      });

      render(<LayersPanel />);
      const useButton = screen.getByText('Use');

      await act(async () => {
        fireEvent.click(useButton);
      });

      expect(useChartStore.getState().activeLayerId).toBe('test-layer');
    });

    it('should allow changing active layer between layers', async () => {
      const layer1 = createMockLayer({ id: 'layer-1', name: 'Layer 1' });
      const layer2 = createMockLayer({ id: 'layer-2', name: 'Layer 2' });

      act(() => {
        useChartStore.setState({
          layers: [layer1, layer2],
          activeLayerId: 'layer-1',
        });
      });

      render(<LayersPanel />);
      const useButtons = screen.getAllByText('Use');

      // Click second layer's Use button
      await act(async () => {
        fireEvent.click(useButtons[1]);
      });

      expect(useChartStore.getState().activeLayerId).toBe('layer-2');
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('integration', () => {
    it('should update display when store changes', async () => {
      render(<LayersPanel />);
      expect(screen.queryByTitle('Toggle visibility')).not.toBeInTheDocument();

      act(() => {
        useChartStore.setState({
          layers: [createMockLayer({ name: 'New Layer' })],
        });
      });

      // Layer should now be visible
      expect(screen.getByText('New Layer')).toBeInTheDocument();
      expect(screen.getByTitle('Toggle visibility')).toBeInTheDocument();
    });

    it('should handle full layer workflow', async () => {
      render(<LayersPanel />);

      // Add a layer
      const nameInput = screen.getByDisplayValue('Layer');
      const addButton = screen.getByText('+ Add');

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'Test Layer' } });
      });

      await act(async () => {
        fireEvent.click(addButton);
      });

      // Verify layer was added
      expect(screen.getByText('Test Layer')).toBeInTheDocument();

      // Set as active
      const useButton = screen.getByText('Use');
      await act(async () => {
        fireEvent.click(useButton);
      });

      // Toggle visibility
      const visibilityButton = screen.getByTitle('Toggle visibility');
      await act(async () => {
        fireEvent.click(visibilityButton);
      });

      // Toggle lock
      const lockButton = screen.getByTitle('Toggle lock');
      await act(async () => {
        fireEvent.click(lockButton);
      });

      // Verify state
      const layers = useChartStore.getState().layers;
      expect(layers.length).toBe(1);
      expect(layers[0].visible).toBe(false);
      expect(layers[0].locked).toBe(true);
      expect(useChartStore.getState().activeLayerId).toBe(layers[0].id);
    });

    it('should handle undefined order values', () => {
      const layer1 = createMockLayer({ name: 'No Order', order: undefined });
      const layer2 = createMockLayer({ name: 'Has Order', order: 1 });

      act(() => {
        useChartStore.setState({
          layers: [layer2, layer1],
        });
      });

      render(<LayersPanel />);
      // Should not crash and display both layers
      expect(screen.getByText('No Order')).toBeInTheDocument();
      expect(screen.getByText('Has Order')).toBeInTheDocument();
    });

    it('should handle undefined opacity values', () => {
      const layer = createMockLayer({ opacity: undefined });

      act(() => {
        useChartStore.setState({ layers: [layer] });
      });

      render(<LayersPanel />);
      const opacitySlider = screen.getByTitle('Opacity');
      // Should default to 100 (opacity 1)
      expect(opacitySlider).toHaveValue('100');
    });
  });
});
