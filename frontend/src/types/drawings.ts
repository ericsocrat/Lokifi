/**
 * Type definitions for drawing system
 * Eliminates "any" types throughout the codebase
 */

export interface Point {
  x: number;
  y: number;
}

export interface DrawingStyle {
  stroke?: string;
  strokeWidth?: number;
  dash?: 'solid' | 'dash' | 'dot' | 'dashdot' | string; // Allow string for backward compatibility
  opacity?: number;
  fill?: string;
}

export type DrawingKind =
  | 'trendline'
  | 'arrow'
  | 'rect'
  | 'ellipse'
  | 'text'
  | 'fib'
  | 'pitchfork'
  | 'parallel'
  | 'horizontal'
  | 'vertical'
  | 'polyline'
  | 'path';

export interface BaseDrawing {
  id: string;
  kind: DrawingKind;
  layerId?: string;
  style?: DrawingStyle;
  hidden?: boolean;
  locked?: boolean;
  points: Point[];
  text?: string;
  note?: string;
  timestamp?: number;
  name?: string; // Optional name for drawings
  // Optional position/size for certain drawing types
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface TrendlineDrawing extends BaseDrawing {
  kind: 'trendline';
  points: [Point, Point];
}

export interface ArrowDrawing extends BaseDrawing {
  kind: 'arrow';
  points: [Point, Point];
}

export interface RectDrawing extends BaseDrawing {
  kind: 'rect';
  points: [Point, Point];
}

export interface EllipseDrawing extends BaseDrawing {
  kind: 'ellipse';
  points: [Point, Point];
}

export interface TextDrawing extends BaseDrawing {
  kind: 'text';
  points: [Point];
  text: string;
  fontSize?: number;
}

export interface FibDrawing extends BaseDrawing {
  kind: 'fib';
  points: [Point, Point];
  levels?: number[];
}

export interface PitchforkDrawing extends BaseDrawing {
  kind: 'pitchfork';
  points: [Point, Point, Point];
}

export interface ParallelChannelDrawing extends BaseDrawing {
  kind: 'parallel';
  points: [Point, Point, Point];
}

export interface HorizontalLineDrawing extends BaseDrawing {
  kind: 'horizontal';
  points: [Point];
  y: number;
}

export interface VerticalLineDrawing extends BaseDrawing {
  kind: 'vertical';
  points: [Point];
  x: number;
}

export interface PolylineDrawing extends BaseDrawing {
  kind: 'polyline';
  points: Point[];
}

export interface PathDrawing extends BaseDrawing {
  kind: 'path';
  points: Point[];
}

export interface GroupDrawing {
  id: string;
  type: 'group';
  children: Drawing[];
  layerId?: string;
  hidden?: boolean;
  locked?: boolean;
}

export type Drawing =
  | TrendlineDrawing
  | ArrowDrawing
  | RectDrawing
  | EllipseDrawing
  | TextDrawing
  | FibDrawing
  | PitchforkDrawing
  | ParallelChannelDrawing
  | HorizontalLineDrawing
  | VerticalLineDrawing
  | PolylineDrawing
  | PathDrawing
  | GroupDrawing;

export interface DrawingBoundingBox {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface DrawingSettings {
  lineWidth: number;
  color: string;
  opacity: number;
  fontSize: number;
  arrowHeadSize: number;
  arrowHead: 'none' | 'open' | 'filled';
  lineCap: 'butt' | 'round' | 'square';
  snapEnabled: boolean;
  snapStep: number;
  showHandles: boolean;
  perToolSnap: Record<string, boolean>;
  fibDefaultLevels: number[];
  showLineLabels: boolean;
  snapPriceLevels: boolean;
  snapToOHLC: boolean;
  magnetTolerancePx: number;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  order: number;
  locked: boolean;
}
