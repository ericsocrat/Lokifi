import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Tool =
  | 'select' | 'trendline' | 'hline' | 'vline'
  | 'rect' | 'text' | 'arrow'
  | 'ray' | 'ellipse' | 'fib'
export type Theme = 'light' | 'dark'

type IndicatorToggles = {
  showBB: boolean
  showVWAP: boolean
  showVWMA: boolean
  showStdChannels: boolean
  bandFill: boolean
}
type IndicatorSettings = {
  bbPeriod: number
  bbMult: number
  vwapAnchor: 'session' | 'index'
  vwapAnchorIndex?: number
  vwmaPeriod: number
  stdChannelPeriod: number
  stdChannelMult: number
}

type DrawingSettings = {
  snapEnabled: boolean
  snapStep: number
  showHandles: boolean
  snapPriceLevels: boolean
  lineCap: 'butt'|'round'|'square'
  arrowHead: 'none'|'open'|'filled'
  arrowHeadSize: number
  showLineLabels: boolean
}

const defaultDrawingSettings: DrawingSettings = {
  snapEnabled: true,
  snapStep: 10,
  showHandles: true,
  snapPriceLevels: true,
  lineCap: 'round',
  arrowHead: 'filled',
  arrowHeadSize: 12,
  showLineLabels: true,
}

const defaultHotkeys: Record<string,string> = {
  DeleteSelected: 'Delete',
  DuplicateSelected: 'Ctrl+D',
  ArrowSizeDecrease: '[',
  ArrowSizeIncrease: ']',
  CycleLineCap: ';',
  CycleArrowHead: "'",
  AlignLeft: 'Ctrl+Alt+ArrowLeft',
  AlignRight: 'Ctrl+Alt+ArrowRight',
  AlignTop: 'Ctrl+Alt+ArrowUp',
  AlignBottom: 'Ctrl+Alt+ArrowDown',
  DistributeHoriz: 'Ctrl+Shift+H',
  DistributeVert: 'Ctrl+Shift+V',
}

