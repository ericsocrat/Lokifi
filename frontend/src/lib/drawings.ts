import { nanoid } from 'nanoid'
import { DEFAULT_STYLE, type DrawingStyle } from '@/lib/styles'

export type Point = { x: number; y: number }
export type DrawingKind = 'trendline' | 'hline' | 'vline' | 'rect' | 'text' | 'arrow' | 'parallel-channel'

export type Drawing = {
  id: string
  kind: DrawingKind
  points: Point[]
  text?: string
  style: DrawingStyle
}

export function withDefaultStyle<T extends Omit<Drawing, 'style'>>(d: T): Drawing {
  return { ...(d as any), style: { ...DEFAULT_STYLE } }
}

export function createDrawing(kind: string, start: Point) {
  switch (kind) {
    case 'trendline': return withDefaultStyle({ id: nanoid(), kind: 'trendline', points: [start, start] })
    case 'hline': return withDefaultStyle({ id: nanoid(), kind: 'hline', points: [start] })
    case 'vline': return withDefaultStyle({ id: nanoid(), kind: 'vline', points: [start] })
    case 'rect': return withDefaultStyle({ id: nanoid(), kind: 'rect', points: [start, start] })
    case 'text': return withDefaultStyle({ id: nanoid(), kind: 'text', points: [start], text: 'Text' })
    case 'arrow': return withDefaultStyle({ id: nanoid(), kind: 'arrow', points: [start, start] })
    case 'parallel-channel': return withDefaultStyle({ id: nanoid(), kind: 'parallel-channel', points: [start, start, start] })
    default: return null
  }
}

export function updateDrawingGeometry(d: Drawing, p: Point): Drawing {
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
