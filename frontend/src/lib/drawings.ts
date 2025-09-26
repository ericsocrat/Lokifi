import { nanoid } from 'nanoid'
export type Point = { x: number; y: number }
export type DrawingKind =
  | 'trendline' | 'hline' | 'vline' | 'rect' | 'text' | 'arrow'
  | 'ray' | 'ellipse' | 'fib'
  | 'pitchfork' | 'parallel-channel'

export type Drawing = {
  id: string
  kind: DrawingKind
  points: Point[]   // generally 2 points; 3 for pitchfork/parallel-channel
  text?: string
}

export function createDrawing(kind: string, start: Point): Drawing | null {
  switch (kind) {
    case 'trendline':
    case 'arrow':
    case 'ray':
    case 'rect':
    case 'ellipse':
    case 'fib':
      return { id: nanoid(), kind: kind as DrawingKind, points: [start, start] }
    case 'pitchfork':
    case 'parallel-channel':
      // initialize 3 points; first drag sets P2, second click sets P3
      return { id: nanoid(), kind: kind as DrawingKind, points: [start, start, start] }
    case 'hline':
      return { id: nanoid(), kind: 'hline', points: [start] }
    case 'vline':
      return { id: nanoid(), kind: 'vline', points: [start] }
    case 'text':
      return { id: nanoid(), kind: 'text', points: [start], text: 'Text' }
    default:
      return null
  }
}

export function updateDrawingGeometry(d: Drawing, p: Point): Drawing {
  switch (d.kind) {
    case 'trendline':
    case 'arrow':
    case 'ray':
    case 'rect':
    case 'ellipse':
    case 'fib':
      return { ...d, points: [d.points[0], p] }
    case 'pitchfork':
    case 'parallel-channel': {
      // during drag we update second point; third point is added by a click later
      const pts = d.points.slice()
      if (pts.length < 3) pts.push(p)
      pts[1] = p
      return { ...d, points: pts }
    }
    case 'hline':
      return { ...d, points: [{ x: d.points[0].x, y: p.y }] }
    case 'vline':
      return { ...d, points: [{ x: p.x, y: d.points[0].y }] }
    case 'text':
      return { ...d, points: [p] }
    default:
      return d
  }
}
