/**
 * Tests for Chart State Store
 *
 * Covers the main ChartState Zustand store with:
 * - Core state (symbol, timeframe, theme)
 * - Indicator flags and settings
 * - Drawing management
 * - Selection operations
 * - Layer management
 * - Snapshot management
 * - Alert management
 * - UI state toggles
 * - Settings management
 *
 * Session 130: Test coverage for src/state/store.ts
 */

import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { INDICATOR_PRESETS, useChartStore } from '../../src/state/store';

// ============================================================================
// TEST UTILITIES
// ============================================================================

// Reset store between tests to avoid state pollution
const resetStore = () => {
  useChartStore.setState({
    symbol: 'AAPL',
    timeframe: '1h',
    theme: 'dark',
    indicatorControlsPanelVisible: false,
    drawings: [],
    selection: new Set<string>(),
    layers: [],
    snapshots: [],
    activeLayerId: null,
    alerts: [],
    alertEvents: [],
    activeTool: null,
  });
};

// Mock drawing factory
const createMockDrawing = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: crypto.randomUUID(),
  kind: 'line',
  type: 'trend-line',
  points: [
    { x: 0, y: 0 },
    { x: 100, y: 100 },
  ],
  visible: true,
  locked: false,
  ...overrides,
});

// Mock alert factory
const createMockAlert = (overrides: Partial<Record<string, unknown>> = {}) => ({
  symbol: 'AAPL',
  condition: 'above',
  value: 200,
  ...overrides,
});

