import {
  applyStyle,
  clearCanvas,
  distanceToSegment,
  drawArrowHead,
  drawEllipse,
  drawFibonacci,
  drawFilledRect,
  drawHandle,
  drawHorizontalLine,
  drawLine,
  drawLineHandles,
  drawLineLabel,
  drawParallelChannel,
  drawPitchfork,
  drawRay,
  drawRect,
  drawRectHandles,
  drawText,
  drawVerticalLine,
  extendLine,
  extendRay,
  pointInRect,
  pointNearPoint,
  rectFromPoints,
  setLineDash,
  type DrawingStyle,
  type Point,
} from '@/lib/drawing/canvasHelpers';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

describe('Canvas Helpers', () => {
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    mockCtx = {
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      ellipse: vi.fn(),
      setLineDash: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      clearRect: vi.fn(),
      closePath: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 50 }),
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      globalAlpha: 1,
      font: '12px sans-serif',
    } as unknown as CanvasRenderingContext2D;
  });

  describe('drawLine', () => {
    it('should draw a line from point A to point B', () => {
      const from: Point = { x: 10, y: 10 };
      const to: Point = { x: 100, y: 100 };

      drawLine(mockCtx, from, to);

      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.moveTo).toHaveBeenCalledWith(10, 10);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(100, 100);
      expect(mockCtx.stroke).toHaveBeenCalled();
    });

    it('should handle lines with negative coordinates', () => {
      const from: Point = { x: -50, y: -50 };
      const to: Point = { x: 50, y: 50 };

      drawLine(mockCtx, from, to);

      expect(mockCtx.moveTo).toHaveBeenCalledWith(-50, -50);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(50, 50);
    });

    it('should handle zero-length lines', () => {
      const from: Point = { x: 100, y: 100 };
      const to: Point = { x: 100, y: 100 };

      drawLine(mockCtx, from, to);

      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.moveTo).toHaveBeenCalledWith(100, 100);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(100, 100);
    });
  });

  describe('drawArrowHead', () => {
    it('should draw simple arrow head', () => {
      const from: Point = { x: 0, y: 0 };
      const to: Point = { x: 100, y: 0 };

      drawArrowHead(mockCtx, from, to, 'simple', 10);

      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.moveTo).toHaveBeenCalledWith(to.x, to.y);
      expect(mockCtx.stroke).toHaveBeenCalled();
    });

    it('should draw filled arrow head', () => {
      const from: Point = { x: 0, y: 0 };
      const to: Point = { x: 100, y: 0 };

      drawArrowHead(mockCtx, from, to, 'filled', 10);

      expect(mockCtx.closePath).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    it('should use custom arrow head size', () => {
      const from: Point = { x: 0, y: 0 };
      const to: Point = { x: 100, y: 100 };

      drawArrowHead(mockCtx, from, to, 'simple', 20);

      expect(mockCtx.moveTo).toHaveBeenCalled();
    });
  });

  describe('drawRect', () => {
    it('should stroke rectangle by default', () => {
      drawRect(mockCtx, 10, 20, 100, 80);

      expect(mockCtx.strokeRect).toHaveBeenCalledWith(10, 20, 100, 80);
    });

    it('should fill and stroke rectangle when fill color provided', () => {
      const style: DrawingStyle = { fill: '#ff0000' };

      drawRect(mockCtx, 10, 20, 100, 80, style);

      expect(mockCtx.fillRect).toHaveBeenCalledWith(10, 20, 100, 80);
      expect(mockCtx.strokeRect).toHaveBeenCalledWith(10, 20, 100, 80);
    });

    it('should handle zero-sized rectangles', () => {
      drawRect(mockCtx, 50, 50, 0, 0);

      expect(mockCtx.strokeRect).toHaveBeenCalledWith(50, 50, 0, 0);
    });
  });

  describe('drawFilledRect', () => {
    it('should fill rectangle with specified color', () => {
      drawFilledRect(mockCtx, 10, 20, 100, 80, '#ff0000', 0.5);

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.fillRect).toHaveBeenCalledWith(10, 20, 100, 80);
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    it('should use default opacity of 0.18', () => {
      drawFilledRect(mockCtx, 0, 0, 50, 50, '#0000ff');

      expect(mockCtx.globalAlpha).toBe(0.18);
    });
  });

  describe('drawEllipse', () => {
    it('should draw ellipse at center point', () => {
      drawEllipse(mockCtx, 100, 100, 50, 30);

      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.ellipse).toHaveBeenCalledWith(100, 100, 50, 30, 0, 0, Math.PI * 2);
      expect(mockCtx.stroke).toHaveBeenCalled();
    });

    it('should fill ellipse when fill color provided', () => {
      const style: DrawingStyle = { fill: '#00ff00' };

      drawEllipse(mockCtx, 100, 100, 50, 30, style);

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.fillStyle).toBe('#00ff00');
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    it('should handle minimum radius of 0.1', () => {
      drawEllipse(mockCtx, 50, 50, 0, 0);

      expect(mockCtx.ellipse).toHaveBeenCalledWith(50, 50, 0.1, 0.1, 0, 0, Math.PI * 2);
    });
  });

  describe('drawHorizontalLine', () => {
    it('should draw horizontal line across width', () => {
      drawHorizontalLine(mockCtx, 150, 800);

      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.moveTo).toHaveBeenCalledWith(0, 150);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(800, 150);
      expect(mockCtx.stroke).toHaveBeenCalled();
    });
  });

  describe('drawVerticalLine', () => {
    it('should draw vertical line across height', () => {
      drawVerticalLine(mockCtx, 200, 600);

      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.moveTo).toHaveBeenCalledWith(200, 0);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(200, 600);
      expect(mockCtx.stroke).toHaveBeenCalled();
    });
  });

  describe('drawHandle', () => {
    it('should draw handle at point with default radius', () => {
      const point: Point = { x: 100, y: 100 };

      drawHandle(mockCtx, point);

      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.arc).toHaveBeenCalledWith(100, 100, 4, 0, Math.PI * 2);
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    it('should draw handle with custom radius', () => {
      const point: Point = { x: 50, y: 75 };

      drawHandle(mockCtx, point, 8);

      expect(mockCtx.arc).toHaveBeenCalledWith(50, 75, 8, 0, Math.PI * 2);
    });
  });

  describe('drawLineHandles', () => {
    it('should draw handles at both line endpoints', () => {
      const from: Point = { x: 10, y: 10 };
      const to: Point = { x: 100, y: 100 };

      drawLineHandles(mockCtx, from, to);

      const arcCalls = (mockCtx.arc as Mock<[number, number, number, number, number], void>).mock
        .calls;
      expect(arcCalls.length).toBe(2);
      expect(arcCalls[0][0]).toBe(10);
      expect(arcCalls[0][1]).toBe(10);
      expect(arcCalls[1][0]).toBe(100);
      expect(arcCalls[1][1]).toBe(100);
    });
  });

  describe('drawRectHandles', () => {
    it('should draw 8 handles (4 corners + 4 edges)', () => {
      drawRectHandles(mockCtx, 10, 10, 100, 80);

      const arcCalls = (mockCtx.arc as Mock<[number, number, number, number, number], void>).mock
        .calls;
      expect(arcCalls.length).toBe(8);
    });

    it('should position corner handles correctly', () => {
      drawRectHandles(mockCtx, 0, 0, 100, 100);

      const arcCalls = (mockCtx.arc as Mock<[number, number, number, number, number], void>).mock
        .calls;
      // Top-left corner
      expect(arcCalls[0]).toEqual([0, 0, 4, 0, Math.PI * 2]);
      // Top-right corner
      expect(arcCalls[1]).toEqual([100, 0, 4, 0, Math.PI * 2]);
      // Bottom-left corner
      expect(arcCalls[2]).toEqual([0, 100, 4, 0, Math.PI * 2]);
      // Bottom-right corner
      expect(arcCalls[3]).toEqual([100, 100, 4, 0, Math.PI * 2]);
    });
  });

  describe('setLineDash', () => {
    it('should set dash pattern', () => {
      setLineDash(mockCtx, 'dash');
      expect(mockCtx.setLineDash).toHaveBeenCalledWith([8, 6]);
    });

    it('should set dot pattern', () => {
      setLineDash(mockCtx, 'dot');
      expect(mockCtx.setLineDash).toHaveBeenCalledWith([2, 4]);
    });

    it('should set dashdot pattern', () => {
      setLineDash(mockCtx, 'dashdot');
      expect(mockCtx.setLineDash).toHaveBeenCalledWith([10, 6, 2, 6]);
    });

    it('should set solid (no dash) pattern', () => {
      setLineDash(mockCtx, 'solid');
      expect(mockCtx.setLineDash).toHaveBeenCalledWith([]);
    });
  });

  describe('applyStyle', () => {
    it('should apply custom style to context', () => {
      const style: DrawingStyle = {
        stroke: '#ff0000',
        strokeWidth: 3,
        opacity: 0.8,
      };

      applyStyle(mockCtx, style);

      expect(mockCtx.strokeStyle).toBe('#ff0000');
      expect(mockCtx.lineWidth).toBe(3);
      expect(mockCtx.globalAlpha).toBe(0.8);
    });

    it('should apply default style when not specified', () => {
      applyStyle(mockCtx, {});

      expect(mockCtx.strokeStyle).toBe('#9ca3af');
      expect(mockCtx.lineWidth).toBe(1.75);
      expect(mockCtx.globalAlpha).toBe(1);
    });

    it('should apply selected style (blue highlight)', () => {
      const style: DrawingStyle = { stroke: '#000000' };

      applyStyle(mockCtx, style, true);

      expect(mockCtx.strokeStyle).toBe('#60a5fa');
    });

    it('should apply line dash from style', () => {
      const style: DrawingStyle = { dash: 'dash' };

      applyStyle(mockCtx, style);

      expect(mockCtx.setLineDash).toHaveBeenCalledWith([8, 6]);
    });
  });

  describe('clearCanvas', () => {
    it('should clear entire canvas', () => {
      clearCanvas(mockCtx, 800, 600);

      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
    });

    it('should handle different canvas sizes', () => {
      clearCanvas(mockCtx, 1920, 1080);

      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 1920, 1080);
    });
  });

  describe('distanceToSegment', () => {
    it('should calculate distance from point to line segment', () => {
      const point: Point = { x: 50, y: 50 };
      const from: Point = { x: 0, y: 0 };
      const to: Point = { x: 100, y: 0 };

      const distance = distanceToSegment(point, from, to);

      expect(distance).toBe(50);
    });

    it('should return 0 for point on segment', () => {
      const point: Point = { x: 50, y: 0 };
      const from: Point = { x: 0, y: 0 };
      const to: Point = { x: 100, y: 0 };

      const distance = distanceToSegment(point, from, to);

      expect(distance).toBe(0);
    });

    it('should handle zero-length segments', () => {
      const point: Point = { x: 50, y: 50 };
      const from: Point = { x: 100, y: 100 };
      const to: Point = { x: 100, y: 100 };

      const distance = distanceToSegment(point, from, to);

      expect(distance).toBeGreaterThan(0);
    });

    it('should handle diagonal lines', () => {
      const point: Point = { x: 50, y: 50 };
      const from: Point = { x: 0, y: 0 };
      const to: Point = { x: 100, y: 100 };

      const distance = distanceToSegment(point, from, to);

      expect(distance).toBeLessThan(1);
    });
  });

  describe('pointNearPoint', () => {
    it('should detect point within threshold', () => {
      const p1: Point = { x: 10, y: 10 };
      const p2: Point = { x: 15, y: 10 };

      const near = pointNearPoint(p1, p2, 10);

      expect(near).toBe(true);
    });

    it('should detect point outside threshold', () => {
      const p1: Point = { x: 10, y: 10 };
      const p2: Point = { x: 50, y: 10 };

      const near = pointNearPoint(p1, p2, 10);

      expect(near).toBe(false);
    });

    it('should use default threshold of 6', () => {
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 5, y: 0 };

      const near = pointNearPoint(p1, p2);

      expect(near).toBe(true);
    });

    it('should detect identical points', () => {
      const p: Point = { x: 100, y: 100 };

      const near = pointNearPoint(p, p, 0);

      expect(near).toBe(true);
    });
  });

  describe('pointInRect', () => {
    it('should detect point inside rectangle', () => {
      const point: Point = { x: 50, y: 50 };

      const inside = pointInRect(point, 10, 10, 100, 100);

      expect(inside).toBe(true);
    });

    it('should detect point outside rectangle', () => {
      const point: Point = { x: 200, y: 50 };

      const inside = pointInRect(point, 10, 10, 100, 100);

      expect(inside).toBe(false);
    });

    it('should detect point on rectangle boundary', () => {
      const point: Point = { x: 10, y: 50 };

      const inside = pointInRect(point, 10, 10, 100, 100);

      expect(inside).toBe(true);
    });

    it('should handle zero-sized rectangles', () => {
      const point: Point = { x: 50, y: 50 };

      const inside = pointInRect(point, 50, 50, 0, 0);

      expect(inside).toBe(true);
    });
  });

  describe('drawFibonacci', () => {
    it('should draw fibonacci retracement levels', () => {
      const from: Point = { x: 100, y: 100 };
      const to: Point = { x: 100, y: 200 };
      const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

      drawFibonacci(mockCtx, from, to, levels, 800);

      expect(mockCtx.moveTo).toHaveBeenCalled();
      expect(mockCtx.lineTo).toHaveBeenCalled();
      expect(mockCtx.fillText).toHaveBeenCalled();
    });

    it('should sort levels before drawing', () => {
      const from: Point = { x: 100, y: 100 };
      const to: Point = { x: 100, y: 200 };
      const levels = [1, 0.5, 0, 0.618]; // Unsorted

      drawFibonacci(mockCtx, from, to, levels, 800);

      expect(mockCtx.stroke).toHaveBeenCalled();
    });
  });

  describe('drawParallelChannel', () => {
    it('should draw parallel channel with three lines', () => {
      const a: Point = { x: 100, y: 100 };
      const b: Point = { x: 200, y: 150 };
      const c: Point = { x: 150, y: 200 };

      drawParallelChannel(mockCtx, a, b, c, 800, 600);

      expect(mockCtx.moveTo).toHaveBeenCalled();
      expect(mockCtx.lineTo).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
    });

    it('should fill channel when fill color provided', () => {
      const a: Point = { x: 100, y: 100 };
      const b: Point = { x: 200, y: 150 };
      const c: Point = { x: 150, y: 200 };

      drawParallelChannel(mockCtx, a, b, c, 800, 600, '#ff0000');

      expect(mockCtx.fill).toHaveBeenCalled();
      expect(mockCtx.closePath).toHaveBeenCalled();
    });
  });

  describe('drawPitchfork', () => {
    it('should draw pitchfork with median and prongs', () => {
      const a: Point = { x: 100, y: 100 };
      const b: Point = { x: 200, y: 100 };
      const c: Point = { x: 150, y: 200 };

      drawPitchfork(mockCtx, a, b, c, 800, 600);

      expect(mockCtx.moveTo).toHaveBeenCalled();
      expect(mockCtx.lineTo).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
    });
  });

  describe('drawRay', () => {
    it('should draw ray extending to canvas bounds', () => {
      const from: Point = { x: 100, y: 100 };
      const to: Point = { x: 200, y: 200 };

      drawRay(mockCtx, from, to, 800, 600);

      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.moveTo).toHaveBeenCalled();
      expect(mockCtx.lineTo).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
    });
  });

  describe('extendRay', () => {
    it('should extend ray to canvas bounds', () => {
      const from: Point = { x: 100, y: 100 };
      const to: Point = { x: 200, y: 200 };

      const extended = extendRay(from, to, 800, 600);

      expect(extended.start).toEqual(from);
      expect(extended.end.x).toBeGreaterThan(from.x);
      expect(extended.end.y).toBeGreaterThan(from.y);
    });

    it('should clamp to canvas bounds', () => {
      const from: Point = { x: 100, y: 100 };
      const to: Point = { x: 200, y: 200 };

      const extended = extendRay(from, to, 800, 600);

      expect(extended.end.x).toBeLessThanOrEqual(800);
      expect(extended.end.y).toBeLessThanOrEqual(600);
    });
  });

  describe('extendLine', () => {
    it('should extend line in both directions', () => {
      const a: Point = { x: 400, y: 300 };
      const b: Point = { x: 500, y: 400 };

      const extended = extendLine(a, b, 800, 600);

      expect(extended.start.x).toBeLessThan(a.x);
      expect(extended.end.x).toBeGreaterThan(b.x);
    });

    it('should clamp to canvas bounds', () => {
      const a: Point = { x: 400, y: 300 };
      const b: Point = { x: 500, y: 400 };

      const extended = extendLine(a, b, 800, 600);

      expect(extended.start.x).toBeGreaterThanOrEqual(0);
      expect(extended.start.y).toBeGreaterThanOrEqual(0);
      expect(extended.end.x).toBeLessThanOrEqual(800);
      expect(extended.end.y).toBeLessThanOrEqual(600);
    });
  });

  describe('drawText', () => {
    it('should draw text at point', () => {
      const point: Point = { x: 100, y: 100 };

      drawText(mockCtx, point, 'Test Label');

      expect(mockCtx.fillText).toHaveBeenCalledWith('Test Label', 100, 100);
    });

    it('should apply style', () => {
      const point: Point = { x: 100, y: 100 };
      const style = { stroke: '#ff0000' };

      drawText(mockCtx, point, 'Test', style);

      expect(mockCtx.fillStyle).toBe('#ff0000');
    });
  });

  describe('drawLineLabel', () => {
    it('should draw line label with percentage and price', () => {
      const from: Point = { x: 100, y: 100 };
      const to: Point = { x: 200, y: 150 };
      const yToPrice = vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(110);

      drawLineLabel(mockCtx, from, to, yToPrice);

      expect(mockCtx.fillText).toHaveBeenCalled();
      expect(yToPrice).toHaveBeenCalledWith(100);
      expect(yToPrice).toHaveBeenCalledWith(150);
    });

    it('should not draw if price is null', () => {
      const from: Point = { x: 100, y: 100 };
      const to: Point = { x: 200, y: 150 };
      const yToPrice = vi.fn().mockReturnValue(null);

      drawLineLabel(mockCtx, from, to, yToPrice);

      expect(mockCtx.fillText).not.toHaveBeenCalled();
    });
  });

  describe('rectFromPoints', () => {
    it('should create rectangle from two points', () => {
      const p1: Point = { x: 100, y: 100 };
      const p2: Point = { x: 300, y: 200 };

      const rect = rectFromPoints(p1, p2);

      expect(rect).toEqual({ x: 100, y: 100, w: 200, h: 100 });
    });

    it('should handle reversed points', () => {
      const p1: Point = { x: 300, y: 200 };
      const p2: Point = { x: 100, y: 100 };

      const rect = rectFromPoints(p1, p2);

      expect(rect).toEqual({ x: 100, y: 100, w: 200, h: 100 });
    });

    it('should handle negative dimensions', () => {
      const p1: Point = { x: 300, y: 100 };
      const p2: Point = { x: 100, y: 200 };

      const rect = rectFromPoints(p1, p2);

      expect(rect.w).toBeGreaterThanOrEqual(0);
      expect(rect.h).toBeGreaterThanOrEqual(0);
    });
  });
});
