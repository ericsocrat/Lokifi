import React from 'react'
import { useChartStore } from '@/state/store'

export default function SnapshotsPanel() {
  const s = useChartStore()
  const [name, setName] = React.useState('Snapshot')

  React.useEffect(() => {
    // Hotkeys: Alt + Left/Right to cycle
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey) return
      if (e.key === 'ArrowLeft') { s.cycleSnapshot(-1); e.preventDefault() }
      if (e.key === 'ArrowRight') { s.cycleSnapshot(+1); e.preventDefault() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [s])

  return (
    <div className='rounded-2xl border border-white/15 p-3 space-y-3'>
      <div className='flex items-center justify-between'>
        <div className='font-semibold text-sm'>Snapshots</div>
        <div className='flex gap-2'>
          <input className='bg-transparent border border-white/15 rounded px-2 py-1 text-xs w-32'
            value={name} onChange={e=>setName(e.target.value)} placeholder='Name' />
          <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10'
            onClick={()=>{ if (name.trim()) s.saveSnapshot(name.trim()) }}>Save</button>
        </div>
      </div>

      <div className='space-y-2 max-h-60 overflow-auto'>
        {s.snapshots.length===0 && <div className='text-xs opacity-60'>No snapshots yet.</div>}
        {s.snapshots.map((sn: any) => (
          <div key={sn.id} className='flex items-center justify-between text-sm rounded border border-white/10 px-2 py-1'>
            <div className='truncate'>
              <span className='opacity-70'>#{sn.id.slice(0,5)}</span> — {sn.name}
              <span className='opacity-60 text-xs'> &nbsp; {new Date(sn.createdAt).toLocaleString()}</span>
            </div>
            <div className='flex gap-2'>
              <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10' onClick={()=>s.loadSnapshot(sn.id)}>Load</button>
              <button className='px-2 py-1 text-xs rounded border border-red-500/40 hover:bg-red-500/10' onClick={()=>s.deleteSnapshot(sn.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      <div className='text-xs opacity-60'>Tips: Use <kbd>Alt</kbd> + <kbd>←</kbd>/<kbd>→</kbd> to quick-compare snapshots.</div>
    </div>
  )
}