type ChartState = {
  timeframe: string
  activeTool: Tool
  theme: Theme
  indicators: IndicatorToggles
  indicatorSettings: IndicatorSettings

  drawings: import('@/lib/drawings').Drawing[]
  selection: Set<string>
  drawingSettings: DrawingSettings

  setTool: (t: Tool) => void
  setTheme: (t: Theme) => void
  setTimeframe: (tf: string) => void
  toggleIndicator: (k: keyof IndicatorToggles) => void
  updateIndicatorSettings: (p: Partial<IndicatorSettings>) => void

  addDrawing: (d: import('@/lib/drawings').Drawing) => void
  updateDrawing: (id: string, fn: (d: import('@/lib/drawings').Drawing)=>import('@/lib/drawings').Drawing) => void
  deleteSelected: () => void
  clearSelection: () => void
  setSelection: (sel: Set<string>) => void
  toggleSelect: (id: string, single?: boolean) => void

  setDrawingSettings: (p: Partial<DrawingSettings>) => void
  resetDrawingSettings: () => void

  hotkeys: Record<string,string>
  setHotkey: (action: string, key: string) => void
  resetHotkeys: () => void

  duplicateSelected: () => void
  alignSelected: (pos: 'left'|'right'|'top'|'bottom') => void
  distributeSelected: (axis: 'h'|'v') => void
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
  drawingSettings: { ...defaultDrawingSettings },

  setTool: (t) => set({ activeTool: t }),
  setTheme: (t) => set({ theme: t }),
  setTimeframe: (tf) => set({ timeframe: tf }),
  toggleIndicator: (k) => set((s) => ({ indicators: { ...s.indicators, [k]: !s.indicators[k] } })),
  updateIndicatorSettings: (p) => set((s) => ({ indicatorSettings: { ...s.indicatorSettings, ...p } })),

  addDrawing: (d) => set((s)=>({ drawings: [...s.drawings, d] })),
  updateDrawing: (id, fn) => set((s)=>({ drawings: s.drawings.map(dr => dr.id===id ? fn(dr) : dr) })),
  deleteSelected: () => set((s)=>({ drawings: s.drawings.filter(d => !s.selection.has(d.id)), selection: new Set() })),
  clearSelection: () => set({ selection: new Set() }),
  setSelection: (sel) => set({ selection: sel }),
  toggleSelect: (id, single) => set((s)=> { const next = new Set(single ? [] : Array.from(s.selection)); if (next.has(id)) next.delete(id); else next.add(id); return { selection: next } }),

  setDrawingSettings: (p) => set((s)=>({ drawingSettings: { ...s.drawingSettings, ...p } })),
  resetDrawingSettings: () => set({ drawingSettings: { ...defaultDrawingSettings } }),

  hotkeys: { ...defaultHotkeys },
  setHotkey: (action, key) => set((s)=> ({ hotkeys: { ...s.hotkeys, [action]: key } })),
  resetHotkeys: () => set({ hotkeys: { ...defaultHotkeys } }),

  duplicateSelected: () => set((s) => {
    const ids = Array.from(s.selection)
    if (!ids.length) return {}
    const items = s.drawings.filter((d)=>ids.includes(d.id))
    const clones = items.map((d) => ({
      ...structuredClone(d),
      id: (globalThis.crypto as any)?.randomUUID?.() || (Date.now().toString(36)+Math.random().toString(36).slice(2)),
      points: d.points.map((p)=>({ x: p.x + 12, y: p.y + 12 }))
    }))
    return { drawings: [...s.drawings, ...clones], selection: new Set(clones.map((c)=>c.id)) }
  }),

  alignSelected: (pos) => set((s)=>{
    const ids = Array.from(s.selection); if (!ids.length) return {}
    const sel = s.drawings.filter((d)=>ids.includes(d.id))
    const boxes = sel.map((d)=>bbox(d))
    const minX = Math.min(...boxes.map((b)=>b.x)), maxX = Math.max(...boxes.map((b)=>b.x+b.w))
    const minY = Math.min(...boxes.map((b)=>b.y)), maxY = Math.max(...boxes.map((b)=>b.y+b.h))
    const moved = s.drawings.map((d)=>{
      if (!ids.includes(d.id)) return d
      const b = bbox(d)
      let dx = 0, dy = 0
      if (pos==='left') dx = minX - b.x
      if (pos==='right') dx = maxX - (b.x + b.w)
      if (pos==='top') dy = minY - b.y
      if (pos==='bottom') dy = maxY - (b.y + b.h)
      return { ...d, points: d.points.map((p)=>({ x: p.x + dx, y: p.y + dy })) }
    })
    return { drawings: moved }
  }),

  distributeSelected: (axis) => set((s)=>{
    const ids = Array.from(s.selection); if (ids.length < 3) return {}
    const sel = s.drawings.filter((d)=>ids.includes(d.id))
    const arr = sel.map((d)=>({ d, b: bbox(d) }))
    arr.sort((a,b)=> axis==='h' ? (a.b.x - b.b.x) : (a.b.y - b.b.y))
    const first = arr[0].b, last = arr[arr.length-1].b
    const span = (axis==='h' ? (last.x - first.x) : (last.y - first.y))
    const gap = span / (arr.length - 1)
    const desired = arr.map((_,i)=> (axis==='h' ? (first.x + i*gap) : (first.y + i*gap)))
    const moved = s.drawings.map((d)=>{
      const i = arr.findIndex((x)=>x.d.id===d.id)
      if (i<0) return d
      const b = arr[i].b
      const cur = axis==='h' ? b.x : b.y
      const delta = desired[i] - cur
      return { ...d, points: d.points.map((p)=> axis==='h' ? ({ x: p.x + delta, y: p.y }) : ({ x: p.x, y: p.y + delta })) }
    })
    return { drawings: moved }
  }),

}), {
  name: 'fynix-chart',
  partialize: (s) => ({
    hotkeys: s.hotkeys,
    drawingSettings: s.drawingSettings,
    theme: s.theme,
    timeframe: s.timeframe,
  }),
}))

function bbox(d:any){
  const xs = d.points.map((p:any)=>p.x); const ys = d.points.map((p:any)=>p.y)
  const x = Math.min(...xs), y = Math.min(...ys)
  const w = Math.max(...xs)-x, h = Math.max(...ys)-y
  return { x,y,w,h }
}

export { defaultDrawingSettings, defaultHotkeys }
