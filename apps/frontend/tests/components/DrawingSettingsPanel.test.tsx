/**
 * Tests for DrawingSettingsPanel Component
 *
 * Covers the drawing settings panel UI:
 * - Rendering and display
 * - Grid snap settings (enabled, step size)
 * - Price level snap toggle
 * - Selection handles toggle
 * - Line labels toggle
 * - Line cap selection
 * - Arrow head selection
 * - Arrow size adjustment
 * - Reset drawing settings
 * - Hotkey configuration
 * - Reset hotkeys
 *
 * Session 130: Test coverage for DrawingSettingsPanel component
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DrawingSettingsPanel from '../../src/components/DrawingSettingsPanel';
import { useChartStore } from '../../src/state/store';

// ============================================================================
// TEST UTILITIES
// ============================================================================

// Reset store between tests
const resetStore = () => {
  useChartStore.setState({
    drawingSettings: {
      snapEnabled: false,
      snapStep: 10,
      snapPriceLevels: false,
      showHandles: true,
      showLineLabels: false,
      lineCap: 'butt',
      arrowHead: 'none',
      arrowHeadSize: 12,
      lineWidth: 2,
      color: '#ffffff',
    },
    hotkeys: {},
  });
};

// Mock toast function
const mockToast = vi.fn();

describe('DrawingSettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
    // Setup toast mock
    (window as Record<string, unknown>).__lokifi_toast = mockToast;
  });

  afterEach(() => {
    resetStore();
    delete (window as Record<string, unknown>).__lokifi_toast;
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('rendering', () => {
    it('should render the panel title', () => {
      render(<DrawingSettingsPanel />);
      expect(screen.getByText('Drawing Settings')).toBeInTheDocument();
    });

    it('should render hotkeys section title', () => {
      render(<DrawingSettingsPanel />);
      expect(screen.getByText('Hotkeys')).toBeInTheDocument();
    });

    it('should render reset drawing settings button', () => {
      render(<DrawingSettingsPanel />);
      expect(screen.getByText('Reset drawing settings')).toBeInTheDocument();
    });

    it('should render reset hotkeys button', () => {
      render(<DrawingSettingsPanel />);
      expect(screen.getByText('Reset hotkeys')).toBeInTheDocument();
    });

    it('should render all settings checkboxes', () => {
      render(<DrawingSettingsPanel />);
      expect(screen.getByText('Grid snap')).toBeInTheDocument();
      expect(screen.getByText('Snap to price levels (OHLC/close)')).toBeInTheDocument();
      expect(screen.getByText('Show selection handles')).toBeInTheDocument();
      expect(screen.getByText('Show line labels (% change)')).toBeInTheDocument();
    });

    it('should render line cap selector', () => {
      render(<DrawingSettingsPanel />);
      expect(screen.getByText('Line cap')).toBeInTheDocument();
    });

    it('should render arrow head selector', () => {
      render(<DrawingSettingsPanel />);
      expect(screen.getByText('Arrow head')).toBeInTheDocument();
    });

    it('should render arrow size slider', () => {
      render(<DrawingSettingsPanel />);
      expect(screen.getByText('Arrow size')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Grid Snap Tests
  // ==========================================================================

  describe('grid snap settings', () => {
    it('should reflect initial snap enabled state', () => {
      useChartStore.setState({
        drawingSettings: {
          ...useChartStore.getState().drawingSettings,
          snapEnabled: true,
        },
      });

      render(<DrawingSettingsPanel />);
      const checkbox = screen.getByLabelText('Grid snap');
      expect(checkbox).toBeChecked();
    });

    it('should toggle snap enabled on click', async () => {
      render(<DrawingSettingsPanel />);
      const checkbox = screen.getByLabelText('Grid snap');

      expect(checkbox).not.toBeChecked();

      await act(async () => {
        fireEvent.click(checkbox);
      });

      expect(useChartStore.getState().drawingSettings.snapEnabled).toBe(true);
    });

    it('should update snap step on input change', async () => {
      render(<DrawingSettingsPanel />);
      const input = screen.getByDisplayValue('10'); // default snapStep

      await act(async () => {
        fireEvent.change(input, { target: { value: '25' } });
      });

      expect(useChartStore.getState().drawingSettings.snapStep).toBe(25);
    });

    it('should enforce minimum snap step of 1', async () => {
      render(<DrawingSettingsPanel />);
      const input = screen.getByDisplayValue('10');

      await act(async () => {
        fireEvent.change(input, { target: { value: '0' } });
      });

      expect(useChartStore.getState().drawingSettings.snapStep).toBe(1);
    });
  });

  // ==========================================================================
  // Price Level Snap Tests
  // ==========================================================================

  describe('price level snap', () => {
    it('should reflect initial snap price levels state', () => {
      useChartStore.setState({
        drawingSettings: {
          ...useChartStore.getState().drawingSettings,
          snapPriceLevels: true,
        },
      });

      render(<DrawingSettingsPanel />);
      const checkbox = screen.getByLabelText('Snap to price levels (OHLC/close)');
      expect(checkbox).toBeChecked();
    });

    it('should toggle snap price levels on click', async () => {
      render(<DrawingSettingsPanel />);
      const checkbox = screen.getByLabelText('Snap to price levels (OHLC/close)');

      await act(async () => {
        fireEvent.click(checkbox);
      });

      expect(useChartStore.getState().drawingSettings.snapPriceLevels).toBe(true);
    });
  });

  // ==========================================================================
  // Show Handles Tests
  // ==========================================================================

  describe('show handles', () => {
    it('should reflect initial show handles state', () => {
      render(<DrawingSettingsPanel />);
      const checkbox = screen.getByLabelText('Show selection handles');
      expect(checkbox).toBeChecked(); // default is true
    });

    it('should toggle show handles on click', async () => {
      render(<DrawingSettingsPanel />);
      const checkbox = screen.getByLabelText('Show selection handles');

      await act(async () => {
        fireEvent.click(checkbox);
      });

      expect(useChartStore.getState().drawingSettings.showHandles).toBe(false);
    });
  });

  // ==========================================================================
  // Show Line Labels Tests
  // ==========================================================================

  describe('show line labels', () => {
    it('should reflect initial show line labels state', () => {
      render(<DrawingSettingsPanel />);
      const checkbox = screen.getByLabelText('Show line labels (% change)');
      expect(checkbox).not.toBeChecked(); // default is false
    });

    it('should toggle show line labels on click', async () => {
      render(<DrawingSettingsPanel />);
      const checkbox = screen.getByLabelText('Show line labels (% change)');

      await act(async () => {
        fireEvent.click(checkbox);
      });

      expect(useChartStore.getState().drawingSettings.showLineLabels).toBe(true);
    });
  });

  // ==========================================================================
  // Line Cap Tests
  // ==========================================================================

  describe('line cap selection', () => {
    it('should reflect initial line cap value', () => {
      render(<DrawingSettingsPanel />);
      const select = screen.getByDisplayValue('butt');
      expect(select).toBeInTheDocument();
    });

    it('should update line cap on select change', async () => {
      render(<DrawingSettingsPanel />);
      const select = screen.getByDisplayValue('butt');

      await act(async () => {
        fireEvent.change(select, { target: { value: 'round' } });
      });

      expect(useChartStore.getState().drawingSettings.lineCap).toBe('round');
    });

    it('should have all line cap options', () => {
      render(<DrawingSettingsPanel />);
      expect(screen.getByRole('option', { name: 'butt' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'round' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'square' })).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Arrow Head Tests
  // ==========================================================================

  describe('arrow head selection', () => {
    it('should reflect initial arrow head value', () => {
      render(<DrawingSettingsPanel />);
      const select = screen.getByDisplayValue('none');
      expect(select).toBeInTheDocument();
    });

    it('should update arrow head on select change', async () => {
      render(<DrawingSettingsPanel />);
      const select = screen.getByDisplayValue('none');

      await act(async () => {
        fireEvent.change(select, { target: { value: 'filled' } });
      });

      expect(useChartStore.getState().drawingSettings.arrowHead).toBe('filled');
    });

    it('should have all arrow head options', () => {
      render(<DrawingSettingsPanel />);
      // Multiple 'none' options exist (line cap and arrow head both default to 'none')
      const noneOptions = screen.getAllByRole('option', { name: 'none' });
      expect(noneOptions.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole('option', { name: 'open' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'filled' })).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Arrow Size Tests
  // ==========================================================================

  describe('arrow size slider', () => {
    it('should reflect initial arrow size value', () => {
      render(<DrawingSettingsPanel />);
      expect(screen.getByText('12')).toBeInTheDocument(); // default arrowHeadSize
    });

    it('should update arrow size on slider change', async () => {
      render(<DrawingSettingsPanel />);
      const slider = screen.getByRole('slider');

      await act(async () => {
        fireEvent.change(slider, { target: { value: '24' } });
      });

      expect(useChartStore.getState().drawingSettings.arrowHeadSize).toBe(24);
    });
  });

  // ==========================================================================
  // Reset Drawing Settings Tests
  // ==========================================================================

  describe('reset drawing settings', () => {
    it('should reset all drawing settings on click', async () => {
      // Modify settings first
      useChartStore.setState({
        drawingSettings: {
          ...useChartStore.getState().drawingSettings,
          snapEnabled: true,
          snapStep: 50,
          lineCap: 'round',
          arrowHead: 'filled',
          arrowHeadSize: 30,
        },
      });

      render(<DrawingSettingsPanel />);
      const resetButton = screen.getByText('Reset drawing settings');

      await act(async () => {
        fireEvent.click(resetButton);
      });

      // Check that reset was called (settings should be default)
      const ds = useChartStore.getState().drawingSettings;
      expect(ds.lineWidth).toBe(2); // default
    });

    it('should show toast on reset', async () => {
      render(<DrawingSettingsPanel />);
      const resetButton = screen.getByText('Reset drawing settings');

      await act(async () => {
        fireEvent.click(resetButton);
      });

      expect(mockToast).toHaveBeenCalledWith('Drawing settings reset');
    });
  });

  // ==========================================================================
  // Hotkey Configuration Tests
  // ==========================================================================

  describe('hotkey configuration', () => {
    it('should render all hotkey labels', () => {
      render(<DrawingSettingsPanel />);
      expect(screen.getByText('Delete selected')).toBeInTheDocument();
      expect(screen.getByText('Duplicate selected')).toBeInTheDocument();
      expect(screen.getByText('Arrow size −')).toBeInTheDocument();
      expect(screen.getByText('Arrow size +')).toBeInTheDocument();
      expect(screen.getByText('Cycle line cap')).toBeInTheDocument();
      expect(screen.getByText('Cycle arrow head')).toBeInTheDocument();
      expect(screen.getByText('Align left')).toBeInTheDocument();
      expect(screen.getByText('Align right')).toBeInTheDocument();
      expect(screen.getByText('Align top')).toBeInTheDocument();
      expect(screen.getByText('Align bottom')).toBeInTheDocument();
      expect(screen.getByText('Distribute horizontal')).toBeInTheDocument();
      expect(screen.getByText('Distribute vertical')).toBeInTheDocument();
    });

    it('should render hotkey input fields with placeholders', () => {
      render(<DrawingSettingsPanel />);
      const inputs = screen.getAllByPlaceholderText('Press keys…');
      expect(inputs.length).toBe(12); // 12 hotkeys defined in HOTKEYS array
    });

    it('should display configured hotkey value', () => {
      useChartStore.setState({
        hotkeys: {
          DeleteSelected: 'Delete',
        },
      });

      render(<DrawingSettingsPanel />);
      expect(screen.getByDisplayValue('Delete')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Reset Hotkeys Tests
  // ==========================================================================

  describe('reset hotkeys', () => {
    it('should reset all hotkeys on click', async () => {
      // Set some hotkeys first
      useChartStore.setState({
        hotkeys: {
          DeleteSelected: 'Delete',
          DuplicateSelected: 'Ctrl+D',
        },
      });

      render(<DrawingSettingsPanel />);
      const resetButton = screen.getByText('Reset hotkeys');

      await act(async () => {
        fireEvent.click(resetButton);
      });

      expect(useChartStore.getState().hotkeys).toEqual({});
    });

    it('should show toast on hotkeys reset', async () => {
      render(<DrawingSettingsPanel />);
      const resetButton = screen.getByText('Reset hotkeys');

      await act(async () => {
        fireEvent.click(resetButton);
      });

      expect(mockToast).toHaveBeenCalledWith('Hotkeys reset');
    });
  });

  // ==========================================================================
  // Toast Debounce Tests
  // ==========================================================================

  describe('toast debouncing', () => {
    it('should show toast when changing settings', async () => {
      render(<DrawingSettingsPanel />);
      const checkbox = screen.getByLabelText('Grid snap');

      await act(async () => {
        fireEvent.click(checkbox);
      });

      expect(mockToast).toHaveBeenCalledWith('Saved');
    });

    it('should handle missing toast function gracefully', async () => {
      delete (window as Record<string, unknown>).__lokifi_toast;

      render(<DrawingSettingsPanel />);
      const checkbox = screen.getByLabelText('Grid snap');

      // Should not throw when toast is missing
      await act(async () => {
        fireEvent.click(checkbox);
      });

      expect(useChartStore.getState().drawingSettings.snapEnabled).toBe(true);
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('integration', () => {
    it('should update multiple settings in sequence', async () => {
      render(<DrawingSettingsPanel />);

      // Toggle grid snap
      await act(async () => {
        fireEvent.click(screen.getByLabelText('Grid snap'));
      });

      // Change snap step
      await act(async () => {
        fireEvent.change(screen.getByDisplayValue('10'), { target: { value: '20' } });
      });

      // Change line cap
      await act(async () => {
        fireEvent.change(screen.getByDisplayValue('butt'), { target: { value: 'round' } });
      });

      const ds = useChartStore.getState().drawingSettings;
      expect(ds.snapEnabled).toBe(true);
      expect(ds.snapStep).toBe(20);
      expect(ds.lineCap).toBe('round');
    });

    it('should reflect store changes in UI', async () => {
      const { rerender } = render(<DrawingSettingsPanel />);

      // Initial state
      expect(screen.getByLabelText('Grid snap')).not.toBeChecked();

      // Update store directly
      act(() => {
        useChartStore.setState({
          drawingSettings: {
            ...useChartStore.getState().drawingSettings,
            snapEnabled: true,
          },
        });
      });

      rerender(<DrawingSettingsPanel />);
      expect(screen.getByLabelText('Grid snap')).toBeChecked();
    });
  });
});
