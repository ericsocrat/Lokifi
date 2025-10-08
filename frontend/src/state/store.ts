import type { Alert, AlertEvent } from "@/lib/alerts";
import type { Drawing, DrawingSettings, Layer } from "@/types/drawings";
import { create, StateCreator } from "zustand";
import { persist } from "zustand/middleware";

type SetState = Parameters<StateCreator<ChartState>>[0];
type GetState = Parameters<StateCreator<ChartState>>[1];

export type { DrawingSettings, Layer } from "@/types/drawings";

export interface IndicatorSettings {
  bbPeriod: number;
  bbMult: number;
  vwmaPeriod: number;
  vwapAnchorIndex: number;
  stdChannelPeriod: number;
  stdChannelMult: number;
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
  bandFill: boolean;
}

export type DrawingStyle = {
  stroke?: string;
  strokeWidth?: number;
  dash?: string;
  opacity?: number;
  fill?: string;
};

export interface ChartState {
  // core chart selections
  symbol: string;
  timeframe: string;
  theme: 'light' | 'dark';
  indicators: IndicatorFlags;

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
  addAlert: (alert: Omit<Alert, 'id' | 'enabled' | 'triggers'>) => void;
  removeAlert: (id: string) => void;
  toggleAlert: (id: string) => void;
  updateAlert: (id: string, patch: Partial<Alert>) => void;
  snoozeAlert: (id: string, until: number | null) => void;
  clearAlertEvents: () => void;

  // actions
  setSymbol: (sym: string) => void;
  setTimeframe: (tf: string) => void;
  setAll: (state: Partial<ChartState>) => void;

  // drawing actions
  addDrawing: (d: Drawing) => void;
  updateDrawing: (id: string, updater: (d: Drawing) => Drawing) => void;
  setStyleForSelection: (patch: Partial<{ lineWidth: number; color: string; opacity: number; fontSize: number }>) => void;
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

  // settings
  setDrawingSettings: (s: Partial<ChartState["drawingSettings"]>) => void;
  resetDrawingSettings: () => void;
  setHotkey: (key: string, combo: string) => void;
  resetHotkeys: () => void;
  setTool: (tool: string | null) => void;

  // dev helpers
  setState: (patch: Partial<ChartState>) => void;
};

const DEFAULT_DRAFT: ChartState["drawingSettings"] = {
  lineWidth: 2,
  color: "#e5e7eb",
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
  bandFill: true,
};

const DEFAULT_INDICATOR_SETTINGS: IndicatorSettings = {
  bbPeriod: 20,
  bbMult: 2,
  vwmaPeriod: 20,
  vwapAnchorIndex: 0,
  stdChannelPeriod: 20,
  stdChannelMult: 2,
};

const DEFAULT_AUTO_LABELS: AutoLabels = {
  showValue: true,
  showPercent: true,
  showAngle: true,
  showRR: true,
  enabled: true,
};

