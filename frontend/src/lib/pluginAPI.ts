import type { Drawing } from '@/lib/drawings'
import { useChartStore } from '@/state/store'

type ContextAction = { id: string; label: string; run: (selection: string[]) => void }

const registry = {
  actions: new Map<string, ContextAction>()
}

export function registerContextAction(id: string, label: string, run: (selection: string[]) => void) {
  registry.actions.set(id, { id, label, run })
}

export function listContextActions(): ContextAction[] {
  return Array.from(registry.actions.values())
}

export function runAction(id: string) {
  const s = (useChartStore as any).getState()
  const sel = Array.from(s.selection || [])
  const a = registry.actions.get(id)
  if (a) a.run(sel)
}

// expose a minimal global for third-parties
;(globalThis as any).Fynix = (globalThis as any).Fynix || {}
;(globalThis as any).Fynix.plugins = {
  registerContextAction,
  listContextActions,
  runAction,
  getDrawings: (): Drawing[] => (useChartStore as any).getState().drawings,
  getSelection: (): string[] => Array.from((useChartStore as any).getState().selection || [])
}
