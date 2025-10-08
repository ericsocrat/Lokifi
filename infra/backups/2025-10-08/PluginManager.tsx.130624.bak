import React from "react"
import { useChartStore } from "@/state/store"
import { listPlugins, setPluginEnabled } from "@/lib/plugins"

export default function PluginManager() {
  const s = useChartStore()
  const [, force] = React.useReducer(x=>x+1, 0)
  const plugins = listPlugins()

  return (
    <div className="rounded-2xl border border-white/15 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Plugins</div>
        <button className="px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10"
                onClick={()=>window.dispatchEvent(new CustomEvent("lokifi:install-demo-plugin"))}>Install demo</button>
      </div>

      <div className="space-y-2">
        {plugins.length===0 && <div className="text-xs opacity-60">No plugins installed.</div>}
        {plugins.map(p => (
          <div key={p.meta.id} className="flex items-center justify-between text-sm rounded border border-white/10 px-2 py-1">
            <div>
              <div className="font-medium">{p.meta.name} <span className="opacity-60 text-xs">#{p.meta.id}</span></div>
              {p.meta.description && <div className="opacity-70 text-xs">{p.meta.description}</div>}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs opacity-70">Enable</label>
              <input type="checkbox" checked={p.enabled} onChange={e=>{ setPluginEnabled(p.meta.id, e.target.checked); force() }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
