import React from 'react'
import { useChartStore } from '@/state/store'

export default function ObjectInspector() {
  const s = useChartStore()
  const sel = Array.from(s.selection)
  const count = sel.length
  const drawings = useChartStore(st => st.drawings.filter((d: any) => st.selection.has(d.id)))
  const first = drawings[0]

  if (count === 0) return (
    <div className='rounded-2xl border border-white/15 p-3'>
      <div className='text-sm opacity-70'>No selection</div>
    </div>
  )

  const mixed = (key: any, pick:(d:any)=>any) => {
    const v = pick(drawings[0])
    return drawings.some(d => pick(d) !== v) ? key : v
  }

  return (
    <div className='rounded-2xl border border-white/15 p-3 space-y-3'>
      <div className='flex items-center justify-between'>
        <div className='font-semibold text-sm'>Selected ({count})</div>
        <div className='flex gap-2'>
          <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10'
                  onClick={()=>s.toggleLockSelected()}>{drawings.every(d=>d.locked) ? 'Unlock' : 'Lock'}</button>
          <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10'
                  onClick={()=>s.toggleVisibilitySelected()}>{drawings.every(d=>d.hidden) ? 'Show' : 'Hide'}</button>
        </div>
      </div>

      <div className='space-y-2'>
        <label className='text-xs opacity-70'>Name</label>
        <input className='w-full bg-transparent border border-white/15 rounded px-2 py-1 text-sm'
               value={typeof mixed('—', d=>d.name||'') === 'string' ? (first?.name||'') : '—'}
               onChange={e=>s.renameSelected(e.target.value)} placeholder='Untitled object'/>
      </div>

      <div className='grid grid-cols-2 gap-2 text-sm'>
        <div>
          <div className='text-xs opacity-70 mb-1'>Stroke</div>
          <input type='color' className='w-full h-8 bg-transparent border border-white/15 rounded'
                 value={first?.style?.stroke || '#9ca3af'}
                 onChange={e=>s.setSelectedStyle({ stroke: e.target.value })}/>
        </div>
        <div>
          <div className='text-xs opacity-70 mb-1'>Width</div>
          <input type='number' min={1} max={6} className='w-full bg-transparent border border-white/15 rounded px-2 py-1'
                 value={first?.style?.strokeWidth ?? 2}
                 onChange={e=>s.setSelectedStyle({ strokeWidth: Math.max(1, parseInt(e.target.value||'1',10)) })}/>
        </div>

        <div>
          <div className='text-xs opacity-70 mb-1'>Dash</div>
          <select className='w-full bg-transparent border border-white/15 rounded px-2 py-1'
                  value={first?.style?.dash || 'solid'}
                  onChange={e=>s.setSelectedStyle({ dash: e.target.value as any })}>
            <option value='solid'>solid</option>
            <option value='dash'>dash</option>
            <option value='dot'>dot</option>
            <option value='dashdot'>dashdot</option>
          </select>
        </div>
        <div>
          <div className='text-xs opacity-70 mb-1'>Opacity</div>
          <input type='range' min={20} max={100}
                 value={Math.round((first?.style?.opacity ?? 1)*100)}
                 onChange={e=>s.setSelectedStyle({ opacity: parseInt(e.target.value,10)/100 })}/>
        </div>

        <div className='col-span-2'>
          <div className='text-xs opacity-70 mb-1'>Fill (rect/ellipse/channel)</div>
          <input type='color' className='w-full h-8 bg-transparent border border-white/15 rounded'
                 value={(first?.style?.fill as any) || '#000000'}
                 onChange={e=>s.setSelectedStyle({ fill: e.target.value })}/>
        </div>
      </div>

      {drawings.every(d=>d.kind==='fib') && (
        <FibEditor />
      )}

      <div className='h-px bg-white/10' />

      <div className='grid grid-cols-2 gap-2'>
        <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10'
                onClick={()=>s.bringToFront()}>Bring to front</button>
        <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10'
                onClick={()=>s.sendToBack()}>Send to back</button>
        <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10'
                onClick={()=>s.groupSelected()}>Group</button>
        <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10'
                onClick={()=>s.ungroupSelected()}>Ungroup</button>
      </div>
    </div>
  )
}

function FibEditor() {
  const s = useChartStore()
  const drawings = useChartStore(st => st.drawings.filter((d: any) => st.selection.has(d.id)))
  const first = drawings[0]
  const levels = (first?.fibLevels ?? s.drawingSettings.fibDefaultLevels).slice().sort((a: number, b: number) => a - b)
  const [val, setVal] = React.useState(levels.join(', '))

  return (
    <div className='space-y-2'>
      <div className='font-semibold text-sm'>Fibonacci Levels</div>
      <div className='text-xs opacity-70'>Comma-separated (0..1). Examples: 0, 0.236, 0.382, 0.5, 0.618, 1</div>
      <input className='w-full bg-transparent border border-white/15 rounded px-2 py-1 text-sm'
             value={val} onChange={e=>setVal(e.target.value)} />
      <div className='flex gap-2'>
        <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10'
                onClick={()=>{
                  const arr = parseLevels(val)
                  if (!arr.length) return
                  s.setFibLevelsForSelected(arr)
                }}>Apply to selection</button>
        <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10'
                onClick={()=>{
                  const arr = parseLevels(val)
                  if (!arr.length) return
                  s.setFibDefaultLevels(arr)
                }}>Set as default</button>
        <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10'
                onClick={()=>setVal('0, 0.236, 0.382, 0.5, 0.618, 1')}>Classic</button>
        <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10'
                onClick={()=>setVal('0, 0.236, 0.382, 0.5, 0.618, 0.786, 1')}>Extended</button>
      </div>
    </div>
  )
}
function parseLevels(src: string): number[] {
  return src.split(',').map(s=>parseFloat(s.trim())).filter(n=>!Number.isNaN(n) && n>=0 && n<=1)
}
