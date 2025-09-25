import { useEffect } from 'react'
import { useChartStore } from '@/state/store'

export default function useHotkeys() {
  const setTool = useChartStore(s => s.setTool)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return
      switch (e.key.toLowerCase()) {
        case 'v': setTool('select'); break
        case 't': setTool('trendline'); break
        case 'h': setTool('hline'); break
        case 'r': setTool('rect'); break
        case 'a': setTool('arrow'); break
        case 'p': setTool('parallel-channel'); break
        case 'f': setTool('fib'); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setTool])
}
