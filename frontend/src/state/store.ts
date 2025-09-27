import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  order: number;
  locked: boolean;
}

export interface IndicatorSettings {
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
  title: string;
  createdAt: number; // epoch seconds
};

export interface ChartState {
  // core chart selections
  symbol: string;
  timeframe: string;

  // drawings / selection
  drawings: any[];
  selection: Set<string>;

  // drawing settings & hotkeys
  drawingSettings: {
    lineWidth: number;
    color: string;
    opacity: number;
    fontSize: number;
  };
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

  // alerts surface
  alerts: any[];
  alertEvents: any[];

  // actions
  setSymbol: (sym: string) => void;
  setTimeframe: (tf: string) => void;
  
  // drawing actions
  addDrawing: (d: any) => void;
  setStyleForSelection: (patch: Partial<{ lineWidth: number; color: string; opacity: number; fontSize: number }>) => void;
  setTextForSelection: (text: string) => void;
  toggleLockSelected: () => void;
  toggleVisibilitySelected: () => void;
  renameSelected: (name: string) => void;

  // layer actions
  addLayer: (name: string) => void;
  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  moveLayer: (layerId: string, direction: 'up' | 'down') => void;
  setActiveLayer: (layerId: string) => void;
  renameLayer: (layerId: string, name: string) => void;

  // indicator actions
  updateIndicatorSettings: (settings: Partial<IndicatorSettings>) => void;

  // settings
  setDrawingSettings: (s: Partial<ChartState["drawingSettings"]>) => void;
  resetDrawingSettings: () => void;
  setHotkey: (key: string, combo: string) => void;
  resetHotkeys: () => void;
  setTool: (tool: string | null) => void;

  // alerts
  addAlert: (a: any) => void;
  updateAlert: (id: string, patch: any) => void;

  // dev helpers
  setState: (patch: Partial<ChartState>) => void;
};

const DEFAULT_DRAFT: ChartState["drawingSettings"] = {
  lineWidth: 2,
  color: "#e5e7eb",
  opacity: 1,
  fontSize: 12,
};

const DEFAULT_INDICATOR_SETTINGS: IndicatorSettings = {
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
    persist((set, get) => ({
      symbol: "AAPL",
      timeframe: "1h",

      drawings: [],
      selection: new Set<string>(),

      drawingSettings: { ...DEFAULT_DRAFT },
      hotkeys: {},

      layers: [],
      snapshots: [],
      activeLayerId: null,

      indicatorSettings: DEFAULT_INDICATOR_SETTINGS,
      autoLabels: DEFAULT_AUTO_LABELS,

      activeTool: null,

      alerts: [],
      alertEvents: [],

      setSymbol: (sym) => set({ symbol: sym }),
      setTimeframe: (tf) => set({ timeframe: tf }),

      addDrawing: (d) => set({ drawings: [...get().drawings, d] }),

      setStyleForSelection: (patch) => {
        const sel = get().selection;
        const next = get().drawings.map((d) =>
          sel.has(d.id) ? { ...d, style: { ...(d.style || {}), ...patch } } : d
        );
        set({ drawings: next });
      },

      setTextForSelection: (text) => {
        const sel = get().selection;
        const next = get().drawings.map((d) =>
          sel.has(d.id) ? { ...d, text } : d
        );
        set({ drawings: next });
      },

      toggleLockSelected: () => {
        const sel = get().selection;
        const next = get().drawings.map((d) =>
          sel.has(d.id) ? { ...d, locked: !d.locked } : d
        );
        set({ drawings: next });
      },

      toggleVisibilitySelected: () => {
        const sel = get().selection;
        const next = get().drawings.map((d) =>
          sel.has(d.id) ? { ...d, hidden: !d.hidden } : d
        );
        set({ drawings: next });
      },

      renameSelected: (name) => {
        const sel = get().selection;
        const next = get().drawings.map((d) =>
          sel.has(d.id) ? { ...d, name } : d
        );
        set({ drawings: next });
      },

      // Layer actions
      addLayer: (name) => {
        const layers = get().layers;
        const maxOrder = Math.max(0, ...layers.map(l => l.order));
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

      toggleLayerVisibility: (layerId) => {
        set({
          layers: get().layers.map(l =>
            l.id === layerId ? { ...l, visible: !l.visible } : l
          )
        });
      },

      toggleLayerLock: (layerId) => {
        set({
          layers: get().layers.map(l =>
            l.id === layerId ? { ...l, locked: !l.locked } : l
          )
        });
      },

      setLayerOpacity: (layerId, opacity) => {
        set({
          layers: get().layers.map(l =>
            l.id === layerId ? { ...l, opacity } : l
          )
        });
      },

      moveLayer: (layerId, direction) => {
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

      setActiveLayer: (layerId) => set({ activeLayerId: layerId }),

      renameLayer: (layerId, name) => {
        set({
          layers: get().layers.map(l =>
            l.id === layerId ? { ...l, name } : l
          )
        });
      },

      updateIndicatorSettings: (settings) => {
        set({
          indicatorSettings: { ...get().indicatorSettings, ...settings }
        });
      },

      setDrawingSettings: (s) => set({ drawingSettings: { ...get().drawingSettings, ...s } }),
      resetDrawingSettings: () => set({ drawingSettings: { ...DEFAULT_DRAFT } }),

      setHotkey: (key, combo) => set({ hotkeys: { ...get().hotkeys, [key]: combo } }),
      resetHotkeys: () => set({ hotkeys: {} }),

      setTool: (tool) => set({ activeTool: tool }),

      addAlert: (a) => set({ alerts: [...get().alerts, a] }),
      updateAlert: (id, patch) =>
        set({ alerts: get().alerts.map((a: any) => (a.id === id ? { ...a, ...patch } : a)) }),

      setState: (patch) => set(patch),
    }), { name: "fynix:chart" })
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
    if (s !== prev) { prev = s; try { cb(s); } catch {} }
  });
  return () => { try { unsub(); } catch {} };
};