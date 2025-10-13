import type { Drawing } from '@/lib/utils/drawings'
import { rectFromPoints } from '@/lib/utils/geom'
import { yToPrice } from '@/lib/charts/chartMap'

type LabelConfig = {
  showValue: boolean
  showPercent: boolean
  showAngle: boolean
  showRR: boolean
}

export function describeDrawing(d: Drawing, cfg: LabelConfig) {
  try {
    switch (d.kind) {
      case "hline": return hlineLabel(d, cfg)
      case "vline": return vlineLabel(d, cfg)
      case "trendline":
      case "ray":
      case "arrow": return lineLabel(d, cfg)
      case "rect": return rectLabel(d, cfg)
      case "ruler": return rulerLabel(d, cfg)
      case "text": return null
      default: return null
    }
  } catch { return null }
}

function fmt(n:number, p=2){ return Number.isFinite(n) ? n.toFixed(p) : "" }

function hlineLabel(d: Drawing, cfg: LabelConfig) {
  const y = d.points[0].y
  const price = yToPrice(y)
  if (price == null) return null
  const parts = []
  if (cfg.showValue) parts.push(`@ ${fmt(price, 2)}`)
  return { text: parts.join(" "), anchor: d.points[0] }
}

function vlineLabel(_d: Drawing, _cfg: LabelConfig) { return null }

function lineLabel(d: Drawing, cfg: LabelConfig) {
  const [a,b] = d.points
  const dy = b.y - a.y
  const dx = b.x - a.x
  const p1 = yToPrice(a.y)
  const p2 = yToPrice(b.y)
  const parts:string[] = []
  if (p1!=null && p2!=null) {
    const dp = p2 - p1
    if (cfg.showValue) parts.push(`Δ ${fmt(dp,2)}`)
    if (cfg.showPercent && p1 !== 0) parts.push(`${dp>=0?"+":""}${fmt((dp/Math.abs(p1))*100,2)}%`)
  }
  if (cfg.showAngle) {
    const angle = Math.atan2(-dy, dx) * 180 / Math.PI // canvas y+ downwards
    parts.push(`${fmt(angle,1)}°`)
  }
  if (!parts.length) return null
  return { text: parts.join(" "), anchor: b }
}

function rectLabel(d: Drawing, cfg: LabelConfig) {
  const r = rectFromPoints(d.points[0], d.points[1])
  const yTop = r.y
  const yBot = r.y + r.h
  const pTop = yToPrice(yTop)
  const pBot = yToPrice(yBot)
  if (pTop == null || pBot == null) return null
  const height = Math.abs(pTop - pBot)
  const mid = { x: r.x + r.w/2, y: r.y + r.h/2 }
  const parts:string[] = []
  if (cfg.showValue) parts.push(`Δ ${fmt(height,2)}`)
  if (cfg.showPercent && pBot !== 0) {
    const pct = (height/Math.abs(pBot))*100
    parts.push(`${fmt(pct,2)}%`)
  }
  if (cfg.showRR) {
    // naive R:R if we assume lower half risk, upper half reward
    const rr = r.h>1 ? (r.h/2)/(r.h/2) : 1
    parts.push(`R:R ${fmt(rr,2)}`)
  }
  return { text: parts.join(" "), anchor: mid }
}

function rulerLabel(d: Drawing, cfg: LabelConfig) {
  const [a,b] = d.points
  const p1 = yToPrice(a.y)
  const p2 = yToPrice(b.y)
  const parts:string[] = []
  if (p1!=null && p2!=null) {
    const dp = p2 - p1
    if (cfg.showValue) parts.push(`Δ ${fmt(dp,2)}`)
    if (cfg.showPercent && p1!==0) parts.push(`${dp>=0?"+":""}${fmt((dp/Math.abs(p1))*100,2)}%`)
  }
  return parts.length ? { text: parts.join(" "), anchor: b } : null
}
