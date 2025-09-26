import React from 'react'
import PriceChart from '@/components/PriceChart'
import DrawingSidePanel from '@/components/DrawingSidePanel'
import SnapshotsPanel from '@/components/SnapshotsPanel'
import LayersPanel from '@/components/LayersPanel'
import IndicatorSettingsDrawer from '@/components/IndicatorSettingsDrawer'
import PluginDrawer from '@/components/PluginDrawer'
import AlertPortal from '@/components/AlertPortal'
import DrawingLayer from '@/components/DrawingLayer'
import DrawingSettingsPanel from '@/components/DrawingSettingsPanel'
import { useGlobalHotkeys } from '@/lib/globalHotkeys'

export default function App() {
  useGlobalHotkeys()
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
</main>
      <aside className='p-4 space-y-4 border border-neutral-700 rounded-2xl'>
        <IndicatorSettingsDrawer />
        <PluginDrawer />
        <DrawingSettingsPanel />
      </aside>
    </div>
  )
}


