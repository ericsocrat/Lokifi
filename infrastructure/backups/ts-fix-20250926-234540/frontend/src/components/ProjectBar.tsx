import React from 'react'
import { useChartStore } from '@/state/store'
import { listSlots, saveSlot, loadSlot, deleteSlot, projectFromState } from '@/lib/persistence'
import { exportPNG, exportSVG } from '@/lib/exporters'

export default function ProjectBar() {
  const s = useChartStore()
  const [slots, setSlots] = React.useState<string[]>([])
  const [name, setName] = React.useState('My project')

  const refresh = () => setSlots(listSlots())

  React.useEffect(() => { refresh() }, [])

  const onSave = () => {
    const proj = projectFromState({ drawings: s.drawings, theme: s.theme, timeframe: s.timeframe }, name)
    saveSlot(name, proj)
    refresh()
    try { (window as any).__fynix_toast?.('Saved project') } catch {}
  }

  const onLoad = (slot: string) => {
    const proj = loadSlot(slot)
    if (!proj) return
    s.clearSelection()
    // Overwrite current scene safely
    s.setAll?.({
      drawings: proj.drawings || [],
      theme: proj.theme || s.theme,
      timeframe: proj.timeframe || s.timeframe
    })
    try { (window as any).__fynix_toast?.('Loaded project') } catch {}
  }

  const onDelete = (slot: string) => {
    deleteSlot(slot); refresh()
  }

  return (
    <div className='rounded-2xl border border-white/15 p-3 space-y-3'>
      <div className='flex items-center justify-between'>
        <div className='font-semibold text-sm'>Projects</div>
        <div className='flex gap-2'>
          <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10' onClick={()=>exportPNG()}>Export PNG</button>
          <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10' onClick={()=>exportSVG()}>Export SVG</button>
        </div>
      </div>

      <div className='grid grid-cols-3 gap-2 text-sm'>
        <input className='col-span-2 bg-transparent border border-white/15 rounded px-2 py-1' value={name} onChange={e=>setName(e.target.value)} placeholder='Slot name' />
        <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10' onClick={onSave}>Save</button>
      </div>

      <div className='space-y-1'>
        {slots.length===0 && <div className='text-xs opacity-60'>No saved projects yet.</div>}
        {slots.map(slot => (
          <div key={slot} className='flex items-center justify-between text-sm'>
            <div className='truncate'>{slot}</div>
            <div className='flex gap-2'>
              <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10' onClick={()=>onLoad(slot)}>Load</button>
              <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10' onClick={()=>onDelete(slot)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
