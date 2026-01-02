import type { Alert, AlertEvent, CreateAlertInput } from '@/lib/utils/alerts';
import type { Drawing, DrawingBounds, DrawingStyle } from '@/lib/utils/drawings';
import type { StateCreator } from 'zustand';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SetState = Parameters<StateCreator<ChartState>>[0];
type GetState = Parameters<StateCreator<ChartState>>[1];

/**
 * Extract bounds from a Drawing for align/distribute operations.
 * Drawings store coordinates in `points` array, not x/y directly.
 * Returns calculated bounding box from first two points.
 */
function getDrawingBounds(d: Drawing): DrawingBounds {
  // Drawings use points array for coordinates
  const points = 'points' in d ? d.points : [];
  const p0 = points[0] ?? { x: 0, y: 0 };
  const p1 = points[1] ?? p0;
  const x = Math.min(p0.x, p1.x);
  const y = Math.min(p0.y, p1.y);
  const width = Math.abs(p1.x - p0.x) || 1; // Ensure non-zero for single-point drawings
  const height = Math.abs(p1.y - p0.y) || 1;
  return { id: d.id, x, y, width, height };
}

// Layer type (minimal definition based on usage)
export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity?: number;
  order?: number;
  locked?: boolean;
}

// DrawingSettings type (flexible)
export interface DrawingSettings {
  [key: string]: any; // any required: Drawing settings are dynamic and tool-specific
}

export interface IndicatorSettings {
  bbPeriod: number;
  bbMult: number;
  vwmaPeriod: number;
  vwapAnchorIndex: number;
  stdChannelPeriod: number;
  stdChannelMult: number;
  rsiPeriod: number;
  macdFastPeriod: number;
  macdSlowPeriod: number;
  macdSignalPeriod: number;
  stochasticKPeriod: number;
  stochasticDPeriod: number;
  adxPeriod: number;
  cciPeriod: number;
  williamsRPeriod: number;
}

export interface AutoLabels {
  showValue: boolean;
  showPercent: boolean;
  showAngle: boolean;
  showRR: boolean;
  enabled: boolean;
}

export type Snapshot = {
  id: string;
  name: string;
  title: string;
  createdAt: number; // epoch seconds
  drawings: Drawing[];
  theme: 'light' | 'dark';
  timeframe: string;
};

export interface IndicatorFlags {
  showBB: boolean;
  showVWAP: boolean;
  showVWMA: boolean;
  showStdChannels: boolean;
  showRSI: boolean;
  showMACD: boolean;
  showStochastic: boolean;
  showADX: boolean;
  showCCI: boolean;
  showWilliamsR: boolean;
  showOBV: boolean;
  showADLine: boolean;
  bandFill: boolean;
}

export interface ChartState {
  // core chart selections
  symbol: string;
  timeframe: string;
  theme: 'light' | 'dark';
  indicators: IndicatorFlags;

  // UI state
  indicatorControlsPanelVisible: boolean;
  toggleIndicatorControlsPanel: () => void;

  // indicator methods
  toggleIndicator: (key: keyof IndicatorFlags) => void;

  // drawing methods
  setSelectedStyle: (style: Partial<DrawingStyle>) => void;
  bringToFront: () => void;
  sendToBack: () => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  setFibLevelsForSelected: (levels: number[]) => void;
  setFibDefaultLevels: (levels: number[]) => void;

  // drawings / selection
  drawings: Drawing[];
  selection: Set<string>;

  // drawing settings & hotkeys
  drawingSettings: DrawingSettings;
  hotkeys: Record<string, string>;

  // layers & snapshots
  layers: Layer[];
  snapshots: Snapshot[];
  activeLayerId: string | null;

  // indicators
  indicatorSettings: IndicatorSettings;
  autoLabels: AutoLabels;

  // plugins & tools
  activeTool: string | null;

  // alerts
  alerts: Alert[];
  alertEvents: AlertEvent[];
  addAlert: (alert: CreateAlertInput) => void;
  removeAlert: (id: string) => void;
  toggleAlert: (id: string) => void;
  updateAlert: (id: string, patch: Partial<Alert>) => void;
  snoozeAlert: (id: string, until: number | undefined) => void;
  clearAlertEvents: () => void;

