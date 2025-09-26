export function fmtNum(n: number, dec = 2) {
  if (!isFinite(n)) return '—'
  const f = Math.abs(n) >= 100 ? 0 : dec
  return n.toFixed(f)
}
export function fmtPct(n: number, dec = 2) {
  if (!isFinite(n)) return '—'
  return (n >= 0 ? '+' : '') + (n*100).toFixed(dec) + '%'
}
export function clamp(v:number, a:number, b:number){ return Math.min(b, Math.max(a, v)) }
