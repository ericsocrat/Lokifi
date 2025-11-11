import React from 'react'
import PriceChart from '@/components/PriceChart'
import DrawingSidePanel from '@/components/DrawingSidePanel'
import SnapshotsPanel from '@/components/SnapshotsPanel'
import LayersPanel from '@/components/LayersPanel'
import IndicatorSettingsDrawer from '@/components/IndicatorSettingsDrawer'
import IndicatorControlsPanel from '@/components/dashboard/IndicatorControlsPanel'
import PluginDrawer from '@/components/PluginDrawer'
import AlertPortal from '@/components/AlertPortal'
import DrawingLayer from '@/components/DrawingLayer'
import DrawingSettingsPanel from '@/components/DrawingSettingsPanel'
import { useGlobalHotkeys } from '@/lib/utils/globalHotkeys'
import { useChartStore } from '@/state/store'

export default function App() {
  useGlobalHotkeys()
  const indicatorControlsPanelVisible = useChartStore(
    (state) => state.indicatorControlsPanelVisible
  )
  const toggleIndicatorControlsPanel = useChartStore(
    (state) => state.toggleIndicatorControlsPanel
  )

  return (
    <div className='grid grid-cols-[280px,1fr,320px] gap-4 p-4'>
      <aside className='p-4 space-y-4 border border-neutral-700 rounded-2xl'>
        <DrawingSidePanel />
              <LayersPanel />
        <SnapshotsPanel />
</aside>
      <main className='relative border border-neutral-700 rounded-2xl'>
        <PriceChart />
        <DrawingLayer />
      
        <AlertPortal />

        {/* Floating Indicator Controls Panel */}
        {indicatorControlsPanelVisible && (
          <div className='absolute top-4 right-4 z-10 max-w-md'>
            <IndicatorControlsPanel />
          </div>
        )}

        {/* Toggle Button for Indicator Controls Panel */}
        <button
          onClick={toggleIndicatorControlsPanel}
          className='absolute top-4 right-4 z-20 px-3 py-2 text-xs font-medium rounded-lg border border-white/15 bg-black/80 backdrop-blur-sm hover:bg-white/10 transition-colors'
          title={`${indicatorControlsPanelVisible ? 'Hide' : 'Show'} Indicator Controls (Ctrl+Alt+I)`}
        >
          {indicatorControlsPanelVisible ? '✕' : '⚙️'}
        </button>
</main>
      <aside className='p-4 space-y-4 border border-neutral-700 rounded-2xl'>
        <IndicatorSettingsDrawer />
        <PluginDrawer />
        <DrawingSettingsPanel />
      </aside>
    </div>
  )
}


