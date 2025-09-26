import { nanoid } from 'nanoid'
export type Point = { x: number; y: number }
export type DrawingKind = 'trendline' | 'hline' | 'vline' | 'rect' | 'text' | 'arrow'
export type Drawing = {
  id: string
  kind: DrawingKind
  points: Point[]
  text?: string
}

export function createDrawing(kind: string, start: Point): Drawing | null {
  switch (kind) {
    case 'trendline': return { id: nanoid(), kind: 'trendline', points: [start, start] }
    case 'arrow': return { id: nanoid(), kind: 'arrow', points: [start, start] }
    case 'hline': return { id: nanoid(), kind: 'hline', points: [start] }
    case 'vline': return { id: nanoid(), kind: 'vline', points: [start] }
    case 'rect': return { id: nanoid(), kind: 'rect', points: [start, start] }
    case 'text': return { id: nanoid(), kind: 'text', points: [start], text: 'Text' }
    default: return null
  }
}

export function updateDrawingGeometry(d: Drawing, p: Point): Drawing {
  switch (d.kind) {
    case 'trendline':
    case 'arrow':
      return { ...d, points: [d.points[0], p] }
    case 'hline': return { ...d, points: [{ x: d.points[0].x, y: p.y }] }
    case 'vline': return { ...d, points: [{ x: p.x, y: d.points[0].y }] }
    case 'rect': return { ...d, points: [d.points[0], p] }
    case 'text': return { ...d, points: [p] }
    default: return d
  }
}
