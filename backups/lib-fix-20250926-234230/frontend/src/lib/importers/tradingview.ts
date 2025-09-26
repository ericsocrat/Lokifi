import type { Drawing } from "@/lib/drawings"

export type TVImportResult = { drawings: Drawing[]; errors: string[] }

export function importTradingViewJSON(json: any): TVImportResult {
  const out: Drawing[] = []
  const errors: string[] = []
  try {
    const arr = Array.isArray(json) ? json : (json?.drawings ?? [])
    for (const d of arr) {
      try {
        if (d.type === "trend_line" && d.points?.length>=2) {
          out.push({
            id: "tv-" + (Math.random().toString(36).slice(2)),
            kind: "trendline" as any,
            points: d.points.map((p:any)=>({ x: p.x ?? 0, y: p.y ?? 0 }))
          } as any)
        } else if (d.type === "horizontal_line" && d.priceY != null) {
          out.push({ id: "tv-" + Math.random().toString(36).slice(2), kind: "hline" as any, points: [{ x: 0, y: d.priceY }] } as any)
        } else if (d.type === "rectangle" && d.points?.length>=2) {
          out.push({ id:"tv-"+Math.random().toString(36).slice(2), kind:"rect" as any, points: d.points.slice(0,2).map((p:any)=>({x:p.x,y:p.y})) } as any)
        }
      } catch (e:any) { errors.push(e?.message || String(e)) }
    }
  } catch (e:any) { errors.push(e?.message || String(e)) }
  return { drawings: out, errors }
}

export function importTradingViewCSV(csv: string): TVImportResult {
  const lines = csv.split(/\r?\n/).filter(Boolean)
  const out: Drawing[] = []
  const errors: string[] = []
  for (const ln of lines) {
    try {
      const [type, ...rest] = ln.split(",")
      if (type==="hline") {
        const y = parseFloat(rest[0]); if (!isFinite(y)) throw new Error("bad y")
        out.push({ id:"tv-"+Math.random().toString(36).slice(2), kind:"hline" as any, points:[{x:0,y}] } as any)
      } else if (type==="trendline") {
        const [x1,y1,x2,y2] = rest.map(parseFloat)
        out.push({ id:"tv-"+Math.random().toString(36).slice(2), kind:"trendline" as any, points:[{x:x1,y:y1},{x:x2,y:y2}] } as any)
      }
    } catch (e:any) { errors.push(e?.message || String(e)) }
  }
  return { drawings: out, errors }
}
