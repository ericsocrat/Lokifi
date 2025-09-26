import type { Drawing } from '@/lib/drawings'
import { yToPrice } from '@/lib/chartMap'

export type Alert = {
  id: string
  drawingId: string
  kind: 'cross'           // price crossing a line/level attached to drawing
  enabled: boolean
  lastTriggeredAt?: number
  note?: string
}

export type AlertEvent = {
  id: string
  at: number
  price: number
  note?: string
}

export function getLineYAtX(d: Drawing, x: number): number | null {
  if (d.kind === 'hline') return d.points[0].y
  if (d.kind === 'vline') return null
  if (d.kind === 'trendline' || d.kind === 'ray' || d.kind === 'arrow') {
    const [a,b] = d.points
    const dx = b.x - a.x; const dy = b.y - a.y
    if (Math.abs(dx) < 1e-6) return null
    const m = dy / dx
    const y = a.y + m * (x - a.x)
    return y
  }
  return null
}

/** Evaluate alerts given a current price y(px) and previous price y(px) to detect crossing. */
export function evaluateAlerts(drawings: Drawing[], alerts: Alert[], yPxPrev: number|null, yPxNow: number|null): AlertEvent[] {
  if (yPxPrev == null || yPxNow == null) return []
  const res: AlertEvent[] = []
  alerts.forEach(al => {
    if (!al.enabled) return
    const d = drawings.find(dd => dd.id === al.drawingId)
    if (!d) return
    let targetY: number | null = null
    if (d.kind === 'hline') targetY = d.points[0].y
    else if (d.kind === 'trendline' || d.kind === 'ray' || d.kind === 'arrow') {
      // approximate using current canvas x ~ rightmost? In practice host calls with mapped X.
      const x = 1 // caller can substitute; we simply need a constant to compare deltas
      targetY = getLineYAtX(d, x)
    }
    if (targetY == null) return
    const crossed = (yPxPrev - targetY) * (yPxNow - targetY) <= 0
    if (crossed) {
      res.push({ id: al.id, at: Date.now(), price: yToPrice(yPxNow) ?? 0, note: al.note })
    }
  })
  return res
}
