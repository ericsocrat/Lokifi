import React from 'react'
import { useChartStore } from '@/state/store'
import { PALETTE } from '@/lib/styles'

export default function DrawingStylePanel() {
  const selCount = useChartStore(s => s.selection.size)
  const setStyle = useChartStore(s => s.setStyleForSelection)
  const setText = useChartStore(s => s.setTextForSelection)

  // simple local inputs
  const [width, setWidth] = React.useState(2)
  const [opacity, setOpacity] = React.useState(1)
  const [lineStyle, setLineStyle] = React.useState<'solid'|'dash'|'dot'>('solid')
  const [fill, setFill] = React.useState<string>('transparent')
  const [textValue, setTextValue] = React.useState('')

  const apply = (p: any) => setStyle(p)

  return (
    <div>
      <h2 className='text-lg font-semibold mb-2'>Drawing Style</h2>
      <div className='space-y-3 text-sm'>
        <div>
          <div className='mb-1'>Color</div>
          <div className='grid grid-cols-10 gap-2'>
            {PALETTE.map(c => (
              <button key={c}
                onClick={()=>apply({ stroke: c })}
                className='h-6 rounded'
                style={{ background: c }}
                title={c}
              />
            ))}
          </div>
        </div>

        <label className='flex items-center justify-between'>
          <span>Width</span>
          <input type='range' min={1} max={8} value={width}
            onChange={e => { const v = parseInt(e.target.value,10); setWidth(v); apply({ width: v }) }}
          />
        </label>

        <label className='flex items-center justify-between'>
          <span>Opacity</span>
          <input type='range' min={0} max={1} step={0.05} value={opacity}
            onChange={e => { const v = parseFloat(e.target.value); setOpacity(v); apply({ opacity: v }) }}
          />
        </label>

        <label className='flex items-center justify-between'>
          <span>Line style</span>
          <select className='bg-transparent border px-2 py-1 rounded'
            value={lineStyle}
            onChange={e => { const v = e.target.value as any; setLineStyle(v); apply({ lineStyle: v }) }}>
            <option value='solid'>Solid</option>
            <option value='dash'>Dash</option>
            <option value='dot'>Dot</option>
          </select>
        </label>

        <label className='flex items-center justify-between'>
          <span>Fill (rect)</span>
          <input className='ml-2 bg-transparent border px-2 py-1 rounded w-28'
            placeholder='transparent or #hex'
            value={fill}
            onChange={e => { const v = e.target.value || 'transparent'; setFill(v); apply({ fill: v }) }}
          />
        </label>

        <div>
          <div className='mb-1'>Text (for text drawings)</div>
          <input className='w-full bg-transparent border px-2 py-1 rounded'
            placeholder='Edit text...'
            value={textValue}
            onChange={e => setTextValue(e.target.value)}
            onBlur={()=> setText(textValue)}
          />
        </div>

        <div className='text-xs text-neutral-400 pt-1'>
          {selCount ? `${selCount} selected` : 'Select a drawing to edit.'}
        </div>
      </div>
    </div>
  )
}
