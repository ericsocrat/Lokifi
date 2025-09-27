export type PluginMeta = {
  id: string
  name: string
  description?: string
  version?: string
  permissions?: ("read"|"write"|"draw"|"alerts")[]
  settings?: Record<string, any>
}

export type PluginHooks = Partial<{
  onSelect(ids: string[]): void
  onAlert(event: any): void
  onContextMenu?(payload: { selection: string[]; add(menu: { label:string; action:()=>void }[]): void }): void
}>

export type Registered = { meta: PluginMeta; hooks: PluginHooks; enabled: boolean; defaults?: Record<string, any> }

const registry = new Map<string, Registered>()

export function registerPlugin(meta: PluginMeta, hooks: PluginHooks) {
  if (registry.has(meta.id)) throw new Error(`Plugin ${meta.id} already registered`)
  registry.set(meta.id, { meta, hooks, enabled: true })
}

export function unregisterPlugin(id: string) {
  registry.delete(id)
}

export function listPlugins(): Registered[] {
  return Array.from(registry.values())
}

export function setPluginEnabled(id: string, enabled: boolean) {
  const r = registry.get(id); if (!r) return
  r.enabled = enabled
}

export function getHooks(): PluginHooks[] {
  return Array.from(registry.values()).filter(r=>r.enabled).map(r=>r.hooks)
}
