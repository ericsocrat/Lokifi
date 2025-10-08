import React from 'react'
import { useChartStore } from '@/state/store'
import { TF_PRESETS, SYMBOL_SUGGESTIONS, normalizeTf } from '@/lib/timeframes'

export default function SymbolTfBar() {
  const symbol = useChartStore(s => s.symbol)
  const timeframe = useChartStore(s => s.timeframe)
  const setSymbol = useChartStore(s => s.setSymbol)
  const setTimeframe = useChartStore(s => s.setTimeframe)

  const [symInput, setSymInput] = React.useState(symbol)
  const [tfInput, setTfInput] = React.useState(timeframe)
  const [showSymMenu, setShowSymMenu] = React.useState(false)

  React.useEffect(() => setSymInput(symbol), [symbol])
  React.useEffect(() => setTfInput(timeframe), [timeframe])

  const applySymbol = () => {
    const v = symInput.trim().toUpperCase()
    if (!v) return
    setSymbol(v)
    setShowSymMenu(false)
  }
  const applyTf = () => {
    const v = normalizeTf(tfInput)
    if (!v) return
    setTimeframe(v)
  }

  // simple outside click for suggestions
  const menuRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as any)) setShowSymMenu(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div className='absolute top-2 left-2 z-10 flex items-center gap-2 px-2 py-1 rounded-xl bg-black/50 border border-white/10 backdrop-blur'>
      {/* Symbol input */}
      <div className='relative' ref={menuRef}>
        <input
          value={symInput}
          onChange={e => { setSymInput(e.target.value.toUpperCase()); setShowSymMenu(true) }}
          onKeyDown={e => { if (e.key==='Enter') applySymbol() }}
          className='px-2 py-1 rounded bg-transparent border border-white/15 text-sm w-36 outline-none'
          placeholder='Symbol'
        />
        {showSymMenu && (
          <div className='absolute mt-1 left-0 w-48 max-h-56 overflow-auto rounded-md border border-white/10 bg-black/80 shadow-lg'>
            {SYMBOL_SUGGESTIONS
              .filter(s => s.toUpperCase().includes(symInput.toUpperCase()))
              .slice(0,20)
              .map(sug => (
                <button
                  key={sug}
                  onClick={() => { setSymInput(sug); setSymbol(sug); setShowSymMenu(false) }}
                  className='w-full text-left px-2 py-1 text-sm hover:bg-white/10'>
                  {sug}
                </button>
            ))}
            {SYMBOL_SUGGESTIONS.length === 0 && (
              <div className='px-2 py-1 text-xs opacity-60'>No suggestions</div>
            )}
          </div>
        )}
      </div>

      <button
        onClick={applySymbol}
        className='px-2 py-1 rounded border border-white/15 text-sm hover:bg-white/10'>
        Set
      </button>

      <div className='w-px h-6 bg-white/10 mx-1' />

      {/* Timeframe presets */}
      <div className='flex gap-1'>
        {TF_PRESETS.map(tf => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={'px-2 py-1 rounded text-sm border ' + (timeframe===tf ? 'border-white/60 bg-white/10' : 'border-white/15 hover:bg-white/10')}>
            {tf}
          </button>
        ))}
      </div>

      {/* Freeform timeframe */}
      <input
        value={tfInput}
        onChange={e => setTfInput(e.target.value)}
        onKeyDown={e => { if (e.key==='Enter') applyTf() }}
        className='px-2 py-1 rounded bg-transparent border border-white/15 text-sm w-20 outline-none'
        placeholder='e.g. 90m'
      />
      <button
        onClick={applyTf}
        className='px-2 py-1 rounded border border-white/15 text-sm hover:bg-white/10'>
        Set
      </button>
    </div>
  )
}
