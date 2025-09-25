import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Tool =
  | 'select' | 'trendline' | 'hline' | 'vline' | 'ray'
  | 'arrow' | 'rect' | 'ellipse' | 'text'
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
  setTool: (t) => set({ activeTool: t }),
  setTheme: (t) => set({ theme: t }),
  setTimeframe: (tf) => set({ timeframe: tf }),
  toggleIndicator: (k) => set((s) => ({ indicators: { ...s.indicators, [k]: !s.indicators[k] } })),
  updateIndicatorSettings: (p) => set((s) => ({ indicatorSettings: { ...s.indicatorSettings, ...p } }))
}), { name: 'fynix-chart' }))
