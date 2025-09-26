import React from 'react'
import { useChartStore } from '@/state/store'
import type { Layer } from '@/state/store'

export default function LayersPanel() {
  const s = useChartStore()
  const [name, setName] = React.useState('Layer')

  const layers = [...s.layers].sort((a,b)=>a.order-b.order)

  return (
    <div className='rounded-2xl border border-white/15 p-3 space-y-3'>
      <div className='flex items-center justify-between'>
        <div className='font-semibold text-sm'>Layers</div>
        <div className='flex gap-2'>
          <input className='bg-transparent border border-white/15 rounded px-2 py-1 text-xs w-28' value={name} onChange={e=>setName(e.target.value)} />
          <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10' onClick={()=>s.addLayer(name||'Layer')}>+ Add</button>
        </div>
      </div>

      <div className='space-y-2'>
        {layers.map(l => <LayerRow key={l.id} layer={l} />)}
      </div>
    </div>
  )
}

function LayerRow({ layer }: { layer: Layer }) {
  const s = useChartStore()
  const isActive = s.activeLayerId === layer.id
  const [editing, setEditing] = React.useState(false)
  const [tmp, setTmp] = React.useState(layer.name)

  React.useEffect(()=>setTmp(layer.name), [layer.name])

  return (
    <div className={'flex items-center gap-2 text-sm rounded border border-white/10 px-2 py-1 ' + (isActive ? 'bg-white/5' : '')}>
      <button className={'w-6 text-center rounded ' + (layer.visible ? 'opacity-100' : 'opacity-40')} title='Toggle visibility'
              onClick={()=>s.toggleLayerVisibility(layer.id)}>👁</button>
      <button className={'w-6 text-center rounded ' + (layer.locked ? 'opacity-100' : 'opacity-40')} title='Toggle lock'
              onClick={()=>s.toggleLayerLock(layer.id)}>🔒</button>

      {editing ? (
        <input autoFocus className='flex-1 bg-transparent border border-white/15 rounded px-2 py-0.5'
               value={tmp} onChange={e=>setTmp(e.target.value)}
               onBlur={()=>{ s.renameLayer(layer.id, tmp||layer.name); setEditing(false) }}
               onKeyDown={e=>{ if (e.key==='Enter') { (e.target as HTMLInputElement).blur() } }} />
      ) : (
        <div className='flex-1 truncate cursor-text' onClick={()=>setEditing(true)}>{layer.name}</div>
      )}

      <div className='flex items-center gap-2 w-28'>
        <input type='range' min={0} max={100} value={Math.round(layer.opacity*100)}
               onChange={e=>s.setLayerOpacity(layer.id, parseInt(e.target.value,10)/100)} title='Opacity' />
        <button className='px-1 rounded border border-white/15 text-xs' onClick={()=>s.moveLayer(layer.id,'up')} title='Up'>↑</button>
        <button className='px-1 rounded border border-white/15 text-xs' onClick={()=>s.moveLayer(layer.id,'down')} title='Down'>↓</button>
      </div>

      <button className={'px-2 py-0.5 text-xs rounded border ' + (isActive ? 'border-emerald-400/50' : 'border-white/15')}
              onClick={()=>s.setActiveLayer(layer.id)} title='Set active'>Use</button>
    </div>
  )
}
