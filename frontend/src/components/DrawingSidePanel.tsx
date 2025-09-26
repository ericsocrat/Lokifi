import React from 'react'
import { useChartStore } from '@/state/store'
import cn from 'classnames'

const tools: { id: ReturnType<typeof useChartStore.getState>['activeTool'], label: string, icon: string }[] = [
  { id: 'select', label: 'Select (V)', icon: '▢' },
  { id: 'trendline', label: 'Trendline (T)', icon: '/' },
  { id: 'hline', label: 'Horizontal', icon: '—' },
  { id: 'vline', label: 'Vertical', icon: '|' },
  { id: 'ray', label: 'Ray', icon: '↗' },
  { id: 'arrow', label: 'Arrow (A)', icon: '→' },
  { id: 'rect', label: 'Rectangle (R)', icon: '▭' },
  { id: 'ellipse', label: 'Ellipse', icon: '◯' },
  { id: 'text', label: 'Text', icon: 'T' },
  { id: 'fib', label: 'Fibonacci', icon: '𝜑' },
  { id: 'pitchfork', label: 'Pitchfork', icon: 'Ψ' },
  { id: 'channel', label: 'Channel', icon: '≋' },
  { id: 'parallel-channel', label: 'Parallel', icon: '≡' },
]

export default function DrawingSidePanel() {
  const active = useChartStore(s => s.activeTool)
  const setTool = useChartStore(s => s.setTool)
  return (
    <div className="flex flex-col gap-2">
      {tools.map(t => (
        <button key={t.id}
          className={cn('w-9 h-9 rounded-xl border border-neutral-700 hover:border-neutral-500 grid place-items-center text-sm', active===t.id && 'border-indigo-400')}
          title={t.label}
          onClick={() => setTool(t.id)}
        >
          <span style={{width:16,height:16,display:'inline-block'}}>{t.icon}</span>
        </button>
      ))}
    </div>
  )
}
