import React from 'react'
import PriceChart from '@/components/PriceChart'
import DrawingSidePanel from '@/components/DrawingSidePanel'
import IndicatorSettingsDrawer from '@/components/IndicatorSettingsDrawer'
import PluginDrawer from '@/components/PluginDrawer'
import DrawingLayer from '@/components/DrawingLayer'
import DrawingSettings from '@/components/DrawingSettings'
import DrawingStylePanel from '@/components/DrawingStylePanel'

export default function App() {
  return (
    <div className='h-screen grid grid-cols-[64px_1fr_360px] gap-4 p-4'>
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
      </aside>
    </div>
  )
}