  // actions
  setSymbol: (sym: string) => void;
  setTimeframe: (tf: string) => void;
  setAll: (state: Partial<ChartState>) => void;

  // drawing actions
  addDrawing: (d: Drawing) => void;
  updateDrawing: (id: string, updater: (d: Drawing) => Drawing) => void;
  setStyleForSelection: (
    patch: Partial<{ lineWidth: number; color: string; opacity: number; fontSize: number }>
  ) => void;
  setTextForSelection: (text: string) => void;
  toggleLockSelected: () => void;
  toggleVisibilitySelected: () => void;
  renameSelected: (name: string) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  alignSelected: (direction: 'left' | 'right' | 'top' | 'bottom') => void;
  distributeSelected: (direction: 'h' | 'v') => void;

  // selection management
  clearSelection: () => void;
  setSelection: (ids: Set<string>) => void;
  toggleSelect: (id: string, exclusive: boolean) => void;

  // layer actions
  addLayer: (name: string) => void;
  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  moveLayer: (layerId: string, direction: 'up' | 'down') => void;
  setActiveLayer: (layerId: string) => void;
  renameLayer: (layerId: string, name: string) => void;

  // snapshot actions
  saveSnapshot: (name: string) => void;
  loadSnapshot: (id: string) => void;
  deleteSnapshot: (id: string) => void;
  cycleSnapshot: (delta: number) => void;

  // indicator actions
  updateIndicatorSettings: (settings: Partial<IndicatorSettings>) => void;
  updateIndicatorSetting: <K extends keyof IndicatorSettings>(
    key: K,
    value: IndicatorSettings[K]
  ) => void;
  resetIndicatorSettings: () => void;
  applyPreset: (presetName: string) => void;

  // settings
  setDrawingSettings: (s: Partial<ChartState['drawingSettings']>) => void;
  resetDrawingSettings: () => void;
  setHotkey: (key: string, combo: string) => void;
  resetHotkeys: () => void;
  setTool: (tool: string | null) => void;

  // dev helpers
  setState: (patch: Partial<ChartState>) => void;
}

const DEFAULT_DRAFT: ChartState['drawingSettings'] = {
  lineWidth: 2,
  color: '#e5e7eb',
  opacity: 1,
  fontSize: 12,
  arrowHeadSize: 12,
  arrowHead: 'none' as const,
  lineCap: 'butt' as const,
  snapEnabled: true,
  snapStep: 10,
  showHandles: true,
  perToolSnap: {},
  fibDefaultLevels: [0, 0.236, 0.382, 0.5, 0.618, 1],
  showLineLabels: true,
  snapPriceLevels: true,
  snapToOHLC: true,
  magnetTolerancePx: 10,
};

const DEFAULT_INDICATOR_FLAGS: IndicatorFlags = {
  showBB: false,
  showVWAP: false,
  showVWMA: false,
  showStdChannels: false,
  showRSI: false,
  showMACD: false,
  showStochastic: false,
  showADX: false,
  showCCI: false,
  showWilliamsR: false,
  showOBV: false,
  showADLine: false,
  bandFill: true,
};

const DEFAULT_INDICATOR_SETTINGS: IndicatorSettings = {
  bbPeriod: 20,
  bbMult: 2,
  vwmaPeriod: 20,
  vwapAnchorIndex: 0,
  stdChannelPeriod: 20,
  stdChannelMult: 2,
  rsiPeriod: 14,
  macdFastPeriod: 12,
  macdSlowPeriod: 26,
  macdSignalPeriod: 9,
  stochasticKPeriod: 14,
  stochasticDPeriod: 3,
  adxPeriod: 14,
  cciPeriod: 20,
  williamsRPeriod: 14,
};

