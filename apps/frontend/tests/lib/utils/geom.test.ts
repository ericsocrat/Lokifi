import { describe, expect, it } from 'vitest';
import {
  clamp,
  distanceToSegment,
  normalize,
  perpendicular,
  rectFromPoints,
  withinRect,
  type Point,
  type Rect,
} from '../../../src/lib/utils/geom';

describe('geom utilities', () => {
  describe('distanceToSegment', () => {
    it('should return distance to closest endpoint when point before segment', () => {
      const p: Point = { x: 0, y: 0 };
      const a: Point = { x: 10, y: 0 };
      const b: Point = { x: 20, y: 0 };

      const dist = distanceToSegment(p, a, b);
      expect(dist).toBeCloseTo(10, 5); // Distance to point a
    });

    it('should return distance to closest endpoint when point after segment', () => {
      const p: Point = { x: 30, y: 0 };
      const a: Point = { x: 10, y: 0 };
      const b: Point = { x: 20, y: 0 };

      const dist = distanceToSegment(p, a, b);
      expect(dist).toBeCloseTo(10, 5); // Distance to point b
    });

    it('should return perpendicular distance when point beside segment', () => {
      const p: Point = { x: 15, y: 5 };
      const a: Point = { x: 10, y: 0 };
      const b: Point = { x: 20, y: 0 };

      const dist = distanceToSegment(p, a, b);
      expect(dist).toBeCloseTo(5, 5); // Perpendicular distance is 5
    });

    it('should return zero when point is on segment', () => {
      const p: Point = { x: 15, y: 0 };
      const a: Point = { x: 10, y: 0 };
      const b: Point = { x: 20, y: 0 };

      const dist = distanceToSegment(p, a, b);
      expect(dist).toBeCloseTo(0, 5);
    });

    it('should handle vertical segments', () => {
      const p: Point = { x: 5, y: 15 };
      const a: Point = { x: 0, y: 10 };
      const b: Point = { x: 0, y: 20 };

      const dist = distanceToSegment(p, a, b);
      expect(dist).toBeCloseTo(5, 5);
    });

    it('should handle diagonal segments', () => {
      const p: Point = { x: 0, y: 5 };
      const a: Point = { x: 0, y: 0 };
      const b: Point = { x: 10, y: 10 };

      const dist = distanceToSegment(p, a, b);
      // Point (0, 5) to line from (0,0) to (10,10) - should be perpendicular distance
      expect(dist).toBeCloseTo(3.5355, 2); // sqrt(2)/2 * 5
    });

    it('should handle zero-length segment (point)', () => {
      const p: Point = { x: 5, y: 5 };
      const a: Point = { x: 10, y: 10 };
      const b: Point = { x: 10, y: 10 };

      const dist = distanceToSegment(p, a, b);
      expect(dist).toBeCloseTo(Math.hypot(5, 5), 5);
    });

    it('should handle negative coordinates', () => {
      const p: Point = { x: -5, y: -5 };
      const a: Point = { x: -10, y: -10 };
      const b: Point = { x: 0, y: 0 };

      const dist = distanceToSegment(p, a, b);
      expect(dist).toBeCloseTo(0, 5); // Point is on the segment
    });
  });

  describe('rectFromPoints', () => {
    it('should create rect from top-left to bottom-right', () => {
      const a: Point = { x: 10, y: 20 };
      const b: Point = { x: 50, y: 60 };

      const rect = rectFromPoints(a, b);
      expect(rect).toEqual({ x: 10, y: 20, w: 40, h: 40 });
    });

    it('should create rect from bottom-right to top-left', () => {
      const a: Point = { x: 50, y: 60 };
      const b: Point = { x: 10, y: 20 };

      const rect = rectFromPoints(a, b);
      expect(rect).toEqual({ x: 10, y: 20, w: 40, h: 40 });
    });

    it('should create rect from top-right to bottom-left', () => {
      const a: Point = { x: 50, y: 20 };
      const b: Point = { x: 10, y: 60 };

      const rect = rectFromPoints(a, b);
      expect(rect).toEqual({ x: 10, y: 20, w: 40, h: 40 });
    });

    it('should create rect from bottom-left to top-right', () => {
      const a: Point = { x: 10, y: 60 };
      const b: Point = { x: 50, y: 20 };

      const rect = rectFromPoints(a, b);
      expect(rect).toEqual({ x: 10, y: 20, w: 40, h: 40 });
    });

    it('should handle zero-width rect', () => {
      const a: Point = { x: 10, y: 20 };
      const b: Point = { x: 10, y: 60 };

      const rect = rectFromPoints(a, b);
      expect(rect).toEqual({ x: 10, y: 20, w: 0, h: 40 });
    });

    it('should handle zero-height rect', () => {
      const a: Point = { x: 10, y: 20 };
      const b: Point = { x: 50, y: 20 };

      const rect = rectFromPoints(a, b);
      expect(rect).toEqual({ x: 10, y: 20, w: 40, h: 0 });
    });

    it('should handle point (zero-size rect)', () => {
      const a: Point = { x: 10, y: 20 };
      const b: Point = { x: 10, y: 20 };

      const rect = rectFromPoints(a, b);
      expect(rect).toEqual({ x: 10, y: 20, w: 0, h: 0 });
    });

    it('should handle negative coordinates', () => {
      const a: Point = { x: -10, y: -20 };
      const b: Point = { x: -50, y: -60 };

      const rect = rectFromPoints(a, b);
      expect(rect).toEqual({ x: -50, y: -60, w: 40, h: 40 });
    });

    it('should handle mixed positive/negative coordinates', () => {
      const a: Point = { x: -10, y: 20 };
      const b: Point = { x: 30, y: -40 };

      const rect = rectFromPoints(a, b);
      expect(rect).toEqual({ x: -10, y: -40, w: 40, h: 60 });
    });
  });

  describe('withinRect', () => {
    const rect: Rect = { x: 10, y: 20, w: 40, h: 30 };

    it('should return true for point inside rect', () => {
      expect(withinRect({ x: 25, y: 35 }, rect)).toBe(true);
      expect(withinRect({ x: 30, y: 30 }, rect)).toBe(true);
    });

    it('should return true for point on rect boundaries', () => {
      expect(withinRect({ x: 10, y: 20 }, rect)).toBe(true); // Top-left corner
      expect(withinRect({ x: 50, y: 20 }, rect)).toBe(true); // Top-right corner
      expect(withinRect({ x: 10, y: 50 }, rect)).toBe(true); // Bottom-left corner
      expect(withinRect({ x: 50, y: 50 }, rect)).toBe(true); // Bottom-right corner
      expect(withinRect({ x: 30, y: 20 }, rect)).toBe(true); // Top edge
      expect(withinRect({ x: 30, y: 50 }, rect)).toBe(true); // Bottom edge
      expect(withinRect({ x: 10, y: 35 }, rect)).toBe(true); // Left edge
      expect(withinRect({ x: 50, y: 35 }, rect)).toBe(true); // Right edge
    });

    it('should return false for point outside rect', () => {
      expect(withinRect({ x: 5, y: 15 }, rect)).toBe(false); // Before top-left
      expect(withinRect({ x: 55, y: 25 }, rect)).toBe(false); // After top-right
      expect(withinRect({ x: 5, y: 55 }, rect)).toBe(false); // Before bottom-left
      expect(withinRect({ x: 55, y: 55 }, rect)).toBe(false); // After bottom-right
    });

    it('should return false for point slightly outside boundaries', () => {
      expect(withinRect({ x: 9.99, y: 20 }, rect)).toBe(false); // Just left of rect
      expect(withinRect({ x: 50.01, y: 20 }, rect)).toBe(false); // Just right of rect
      expect(withinRect({ x: 10, y: 19.99 }, rect)).toBe(false); // Just above rect
      expect(withinRect({ x: 10, y: 50.01 }, rect)).toBe(false); // Just below rect
    });

    it('should handle zero-size rect', () => {
      const pointRect: Rect = { x: 10, y: 20, w: 0, h: 0 };
      expect(withinRect({ x: 10, y: 20 }, pointRect)).toBe(true);
      expect(withinRect({ x: 10.01, y: 20 }, pointRect)).toBe(false);
    });

    it('should handle rect at origin', () => {
      const originRect: Rect = { x: 0, y: 0, w: 10, h: 10 };
      expect(withinRect({ x: 0, y: 0 }, originRect)).toBe(true);
      expect(withinRect({ x: 5, y: 5 }, originRect)).toBe(true);
      expect(withinRect({ x: 10, y: 10 }, originRect)).toBe(true);
      expect(withinRect({ x: -1, y: 5 }, originRect)).toBe(false);
    });

    it('should handle negative coordinate rect', () => {
      const negRect: Rect = { x: -20, y: -30, w: 10, h: 15 };
      expect(withinRect({ x: -15, y: -20 }, negRect)).toBe(true);
      expect(withinRect({ x: -20, y: -30 }, negRect)).toBe(true);
      expect(withinRect({ x: -10, y: -15 }, negRect)).toBe(true);
      expect(withinRect({ x: -25, y: -20 }, negRect)).toBe(false);
    });
  });

  describe('clamp', () => {
    it('should return value when within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(0.5, 0, 1)).toBe(0.5);
    });

    it('should clamp to min when value too low', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(0, 1, 10)).toBe(1);
    });

    it('should clamp to max when value too high', () => {
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(1.5, 0, 1)).toBe(1);
    });

    it('should handle value equal to boundaries', () => {
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });

    it('should handle negative ranges', () => {
      expect(clamp(-5, -10, -1)).toBe(-5);
      expect(clamp(-15, -10, -1)).toBe(-10);
      expect(clamp(0, -10, -1)).toBe(-1);
    });

    it('should handle degenerate range (min === max)', () => {
      expect(clamp(5, 3, 3)).toBe(3);
      expect(clamp(1, 5, 5)).toBe(5);
    });
  });

  describe('normalize', () => {
    it('should normalize unit vectors', () => {
      const [nx, ny] = normalize(1, 0);
      expect(nx).toBeCloseTo(1, 5);
      expect(ny).toBeCloseTo(0, 5);
    });

    it('should normalize arbitrary vectors', () => {
      const [nx, ny] = normalize(3, 4);
      expect(nx).toBeCloseTo(0.6, 5);
      expect(ny).toBeCloseTo(0.8, 5);
      expect(Math.hypot(nx, ny)).toBeCloseTo(1, 5); // Length should be 1
    });

    it('should normalize diagonal vectors', () => {
      const [nx, ny] = normalize(1, 1);
      expect(nx).toBeCloseTo(Math.SQRT1_2, 5); // 1/sqrt(2)
      expect(ny).toBeCloseTo(Math.SQRT1_2, 5);
      expect(Math.hypot(nx, ny)).toBeCloseTo(1, 5);
    });

    it('should handle negative vectors', () => {
      const [nx, ny] = normalize(-3, -4);
      expect(nx).toBeCloseTo(-0.6, 5);
      expect(ny).toBeCloseTo(-0.8, 5);
      expect(Math.hypot(nx, ny)).toBeCloseTo(1, 5);
    });

    it('should handle zero vector (returns itself, avoids division by zero)', () => {
      const [nx, ny] = normalize(0, 0);
      expect(nx).toBe(0);
      expect(ny).toBe(0);
    });

    it('should handle very small vectors', () => {
      const [nx, ny] = normalize(0.0001, 0.0001);
      expect(Math.hypot(nx, ny)).toBeCloseTo(1, 5);
    });

    it('should handle very large vectors', () => {
      const [nx, ny] = normalize(1000000, 2000000);
      expect(Math.hypot(nx, ny)).toBeCloseTo(1, 5);
    });

    it('should preserve direction', () => {
      // Positive x, positive y
      let [nx, ny] = normalize(1, 1);
      expect(nx).toBeGreaterThan(0);
      expect(ny).toBeGreaterThan(0);

      // Negative x, positive y
      [nx, ny] = normalize(-1, 1);
      expect(nx).toBeLessThan(0);
      expect(ny).toBeGreaterThan(0);

      // Negative x, negative y
      [nx, ny] = normalize(-1, -1);
      expect(nx).toBeLessThan(0);
      expect(ny).toBeLessThan(0);

      // Positive x, negative y
      [nx, ny] = normalize(1, -1);
      expect(nx).toBeGreaterThan(0);
      expect(ny).toBeLessThan(0);
    });
  });

  describe('perpendicular', () => {
    it('should return perpendicular vector rotated 90° CCW', () => {
      // (1, 0) -> (0, 1)
      let [px, py] = perpendicular(1, 0);
      expect(px).toBeCloseTo(0, 5); // Allow -0 or +0
      expect(py).toBe(1);

      // (0, 1) -> (-1, 0)
      [px, py] = perpendicular(0, 1);
      expect(px).toBe(-1);
      expect(py).toBe(0);

      // (-1, 0) -> (0, -1)
      [px, py] = perpendicular(-1, 0);
      expect(px).toBeCloseTo(0, 5); // Allow -0 or +0
      expect(py).toBe(-1);

      // (0, -1) -> (1, 0)
      [px, py] = perpendicular(0, -1);
      expect(px).toBe(1);
      expect(py).toBeCloseTo(0, 5); // Allow -0 or +0
    });

    it('should preserve magnitude', () => {
      const [px, py] = perpendicular(3, 4);
      const originalMag = Math.hypot(3, 4);
      const perpendicularMag = Math.hypot(px, py);
      expect(perpendicularMag).toBeCloseTo(originalMag, 5);
    });

    it('should create perpendicular vectors (dot product = 0)', () => {
      const vx = 3,
        vy = 4;
      const [px, py] = perpendicular(vx, vy);
      const dotProduct = vx * px + vy * py;
      expect(dotProduct).toBeCloseTo(0, 5);
    });

    it('should handle arbitrary vectors', () => {
      const [px, py] = perpendicular(5, 7);
      expect(px).toBe(-7);
      expect(py).toBe(5);
    });

    it('should handle negative vectors', () => {
      const [px, py] = perpendicular(-3, -4);
      expect(px).toBe(4);
      expect(py).toBe(-3);
    });

    it('should handle zero vector', () => {
      const [px, py] = perpendicular(0, 0);
      expect(px).toBeCloseTo(0, 5); // Allow -0 or +0
      expect(py).toBeCloseTo(0, 5); // Allow -0 or +0
    });

    it('should be reversible (apply twice for 180° rotation)', () => {
      const vx = 3,
        vy = 4;
      const [px1, py1] = perpendicular(vx, vy);
      const [px2, py2] = perpendicular(px1, py1);
      expect(px2).toBeCloseTo(-vx, 5);
      expect(py2).toBeCloseTo(-vy, 5);
    });

    it('should create perpendicular to diagonal vectors', () => {
      const [px, py] = perpendicular(1, 1);
      expect(px).toBe(-1);
      expect(py).toBe(1);
      // Verify perpendicular: dot product should be 0
      expect(1 * px + 1 * py).toBe(0);
    });
  });

  describe('integration - combining utilities', () => {
    it('should check if points are within rect created from two points', () => {
      const a: Point = { x: 10, y: 20 };
      const b: Point = { x: 50, y: 60 };
      const rect = rectFromPoints(a, b);

      expect(withinRect({ x: 30, y: 40 }, rect)).toBe(true);
      expect(withinRect({ x: 5, y: 15 }, rect)).toBe(false);
    });

    it('should normalize and compute perpendicular', () => {
      const [nx, ny] = normalize(3, 4);
      const [px, py] = perpendicular(nx, ny);

      // Should be perpendicular
      expect(nx * px + ny * py).toBeCloseTo(0, 5);

      // Should still be unit length
      expect(Math.hypot(px, py)).toBeCloseTo(1, 5);
    });

    it('should use clamped values in rect calculations', () => {
      const x = clamp(150, 0, 100);
      const y = clamp(-10, 0, 100);
      const rect: Rect = { x, y, w: 50, h: 50 };

      expect(rect.x).toBe(100);
      expect(rect.y).toBe(0);
    });
  });
});
