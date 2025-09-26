import React from 'react'
import PriceChart from '@/components/PriceChart'
import DrawingSidePanel from '@/components/DrawingSidePanel'
import IndicatorSettingsDrawer from '@/components/IndicatorSettingsDrawer'
import PluginDrawer from '@/components/PluginDrawer'
import DrawingLayer from '@/components/DrawingLayer'
import DrawingSettings from '@/components/DrawingSettings'
import DrawingStylePanel from '@/components/DrawingStylePanel'
import ExportImportPanel from '@/components/ExportImportPanel'
import { decodeShare } from '@/lib/share'
import { useChartStore } from '@/state/store'
import { saveCurrent } from '@/lib/persist'

export default function App() {
  const loadedRef = React.useRef(false)

  // One-time loader if URL has a #share
  React.useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    const h = window.location.hash
    if (h && h.length > 1) {
      const data = decodeShare(h.slice(1))
      if (data) {
        const s = useChartStore.getState()
        useChartStore.setState({
          drawings: Array.isArray(data.drawings) ? data.drawings : s.drawings,
          selection: new Set<string>(),
          indicators: data.indicators ?? s.indicators,
          indicatorSettings: data.indicatorSettings ?? s.indicatorSettings,
          theme: (data.theme as any) ?? s.theme,
          symbol: (data.symbol as any) ?? s.symbol,
          timeframe: (data.timeframe as any) ?? s.timeframe
        })
        try { saveCurrent(useChartStore.getState().drawings, new Set()) } catch {}
        // keep the URL clean after loading
        history.replaceState(null, document.title, window.location.pathname + window.location.search)
      }
    }
  }, [])

  return (
    <div className='h-screen grid grid-cols-[64px_1fr_380px] gap-4 p-4'>
      <aside className='p-2 border border-neutral-700 rounded-2xl'>
        <DrawingSidePanel />
      </aside>
      <main className='relative border border-neutral-700 rounded-2xl'>
        <PriceChart />
        <DrawingLayer />
      </main>
      <aside className='p-4 space-y-4 border border-neutral-700 rounded-2xl'>
        <IndicatorSettingsDrawer />
        <PluginDrawer />
        <DrawingSettings />
        <DrawingStylePanel />
        <ExportImportPanel />
      </aside>
    </div>
  )
}
