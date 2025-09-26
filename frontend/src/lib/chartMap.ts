export type Point = { x:number; y:number }

/** Grid snapping already exists elsewhere; we provide OHLC magneting helpers here. */
let _lastKnownPriceLevels: number[] = []

/** Host can call to feed latest price levels (OHLCs across visible range). */
export function setVisiblePriceLevels(levels: number[]) {
  _lastKnownPriceLevels = Array.from(new Set(levels)).sort((a,b)=>a-b)
}

/** y(px) -> price; you already had this. Keep stub if not wired yet. */
export function yToPrice(y: number): number | null {
  // If you have a real scale, replace this stub. Keeping for compatibility.
  // e.g., return scale.invert(y)
  return null
}

/** price -> y(px); if you have a real scale, wire it. */
export function priceToY(price: number): number | null {
  return null
}

/** Magnet Y (px) to the nearest OHLC price line within tolerance (px). */
export function magnetYToOHLC(yPx: number, tolerancePx: number): number {
  if (_lastKnownPriceLevels.length === 0) return yPx
  // If you have priceToY mapping, convert each level to Y and snap if within tolerance
  let bestY = yPx
  let best = Number.POSITIVE_INFINITY
  for (const p of _lastKnownPriceLevels) {
    const ly = priceToY(p)
    if (ly == null) continue
    const d = Math.abs(ly - yPx)
    if (d < best) { best = d; bestY = ly }
  }
  return best <= tolerancePx ? bestY : yPx
}

/** Basic grid snap for px point (guarded by enabled). */
export function snapPxToGrid<T extends Point>(p: T, step: number, enabled: boolean): T {
  if (!enabled) return p
  return { ...(p as any), x: Math.round(p.x / step) * step, y: Math.round(p.y / step) * step }
}

/** Snap just Y to nearest multiples of step (for price step emulation) */
export function snapYToPriceLevels(y: number, step: number): number {
  return Math.round(y / step) * step
}
