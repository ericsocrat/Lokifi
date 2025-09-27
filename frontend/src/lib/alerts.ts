import type { Drawing } from '@/lib/drawings'
import { rectFromPoints } from '@/lib/geom'
import { yToPrice } from '@/lib/chartMap'

export type AlertKind = 'cross' | 'fib-cross' | 'region-touch' | 'time'

export type Alert = {
  id: string
  drawingId?: string
  kind: AlertKind
  enabled: boolean
  note?: string
  fibLevel?: number
  cooldownMs?: number
  maxTriggers?: number
  sound?: 'ping' | 'none'
  when?: number
  snoozedUntil?: number | null
  triggers?: number
  lastTriggeredAt?: number
}

export type AlertEvent = {
  id: string
  at: number
  price?: number
  note?: string
  kind: AlertKind
}

function crossed(prev: number, now: number, target: number): boolean {
  return (prev - target) * (now - target) <= 0
}

function inBand(prev: number, now: number, y0: number, y1: number): boolean {
  const lo = Math.min(y0, y1), hi = Math.max(y0, y1)
  const wasInside = prev >= lo && prev <= hi
  const isInside = now >= lo && now <= hi
  return isInside || (wasInside !== isInside && ((prev < lo && now > lo) || (prev > hi && now < hi)))
}

export function evaluateAlerts(
  drawings: Drawing[],
  alerts: Alert[],
  yPxPrev: number | null,
  yPxNow: number | null,
  now: number = Date.now()
): AlertEvent[] {
  const out: AlertEvent[] = []
  for (const al of alerts) {
    if (!al.enabled) continue
    if (al.snoozedUntil && now < al.snoozedUntil) continue
    if (al.maxTriggers && (al.triggers ?? 0) >= al.maxTriggers) continue
    if (al.cooldownMs && al.lastTriggeredAt && now - al.lastTriggeredAt < al.cooldownMs) continue

    if (al.kind === 'time') {
      if (al.when && now >= al.when) out.push({ id: al.id, at: now, kind: 'time', note: al.note })
      continue
    }

    if (yPxPrev == null || yPxNow == null) continue
    const d = drawings.find(x => x.id === al.drawingId)
    if (!d) continue

    switch (al.kind) {
      case 'cross': {
        if (d.kind === 'hline') {
          const targetY = d.points[0].y
          if (crossed(yPxPrev, yPxNow, targetY)) out.push({ id: al.id, at: now, kind: 'cross', note: al.note, price: yToPrice(yPxNow) ?? undefined })
        } else if (d.kind === 'trendline' || d.kind === 'ray' || d.kind === 'arrow') {
          const [a,b] = d.points
          const dx = b.x - a.x; const dy = b.y - a.y
          if (Math.abs(dx) > 1e-6) {
            const m = dy / dx
            const targetY = a.y + m * (b.x - a.x) // project at current x ~ b.x
            if (crossed(yPxPrev, yPxNow, targetY)) out.push({ id: al.id, at: now, kind: 'cross', note: al.note, price: yToPrice(yPxNow) ?? undefined })
          }
        }
        break
      }
      case 'fib-cross': {
        if (d.kind !== 'fib') break
        const [p0, p1] = d.points
        const level = (al.fibLevel ?? 0.618)
        const y = p0.y + (p1.y - p0.y) * level
        if (crossed(yPxPrev, yPxNow, y)) out.push({ id: al.id, at: now, kind: 'fib-cross', note: al.note, price: yToPrice(yPxNow) ?? undefined })
        break
      }
      case 'region-touch': {
        if (d.kind !== 'rect') break
        const r = rectFromPoints(d.points[0], d.points[1])
        if (inBand(yPxPrev, yPxNow, r.y, r.y + r.h)) {
          out.push({ id: al.id, at: now, kind: 'region-touch', note: al.note, price: yToPrice(yPxNow) ?? undefined })
        }
        break
      }
    }
  }
  return out
}
export async function createAlert(){ return {id:Date.now().toString(),symbol:"SYM",type:"price",timeframe:"1h",active:true}; }
export async function deleteAlert(id:string){ return true; }
export async function listAlerts(){ return []; }
export async function toggleAlert(id:string,active:boolean){ return true; }
export async function subscribeAlerts(){ return ()=>{}; }