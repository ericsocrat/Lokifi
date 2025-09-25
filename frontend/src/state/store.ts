import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Tool =
  | 'select' | 'trendline' | 'hline' | 'vline' | 'ray' | 'arrow'
  | 'rect' | 'ellipse' | 'text'
  | 'fib' | 'pitchfork' | 'channel' | 'parallel-channel'

export type Theme = 'dark' | 'light' | 'midnight'

type IndicatorSettings = {
  bbPeriod: number
  bbMult: number
  vwapAnchor: 'session' | 'day' | 'week' | 'month' | 'anchored'
  vwapAnchorIndex?: number
  vwmaPeriod: number
  stdChannelPeriod: number
  stdChannelMult: number
}

type IndicatorToggles = {
  showBB: boolean
  showVWAP: boolean
  showVWMA: boolean
  showStdChannels: boolean
  bandFill: boolean
}

type DrawingSettings = {
  snapEnabled: boolean
  snapStep: number   // pixels
  showHandles: boolean
}

type ChartState = {
  timeframe: string
  activeTool: Tool
  theme: Theme
  indicators: IndicatorToggles
  indicatorSettings: IndicatorSettings
  setTool: (t: Tool) => void
  setTheme: (t: Theme) => void
  setTimeframe: (tf: string) => void
  toggleIndicator: (k: keyof IndicatorToggles) => void
  updateIndicatorSettings: (p: Partial<IndicatorSettings>) => void

  // Drawing state
  drawings: any[]
  selection: Set<string>
  drawingSettings: DrawingSettings
  addDrawing: (d: any) => void
  updateDrawing: (id: string, fn: (d:any)=>any) => void
  deleteSelected: () => void
  clearSelection: () => void
  setSelection: (sel: Set<string>) => void
  toggleSelect: (id: string, single?: boolean) => void
  setDrawingSettings: (p: Partial<DrawingSettings>) => void
}

export const useChartStore = create<ChartState>()(persist((set) => ({
  timeframe: '1H',
  activeTool: 'select',
  theme: 'dark',
  indicators: {
    showBB: true,
    showVWAP: true,
    showVWMA: true,
    showStdChannels: false,
    bandFill: true
  },
  indicatorSettings: {
    bbPeriod: 20,
    bbMult: 2,
    vwapAnchor: 'session',
    vwapAnchorIndex: undefined,
    vwmaPeriod: 20,
    stdChannelPeriod: 50,
    stdChannelMult: 2
  },

  drawings: [],
  selection: new Set<string>(),
  drawingSettings: { snapEnabled: true, snapStep: 10, showHandles: true },

  addDrawing: (d) => set((s)=>({ drawings: [...s.drawings, d] })),
  updateDrawing: (id, fn) => set((s)=>({ drawings: s.drawings.map(dr => dr.id===id ? fn(dr) : dr) })),
  deleteSelected: () => set((s)=>({ drawings: s.drawings.filter(d => !s.selection.has(d.id)), selection: new Set() })),
  clearSelection: () => set({ selection: new Set() }),
  setSelection: (sel) => set({ selection: sel }),
  toggleSelect: (id, single) => set((s)=> {
    const next = new Set(single ? [] : Array.from(s.selection));
    if (next.has(id)) next.delete(id); else next.add(id);
    return { selection: next }
  }),
  setDrawingSettings: (p) => set((s)=>({ drawingSettings: { ...s.drawingSettings, ...p } })),

  setTool: (t) => set({ activeTool: t }),
  setTheme: (t) => set({ theme: t }),
  setTimeframe: (tf) => set({ timeframe: tf }),
  toggleIndicator: (k) => set((s) => ({ indicators: { ...s.indicators, [k]: !s.indicators[k] } })),
  updateIndicatorSettings: (p) => set((s) => ({ indicatorSettings: { ...s.indicatorSettings, ...p } }))
}), { name: 'fynix-chart' }))
