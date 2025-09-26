import React from 'react'
import { useChartStore } from '@/state/store'
import { toast } from '@/lib/toast'

const HOTKEYS: Array<{action:string; label:string}> = [
  { action: 'DeleteSelected', label: 'Delete selected' },
  { action: 'DuplicateSelected', label: 'Duplicate selected' },
  { action: 'ArrowSizeDecrease', label: 'Arrow size −' },
  { action: 'ArrowSizeIncrease', label: 'Arrow size +' },
  { action: 'CycleLineCap', label: 'Cycle line cap' },
  { action: 'CycleArrowHead', label: 'Cycle arrow head' },
  { action: 'AlignLeft', label: 'Align left' },
  { action: 'AlignRight', label: 'Align right' },
  { action: 'AlignTop', label: 'Align top' },
  { action: 'AlignBottom', label: 'Align bottom' },
  { action: 'DistributeHoriz', label: 'Distribute horizontal' },
  { action: 'DistributeVert', label: 'Distribute vertical' }
]

function captureKey(e: React.KeyboardEvent<HTMLInputElement>) {
  e.preventDefault()
  const parts:string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  const k = e.key.length === 1 ? e.key.toUpperCase() : e.key
  parts.push(k)
  return parts.join('+')
}

export default function DrawingSettingsPanel() {
  const ds = useChartStore(s => s.drawingSettings)
  const setDS = useChartStore(s => s.setDrawingSettings)
  const resetDS = useChartStore(s => s.resetDrawingSettings)
  const hk = useChartStore(s => s.hotkeys)
  const setHK = useChartStore(s => s.setHotkey)
  const resetHK = useChartStore(s => s.resetHotkeys)

  // small helper to toast once per user action burst
  const ding = React.useRef<number>(0)
  const saved = (msg = 'Saved') => {
    const now = Date.now()
    if (now - ding.current > 250) { toast(msg); ding.current = now }
  }

  return (
    <div className='space-y-4'>
      <h2 className='text-lg font-semibold'>Drawing Settings</h2>

      <div className='grid grid-cols-2 gap-2 text-sm'>
        <label className='col-span-1 flex items-center gap-2'>
          <input
            type='checkbox'
            checked={ds.snapEnabled}
            onChange={e => { setDS({ snapEnabled: e.target.checked }); saved() }}
          />
          Grid snap
        </label>
        <div className='col-span-1 flex items-center gap-2'>
          <span className='opacity-70'>Step</span>
          <input
            type='number'
            className='w-16 bg-transparent border border-white/15 rounded px-2 py-1'
            value={ds.snapStep} min={1} max={50}
            onChange={e => { setDS({ snapStep: Math.max(1, parseInt(e.target.value||'1',10)) }); saved() }}
          />
        </div>

        <label className='col-span-2 flex items-center gap-2'>
          <input
            type='checkbox'
            checked={ds.snapPriceLevels}
            onChange={e => { setDS({ snapPriceLevels: e.target.checked }); saved() }}
          />
          Snap to price levels (OHLC/close)
        </label>

        <label className='col-span-2 flex items-center gap-2'>
          <input
            type='checkbox'
            checked={ds.showHandles}
            onChange={e => { setDS({ showHandles: e.target.checked }); saved() }}
          />
          Show selection handles
        </label>

        <label className='col-span-2 flex items-center gap-2'>
          <input
            type='checkbox'
            checked={ds.showLineLabels}
            onChange={e => { setDS({ showLineLabels: e.target.checked }); saved() }}
          />
          Show line labels (% change)
        </label>

        <div className='col-span-2 h-px bg-white/10 my-1' />

        <div className='col-span-1'>
          <div className='opacity-70 mb-1'>Line cap</div>
          <select
            className='w-full bg-transparent border border-white/15 rounded px-2 py-1'
            value={ds.lineCap}
            onChange={e => { setDS({ lineCap: e.target.value as any }); saved() }}
          >
            <option value='butt'>butt</option>
            <option value='round'>round</option>
            <option value='square'>square</option>
          </select>
        </div>

        <div className='col-span-1'>
          <div className='opacity-70 mb-1'>Arrow head</div>
          <select
            className='w-full bg-transparent border border-white/15 rounded px-2 py-1'
            value={ds.arrowHead}
            onChange={e => { setDS({ arrowHead: e.target.value as any }); saved() }}
          >
            <option value='none'>none</option>
            <option value='open'>open</option>
            <option value='filled'>filled</option>
          </select>
        </div>

        <div className='col-span-2 flex items-center gap-2'>
          <div className='opacity-70'>Arrow size</div>
          <input
            type='range' min={6} max={48} value={ds.arrowHeadSize}
            onChange={e => { setDS({ arrowHeadSize: parseInt(e.target.value,10) }); saved() }}
            className='flex-1'
          />
          <div className='w-10 text-right'>{ds.arrowHeadSize}</div>
        </div>
      </div>

      <div className='flex gap-2'>
        <button
          onClick={() => { resetDS(); toast('Drawing settings reset'); }}
          className='px-3 py-2 rounded border border-white/15 hover:bg-white/10 text-sm'
        >
          Reset drawing settings
        </button>
      </div>

      <div className='h-px bg-white/10' />

      <h3 className='font-semibold'>Hotkeys</h3>
      <div className='space-y-2'>
        {HOTKEYS.map(k => (
          <div key={k.action} className='flex items-center justify-between gap-2 text-sm'>
            <div className='opacity-80'>{k.label}</div>
            <input
              className='w-44 bg-transparent border border-white/15 rounded px-2 py-1'
              value={hk[k.action] || ''}
              onKeyDown={(e) => {
                const combo = captureKey(e)
                resetIfDuplicate(k.action, combo)
                setHK(k.action, combo)
                saved()
              }}
              onChange={() => {}}
              placeholder='Press keys…'
              title='Click and press keys (e.g., Ctrl+Shift+V)'
            />
          </div>
        ))}
      </div>

      <div className='flex gap-2'>
        <button
          onClick={() => { resetHK(); toast('Hotkeys reset'); }}
          className='px-3 py-2 rounded border border-white/15 hover:bg-white/10 text-sm'
        >
          Reset hotkeys
        </button>
      </div>
    </div>
  )
}

/** If a key combo is already used, clear the old action first */
function resetIfDuplicate(action: string, combo: string) {
  const s = useChartStore.getState()
  const current = s.hotkeys
  const prevAction = Object.keys(current).find(a => current[a] === combo && a !== action)
  if (prevAction) s.setHotkey(prevAction, '')
}
