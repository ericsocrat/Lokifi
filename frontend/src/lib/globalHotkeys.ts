import { useEffect } from 'react'
import { useChartStore } from '@/state/store'

type BindingMap = Record<string, string>

function keyFromEvent(e: KeyboardEvent) {
  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  const k = e.key.length === 1 ? e.key.toUpperCase() : e.key
  parts.push(k)
  return parts.join('+')
}

export function useGlobalHotkeys() {
  const bindings = useChartStore(s => s.hotkeys)
  const actions = useChartStore.getState()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const pressed = keyFromEvent(e)
      const action = Object.keys(bindings).find(a => bindings[a] === pressed)
      if (!action) return
      e.preventDefault()

      switch (action) {
        case 'DeleteSelected': actions.deleteSelected(); break
        case 'DuplicateSelected': actions.duplicateSelected(); break
        case 'ArrowSizeIncrease': actions.setDrawingSettings({ arrowHeadSize: Math.min(48, actions.drawingSettings.arrowHeadSize + 2) }); break
        case 'ArrowSizeDecrease': actions.setDrawingSettings({ arrowHeadSize: Math.max(6, actions.drawingSettings.arrowHeadSize - 2) }); break
        case 'CycleLineCap': {
          const c = actions.drawingSettings.lineCap
          actions.setDrawingSettings({ lineCap: c === 'butt' ? 'round' : c === 'round' ? 'square' : 'butt' })
          break
        }
        case 'CycleArrowHead': {
          const h = actions.drawingSettings.arrowHead
          actions.setDrawingSettings({ arrowHead: h === 'none' ? 'open' : h === 'open' ? 'filled' : 'none' })
          break
        }
        case 'AlignLeft': actions.alignSelected('left'); break
        case 'AlignRight': actions.alignSelected('right'); break
        case 'AlignTop': actions.alignSelected('top'); break
        case 'AlignBottom': actions.alignSelected('bottom'); break
        case 'DistributeHoriz': actions.distributeSelected('h'); break
        case 'DistributeVert': actions.distributeSelected('v'); break
        default: break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [bindings])
}
