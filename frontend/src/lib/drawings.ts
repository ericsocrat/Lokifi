import { nanoid } from 'nanoid'
export type Point = { x: number; y: number }
export type DrawingKind = 'trendline' | 'hline' | 'vline' | 'rect' | 'text' | 'arrow' | 'parallel-channel'
export type Drawing = {
  id: string
  kind: DrawingKind
  points: Point[]
  text?: string
}

export function createDrawing(kind: string, start: Point) {
  switch (kind) {
    case 'trendline': return { id: nanoid(), kind: 'trendline', points: [start, start] }
    case 'hline': return { id: nanoid(), kind: 'hline', points: [start] }
    case 'vline': return { id: nanoid(), kind: 'vline', points: [start] }
    case 'rect': return { id: nanoid(), kind: 'rect', points: [start, start] }
    case 'text': return { id: nanoid(), kind: 'text', points: [start], text: 'Text' }
    case 'arrow': return { id: nanoid(), kind: 'arrow', points: [start, start] }
    case 'parallel-channel': return { id: nanoid(), kind: 'parallel-channel', points: [start, start, start] }
    default: return null
  }
}

export function updateDrawingGeometry(d: any, p: Point) {
  switch (d.kind) {
    case 'trendline': return { ...d, points: [d.points[0], p] }
    case 'hline': return { ...d, points: [{ x: d.points[0].x, y: p.y }] }
    case 'vline': return { ...d, points: [{ x: p.x, y: d.points[0].y }] }
    case 'rect': return { ...d, points: [d.points[0], p] }
    case 'text': return { ...d, points: [p] }
    case 'arrow': return { ...d, points: [d.points[0], p] }
    case 'parallel-channel': return { ...d, points: [d.points[0], d.points[1], p] }
    default: return d
  }
}

export function arrowHead(from: Point, to: Point, size = 8) {
  const vx = to.x - from.x, vy = to.y - from.y
  const m = Math.hypot(vx, vy) || 1
  const nx = vx / m, ny = vy / m
  const px = -ny, py = nx
  const tip = to
  const base = { x: to.x - nx*size, y: to.y - ny*size }
  const left = { x: base.x + px*size*0.6, y: base.y + py*size*0.6 }
  const right = { x: base.x - px*size*0.6, y: base.y - py*size*0.6 }
  return { tip, left, right }
}
