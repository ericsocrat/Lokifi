import React from "react"
import { useChartStore } from "@/state/store"
import { describeDrawing } from '@/lib/utils/labels'

export default function LabelsLayer() {
  const s = useChartStore()
  const [drawings, setDrawings] = React.useState(s.drawings)
  React.useEffect(()=> useChartStore.subscribe(st=>setDrawings(st.drawings)), [])

  const cfg = s.autoLabels || { showValue:true, showPercent:true, showAngle:true, showRR:true, enabled:true }
  if (!cfg.enabled) return null

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {drawings.map((d: any) => {
        // respect hidden layers
        const layer = s.layers?.find((l: any) =>l.id === (d as any).layerId) || { visible:true, opacity:1 }
        if (!layer.visible || (layer.opacity ?? 1) === 0) return null
        const info = describeDrawing(d as any, cfg)
        if (!info) return null
        const x = info.anchor.x + 8
        const y = info.anchor.y - 8
        return (
          <div key={"lab-"+d.id}
               style={{ position:'absolute', left:x, top:y, transform:'translateY(-100%)' }}
               className="text-[11px] leading-none px-2 py-1 rounded bg-black/70 border border-white/10 text-white/90">
            {info.text}
          </div>
        )
      })}
    </div>
  )
}
