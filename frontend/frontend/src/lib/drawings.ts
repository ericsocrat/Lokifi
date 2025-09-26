import { nanoid } from 'nanoid';

export type DashStyle = 'solid' | 'dashed' | 'dotted';

export interface Point {
  x: number;
  y: number;
}

export type DrawingKind =
  | 'ray'
  | 'segment'
  | 'line'
  | 'rect'
  | 'ellipse'
  | 'path'
  | 'fib'
  | 'parallel_channel'
  | 'text';

export interface DrawingStyle {
  stroke: string;         // stroke color
  strokeWidth: number;    // px
  dash: DashStyle;
  opacity: number;        // 0..1
  fill: string | null;    // for rect/ellipse/filled shapes
}

export interface BaseDrawing {
  id: string;
  kind: DrawingKind;
  points: Point[];        // anchor points (meaning depends on kind)
  style: DrawingStyle;
}

export interface TextDrawing extends BaseDrawing {
  kind: 'text';
  text: string;
}

export type Drawing = BaseDrawing | TextDrawing;

export const DEFAULT_STYLE: DrawingStyle = {
  stroke: '#9ca3af',
  strokeWidth: 1.75,
  dash: 'solid',
  opacity: 1,
  fill: null,
};

export function withStyle<T extends Omit<BaseDrawing, 'style'>>(shape: T, style?: Partial<DrawingStyle>): Drawing {
  return {
    ...shape,
    style: { ...DEFAULT_STYLE, ...(style ?? {}) },
  } as Drawing;
}

/**
 * Factory to start a new drawing with a first point.
 */
export function createDrawing(kind: DrawingKind, start: Point, style?: Partial<DrawingStyle>): Drawing {
  const base = withStyle({ id: nanoid(), kind, points: [start] }, style);

  switch (kind) {
    case 'text':
      return { id: base.id, kind: 'text', points: base.points, style: base.style, text: 'Text' };

    case 'rect':
    case 'ellipse':
    case 'path':
    case 'line':
    case 'segment':
    case 'ray':
    case 'fib':
    case 'parallel_channel':
      // Start with a single anchor; UI adds more points during drag.
      return base;

    default:
      return base;
  }
}

/**
 * Helper to append a point during user drag.
 */
export function addPoint(d: Drawing, p: Point): Drawing {
  return { ...d, points: [...d.points, p] } as Drawing;
}

/**
 * Update the style of a drawing (immutable).
 */
export function updateStyle(d: Drawing, style: Partial<DrawingStyle>): Drawing {
  return { ...d, style: { ...d.style, ...style } } as Drawing;
}
