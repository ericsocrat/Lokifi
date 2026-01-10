/**
 * Pure canvas drawing helper functions
 * These functions are decoupled from the DrawingLayer component and can be tested independently
 */

export type Point = { x: number; y: number };

export interface DrawingStyle {
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  opacity?: number;
  dash?: 'solid' | 'dash' | 'dot' | 'dashdot';
}

/**
 * Draw a line with optional arrow head
 */
export function drawLine(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  style: DrawingStyle = {}
): void {
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

/**
 * Draw an arrow head at the end of a line
 */
export function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  headType: 'simple' | 'filled' = 'simple',
  size: number = 10
): void {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const headlen = size;

  // Lines for arrowhead
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(
    to.x - headlen * Math.cos(angle - Math.PI / 6),
    to.y - headlen * Math.sin(angle - Math.PI / 6)
  );

  if (headType === 'filled') {
    ctx.lineTo(
      to.x - headlen * Math.cos(angle + Math.PI / 6),
      to.y - headlen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.moveTo(
      to.x - headlen * Math.cos(angle - Math.PI / 6),
      to.y - headlen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      to.x - headlen * Math.cos(angle + Math.PI / 6),
      to.y - headlen * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  }
}

/**
 * Draw a rectangle
 */
export function drawRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  style: DrawingStyle = {}
): void {
  if (style.fill) {
    ctx.fillRect(x, y, width, height);
  }
  ctx.strokeRect(x, y, width, height);
}

/**
 * Draw a filled rectangle
 */
export function drawFilledRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor: string,
  opacity: number = 0.18
): void {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = fillColor;
  ctx.fillRect(x, y, width, height);
  ctx.restore();
}

/**
 * Draw a circle/ellipse
 */
export function drawEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  style: DrawingStyle = {}
): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(rx, 0.1), Math.max(ry, 0.1), 0, 0, Math.PI * 2);

  if (style.fill) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = style.fill;
    ctx.fill();
    ctx.restore();
  }
  ctx.stroke();
}

/**
 * Draw a horizontal line
 */
export function drawHorizontalLine(ctx: CanvasRenderingContext2D, y: number, width: number): void {
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(width, y);
  ctx.stroke();
}

/**
 * Draw a vertical line
 */
export function drawVerticalLine(ctx: CanvasRenderingContext2D, x: number, height: number): void {
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, height);
  ctx.stroke();
}

/**
 * Draw a handle (small circle) for selection
 */
export function drawHandle(ctx: CanvasRenderingContext2D, point: Point, radius: number = 4): void {
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw multiple handles for a line
 */
export function drawLineHandles(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  radius: number = 4
): void {
  drawHandle(ctx, from, radius);
  drawHandle(ctx, to, radius);
}

/**
 * Draw handles for a rectangle
 */
export function drawRectHandles(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number = 4
): void {
  // Corners
  drawHandle(ctx, { x, y }, radius);
  drawHandle(ctx, { x: x + width, y }, radius);
  drawHandle(ctx, { x, y: y + height }, radius);
  drawHandle(ctx, { x: x + width, y: y + height }, radius);

  // Edges
  drawHandle(ctx, { x: x + width / 2, y }, radius);
  drawHandle(ctx, { x: x + width / 2, y: y + height }, radius);
  drawHandle(ctx, { x, y: y + height / 2 }, radius);
  drawHandle(ctx, { x: x + width, y: y + height / 2 }, radius);
}

/**
 * Set line dash pattern
 */
export function setLineDash(
  ctx: CanvasRenderingContext2D,
  dashType: 'solid' | 'dash' | 'dot' | 'dashdot'
): void {
  switch (dashType) {
    case 'dash':
      ctx.setLineDash([8, 6]);
      break;
    case 'dot':
      ctx.setLineDash([2, 4]);
      break;
    case 'dashdot':
      ctx.setLineDash([10, 6, 2, 6]);
      break;
    case 'solid':
    default:
      ctx.setLineDash([]);
  }
}

/**
 * Apply drawing style to context
 */
export function applyStyle(
  ctx: CanvasRenderingContext2D,
  style: DrawingStyle,
  isSelected: boolean = false
): void {
  ctx.strokeStyle = isSelected ? '#60a5fa' : style.stroke || '#9ca3af';
  ctx.lineWidth = style.strokeWidth || 1.75;
  ctx.globalAlpha = style.opacity ?? 1;

  if (style.dash) {
    setLineDash(ctx, style.dash);
  }
}

/**
 * Clear canvas
 */
export function clearCanvas(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.clearRect(0, 0, width, height);
}

/**
 * Calculate distance from point to line segment
 */
export function distanceToSegment(point: Point, from: Point, to: Point): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const denom = dx * dx + dy * dy;

  if (denom === 0) {
    return Math.sqrt(Math.pow(point.x - from.x, 2) + Math.pow(point.y - from.y, 2));
  }

  let t = ((point.x - from.x) * dx + (point.y - from.y) * dy) / denom;
  t = Math.max(0, Math.min(1, t));

  const closest = {
    x: from.x + t * dx,
    y: from.y + t * dy,
  };

  return Math.sqrt(Math.pow(point.x - closest.x, 2) + Math.pow(point.y - closest.y, 2));
}

/**
 * Check if point is within distance threshold of another point
 */
export function pointNearPoint(p1: Point, p2: Point, threshold: number = 6): boolean {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy) <= threshold;
}

/**
 * Check if point is within rectangle
 */
export function pointInRect(
  point: Point,
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height;
}
