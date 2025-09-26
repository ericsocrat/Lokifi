export type Point = { x:number; y:number }

/** --- Mapping hooks (host wires real chart scales here) --- */
type Mappers = {
  yToPrice?: (y:number)=>number|null
  priceToY?: (price:number)=>number|null
  xToTime?: (x:number)=>number|Date|string|null   // any time-ish
  timeToX?: (t:number|Date|string)=>number|null
}
let _mappers: Mappers = {}
export function setMappers(m: Partial<Mappers>) { _mappers = { ..._mappers, ...m } }
export function yToPrice(y:number): number|null { return _mappers.yToPrice ? _mappers.yToPrice(y) : null }
export function priceToY(p:number): number|null { return _mappers.priceToY ? _mappers.priceToY(p) : null }
export function xToTime(x:number): number|Date|string|null { return _mappers.xToTime ? _mappers.xToTime(x) : null }
export function timeToX(t:number|Date|string): number|null { return _mappers.timeToX ? _mappers.timeToX(t) : null }

/** OHLC magnet infrastructure (from earlier phases; keep) */
let _lastKnownPriceLevels: number[] = []
export function setVisiblePriceLevels(levels: number[]) {
  _lastKnownPriceLevels = Array.from(new Set(levels)).sort((a,b)=>a-b)
}
export function magnetYToOHLC(yPx: number, tolerancePx: number): number {
  if (_lastKnownPriceLevels.length === 0 || !_mappers.priceToY) return yPx
  let bestY = yPx, best = Number.POSITIVE_INFINITY
  for (const p of _lastKnownPriceLevels) {
    const ly = _mappers.priceToY(p); if (ly == null) continue
    const d = Math.abs(ly - yPx); if (d < best) { best = d; bestY = ly }
  }
  return best <= tolerancePx ? bestY : yPx
}

/** Grid snap (keep) */
export function snapPxToGrid<T extends Point>(p: T, step: number, enabled: boolean): T {
  if (!enabled) return p
  return { ...(p as any), x: Math.round(p.x / step) * step, y: Math.round(p.y / step) * step }
}
export function snapYToPriceLevels(y: number, step: number): number { return Math.round(y / step) * step }

/** --- Bar/X snap support --- */
let _visibleBarXs: number[] = []  // device CSS pixels (pre-DPR scale), sorted
export function setVisibleBarCoords(xs:number[]) { _visibleBarXs = xs.slice().sort((a,b)=>a-b) }

/** Snap X to nearest bar coordinate within tolerance (px). If mapping unknown, returns x unchanged. */
export function magnetXToBars(x:number, tolerancePx:number): number {
  if (_visibleBarXs.length === 0) return x
  // binary search nearest
  let lo = 0, hi = _visibleBarXs.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (_visibleBarXs[mid] < x) lo = mid + 1; else hi = mid
  }
  const idx = lo
  const cands = [idx-1, idx, idx+1].filter(i => i>=0 && i<_visibleBarXs.length).map(i => _visibleBarXs[i])
  let best = x, dBest = Number.POSITIVE_INFINITY
  for (const cx of cands) { const d = Math.abs(cx - x); if (d < dBest) { dBest = d; best = cx } }
  return dBest <= tolerancePx ? best : x
}
