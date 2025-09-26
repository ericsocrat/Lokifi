import { nanoid } from 'nanoid'
export type Point = { x: number; y: number }
export type DrawingKind =
  | 'trendline' | 'hline' | 'vline' | 'rect' | 'text' | 'arrow'
  | 'ray' | 'ellipse' | 'fib' | 'pitchfork' | 'parallel-channel'
  | 'ruler'

export type StrokeDash = 'solid' | 'dash' | 'dot' | 'dashdot'
export type DrawingStyle = {
  stroke: string
  strokeWidth: number
  dash: StrokeDash
  opacity: number
  fill?: string | null
}

export type Drawing = {\n  layerId?: string
  id: string
  kind: DrawingKind
  points: Point[]
  text?: string
  name?: string
  locked?: boolean
  hidden?: boolean
  groupId?: string | null
  style?: DrawingStyle
  fibLevels?: number[]
}

export const DEFAULT_STYLE: DrawingStyle = {
  stroke: '#9ca3af',
  strokeWidth: 1.75,
  dash: 'solid',
  opacity: 1,
  fill: null,
}

export function createDrawing(kind: string, start: Point) {
  const base: Partial<Drawing> = { style: { ...DEFAULT_STYLE }, groupId: null }
  switch (kind) {
    case 'trendline':
    case 'arrow':
    case 'ray':
    case 'rect':
    case 'ellipse':
    case 'fib':
    case 'ruler':
      return { id: nanoid(), kind: kind as DrawingKind, points: [start, start], ...base }
    case 'pitchfork':
    case 'parallel-channel':
      return { id: nanoid(), kind: kind as DrawingKind, points: [start, start, start], ...base }
    case 'hline':
      return { id: nanoid(), kind: 'hline', points: [start], ...base }
    case 'vline':
      return { id: nanoid(), kind: 'vline', points: [start], ...base }
    case 'text':
      return { id: nanoid(), kind: 'text', points: [start], text: 'Text', ...base }
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
    case 'ruler':
      return { ...d, points: [d.points[0], p] }
    case 'pitchfork':
    case 'parallel-channel': {
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

