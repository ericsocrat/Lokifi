/**
 * Drawing and canvas type definitions
 */

export interface Point {
  x: number;
  y: number;
}

export type LineStyle = 0 | 1 | 2 | 3; // solid, dashed, dotted, dash-dot
export type LineCap = 'butt' | 'round' | 'square';
export type ArrowHead = 'none' | 'simple' | 'filled';
export type Dash = 'solid' | 'dashed' | 'dotted';

export interface DrawingStyle {
  stroke?: string;
  fill?: string;
  lineWidth?: number;
  lineStyle?: LineStyle;
  dash?: Dash;
  lineCap?: LineCap;
  arrowHead?: ArrowHead;
}

export type DrawingKind = 
  | 'line'
  | 'trendline'
  | 'ray'
  | 'arrow'
  | 'hline'
  | 'vline'
  | 'rect'
  | 'ellipse'
  | 'triangle'
  | 'fib'
  | 'channel'
  | 'pitchfork'
  | 'text';

export interface BaseDrawing {
  id: string;
  kind: DrawingKind;
  points: Point[];
  style?: DrawingStyle;
  layerId?: string;
  locked?: boolean;
  hidden?: boolean;
}

export interface TextDrawing extends BaseDrawing {
  kind: 'text';
  text: string;
}

export interface FibDrawing extends BaseDrawing {
  kind: 'fib';
  fibLevels?: number[];
}

export type Drawing = BaseDrawing | TextDrawing | FibDrawing;

export interface Layer {
  id: string;
  name?: string;
  visible: boolean;
  opacity: number;
}