export const useChartStore =
  create<ChartState>()(
    persist((set: SetState, get: GetState) => ({
      symbol: "AAPL",
      timeframe: "1h",
      theme: "dark",

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
      addAlert: (a: Omit<Alert, 'id' | 'enabled' | 'triggers'>) => {
        set({
          alerts: [...get().alerts, {
            id: crypto.randomUUID(),
            enabled: true,
            triggers: 0,
            ...a
          }]
        });
      },
      removeAlert: (id: string) => set({ alerts: get().alerts.filter((a: any) => a.id !== id) }),
      updateAlert: (id: string, patch: Partial<Alert>) => set({ alerts: get().alerts.map((a: any) => a.id === id ? { ...a, ...patch } : a) }),
      toggleAlert: (id: string) => set({ alerts: get().alerts.map((a: any) => a.id === id ? { ...a, enabled: !a.enabled } : a) }),
      snoozeAlert: (id: string, until: number | undefined) => set({ alerts: get().alerts.map((a: any) => a.id === id ? { ...a, snoozedUntil: until } : a) }),
      clearAlertEvents: () => set({ alertEvents: [] }),

      setSymbol: (sym: string) => set({ symbol: sym }),
      setTimeframe: (tf: string) => set({ timeframe: tf }),
      setAll: (state: Partial<ChartState>) => set(state),

      // Indicator methods
      toggleIndicator: (key: keyof IndicatorFlags) => {
        const indicators = get().indicators;
        set({ indicators: { ...indicators, [key]: !indicators[key] } });
      },

      // Drawing methods
      setSelectedStyle: (style: Partial<DrawingStyle>) => {
        const drawings = get().drawings.map((d: any) =>
          get().selection.has(d.id) ? { ...d, ...style } : d
        );
        set({ drawings });
      },

      bringToFront: () => {
        const drawings = [...get().drawings];
        const selected = new Set(get().selection);
        const toMove = drawings.filter((d: any) => selected.has(d.id));
        const others = drawings.filter((d: any) => !selected.has(d.id));
        set({ drawings: [...others, ...toMove] });
      },

      sendToBack: () => {
        const drawings = [...get().drawings];
        const selected = new Set(get().selection);
        const toMove = drawings.filter((d: any) => selected.has(d.id));
        const others = drawings.filter((d: any) => !selected.has(d.id));
        set({ drawings: [...toMove, ...others] });
      },

      groupSelected: () => {
        const drawings = get().drawings;
        const selected = new Set(get().selection);
        const toGroup = drawings.filter((d: any) => selected.has(d.id));
        const others = drawings.filter((d: any) => !selected.has(d.id));
        const group = {
          id: crypto.randomUUID(),
          type: 'group',
          children: toGroup
        };
        set({ drawings: [...others, group] });
      },

      ungroupSelected: () => {
        const drawings = get().drawings;
        const selected = new Set(get().selection);
        const newDrawings = [];
        for (const d of drawings) {
          if (selected.has(d.id) && d.type === 'group') {
            newDrawings.push(...d.children);
          } else {
            newDrawings.push(d);
          }
        }
        set({ drawings: newDrawings });
      },

      setFibLevelsForSelected: (levels: number[]) => {
        const drawings = get().drawings.map((d: any) =>
          get().selection.has(d.id) && d.type === 'fib' ? { ...d, levels } : d
        );
        set({ drawings });
      },

      setFibDefaultLevels: (levels: number[]) => {
        const drawingSettings = get().drawingSettings;
        set({ drawingSettings: { ...drawingSettings, fibDefaultLevels: levels } });
      },

      addDrawing: (d: Drawing) => set({ drawings: [...get().drawings, d] }),

      updateDrawing: (id: string, updater: (d: Drawing) => Drawing) => {
        const next = get().drawings.map((d: any) => d.id === id ? updater(d) : d);
        set({ drawings: next });
      },

      setStyleForSelection: (patch: Partial<DrawingStyle>) => {
        const sel = get().selection;
        const next = get().drawings.map((d: any) =>
          sel.has(d.id) ? { ...d, style: { ...(d.style || {}), ...patch } } : d
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
        const next = get().drawings.map((d: any) =>
          sel.has(d.id) ? { ...d, text } : d
        );
        set({ drawings: next });
      },

      toggleLockSelected: () => {
        const sel = get().selection;
        const next = get().drawings.map((d: any) =>
          sel.has(d.id) ? { ...d, locked: !d.locked } : d
        );
        set({ drawings: next });
      },

      toggleVisibilitySelected: () => {
        const sel = get().selection;
        const next = get().drawings.map((d: any) =>
          sel.has(d.id) ? { ...d, hidden: !d.hidden } : d
        );
        set({ drawings: next });
      },

      renameSelected: (name: string) => {
        const sel = get().selection;
        const next = get().drawings.map((d: any) =>
          sel.has(d.id) ? { ...d, name } : d
        );
        set({ drawings: next });
      },

      deleteSelected: () => {
        const sel = get().selection;
        set({
          drawings: get().drawings.filter((d: any) => !sel.has(d.id)),
          selection: new Set()
        });
      },

      duplicateSelected: () => {
        const sel = get().selection;
        const toDuplicate = get().drawings.filter((d: any) => sel.has(d.id));
        const duplicates = toDuplicate.map((d: any) => ({
          ...d,
          id: crypto.randomUUID(),
          name: `${d.name || 'Drawing'} (copy)`
        }));
        set({ drawings: [...get().drawings, ...duplicates] });
      },

      alignSelected: (direction: 'left' | 'right' | 'top' | 'bottom') => {
        const sel = get().selection;
        if (sel.size < 2) return;

        const selectedDrawings = get().drawings.filter((d: any) => sel.has(d.id));
        const bounds = selectedDrawings.map((d: any) => ({
          id: d.id,
          x: d.x,
          y: d.y,
          width: d.width,
          height: d.height
        }));

        let alignTo: number;
        switch (direction) {
          case 'left':
            alignTo = Math.min(...bounds.map((b: any) => b.x));
            bounds.forEach(b => b.x = alignTo);
            break;
          case 'right':
            alignTo = Math.max(...bounds.map((b: any) => b.x + b.width));
            bounds.forEach(b => b.x = alignTo - b.width);
            break;
          case 'top':
            alignTo = Math.min(...bounds.map((b: any) => b.y));
            bounds.forEach(b => b.y = alignTo);
            break;
          case 'bottom':
            alignTo = Math.max(...bounds.map((b: any) => b.y + b.height));
            bounds.forEach(b => b.y = alignTo - b.height);
            break;
        }

        const next = get().drawings.map((d: any) => {
          const bound = bounds.find((b: any) => b.id === d.id);
          return bound ? { ...d, x: bound.x, y: bound.y } : d;
        });
        set({ drawings: next });
      },

      distributeSelected: (direction: 'h' | 'v') => {
        const sel = get().selection;
        if (sel.size < 3) return;

        const selectedDrawings = get().drawings
          .filter((d: any) => sel.has(d.id))
          .sort((a: any, b: any) => direction === 'h' ? a.x - b.x : a.y - b.y);

        const total = selectedDrawings.length;
        const first = selectedDrawings[0];
        const last = selectedDrawings[total - 1];
        const space = direction === 'h'
          ? (last.x - first.x) / (total - 1)
          : (last.y - first.y) / (total - 1);

        const next = get().drawings.map((d: any) => {
          const idx = selectedDrawings.findIndex(sd => sd.id === d.id);
          if (idx === -1 || idx === 0 || idx === total - 1) return d;

          return {
            ...d,
            x: direction === 'h' ? first.x + space * idx : d.x,
            y: direction === 'v' ? first.y + space * idx : d.y
          };
        });
        set({ drawings: next });
      },

      // Layer actions
      addLayer: (name: string) => {
        const layers = get().layers;
        const maxOrder = Math.max(0, ...layers.map((l: any) => l.order));
        set({
          layers: [...layers, {
            id: crypto.randomUUID(),
            name,
            visible: true,
            opacity: 1,
            order: maxOrder + 1,
            locked: false
          }]
        });
      },

      toggleLayerVisibility: (layerId: string) => {
        set({
          layers: get().layers.map((l: any) =>
            l.id === layerId ? { ...l, visible: !l.visible } : l
          )
        });
      },

      toggleLayerLock: (layerId: string) => {
        set({
          layers: get().layers.map((l: any) =>
            l.id === layerId ? { ...l, locked: !l.locked } : l
          )
        });
      },

      setLayerOpacity: (layerId: string, opacity: number) => {
        set({
          layers: get().layers.map((l: any) =>
            l.id === layerId ? { ...l, opacity } : l
          )
        });
      },

      moveLayer: (layerId: string, direction: 'up' | 'down') => {
        const layers = [...get().layers];
        const idx = layers.findIndex(l => l.id === layerId);
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
          layers: get().layers.map((l: any) =>
            l.id === layerId ? { ...l, name } : l
          )
        });
      },

      updateIndicatorSettings: (settings: Partial<IndicatorSettings>) => {
        set({
          indicatorSettings: { ...get().indicatorSettings, ...settings }
        });
      },

      setDrawingSettings: (s: Partial<typeof DEFAULT_DRAFT>) => set({ drawingSettings: { ...get().drawingSettings, ...s } }),
      resetDrawingSettings: () => set({ drawingSettings: { ...DEFAULT_DRAFT } }),

      setHotkey: (key: string, combo: string) => set({ hotkeys: { ...get().hotkeys, [key]: combo } }),
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
          timeframe: current.timeframe
        };
        set({ snapshots: [...current.snapshots, snapshot] });
      },

      loadSnapshot: (id: string) => {
        const snapshot = get().snapshots.find((s: any) => s.id === id);
        if (!snapshot) return;
        set({
          drawings: snapshot.drawings,
          theme: snapshot.theme,
          timeframe: snapshot.timeframe
        });
      },

      deleteSnapshot: (id: string) => {
        set({
          snapshots: get().snapshots.filter((s: any) => s.id !== id)
        });
      },

      cycleSnapshot: (delta: number) => {
        const { snapshots } = get();
        if (!snapshots.length) return;

        const currentId = get().snapshots[0]?.id;
        const currentIndex = snapshots.findIndex(s => s.id === currentId);
        const nextIndex = (currentIndex + delta + snapshots.length) % snapshots.length;
        const nextSnapshot = snapshots[nextIndex];
        if (nextSnapshot) {
          set({
            drawings: nextSnapshot.drawings,
            theme: nextSnapshot.theme,
            timeframe: nextSnapshot.timeframe
          });
        }
      },

      setState: (patch: Partial<ChartState>) => set(patch),
    }), { name: "lokifi:chart" })
  );

// expose helpers the UI expects on the hook function
(useChartStore as any).getState = (useChartStore as any).getState || (() => (useChartStore as any)());
(useChartStore as any).setState = (patch: Partial<ChartState>) => {
  const cur = (useChartStore as any).getState();
  (useChartStore as any)((s: ChartState) => ({ ...cur, ...patch }));
};
(useChartStore as any).subscribe = (cb: (s: ChartState) => void) => {
  let prev = (useChartStore as any).getState();
  const unsub = (useChartStore as any)((s: ChartState) => {
    if (s !== prev) { prev = s; try { cb(s); } catch { } }
  });
  return () => { try { unsub(); } catch { } };
};
