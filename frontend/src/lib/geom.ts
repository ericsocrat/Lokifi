export type Point = { x: number; y: number }
export type Rect = { x: number; y: number; w: number; h: number }

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const vx = b.x - a.x, vy = b.y - a.y
  const wx = p.x - a.x, wy = p.y - a.y
  const c1 = vx*wx + vy*wy
  if (c1 <= 0) return Math.hypot(p.x-a.x, p.y-a.y)
  const c2 = vx*vx + vy*vy
  if (c2 <= c1) return Math.hypot(p.x-b.x, p.y-b.y)
  const t = c1 / c2
  const proj = { x: a.x + t*vx, y: a.y + t*vy }
  return Math.hypot(p.x - proj.x, p.y - proj.y)
}

export function rectFromPoints(a: Point, b: Point): Rect {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  const w = Math.abs(a.x - b.x)
  const h = Math.abs(a.y - b.y)
  return { x, y, w, h }
}

export function withinRect(p: Point, r: Rect): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function normalize(vx: number, vy: number) {
  const m = Math.hypot(vx, vy) || 1
  return [vx/m, vy/m] as const
}

export function perpendicular(vx: number, vy: number) {
  return [-vy, vx] as const
}
