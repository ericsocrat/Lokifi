import React from 'react'
import { listPlugins } from '@/lib/plugins'
import { saveJSON, loadJSON } from '@/lib/storage'

type Map = Record<string, any>

export default function PluginDrawer() {
  const plugins = listPlugins()
  const [cfg, setCfg] = React.useState<Map>(() => loadJSON('fynix-plugin-cfg', {}))
  const fileRef = React.useRef<HTMLInputElement>(null)

  function update(id: string, key: string, value: any) {
    const next = { ...cfg, [id]: { ...(cfg[id]||{}), [key]: value } }
    setCfg(next); saveJSON('fynix-plugin-cfg', next)
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'fynix-plugins.json'; a.click()
    URL.revokeObjectURL(url)
  }

  function importJSON(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result))
        setCfg(data); saveJSON('fynix-plugin-cfg', data)
      } catch {}
    }
    reader.readAsText(file)
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Plugins</h2>
      <div className="space-y-3">
        {plugins.map(p => (
          <div key={p.id} className="p-3 rounded-xl border border-neutral-700">
            <div className="font-medium">{p.name}</div>
            <div className="text-xs text-neutral-400">{p.description || 'No description'}</div>
            <div className="mt-2 text-sm grid grid-cols-2 gap-2">
              {Object.entries(p.defaults).map(([k,v]) => (
                <label key={k} className="flex items-center justify-between">
                  <span>{k}</span>
                  <input className="ml-2 bg-transparent border px-2 py-1 rounded"
                    value={String((cfg[p.id]?.[k] ?? v))}
                    onChange={e => update(p.id, k, e.target.value)} />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button className="px-3 py-2 rounded-2xl border border-neutral-700 hover:border-neutral-500" onClick={exportJSON}>Export</button>
        <input ref={fileRef} type="file" accept="application/json" className="hidden"
          onChange={e => e.target.files && importJSON(e.target.files[0])} />
        <button className="px-3 py-2 rounded-2xl border border-neutral-700 hover:border-neutral-500" onClick={() => fileRef.current?.click()}>Import</button>
      </div>
    </div>
  )
}