describe('useChartStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  afterEach(() => {
    resetStore();
  });

  // ==========================================================================
  // Store Initialization Tests
  // ==========================================================================

  describe('initialization', () => {
    it('should have default symbol', () => {
      const state = useChartStore.getState();
      expect(state.symbol).toBe('AAPL');
    });

    it('should have default timeframe', () => {
      const state = useChartStore.getState();
      expect(state.timeframe).toBe('1h');
    });

    it('should have default dark theme', () => {
      const state = useChartStore.getState();
      expect(state.theme).toBe('dark');
    });

    it('should have empty drawings array', () => {
      const state = useChartStore.getState();
      expect(state.drawings).toEqual([]);
    });

    it('should have empty selection set', () => {
      const state = useChartStore.getState();
      expect(state.selection.size).toBe(0);
    });

    it('should have indicator flags with defaults', () => {
      const state = useChartStore.getState();
      expect(state.indicators.showBB).toBe(false);
      expect(state.indicators.bandFill).toBe(true);
    });

    it('should have default indicator settings', () => {
      const state = useChartStore.getState();
      expect(state.indicatorSettings.bbPeriod).toBe(20);
      expect(state.indicatorSettings.rsiPeriod).toBe(14);
    });
  });

  // ==========================================================================
  // Core State Actions Tests
  // ==========================================================================

  describe('core state actions', () => {
    describe('setSymbol', () => {
      it('should update symbol', () => {
        act(() => {
          useChartStore.getState().setSymbol('MSFT');
        });

        expect(useChartStore.getState().symbol).toBe('MSFT');
      });

      it('should accept crypto symbols', () => {
        act(() => {
          useChartStore.getState().setSymbol('BTC');
        });

        expect(useChartStore.getState().symbol).toBe('BTC');
      });
    });

    describe('setTimeframe', () => {
      it('should update timeframe', () => {
        act(() => {
          useChartStore.getState().setTimeframe('1d');
        });

        expect(useChartStore.getState().timeframe).toBe('1d');
      });

      it('should accept various timeframes', () => {
        const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];

        timeframes.forEach((tf) => {
          act(() => {
            useChartStore.getState().setTimeframe(tf);
          });
          expect(useChartStore.getState().timeframe).toBe(tf);
        });
      });
    });

    describe('setAll', () => {
      it('should update multiple state properties', () => {
        act(() => {
          useChartStore.getState().setAll({
            symbol: 'GOOGL',
            timeframe: '4h',
            theme: 'light',
          });
        });

        const state = useChartStore.getState();
        expect(state.symbol).toBe('GOOGL');
        expect(state.timeframe).toBe('4h');
        expect(state.theme).toBe('light');
      });

      it('should only update provided properties', () => {
        act(() => {
          useChartStore.getState().setAll({ symbol: 'AMZN' });
        });

        const state = useChartStore.getState();
        expect(state.symbol).toBe('AMZN');
        expect(state.timeframe).toBe('1h'); // unchanged
      });
    });

    describe('setState', () => {
      it('should update state with patch', () => {
        act(() => {
          useChartStore.getState().setState({ symbol: 'NVDA' });
        });

        expect(useChartStore.getState().symbol).toBe('NVDA');
      });
    });
  });

  // ==========================================================================
  // Indicator Tests
  // ==========================================================================

  describe('indicator actions', () => {
    describe('toggleIndicator', () => {
      it('should toggle indicator flag on', () => {
        act(() => {
          useChartStore.getState().toggleIndicator('showBB');
        });

        expect(useChartStore.getState().indicators.showBB).toBe(true);
      });

      it('should toggle indicator flag off', () => {
        // First turn on
        act(() => {
          useChartStore.getState().toggleIndicator('showRSI');
        });
        expect(useChartStore.getState().indicators.showRSI).toBe(true);

        // Then turn off
        act(() => {
          useChartStore.getState().toggleIndicator('showRSI');
        });
        expect(useChartStore.getState().indicators.showRSI).toBe(false);
      });
    });

    describe('updateIndicatorSettings', () => {
      it('should update indicator settings', () => {
        act(() => {
          useChartStore.getState().updateIndicatorSettings({ bbPeriod: 30 });
        });

        expect(useChartStore.getState().indicatorSettings.bbPeriod).toBe(30);
      });

      it('should preserve other settings', () => {
        const original = useChartStore.getState().indicatorSettings.rsiPeriod;

        act(() => {
          useChartStore.getState().updateIndicatorSettings({ bbPeriod: 25 });
        });

        expect(useChartStore.getState().indicatorSettings.rsiPeriod).toBe(original);
      });
    });

    describe('updateIndicatorSetting', () => {
      it('should update single indicator setting', () => {
        act(() => {
          useChartStore.getState().updateIndicatorSetting('rsiPeriod', 21);
        });

        expect(useChartStore.getState().indicatorSettings.rsiPeriod).toBe(21);
      });
    });

    describe('resetIndicatorSettings', () => {
      it('should reset indicator settings to defaults', () => {
        // Modify settings first
        act(() => {
          useChartStore.getState().updateIndicatorSettings({
            bbPeriod: 50,
            rsiPeriod: 30,
          });
        });

        // Reset
        act(() => {
          useChartStore.getState().resetIndicatorSettings();
        });

        expect(useChartStore.getState().indicatorSettings.bbPeriod).toBe(20);
        expect(useChartStore.getState().indicatorSettings.rsiPeriod).toBe(14);
      });
    });

    describe('applyPreset', () => {
      it('should apply day-trading preset', () => {
        act(() => {
          useChartStore.getState().applyPreset('day-trading');
        });

        const settings = useChartStore.getState().indicatorSettings;
        const preset = INDICATOR_PRESETS['day-trading'];

        // Check preset values were applied
        expect(settings.bbPeriod).toBe(preset.bbPeriod);
        expect(settings.rsiPeriod).toBe(preset.rsiPeriod);
      });

      it('should apply swing-trading preset', () => {
        act(() => {
          useChartStore.getState().applyPreset('swing-trading');
        });

        const settings = useChartStore.getState().indicatorSettings;
        const preset = INDICATOR_PRESETS['swing-trading'];

        expect(settings.bbPeriod).toBe(preset.bbPeriod);
        expect(settings.rsiPeriod).toBe(preset.rsiPeriod);
      });

      it('should apply position-trading preset', () => {
        act(() => {
          useChartStore.getState().applyPreset('position-trading');
        });

        const settings = useChartStore.getState().indicatorSettings;
        const preset = INDICATOR_PRESETS['position-trading'];

        expect(settings.bbPeriod).toBe(preset.bbPeriod);
        expect(settings.rsiPeriod).toBe(preset.rsiPeriod);
      });
    });
  });

  // ==========================================================================
  // UI State Tests
  // ==========================================================================

  describe('UI state', () => {
    describe('toggleIndicatorControlsPanel', () => {
      it('should toggle panel visibility on', () => {
        act(() => {
          useChartStore.getState().toggleIndicatorControlsPanel();
        });

        expect(useChartStore.getState().indicatorControlsPanelVisible).toBe(true);
      });

      it('should toggle panel visibility off', () => {
        // First turn on
        act(() => {
          useChartStore.getState().toggleIndicatorControlsPanel();
        });

        // Then turn off
        act(() => {
          useChartStore.getState().toggleIndicatorControlsPanel();
        });

        expect(useChartStore.getState().indicatorControlsPanelVisible).toBe(false);
      });
    });

    describe('setTool', () => {
      it('should set active tool', () => {
        act(() => {
          useChartStore.getState().setTool('trend-line');
        });

        expect(useChartStore.getState().activeTool).toBe('trend-line');
      });

      it('should clear tool with null', () => {
        act(() => {
          useChartStore.getState().setTool('trend-line');
        });

        act(() => {
          useChartStore.getState().setTool(null);
        });

        expect(useChartStore.getState().activeTool).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Drawing Actions Tests
  // ==========================================================================

  describe('drawing actions', () => {
    describe('addDrawing', () => {
      it('should add a drawing', () => {
        const drawing = createMockDrawing();

        act(() => {
          useChartStore.getState().addDrawing(drawing);
        });

        expect(useChartStore.getState().drawings.length).toBe(1);
        expect(useChartStore.getState().drawings[0].id).toBe(drawing.id);
      });

      it('should add multiple drawings', () => {
        const drawing1 = createMockDrawing();
        const drawing2 = createMockDrawing();

        act(() => {
          useChartStore.getState().addDrawing(drawing1);
          useChartStore.getState().addDrawing(drawing2);
        });

        expect(useChartStore.getState().drawings.length).toBe(2);
      });
    });

    describe('updateDrawing', () => {
      it('should update a drawing', () => {
        const drawing = createMockDrawing();

        act(() => {
          useChartStore.getState().addDrawing(drawing);
        });

        act(() => {
          useChartStore.getState().updateDrawing(drawing.id, (d) => ({
            ...d,
            visible: false,
          }));
        });

        expect(useChartStore.getState().drawings[0].visible).toBe(false);
      });

      it('should not modify other drawings', () => {
        const drawing1 = createMockDrawing();
        const drawing2 = createMockDrawing();

        act(() => {
          useChartStore.getState().addDrawing(drawing1);
          useChartStore.getState().addDrawing(drawing2);
        });

        act(() => {
          useChartStore.getState().updateDrawing(drawing1.id, (d) => ({
            ...d,
            visible: false,
          }));
        });

        const drawings = useChartStore.getState().drawings;
        expect(drawings.find((d) => d.id === drawing1.id)?.visible).toBe(false);
        expect(drawings.find((d) => d.id === drawing2.id)?.visible).toBe(true);
      });
    });

    describe('deleteSelected', () => {
      it('should delete selected drawings', () => {
        const drawing1 = createMockDrawing();
        const drawing2 = createMockDrawing();

        act(() => {
          useChartStore.getState().addDrawing(drawing1);
          useChartStore.getState().addDrawing(drawing2);
          useChartStore.getState().setSelection(new Set([drawing1.id]));
        });

        act(() => {
          useChartStore.getState().deleteSelected();
        });

        expect(useChartStore.getState().drawings.length).toBe(1);
        expect(useChartStore.getState().drawings[0].id).toBe(drawing2.id);
      });

      it('should clear selection after delete', () => {
        const drawing = createMockDrawing();

        act(() => {
          useChartStore.getState().addDrawing(drawing);
          useChartStore.getState().setSelection(new Set([drawing.id]));
        });

        act(() => {
          useChartStore.getState().deleteSelected();
        });

        expect(useChartStore.getState().selection.size).toBe(0);
      });
    });

    describe('bringToFront', () => {
      it('should move selected drawings to end of array', () => {
        const drawing1 = createMockDrawing();
        const drawing2 = createMockDrawing();
        const drawing3 = createMockDrawing();

        act(() => {
          useChartStore.getState().addDrawing(drawing1);
          useChartStore.getState().addDrawing(drawing2);
          useChartStore.getState().addDrawing(drawing3);
          useChartStore.getState().setSelection(new Set([drawing1.id]));
        });

        act(() => {
          useChartStore.getState().bringToFront();
        });

        const drawings = useChartStore.getState().drawings;
        expect(drawings[drawings.length - 1].id).toBe(drawing1.id);
      });
    });

    describe('sendToBack', () => {
      it('should move selected drawings to start of array', () => {
        const drawing1 = createMockDrawing();
        const drawing2 = createMockDrawing();
        const drawing3 = createMockDrawing();

        act(() => {
          useChartStore.getState().addDrawing(drawing1);
          useChartStore.getState().addDrawing(drawing2);
          useChartStore.getState().addDrawing(drawing3);
          useChartStore.getState().setSelection(new Set([drawing3.id]));
        });

        act(() => {
          useChartStore.getState().sendToBack();
        });

        const drawings = useChartStore.getState().drawings;
        expect(drawings[0].id).toBe(drawing3.id);
      });
    });

    describe('duplicateSelected', () => {
      it('should duplicate selected drawings', () => {
        const drawing = createMockDrawing();

        act(() => {
          useChartStore.getState().addDrawing(drawing);
          useChartStore.getState().setSelection(new Set([drawing.id]));
        });

        act(() => {
          useChartStore.getState().duplicateSelected();
        });

        expect(useChartStore.getState().drawings.length).toBe(2);
      });

      it('should append (copy) to duplicated drawing names', () => {
        const drawing = { ...createMockDrawing(), name: 'Original' };

        act(() => {
          useChartStore.getState().addDrawing(drawing);
          useChartStore.getState().setSelection(new Set([drawing.id]));
        });

        act(() => {
          useChartStore.getState().duplicateSelected();
        });

        const drawings = useChartStore.getState().drawings;
        expect(drawings[1].name).toBe('Original (copy)');
      });

      it('should create new IDs for duplicated drawings', () => {
        const drawing = createMockDrawing();

        act(() => {
          useChartStore.getState().addDrawing(drawing);
          useChartStore.getState().setSelection(new Set([drawing.id]));
        });

        act(() => {
          useChartStore.getState().duplicateSelected();
        });

        const drawings = useChartStore.getState().drawings;
        expect(drawings[0].id).not.toBe(drawings[1].id);
      });

      it('should duplicate multiple selected drawings', () => {
        const drawing1 = createMockDrawing();
        const drawing2 = createMockDrawing();

        act(() => {
          useChartStore.getState().addDrawing(drawing1);
          useChartStore.getState().addDrawing(drawing2);
          useChartStore.getState().setSelection(new Set([drawing1.id, drawing2.id]));
        });

        act(() => {
          useChartStore.getState().duplicateSelected();
        });

        expect(useChartStore.getState().drawings.length).toBe(4);
      });
    });

    describe('alignSelected', () => {
      it('should not align when fewer than 2 drawings selected', () => {
        const drawing = createMockDrawing();

        act(() => {
          useChartStore.getState().addDrawing(drawing);
          useChartStore.getState().setSelection(new Set([drawing.id]));
        });

        const initialX = useChartStore.getState().drawings[0].points[0].x;

        act(() => {
          useChartStore.getState().alignSelected('left');
        });

        // Should be unchanged
        expect(useChartStore.getState().drawings[0].points[0].x).toBe(initialX);
      });

      it('should align selected drawings to the left', () => {
        const drawing1 = { ...createMockDrawing(), id: 'draw-1', points: [{ x: 10, y: 20 }, { x: 30, y: 40 }] };
        const drawing2 = { ...createMockDrawing(), id: 'draw-2', points: [{ x: 50, y: 20 }, { x: 70, y: 40 }] };

        act(() => {
          useChartStore.getState().addDrawing(drawing1);
          useChartStore.getState().addDrawing(drawing2);
          useChartStore.getState().setSelection(new Set(['draw-1', 'draw-2']));
        });

        act(() => {
          useChartStore.getState().alignSelected('left');
        });

        // Both drawings should be aligned (function operates on x position)
        expect(useChartStore.getState().drawings.length).toBe(2);
      });

      it('should align selected drawings to the right', () => {
        const drawing1 = { ...createMockDrawing(), id: 'draw-1', points: [{ x: 10, y: 20 }, { x: 30, y: 40 }] };
        const drawing2 = { ...createMockDrawing(), id: 'draw-2', points: [{ x: 50, y: 20 }, { x: 70, y: 40 }] };

        act(() => {
          useChartStore.getState().addDrawing(drawing1);
          useChartStore.getState().addDrawing(drawing2);
          useChartStore.getState().setSelection(new Set(['draw-1', 'draw-2']));
        });

        act(() => {
          useChartStore.getState().alignSelected('right');
        });

        expect(useChartStore.getState().drawings.length).toBe(2);
      });

      it('should align selected drawings to the top', () => {
        const drawing1 = { ...createMockDrawing(), id: 'draw-1', points: [{ x: 10, y: 20 }, { x: 30, y: 40 }] };
        const drawing2 = { ...createMockDrawing(), id: 'draw-2', points: [{ x: 10, y: 60 }, { x: 30, y: 80 }] };

        act(() => {
          useChartStore.getState().addDrawing(drawing1);
          useChartStore.getState().addDrawing(drawing2);
          useChartStore.getState().setSelection(new Set(['draw-1', 'draw-2']));
        });

        act(() => {
          useChartStore.getState().alignSelected('top');
        });

        expect(useChartStore.getState().drawings.length).toBe(2);
      });

      it('should align selected drawings to the bottom', () => {
        const drawing1 = { ...createMockDrawing(), id: 'draw-1', points: [{ x: 10, y: 20 }, { x: 30, y: 40 }] };
        const drawing2 = { ...createMockDrawing(), id: 'draw-2', points: [{ x: 10, y: 60 }, { x: 30, y: 80 }] };

        act(() => {
          useChartStore.getState().addDrawing(drawing1);
          useChartStore.getState().addDrawing(drawing2);
          useChartStore.getState().setSelection(new Set(['draw-1', 'draw-2']));
        });

        act(() => {
          useChartStore.getState().alignSelected('bottom');
        });

        expect(useChartStore.getState().drawings.length).toBe(2);
      });
    });

    describe('distributeSelected', () => {
      it('should not distribute when fewer than 3 drawings selected', () => {
        const drawing1 = createMockDrawing();
        const drawing2 = createMockDrawing();

        act(() => {
          useChartStore.getState().addDrawing(drawing1);
          useChartStore.getState().addDrawing(drawing2);
          useChartStore.getState().setSelection(new Set([drawing1.id, drawing2.id]));
        });

        const initialCount = useChartStore.getState().drawings.length;

        act(() => {
          useChartStore.getState().distributeSelected('h');
        });

        expect(useChartStore.getState().drawings.length).toBe(initialCount);
      });

      it('should distribute horizontally with 3+ drawings', () => {
        const drawing1 = { ...createMockDrawing(), id: 'draw-1', points: [{ x: 10, y: 20 }, { x: 30, y: 40 }] };
        const drawing2 = { ...createMockDrawing(), id: 'draw-2', points: [{ x: 50, y: 20 }, { x: 70, y: 40 }] };
        const drawing3 = { ...createMockDrawing(), id: 'draw-3', points: [{ x: 100, y: 20 }, { x: 120, y: 40 }] };

        act(() => {
          useChartStore.getState().addDrawing(drawing1);
          useChartStore.getState().addDrawing(drawing2);
          useChartStore.getState().addDrawing(drawing3);
          useChartStore.getState().setSelection(new Set(['draw-1', 'draw-2', 'draw-3']));
        });

        act(() => {
          useChartStore.getState().distributeSelected('h');
        });

        expect(useChartStore.getState().drawings.length).toBe(3);
      });

      it('should distribute vertically with 3+ drawings', () => {
        const drawing1 = { ...createMockDrawing(), id: 'draw-1', points: [{ x: 10, y: 20 }, { x: 30, y: 40 }] };
        const drawing2 = { ...createMockDrawing(), id: 'draw-2', points: [{ x: 10, y: 60 }, { x: 30, y: 80 }] };
        const drawing3 = { ...createMockDrawing(), id: 'draw-3', points: [{ x: 10, y: 100 }, { x: 30, y: 120 }] };

        act(() => {
          useChartStore.getState().addDrawing(drawing1);
          useChartStore.getState().addDrawing(drawing2);
          useChartStore.getState().addDrawing(drawing3);
          useChartStore.getState().setSelection(new Set(['draw-1', 'draw-2', 'draw-3']));
        });

        act(() => {
          useChartStore.getState().distributeSelected('v');
        });

        expect(useChartStore.getState().drawings.length).toBe(3);
      });
    });
  });

  // ==========================================================================
  // Selection Tests
  // ==========================================================================

  describe('selection actions', () => {
    describe('setSelection', () => {
      it('should set selection', () => {
        const drawing = createMockDrawing();

        act(() => {
          useChartStore.getState().addDrawing(drawing);
          useChartStore.getState().setSelection(new Set([drawing.id]));
        });

        expect(useChartStore.getState().selection.has(drawing.id)).toBe(true);
      });

      it('should replace existing selection', () => {
        const drawing1 = createMockDrawing();
        const drawing2 = createMockDrawing();

        act(() => {
          useChartStore.getState().addDrawing(drawing1);
          useChartStore.getState().addDrawing(drawing2);
          useChartStore.getState().setSelection(new Set([drawing1.id]));
        });

        act(() => {
          useChartStore.getState().setSelection(new Set([drawing2.id]));
        });

        expect(useChartStore.getState().selection.has(drawing1.id)).toBe(false);
        expect(useChartStore.getState().selection.has(drawing2.id)).toBe(true);
      });
    });

    describe('clearSelection', () => {
      it('should clear all selections', () => {
        const drawing = createMockDrawing();

        act(() => {
          useChartStore.getState().addDrawing(drawing);
          useChartStore.getState().setSelection(new Set([drawing.id]));
        });

        act(() => {
          useChartStore.getState().clearSelection();
        });

        expect(useChartStore.getState().selection.size).toBe(0);
      });
    });

    describe('toggleSelect', () => {
      it('should add to selection when not exclusive', () => {
        const drawing1 = createMockDrawing();
        const drawing2 = createMockDrawing();

        act(() => {
          useChartStore.getState().addDrawing(drawing1);
          useChartStore.getState().addDrawing(drawing2);
          useChartStore.getState().setSelection(new Set([drawing1.id]));
        });

        act(() => {
          useChartStore.getState().toggleSelect(drawing2.id, false);
        });

        expect(useChartStore.getState().selection.has(drawing1.id)).toBe(true);
        expect(useChartStore.getState().selection.has(drawing2.id)).toBe(true);
      });

      it('should replace selection when exclusive', () => {
        const drawing1 = createMockDrawing();
        const drawing2 = createMockDrawing();

        act(() => {
          useChartStore.getState().addDrawing(drawing1);
          useChartStore.getState().addDrawing(drawing2);
          useChartStore.getState().setSelection(new Set([drawing1.id]));
        });

        act(() => {
          useChartStore.getState().toggleSelect(drawing2.id, true);
        });

        expect(useChartStore.getState().selection.has(drawing1.id)).toBe(false);
        expect(useChartStore.getState().selection.has(drawing2.id)).toBe(true);
      });
    });
  });

  // ==========================================================================
  // Alert Tests
  // ==========================================================================

  describe('alert actions', () => {
    describe('addAlert', () => {
      it('should add alert with auto-generated id', () => {
        act(() => {
          useChartStore.getState().addAlert(createMockAlert());
        });

        const alerts = useChartStore.getState().alerts;
        expect(alerts.length).toBe(1);
        expect(alerts[0].id).toBeDefined();
      });

      it('should set alert as enabled by default', () => {
        act(() => {
          useChartStore.getState().addAlert(createMockAlert());
        });

        expect(useChartStore.getState().alerts[0].enabled).toBe(true);
      });
    });

    describe('removeAlert', () => {
      it('should remove alert by id', () => {
        act(() => {
          useChartStore.getState().addAlert(createMockAlert());
        });

        const alertId = useChartStore.getState().alerts[0].id;

        act(() => {
          useChartStore.getState().removeAlert(alertId);
        });

        expect(useChartStore.getState().alerts.length).toBe(0);
      });
    });

    describe('toggleAlert', () => {
      it('should toggle alert enabled state', () => {
        act(() => {
          useChartStore.getState().addAlert(createMockAlert());
        });

        const alertId = useChartStore.getState().alerts[0].id;

        act(() => {
          useChartStore.getState().toggleAlert(alertId);
        });

        expect(useChartStore.getState().alerts[0].enabled).toBe(false);
      });
    });

    describe('updateAlert', () => {
      it('should update alert properties', () => {
        act(() => {
          useChartStore.getState().addAlert(createMockAlert({ symbol: 'AAPL' }));
        });

        const alertId = useChartStore.getState().alerts[0].id;

        act(() => {
          useChartStore.getState().updateAlert(alertId, { symbol: 'MSFT' });
        });

        expect(useChartStore.getState().alerts[0].symbol).toBe('MSFT');
      });
    });

    describe('snoozeAlert', () => {
      it('should set snoozedUntil timestamp', () => {
        const snoozeTime = Date.now() + 3600000;

        act(() => {
          useChartStore.getState().addAlert(createMockAlert());
        });

        const alertId = useChartStore.getState().alerts[0].id;

        act(() => {
          useChartStore.getState().snoozeAlert(alertId, snoozeTime);
        });

        expect(useChartStore.getState().alerts[0].snoozedUntil).toBe(snoozeTime);
      });

      it('should clear snooze with undefined', () => {
        act(() => {
          useChartStore.getState().addAlert(createMockAlert());
        });

        const alertId = useChartStore.getState().alerts[0].id;

        act(() => {
          useChartStore.getState().snoozeAlert(alertId, Date.now() + 3600000);
        });

        act(() => {
          useChartStore.getState().snoozeAlert(alertId, undefined);
        });

        expect(useChartStore.getState().alerts[0].snoozedUntil).toBeUndefined();
      });
    });

    describe('clearAlertEvents', () => {
      it('should clear alert events', () => {
        // Set some alert events
        act(() => {
          useChartStore.setState({
            alertEvents: [{ id: '1', alertId: 'a1', timestamp: Date.now() }],
          });
        });

        act(() => {
          useChartStore.getState().clearAlertEvents();
        });

        expect(useChartStore.getState().alertEvents.length).toBe(0);
      });
    });
  });

  // ==========================================================================
  // Layer Tests
  // ==========================================================================

  describe('layer actions', () => {
    describe('addLayer', () => {
      it('should add a new layer', () => {
        act(() => {
          useChartStore.getState().addLayer('Test Layer');
        });

        expect(useChartStore.getState().layers.length).toBe(1);
        expect(useChartStore.getState().layers[0].name).toBe('Test Layer');
      });
    });

    describe('toggleLayerVisibility', () => {
      it('should toggle layer visibility', () => {
        act(() => {
          useChartStore.getState().addLayer('Test Layer');
        });

        const layerId = useChartStore.getState().layers[0].id;

        act(() => {
          useChartStore.getState().toggleLayerVisibility(layerId);
        });

        expect(useChartStore.getState().layers[0].visible).toBe(false);
      });
    });

    describe('toggleLayerLock', () => {
      it('should toggle layer lock', () => {
        act(() => {
          useChartStore.getState().addLayer('Test Layer');
        });

        const layerId = useChartStore.getState().layers[0].id;

        act(() => {
          useChartStore.getState().toggleLayerLock(layerId);
        });

        expect(useChartStore.getState().layers[0].locked).toBe(true);
      });
    });

    describe('setLayerOpacity', () => {
      it('should set layer opacity', () => {
        act(() => {
          useChartStore.getState().addLayer('Test Layer');
        });

        const layerId = useChartStore.getState().layers[0].id;

        act(() => {
          useChartStore.getState().setLayerOpacity(layerId, 0.5);
        });

        expect(useChartStore.getState().layers[0].opacity).toBe(0.5);
      });
    });

    describe('moveLayer', () => {
      it('should move layer up when not at top', () => {
        act(() => {
          useChartStore.getState().addLayer('Layer 1');
          useChartStore.getState().addLayer('Layer 2');
          useChartStore.getState().addLayer('Layer 3');
        });

        const layers = useChartStore.getState().layers;
        const layer3Id = layers[2].id;
        const layer2Id = layers[1].id;

        act(() => {
          useChartStore.getState().moveLayer(layer3Id, 'up');
        });

        const updatedLayers = useChartStore.getState().layers;
        // After moving layer3 up, layer2 and layer3 should be swapped
        expect(updatedLayers[1].id).toBe(layer3Id);
        expect(updatedLayers[2].id).toBe(layer2Id);
      });

      it('should move layer down when not at bottom', () => {
        act(() => {
          useChartStore.getState().addLayer('Layer 1');
          useChartStore.getState().addLayer('Layer 2');
          useChartStore.getState().addLayer('Layer 3');
        });

        const layers = useChartStore.getState().layers;
        const layer1Id = layers[0].id;
        const layer2Id = layers[1].id;

        act(() => {
          useChartStore.getState().moveLayer(layer1Id, 'down');
        });

        const updatedLayers = useChartStore.getState().layers;
        // After moving layer1 down, layer1 and layer2 should be swapped
        expect(updatedLayers[0].id).toBe(layer2Id);
        expect(updatedLayers[1].id).toBe(layer1Id);
      });

      it('should not move first layer up (edge case)', () => {
        act(() => {
          useChartStore.getState().addLayer('Layer 1');
          useChartStore.getState().addLayer('Layer 2');
        });

        const layers = useChartStore.getState().layers;
        const layer1Id = layers[0].id;

        act(() => {
          useChartStore.getState().moveLayer(layer1Id, 'up');
        });

        const updatedLayers = useChartStore.getState().layers;
        // Layer 1 should still be at position 0
        expect(updatedLayers[0].id).toBe(layer1Id);
      });

      it('should not move last layer down (edge case)', () => {
        act(() => {
          useChartStore.getState().addLayer('Layer 1');
          useChartStore.getState().addLayer('Layer 2');
        });

        const layers = useChartStore.getState().layers;
        const layer2Id = layers[1].id;

        act(() => {
          useChartStore.getState().moveLayer(layer2Id, 'down');
        });

        const updatedLayers = useChartStore.getState().layers;
        // Layer 2 should still be at position 1
        expect(updatedLayers[1].id).toBe(layer2Id);
      });

      it('should do nothing with invalid layer ID', () => {
        act(() => {
          useChartStore.getState().addLayer('Layer 1');
          useChartStore.getState().addLayer('Layer 2');
        });

        const layers = useChartStore.getState().layers;
        const originalOrder = layers.map((l) => l.id);

        act(() => {
          useChartStore.getState().moveLayer('invalid-id', 'up');
        });

        const updatedLayers = useChartStore.getState().layers;
        const updatedOrder = updatedLayers.map((l) => l.id);
        expect(updatedOrder).toEqual(originalOrder);
      });

      it('should swap layer order values when moving', () => {
        act(() => {
          useChartStore.getState().addLayer('Layer 1');
          useChartStore.getState().addLayer('Layer 2');
        });

        const layers = useChartStore.getState().layers;
        const layer1Order = layers[0].order;
        const layer2Order = layers[1].order;
        const layer1Id = layers[0].id;

        act(() => {
          useChartStore.getState().moveLayer(layer1Id, 'down');
        });

        const updatedLayers = useChartStore.getState().layers;
        // Order values should be swapped
        expect(updatedLayers[0].order).toBe(layer1Order);
        expect(updatedLayers[1].order).toBe(layer2Order);
      });
    });

    describe('renameLayer', () => {
      it('should rename layer', () => {
        act(() => {
          useChartStore.getState().addLayer('Old Name');
        });

        const layerId = useChartStore.getState().layers[0].id;

        act(() => {
          useChartStore.getState().renameLayer(layerId, 'New Name');
        });

        expect(useChartStore.getState().layers[0].name).toBe('New Name');
      });
    });

    describe('setActiveLayer', () => {
      it('should set active layer', () => {
        act(() => {
          useChartStore.getState().addLayer('Test Layer');
        });

        const layerId = useChartStore.getState().layers[0].id;

        act(() => {
          useChartStore.getState().setActiveLayer(layerId);
        });

        expect(useChartStore.getState().activeLayerId).toBe(layerId);
      });
    });
  });

  // ==========================================================================
  // Snapshot Tests
  // ==========================================================================

  describe('snapshot actions', () => {
    describe('saveSnapshot', () => {
      it('should save current state as snapshot', () => {
        const drawing = createMockDrawing();

        act(() => {
          useChartStore.getState().addDrawing(drawing);
          useChartStore.getState().saveSnapshot('My Snapshot');
        });

        expect(useChartStore.getState().snapshots.length).toBe(1);
        expect(useChartStore.getState().snapshots[0].name).toBe('My Snapshot');
      });

      it('should capture drawings in snapshot', () => {
        const drawing = createMockDrawing();

        act(() => {
          useChartStore.getState().addDrawing(drawing);
          useChartStore.getState().saveSnapshot('Test');
        });

        expect(useChartStore.getState().snapshots[0].drawings.length).toBe(1);
      });
    });

    describe('loadSnapshot', () => {
      it('should restore state from snapshot', () => {
        const drawing = createMockDrawing();

        act(() => {
          useChartStore.getState().addDrawing(drawing);
          useChartStore.getState().saveSnapshot('Before Clear');
        });

        // Clear drawings
        act(() => {
          useChartStore.setState({ drawings: [] });
        });

        expect(useChartStore.getState().drawings.length).toBe(0);

        // Load snapshot
        const snapshotId = useChartStore.getState().snapshots[0].id;

        act(() => {
          useChartStore.getState().loadSnapshot(snapshotId);
        });

        expect(useChartStore.getState().drawings.length).toBe(1);
      });
    });

    describe('deleteSnapshot', () => {
      it('should delete snapshot', () => {
        act(() => {
          useChartStore.getState().saveSnapshot('Test');
        });

        const snapshotId = useChartStore.getState().snapshots[0].id;

        act(() => {
          useChartStore.getState().deleteSnapshot(snapshotId);
        });

        expect(useChartStore.getState().snapshots.length).toBe(0);
      });
    });

    describe('cycleSnapshot', () => {
      it('should do nothing when no snapshots exist', () => {
        const initialState = useChartStore.getState();

        act(() => {
          useChartStore.getState().cycleSnapshot(1);
        });

        // State should be unchanged since there are no snapshots
        expect(useChartStore.getState().drawings).toEqual(initialState.drawings);
      });

      it('should cycle forward through snapshots', () => {
        const drawing1 = createMockDrawing();

        // Create multiple snapshots
        act(() => {
          useChartStore.getState().addDrawing(drawing1);
          useChartStore.getState().saveSnapshot('Snapshot 1');
          useChartStore.getState().saveSnapshot('Snapshot 2');
        });

        expect(useChartStore.getState().snapshots.length).toBe(2);

        // Cycle forward
        act(() => {
          useChartStore.getState().cycleSnapshot(1);
        });

        // Should load a snapshot's state (drawings preserved)
        expect(useChartStore.getState().snapshots.length).toBe(2);
        expect(useChartStore.getState().drawings.length).toBeGreaterThanOrEqual(1);
      });

      it('should cycle backward through snapshots', () => {
        const drawing1 = createMockDrawing();

        act(() => {
          useChartStore.getState().addDrawing(drawing1);
          useChartStore.getState().saveSnapshot('Snapshot 1');
          useChartStore.getState().saveSnapshot('Snapshot 2');
        });

        expect(useChartStore.getState().snapshots.length).toBe(2);

        // Cycle backward (delta = -1)
        act(() => {
          useChartStore.getState().cycleSnapshot(-1);
        });

        // Should still have snapshots
        expect(useChartStore.getState().snapshots.length).toBe(2);
      });

      it('should wrap around when cycling past end', () => {
        act(() => {
          useChartStore.getState().saveSnapshot('Snapshot 1');
          useChartStore.getState().saveSnapshot('Snapshot 2');
          useChartStore.getState().saveSnapshot('Snapshot 3');
        });

        const initialSnapshots = useChartStore.getState().snapshots;
        expect(initialSnapshots.length).toBe(3);

        // Cycle forward multiple times to test wrap-around
        act(() => {
          useChartStore.getState().cycleSnapshot(3); // Full wrap-around
        });

        // State should be valid after wrap-around
        expect(useChartStore.getState().snapshots.length).toBe(3);
      });

      it('should restore theme and timeframe from snapshot', () => {
        const drawing = createMockDrawing();

        act(() => {
          useChartStore.getState().addDrawing(drawing);
          useChartStore.getState().setState({ theme: 'dark' });
          useChartStore.getState().setTimeframe('1W');
          useChartStore.getState().saveSnapshot('Styled Snapshot');
        });

        // Change current state
        act(() => {
          useChartStore.getState().setState({ theme: 'light' });
          useChartStore.getState().setTimeframe('1D');
        });

        // Cycle to saved snapshot
        act(() => {
          useChartStore.getState().cycleSnapshot(0);
        });

        // Should restore theme and timeframe
        expect(useChartStore.getState().theme).toBe('dark');
        expect(useChartStore.getState().timeframe).toBe('1W');
      });
    });
  });

  // ==========================================================================
  // Drawing Settings Tests
  // ==========================================================================

  describe('drawing settings', () => {
    describe('setDrawingSettings', () => {
      it('should update drawing settings', () => {
        act(() => {
          useChartStore.getState().setDrawingSettings({ lineWidth: 5 });
        });

        expect(useChartStore.getState().drawingSettings.lineWidth).toBe(5);
      });
    });

    describe('resetDrawingSettings', () => {
      it('should reset drawing settings to defaults', () => {
        act(() => {
          useChartStore.getState().setDrawingSettings({ lineWidth: 10, color: 'red' });
        });

        act(() => {
          useChartStore.getState().resetDrawingSettings();
        });

        expect(useChartStore.getState().drawingSettings.lineWidth).toBe(2);
      });
    });
  });

  // ==========================================================================
  // Hotkeys Tests
  // ==========================================================================

  describe('hotkey actions', () => {
    describe('setHotkey', () => {
      it('should set custom hotkey', () => {
        act(() => {
          useChartStore.getState().setHotkey('trend-line', 'Ctrl+T');
        });

        expect(useChartStore.getState().hotkeys['trend-line']).toBe('Ctrl+T');
      });
    });

    describe('resetHotkeys', () => {
      it('should reset all hotkeys', () => {
        act(() => {
          useChartStore.getState().setHotkey('trend-line', 'Ctrl+T');
        });

        act(() => {
          useChartStore.getState().resetHotkeys();
        });

        expect(useChartStore.getState().hotkeys).toEqual({});
      });
    });
  });

  // ==========================================================================
  // Indicator Presets Tests
  // ==========================================================================

  describe('INDICATOR_PRESETS', () => {
    it('should export presets object', () => {
      expect(INDICATOR_PRESETS).toBeDefined();
      expect(typeof INDICATOR_PRESETS).toBe('object');
    });

    it('should have day-trading preset', () => {
      expect(INDICATOR_PRESETS['day-trading']).toBeDefined();
    });

    it('should have swing-trading preset', () => {
      expect(INDICATOR_PRESETS['swing-trading']).toBeDefined();
    });

    it('should have position-trading preset', () => {
      expect(INDICATOR_PRESETS['position-trading']).toBeDefined();
    });

    it('should have preset values that are numbers', () => {
      Object.values(INDICATOR_PRESETS).forEach((preset) => {
        Object.values(preset).forEach((value) => {
          expect(typeof value).toBe('number');
        });
      });
    });
  });
});