// Preset configurations for different trading strategies
export const INDICATOR_PRESETS: Record<string, Partial<IndicatorSettings>> = {
  'day-trading': {
    // Quick signals, short periods for intraday trading
    rsiPeriod: 9,
    macdFastPeriod: 8,
    macdSlowPeriod: 17,
    macdSignalPeriod: 9,
    bbPeriod: 12,
    bbMult: 2,
    stochasticKPeriod: 9,
    stochasticDPeriod: 3,
    adxPeriod: 9,
    cciPeriod: 14,
    williamsRPeriod: 9,
  },
  'swing-trading': {
    // Balanced periods for medium-term trades (default settings)
    rsiPeriod: 14,
    macdFastPeriod: 12,
    macdSlowPeriod: 26,
    macdSignalPeriod: 9,
    bbPeriod: 20,
    bbMult: 2,
    stochasticKPeriod: 14,
    stochasticDPeriod: 3,
    adxPeriod: 14,
    cciPeriod: 20,
    williamsRPeriod: 14,
  },
  'position-trading': {
    // Long-term trends, longer periods for position trades
    rsiPeriod: 21,
    macdFastPeriod: 19,
    macdSlowPeriod: 39,
    macdSignalPeriod: 9,
    bbPeriod: 30,
    bbMult: 2.5,
    stochasticKPeriod: 21,
    stochasticDPeriod: 5,
    adxPeriod: 21,
    cciPeriod: 30,
    williamsRPeriod: 21,
  },
};

const DEFAULT_AUTO_LABELS: AutoLabels = {
  showValue: true,
  showPercent: true,
  showAngle: true,
  showRR: true,
  enabled: true,
};

