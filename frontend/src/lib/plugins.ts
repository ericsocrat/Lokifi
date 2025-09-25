export type PluginConfig = Record<string, unknown>
export type PluginDef = {
  id: string
  name: string
  description?: string
  defaults: PluginConfig
}

const registry: PluginDef[] = [
  { id: 'bb', name: 'Bollinger Bands', defaults: { period: 20, mult: 2, bandFill: true } },
  { id: 'vwap', name: 'VWAP', defaults: { anchor: 'session' } },
  { id: 'vwma', name: 'VWMA', defaults: { period: 20 } },
  { id: 'stdch', name: 'StdDev Channels', defaults: { period: 50, mult: 2 } }
]

export function listPlugins() { return registry }
