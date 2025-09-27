import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Layer = {
  id: string;
  name: string;
  visible: boolean;
};

export type Snapshot = {
  id: string;
  title: string;
  createdAt: number; // epoch seconds
};

export type ChartState = {
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

  // plugins & tools
  activeTool: string | null;

  // alerts surface
  alerts: any[];
  alertEvents: any[];

  // actions
  setSymbol: (sym: string) => void;
  setTimeframe: (tf: string) => void;

  addDrawing: (d: any) => void;
  setStyleForSelection: (patch: Partial<{ lineWidth: number; color: string; opacity: number; fontSize: number }>) => void;
  setTextForSelection: (text: string) => void;

  setDrawingSettings: (s: Partial<ChartState["drawingSettings"]>) => void;
  resetDrawingSettings: () => void;

  setHotkey: (key: string, combo: string) => void;
  resetHotkeys: () => void;

  setTool: (tool: string | null) => void;

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

      activeTool: null,

      alerts: [],
      alertEvents: [],

      setSymbol: (sym) => set({ symbol: sym }),
      setTimeframe: (tf) => set({ timeframe: tf }),

      addDrawing: (d) => set({ drawings: [...get().drawings, d] }),

      setStyleForSelection: (patch) => {
        // naive demo: apply to all drawings in selection if they have a style
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

export type { ChartState };