export const useChartStore = create<ChartState>()(
  persist(
    (set: SetState, get: GetState) => ({
      symbol: 'AAPL',
      timeframe: '1h',
      theme: 'dark',

      // UI state
      indicatorControlsPanelVisible: false,

      drawings: [],
      selection: new Set<string>(),

      drawingSettings: { ...DEFAULT_DRAFT },
      hotkeys: {} as Record<string, string>,

      layers: [],
      snapshots: [],
      activeLayerId: null,

      indicators: DEFAULT_INDICATOR_FLAGS,
      indicatorSettings: DEFAULT_INDICATOR_SETTINGS,
      autoLabels: DEFAULT_AUTO_LABELS,

      activeTool: null,

      alerts: [],
      alertEvents: [],
      addAlert: (a: CreateAlertInput) => {
        set({
          alerts: [
            ...get().alerts,
            {
              id: crypto.randomUUID(),
              enabled: true,
              triggers: 0,
              ...a,
            } as Alert, // any required: Spread operator with discriminated union
          ],
        });
      },
      removeAlert: (id: string) => set({ alerts: get().alerts.filter((a) => a.id !== id) }),
      updateAlert: (id: string, patch: Partial<Alert>) =>
        set({ alerts: get().alerts.map((a) => (a.id === id ? ({ ...a, ...patch } as Alert) : a)) }),
      toggleAlert: (id: string) =>
        set({
          alerts: get().alerts.map((a) =>
            a.id === id ? ({ ...a, enabled: !a.enabled } as Alert) : a
          ),
        }),
      snoozeAlert: (id: string, until: number | undefined) =>
        set({
          alerts: get().alerts.map((a) =>
            a.id === id ? ({ ...a, snoozedUntil: until } as Alert) : a
          ),
        }),
      clearAlertEvents: () => set({ alertEvents: [] }),

      setSymbol: (sym: string) => set({ symbol: sym }),
      setTimeframe: (tf: string) => set({ timeframe: tf }),
      setAll: (state: Partial<ChartState>) => set(state),

      // UI methods
      toggleIndicatorControlsPanel: () =>
        set({ indicatorControlsPanelVisible: !get().indicatorControlsPanelVisible }),

      // Indicator methods
      toggleIndicator: (key: keyof IndicatorFlags) => {
        const indicators = get().indicators;
        set({ indicators: { ...indicators, [key]: !indicators[key] } });
      },

      // Drawing methods
      setSelectedStyle: (style: Partial<DrawingStyle>) => {
        const drawings = get().drawings.map((d) =>
          get().selection.has(d.id) ? { ...d, ...style } : d
        );
        set({ drawings });
      },

      bringToFront: () => {
        const drawings = [...get().drawings];
        const selected = new Set(get().selection);
        const toMove = drawings.filter((d) => selected.has(d.id));
        const others = drawings.filter((d) => !selected.has(d.id));
        set({ drawings: [...others, ...toMove] });
      },

      sendToBack: () => {
        const drawings = [...get().drawings];
        const selected = new Set(get().selection);
        const toMove = drawings.filter((d) => selected.has(d.id));
        const others = drawings.filter((d) => !selected.has(d.id));
        set({ drawings: [...toMove, ...others] });
      },

      groupSelected: () => {
        const drawings = get().drawings;
        const selected = new Set(get().selection);
        const toGroup = drawings.filter((d) => selected.has(d.id));
        const others = drawings.filter((d) => !selected.has(d.id));
        const group: Drawing = {
          id: crypto.randomUUID(),
          kind: 'group',
          type: 'group',
          children: toGroup,
        };
        set({ drawings: [...others, group] });
      },

      ungroupSelected: () => {
        const drawings = get().drawings;
        const selected = new Set(get().selection);
        const newDrawings: Drawing[] = [];
        for (const d of drawings) {
          if (selected.has(d.id) && d.kind === 'group') {
            newDrawings.push(...d.children);
          } else {
            newDrawings.push(d);
          }
        }
        set({ drawings: newDrawings });
      },

      setFibLevelsForSelected: (levels: number[]) => {
        const drawings = get().drawings.map((d) =>
          get().selection.has(d.id) && d.kind === 'fib' ? { ...d, levels } : d
        );
        set({ drawings });
      },

      setFibDefaultLevels: (levels: number[]) => {
        const drawingSettings = get().drawingSettings;
        set({ drawingSettings: { ...drawingSettings, fibDefaultLevels: levels } });
      },

      addDrawing: (d: Drawing) => set({ drawings: [...get().drawings, d] }),

      updateDrawing: (id: string, updater: (d: Drawing) => Drawing) => {
        const next = get().drawings.map((d) => (d.id === id ? updater(d) : d));
        set({ drawings: next });
      },

      setStyleForSelection: (patch: Partial<DrawingStyle>) => {
        const sel = get().selection;
        const next = get().drawings.map((d) =>
          sel.has(d.id) ? { ...d, style: { ...(d.style || {}), ...patch } as DrawingStyle } : d
        );
        set({ drawings: next });
      },

      clearSelection: () => set({ selection: new Set<string>() }),

      setSelection: (ids: Set<string>) => set({ selection: ids }),

      toggleSelect: (id: string, exclusive: boolean) => {
        const current = get().selection;
        const next = new Set(exclusive ? [] : current);
        if (current.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        set({ selection: next });
      },

      setTextForSelection: (text: string) => {
        const sel = get().selection;
        const next = get().drawings.map((d) => (sel.has(d.id) ? { ...d, text } : d));
        set({ drawings: next });
      },

      toggleLockSelected: () => {
        const sel = get().selection;
        const next = get().drawings.map((d) => (sel.has(d.id) ? { ...d, locked: !d.locked } : d));
        set({ drawings: next });
      },

      toggleVisibilitySelected: () => {
        const sel = get().selection;
        const next = get().drawings.map((d) => (sel.has(d.id) ? { ...d, hidden: !d.hidden } : d));
        set({ drawings: next });
      },

      renameSelected: (name: string) => {
        const sel = get().selection;
        const next = get().drawings.map((d) => (sel.has(d.id) ? { ...d, name } : d));
        set({ drawings: next });
      },

      deleteSelected: () => {
        const sel = get().selection;
        set({
          drawings: get().drawings.filter((d) => !sel.has(d.id)),
          selection: new Set(),
        });
      },

      duplicateSelected: () => {
        const sel = get().selection;
        const toDuplicate = get().drawings.filter((d) => sel.has(d.id));
        const duplicates = toDuplicate.map((d) => ({
          ...d,
          id: crypto.randomUUID(),
          name: `${d.name || 'Drawing'} (copy)`,
        }));
        set({ drawings: [...get().drawings, ...duplicates] });
      },

      alignSelected: (direction: 'left' | 'right' | 'top' | 'bottom') => {
        const sel = get().selection;
        if (sel.size < 2) return;

        const selectedDrawings = get().drawings.filter((d) => sel.has(d.id));
        const bounds = selectedDrawings.map(getDrawingBounds);

        let alignTo: number;
        switch (direction) {
          case 'left':
            alignTo = Math.min(...bounds.map((b) => b.x));
            bounds.forEach((b) => (b.x = alignTo));
            break;
          case 'right':
            alignTo = Math.max(...bounds.map((b) => b.x + b.width));
            bounds.forEach((b) => (b.x = alignTo - b.width));
            break;
          case 'top':
            alignTo = Math.min(...bounds.map((b) => b.y));
            bounds.forEach((b) => (b.y = alignTo));
            break;
          case 'bottom':
            alignTo = Math.max(...bounds.map((b) => b.y + b.height));
            bounds.forEach((b) => (b.y = alignTo - b.height));
            break;
        }

        // Note: This updates x/y which doesn't persist to Drawing.points
        // TODO: Implement proper point transformation for drawing alignment
        const next = get().drawings.map((d) => {
          const bound = bounds.find((b) => b.id === d.id);
          return bound ? { ...d, x: bound.x, y: bound.y } : d;
        });
        set({ drawings: next });
      },

      distributeSelected: (direction: 'h' | 'v') => {
        const sel = get().selection;
        if (sel.size < 3) return;

        // Get bounds for selected drawings and sort by position
        const selectedDrawings = get().drawings.filter((d) => sel.has(d.id));
        const boundsList = selectedDrawings.map(getDrawingBounds);
        boundsList.sort((a, b) => (direction === 'h' ? a.x - b.x : a.y - b.y));

        const total = boundsList.length;
        const first = boundsList[0];
        const last = boundsList[total - 1];
        const space =
          direction === 'h'
            ? (last.x - first.x) / (total - 1)
            : (last.y - first.y) / (total - 1);

        // Create a map of id -> new position
        const positionMap = new Map<string, { x: number; y: number }>();
        boundsList.forEach((bounds, idx) => {
          if (idx === 0 || idx === total - 1) return; // Keep first and last in place
          positionMap.set(bounds.id, {
            x: direction === 'h' ? first.x + space * idx : bounds.x,
            y: direction === 'v' ? first.y + space * idx : bounds.y,
          });
        });

        // Note: This updates x/y which doesn't persist to Drawing.points
        // TODO: Implement proper point transformation for drawing distribution
        const next = get().drawings.map((d) => {
          const pos = positionMap.get(d.id);
          return pos ? { ...d, x: pos.x, y: pos.y } : d;
        });
        set({ drawings: next });
      },

      // Layer actions
      addLayer: (name: string) => {
        const layers = get().layers;
        const maxOrder = Math.max(0, ...layers.map((l) => l.order ?? 0));
        set({
          layers: [
            ...layers,
            {
              id: crypto.randomUUID(),
              name,
              visible: true,
              opacity: 1,
              order: maxOrder + 1,
              locked: false,
            },
          ],
        });
      },

      toggleLayerVisibility: (layerId: string) => {
        set({
          layers: get().layers.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l)),
        });
      },

      toggleLayerLock: (layerId: string) => {
        set({
          layers: get().layers.map((l) => (l.id === layerId ? { ...l, locked: !l.locked } : l)),
        });
      },

      setLayerOpacity: (layerId: string, opacity: number) => {
        set({
          layers: get().layers.map((l) => (l.id === layerId ? { ...l, opacity } : l)),
        });
      },

      moveLayer: (layerId: string, direction: 'up' | 'down') => {
        const layers = [...get().layers];
        const idx = layers.findIndex((l) => l.id === layerId);
        if (idx === -1) return;

        if (direction === 'up' && idx > 0) {
          const temp = layers[idx - 1].order;
          layers[idx - 1].order = layers[idx].order;
          layers[idx].order = temp;
          [layers[idx - 1], layers[idx]] = [layers[idx], layers[idx - 1]];
        } else if (direction === 'down' && idx < layers.length - 1) {
          const temp = layers[idx + 1].order;
          layers[idx + 1].order = layers[idx].order;
          layers[idx].order = temp;
          [layers[idx + 1], layers[idx]] = [layers[idx], layers[idx + 1]];
        }

        set({ layers });
      },

      setActiveLayer: (layerId: string | null) => set({ activeLayerId: layerId }),

      renameLayer: (layerId: string, name: string) => {
        set({
          layers: get().layers.map((l) => (l.id === layerId ? { ...l, name } : l)),
        });
      },

      updateIndicatorSettings: (settings: Partial<IndicatorSettings>) => {
        set({
          indicatorSettings: { ...get().indicatorSettings, ...settings },
        });
      },

      updateIndicatorSetting: <K extends keyof IndicatorSettings>(
        key: K,
        value: IndicatorSettings[K]
      ) => {
        set({
          indicatorSettings: { ...get().indicatorSettings, [key]: value },
        });
      },

      resetIndicatorSettings: () => {
        set({ indicatorSettings: { ...DEFAULT_INDICATOR_SETTINGS } });
      },

      applyPreset: (presetName: string) => {
        const preset = INDICATOR_PRESETS[presetName];
        if (preset) {
          set({
            indicatorSettings: { ...get().indicatorSettings, ...preset },
          });
        }
      },

      setDrawingSettings: (s: Partial<typeof DEFAULT_DRAFT>) =>
        set({ drawingSettings: { ...get().drawingSettings, ...s } }),
      resetDrawingSettings: () => set({ drawingSettings: { ...DEFAULT_DRAFT } }),

      setHotkey: (key: string, combo: string) =>
        set({ hotkeys: { ...get().hotkeys, [key]: combo } }),
      resetHotkeys: () => set({ hotkeys: {} }),

      setTool: (tool: string | null) => set({ activeTool: tool }),

      saveSnapshot: (name: string) => {
        const current = get();
        const snapshot = {
          id: crypto.randomUUID(),
          name: name,
          title: name,
          createdAt: Math.floor(Date.now() / 1000),
          drawings: current.drawings,
          theme: current.theme,
          timeframe: current.timeframe,
        };
        set({ snapshots: [...current.snapshots, snapshot] });
      },

      loadSnapshot: (id: string) => {
        const snapshot = get().snapshots.find((s) => s.id === id);
        if (!snapshot) return;
        set({
          drawings: snapshot.drawings,
          theme: snapshot.theme,
          timeframe: snapshot.timeframe,
        });
      },

      deleteSnapshot: (id: string) => {
        set({
          snapshots: get().snapshots.filter((s) => s.id !== id),
        });
      },

      cycleSnapshot: (delta: number) => {
        const { snapshots } = get();
        if (!snapshots.length) return;

        const currentId = get().snapshots[0]?.id;
        const currentIndex = snapshots.findIndex((s) => s.id === currentId);
        const nextIndex = (currentIndex + delta + snapshots.length) % snapshots.length;
        const nextSnapshot = snapshots[nextIndex];
        if (nextSnapshot) {
          set({
            drawings: nextSnapshot.drawings,
            theme: nextSnapshot.theme,
            timeframe: nextSnapshot.timeframe,
          });
        }
      },

      setState: (patch: Partial<ChartState>) => set(patch),
    }),
    { name: 'lokifi:chart' }
  )
);

// Type-safe store extension interface
// Zustand v4+ provides these methods, but we add explicit types for type safety
interface StoreWithHelpers {
  getState: () => ChartState;
  setState: (patch: Partial<ChartState>) => void;
  subscribe: (cb: (s: ChartState) => void) => () => void;
}

// The store already has these methods from Zustand's create function
// This explicit cast ensures TypeScript knows about them
export const chartStoreHelpers = useChartStore as typeof useChartStore & StoreWithHelpers;
