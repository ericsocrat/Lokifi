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

/**
 * Draw fibonacci retracement levels
 */
export function drawFibonacci(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  levels: number[],
  canvasWidth: number,
  style: DrawingStyle = {},
  yToPrice?: (y: number) => number | null
): void {
  const sortedLevels = [...levels].sort((a, b) => a - b);
  const y0 = from.y;
  const y1 = to.y;
  const left = 0;
  const right = canvasWidth;

  ctx.save();
  applyStyle(ctx, style);
  ctx.font = '12px ui-sans-serif, system-ui';

  sortedLevels.forEach((level) => {
    const y = y0 + (y1 - y0) * level;

    // Draw horizontal line
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();

    // Draw label
    const price = yToPrice ? yToPrice(y) : null;
    const txt = `${Math.round(level * 100)}%${price != null ? ` @ ${price}` : ''}`;
    ctx.fillStyle = '#e5e7eb';
    ctx.fillText(txt, right - 8 - ctx.measureText(txt).width, y - 4);
  });

  ctx.restore();
}

/**
 * Draw parallel channel with three points
 */
export function drawParallelChannel(
  ctx: CanvasRenderingContext2D,
  a: Point,
  b: Point,
  c: Point,
  canvasWidth: number,
  canvasHeight: number,
  fillColor?: string
): void {
  // Calculate the width/offset from the base line (a-b) to point c
  const midY = (a.y + b.y) / 2;
  const offset = c.y - midY;

  // Base line
  const baseLine = extendLine(a, b, canvasWidth, canvasHeight);

  // Parallel lines (top and bottom)
  const topLine = extendLine(
    { x: a.x, y: a.y - offset },
    { x: b.x, y: b.y - offset },
    canvasWidth,
    canvasHeight
  );
  const bottomLine = extendLine(
    { x: a.x, y: a.y + offset },
    { x: b.x, y: b.y + offset },
    canvasWidth,
    canvasHeight
  );

  ctx.save();

  // Fill the channel if requested
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.moveTo(topLine.start.x, topLine.start.y);
    ctx.lineTo(topLine.end.x, topLine.end.y);
    ctx.lineTo(bottomLine.end.x, bottomLine.end.y);
    ctx.lineTo(bottomLine.start.x, bottomLine.start.y);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Draw the three lines
  [topLine, baseLine, bottomLine].forEach((line) => {
    ctx.beginPath();
    ctx.moveTo(line.start.x, line.start.y);
    ctx.lineTo(line.end.x, line.end.y);
    ctx.stroke();
  });

  ctx.restore();
}

/**
 * Draw pitchfork with three pivot points
 */
export function drawPitchfork(
  ctx: CanvasRenderingContext2D,
  a: Point,
  b: Point,
  c: Point,
  canvasWidth: number,
  canvasHeight: number
): void {
  ctx.save();

  // Calculate the midpoint between a and b
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

  // Median line from c through midpoint
  const medianLine = extendLine(c, mid, canvasWidth, canvasHeight);

  // Prong from a to extended point parallel to median
  const prongA = extendLine(a, c, canvasWidth, canvasHeight);

  // Prong from b to extended point parallel to median
  const prongB = extendLine(b, c, canvasWidth, canvasHeight);

  // Draw all three lines
  [medianLine, prongA, prongB].forEach((line) => {
    ctx.beginPath();
    ctx.moveTo(line.start.x, line.start.y);
    ctx.lineTo(line.end.x, line.end.y);
    ctx.stroke();
  });

  ctx.restore();
}

/**
 * Draw a ray (infinite line from one point through another)
 */
export function drawRay(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  canvasWidth: number,
  canvasHeight: number
): void {
  const extended = extendRay(from, to, canvasWidth, canvasHeight);

  ctx.beginPath();
  ctx.moveTo(extended.start.x, extended.start.y);
  ctx.lineTo(extended.end.x, extended.end.y);
  ctx.stroke();
}

/**
 * Extend a ray to canvas bounds
 */
export function extendRay(
  from: Point,
  to: Point,
  canvasWidth: number,
  canvasHeight: number
): { start: Point; end: Point } {
  const vx = to.x - from.x;
  const vy = to.y - from.y;
  const len = Math.hypot(vx, vy) || 1;
  const nx = vx / len;
  const ny = vy / len;

  // Extend to a far distance
  const t = 1e6;
  const end = { x: from.x + nx * t, y: from.y + ny * t };

  // Clamp to canvas bounds
  end.x = Math.max(0, Math.min(canvasWidth, end.x));
  end.y = Math.max(0, Math.min(canvasHeight, end.y));

  return { start: from, end };
}

/**
 * Extend a line segment to canvas bounds in both directions
 */
export function extendLine(
  a: Point,
  b: Point,
  canvasWidth: number,
  canvasHeight: number
): { start: Point; end: Point } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dx / len;
  const ny = dy / len;

  // Extend in both directions
  const t = 1e6;
  const start = { x: a.x - nx * t, y: a.y - ny * t };
  const end = { x: a.x + nx * t, y: a.y + ny * t };

  // Clamp to canvas bounds
  start.x = Math.max(0, Math.min(canvasWidth, start.x));
  start.y = Math.max(0, Math.min(canvasHeight, start.y));
  end.x = Math.max(0, Math.min(canvasWidth, end.x));
  end.y = Math.max(0, Math.min(canvasHeight, end.y));

  return { start, end };
}

/**
 * Draw text label at a point
 */
export function drawText(
  ctx: CanvasRenderingContext2D,
  point: Point,
  text: string,
  style: DrawingStyle = {}
): void {
  ctx.save();
  ctx.fillStyle = style.stroke || '#e5e7eb';
  ctx.font = '12px ui-sans-serif, system-ui';
  ctx.fillText(text, point.x, point.y);
  ctx.restore();
}

/**
 * Draw a line label showing percentage change and price
 */
export function drawLineLabel(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  yToPrice: (y: number) => number | null
): void {
  const p1 = yToPrice(from.y);
  const p2 = yToPrice(to.y);

  if (p1 == null || p2 == null || p1 === 0) return;

  const pct = ((p2 - p1) / Math.abs(p1)) * 100;
  const txt = `${Math.round(pct)}% @ ${p2}`;

  ctx.save();
  ctx.fillStyle = '#e5e7eb';
  ctx.font = '12px ui-sans-serif, system-ui';
  ctx.fillText(txt, Math.min(from.x, to.x) + 8, Math.min(from.y, to.y) - 6);
  ctx.restore();
}

/**
 * Create rectangle from two corner points
 */
export function rectFromPoints(
  p1: Point,
  p2: Point
): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  const x = Math.min(p1.x, p2.x);
  const y = Math.min(p1.y, p2.y);
  const w = Math.abs(p2.x - p1.x);
  const h = Math.abs(p2.y - p1.y);
  return { x, y, w, h };
}
