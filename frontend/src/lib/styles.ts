export type LineStyleKind = 'solid' | 'dash' | 'dot'

export type DrawingStyle = {
  stroke: string
  width: number
  lineStyle: LineStyleKind
  opacity: number
  fill?: string | 'transparent'
  fontSize?: number        // for text
}

export const DEFAULT_STYLE: DrawingStyle = {
  stroke: '#60a5fa',
  width: 2,
  lineStyle: 'solid',
  opacity: 1,
  fill: 'transparent',
  fontSize: 12
}

export const PALETTE = [
  '#60a5fa', // blue-400
  '#22c55e', // green-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#e879f9', // fuchsia-400
  '#a78bfa', // violet-400
  '#f472b6', // pink-400
  '#f97316', // orange-500
  '#94a3b8', // slate-400
  '#e5e7eb'  // zinc-200
]

export function lineDashFromStyle(kind: LineStyleKind): number[] {
  switch (kind) {
    case 'dash': return [8, 6]
    case 'dot':  return [2, 6]
    default:     return []
  }
}

export function applyCtxStyle(ctx: CanvasRenderingContext2D, style: DrawingStyle) {
  ctx.globalAlpha = Math.max(0, Math.min(1, style.opacity ?? 1))
  ctx.strokeStyle = style.stroke
  ctx.lineWidth = Math.max(0.5, style.width ?? 1)
  ctx.setLineDash(lineDashFromStyle(style.lineStyle ?? 'solid'))
}
