import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { saveCurrent } from '@/lib/persist'

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

type HistoryEntry = {
  drawings: any[]
  selection: string[]
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

  // History
  past: HistoryEntry[]
  future: HistoryEntry[]
  maxHistory: number
  commit: (label?: string) => void
  undo: () => void
  redo: () => void

  // Clipboard
  clipboard: any[] | null
  copySelected: () => void
  paste: (offset?: {dx:number, dy:number}) => void

  // Mutation helpers
  addDrawing: (d: any) => void
  updateDrawing: (id: string, fn: (d:any)=>any) => void
  deleteSelected: () => void
  clearSelection: () => void
  setSelection: (sel: Set<string>) => void
  toggleSelect: (id: string, single?: boolean) => void
  setDrawingSettings: (p: Partial<DrawingSettings>) => void
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

export const useChartStore = create<ChartState>()(persist((set, get) => ({
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

  // History
  past: [],
  future: [],
  maxHistory: 100,
  commit: () => {
    const s = get()
    const entry: HistoryEntry = {
      drawings: deepClone(s.drawings),
      selection: Array.from(s.selection)
    }
    const nextPast = [...s.past, entry]
    if (nextPast.length > s.maxHistory) nextPast.shift()
    set({ past: nextPast, future: [] })
    // Persist current snapshot too
    try { saveCurrent(s.drawings, s.selection) } catch {}
  },
  undo: () => {
    const s = get()
    if (s.past.length === 0) return
    const prev = s.past[s.past.length - 1]
    const now: HistoryEntry = { drawings: deepClone(s.drawings), selection: Array.from(s.selection) }
    set({
      drawings: deepClone(prev.drawings),
      selection: new Set(prev.selection),
      past: s.past.slice(0, -1),
      future: [...s.future, now]
    })
  },
  redo: () => {
    const s = get()
    if (s.future.length === 0) return
    const next = s.future[s.future.length - 1]
    const now: HistoryEntry = { drawings: deepClone(s.drawings), selection: Array.from(s.selection) }
    set({
      drawings: deepClone(next.drawings),
      selection: new Set(next.selection),
      past: [...s.past, now],
      future: s.future.slice(0, -1)
    })
  },

  // Clipboard
  clipboard: null,
  copySelected: () => {
    const s = get()
    const ids = Array.from(s.selection)
    const items = s.drawings.filter(d => ids.includes(d.id))
    set({ clipboard: deepClone(items) })
  },
  paste: (offset = {dx: 10, dy: 10}) => {
    const s = get()
    if (!s.clipboard || s.clipboard.length === 0) return
    const clones = s.clipboard.map((d: any) => ({
      ...deepClone(d),
      id: crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36)+Math.random().toString(36).slice(2)),
      points: d.points.map((p: any) => ({ x: p.x + offset.dx, y: p.y + offset.dy }))
    }))
    set({
      drawings: [...s.drawings, ...clones],
      selection: new Set(clones.map((c:any)=>c.id))
    })
  },

  // Mutations
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
