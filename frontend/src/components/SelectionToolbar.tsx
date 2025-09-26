import React from "react"
import { useChartStore } from "@/state/store"

export default function SelectionToolbar() {
  const s = useChartStore()
  const count = s ? (s.selection ? s.selection.size : 0) : 0
  if (!count || count < 2) return null
  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-2 z-30 flex gap-2 rounded-xl bg-black/60 border border-white/10 px-2 py-1 text-xs">
      <button className="px-2 py-1 rounded border border-white/15 hover:bg-white/10" onClick={()=>s.alignSelected('left')}>Align ⟵</button>
      <button className="px-2 py-1 rounded border border-white/15 hover:bg-white/10" onClick={()=>s.alignSelected('right')}>Align ⟶</button>
      <button className="px-2 py-1 rounded border border-white/15 hover:bg-white/10" onClick={()=>s.alignSelected('top')}>Align ⤒</button>
      <button className="px-2 py-1 rounded border border-white/15 hover:bg-white/10" onClick={()=>s.alignSelected('bottom')}>Align ⤓</button>
      <div className="w-px bg-white/10 mx-1" />
      <button className="px-2 py-1 rounded border border-white/15 hover:bg-white/10" onClick={()=>s.distributeSelected('h')}>Distribute ↔︎</button>
      <button className="px-2 py-1 rounded border border-white/15 hover:bg-white/10" onClick={()=>s.distributeSelected('v')}>Distribute ↕︎</button>
    </div>
  )
}
