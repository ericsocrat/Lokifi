import { describe, expect, it } from 'vitest';
import { align, distribute } from '../../../src/lib/utils/alignment';
import type { Drawing } from '../../../src/lib/utils/drawings';

// Helper to create mock drawing objects with points
function mockDrawing(id: string, points: Array<{ x: number; y: number }>): Drawing {
  return {
    id,
    kind: 'trendline' as const,
    points,
  };
}

describe('alignment utilities', () => {
  describe('align', () => {
    describe('left alignment', () => {
      it('should align selected drawings to leftmost edge', () => {
        const drawings: Drawing[] = [
          mockDrawing('d1', [
            { x: 10, y: 20 },
            { x: 30, y: 40 },
          ]),
          mockDrawing('d2', [
            { x: 50, y: 20 },
            { x: 70, y: 40 },
          ]),
          mockDrawing('d3', [
            { x: 100, y: 20 },
            { x: 120, y: 40 },
          ]),
        ];
        const ids = new Set(['d1', 'd2', 'd3']);

        const result = align(drawings, ids, 'left');

        // All should align to leftmost x=10
        expect(Math.min(...result[0].points.map((p) => p.x))).toBe(10); // d1 stays
        expect(Math.min(...result[1].points.map((p) => p.x))).toBe(10); // d2 moved left
        expect(Math.min(...result[2].points.map((p) => p.x))).toBe(10); // d3 moved left
      });

      it('should not modify unselected drawings', () => {
        const drawings: Drawing[] = [
          mockDrawing('d1', [{ x: 10, y: 20 }]),
          mockDrawing('d2', [{ x: 50, y: 20 }]),
          mockDrawing('d3', [{ x: 100, y: 20 }]),
        ];
        const ids = new Set(['d1', 'd2']); // d3 not selected

        const result = align(drawings, ids, 'left');

        // d3 should remain unchanged
        expect(result[2]).toEqual(drawings[2]);
      });

      it('should return unchanged drawings when less than 2 selected', () => {
        const drawings: Drawing[] = [
          mockDrawing('d1', [{ x: 10, y: 20 }]),
          mockDrawing('d2', [{ x: 50, y: 20 }]),
        ];
        const ids = new Set(['d1']); // Only 1 selected

        const result = align(drawings, ids, 'left');

        expect(result).toEqual(drawings);
      });

      it('should handle single-point drawings', () => {
        const drawings: Drawing[] = [
          mockDrawing('d1', [{ x: 10, y: 20 }]),
          mockDrawing('d2', [{ x: 50, y: 30 }]),
        ];
        const ids = new Set(['d1', 'd2']);

        const result = align(drawings, ids, 'left');

        expect(result[0].points[0].x).toBe(10);
        expect(result[1].points[0].x).toBe(10); // Moved from 50 to 10
      });
    });

    describe('right alignment', () => {
      it('should align selected drawings to rightmost edge', () => {
        const drawings: Drawing[] = [
          mockDrawing('d1', [
            { x: 10, y: 20 },
            { x: 30, y: 40 },
          ]),
          mockDrawing('d2', [
            { x: 50, y: 20 },
            { x: 70, y: 40 },
          ]),
          mockDrawing('d3', [
            { x: 100, y: 20 },
            { x: 120, y: 40 },
          ]),
        ];
        const ids = new Set(['d1', 'd2', 'd3']);

        const result = align(drawings, ids, 'right');

        // All should align to rightmost x=120
        expect(Math.max(...result[0].points.map((p) => p.x))).toBe(120); // d1 moved right
        expect(Math.max(...result[1].points.map((p) => p.x))).toBe(120); // d2 moved right
        expect(Math.max(...result[2].points.map((p) => p.x))).toBe(120); // d3 stays
      });

      it('should preserve y coordinates when aligning right', () => {
        const drawings: Drawing[] = [
          mockDrawing('d1', [
            { x: 10, y: 100 },
            { x: 30, y: 200 },
          ]),
          mockDrawing('d2', [
            { x: 50, y: 300 },
            { x: 70, y: 400 },
          ]),
        ];
        const ids = new Set(['d1', 'd2']);

        const result = align(drawings, ids, 'right');

        // Y coordinates unchanged
        expect(result[0].points[0].y).toBe(100);
        expect(result[0].points[1].y).toBe(200);
        expect(result[1].points[0].y).toBe(300);
        expect(result[1].points[1].y).toBe(400);
      });
    });

    describe('top alignment', () => {
      it('should align selected drawings to topmost edge', () => {
        const drawings: Drawing[] = [
          mockDrawing('d1', [
            { x: 20, y: 10 },
            { x: 40, y: 30 },
          ]),
          mockDrawing('d2', [
            { x: 20, y: 50 },
            { x: 40, y: 70 },
          ]),
          mockDrawing('d3', [
            { x: 20, y: 100 },
            { x: 40, y: 120 },
          ]),
        ];
        const ids = new Set(['d1', 'd2', 'd3']);

        const result = align(drawings, ids, 'top');

        // All should align to topmost y=10
        expect(Math.min(...result[0].points.map((p) => p.y))).toBe(10); // d1 stays
        expect(Math.min(...result[1].points.map((p) => p.y))).toBe(10); // d2 moved up
        expect(Math.min(...result[2].points.map((p) => p.y))).toBe(10); // d3 moved up
      });

      it('should preserve x coordinates when aligning top', () => {
        const drawings: Drawing[] = [
          mockDrawing('d1', [
            { x: 100, y: 10 },
            { x: 200, y: 30 },
          ]),
          mockDrawing('d2', [
            { x: 300, y: 50 },
            { x: 400, y: 70 },
          ]),
        ];
        const ids = new Set(['d1', 'd2']);

        const result = align(drawings, ids, 'top');

        // X coordinates unchanged
        expect(result[0].points[0].x).toBe(100);
        expect(result[0].points[1].x).toBe(200);
        expect(result[1].points[0].x).toBe(300);
        expect(result[1].points[1].x).toBe(400);
      });
    });

    describe('bottom alignment', () => {
      it('should align selected drawings to bottommost edge', () => {
        const drawings: Drawing[] = [
          mockDrawing('d1', [
            { x: 20, y: 10 },
            { x: 40, y: 30 },
          ]),
          mockDrawing('d2', [
            { x: 20, y: 50 },
            { x: 40, y: 70 },
          ]),
          mockDrawing('d3', [
            { x: 20, y: 100 },
            { x: 40, y: 120 },
          ]),
        ];
        const ids = new Set(['d1', 'd2', 'd3']);

        const result = align(drawings, ids, 'bottom');

        // All should align to bottommost y=120
        expect(Math.max(...result[0].points.map((p) => p.y))).toBe(120); // d1 moved down
        expect(Math.max(...result[1].points.map((p) => p.y))).toBe(120); // d2 moved down
        expect(Math.max(...result[2].points.map((p) => p.y))).toBe(120); // d3 stays
      });

      it('should handle negative coordinates', () => {
        const drawings: Drawing[] = [
          mockDrawing('d1', [
            { x: 0, y: -10 },
            { x: 10, y: 0 },
          ]),
          mockDrawing('d2', [
            { x: 0, y: -50 },
            { x: 10, y: -40 },
          ]),
        ];
        const ids = new Set(['d1', 'd2']);

        const result = align(drawings, ids, 'bottom');

        // Both align to y=0 (bottommost)
        expect(Math.max(...result[0].points.map((p) => p.y))).toBe(0);
        expect(Math.max(...result[1].points.map((p) => p.y))).toBe(0);
      });
    });

    describe('multi-point drawings', () => {
      it('should handle drawings with many points', () => {
        const drawings: Drawing[] = [
          mockDrawing('d1', [
            { x: 10, y: 10 },
            { x: 20, y: 20 },
            { x: 30, y: 30 },
            { x: 40, y: 40 },
          ]),
          mockDrawing('d2', [
            { x: 50, y: 10 },
            { x: 60, y: 20 },
            { x: 70, y: 30 },
            { x: 80, y: 40 },
          ]),
        ];
        const ids = new Set(['d1', 'd2']);

        const result = align(drawings, ids, 'left');

        // All points in both drawings shifted
        expect(result[0].points[0].x).toBe(10); // Was 10, stays 10
        expect(result[1].points[0].x).toBe(10); // Was 50, moves to 10
        expect(result[1].points.length).toBe(4); // All points preserved
      });

      it('should maintain point order', () => {
        const drawings: Drawing[] = [
          mockDrawing('d1', [
            { x: 10, y: 20 },
            { x: 30, y: 40 },
          ]),
          mockDrawing('d2', [
            { x: 50, y: 60 },
            { x: 70, y: 80 },
          ]),
        ];
        const ids = new Set(['d1', 'd2']);

        const result = align(drawings, ids, 'left');

        // Point order preserved
        expect(result[1].points[0].y).toBe(60);
        expect(result[1].points[1].y).toBe(80);
      });
    });

    describe('edge cases', () => {
      it('should return unchanged when no ids selected', () => {
        const drawings: Drawing[] = [
          mockDrawing('d1', [{ x: 10, y: 20 }]),
          mockDrawing('d2', [{ x: 50, y: 20 }]),
        ];
        const ids = new Set<string>();

        const result = align(drawings, ids, 'left');

        expect(result).toEqual(drawings);
      });

      it('should return unchanged when empty drawings array', () => {
        const drawings: Drawing[] = [];
        const ids = new Set(['d1', 'd2']);

        const result = align(drawings, ids, 'left');

        expect(result).toEqual([]);
      });

      it('should handle drawings already aligned', () => {
        const drawings: Drawing[] = [
          mockDrawing('d1', [
            { x: 10, y: 20 },
            { x: 30, y: 40 },
          ]),
          mockDrawing('d2', [
            { x: 10, y: 60 },
            { x: 30, y: 80 },
          ]),
        ];
        const ids = new Set(['d1', 'd2']);

        const result = align(drawings, ids, 'left');

        // Already aligned, no change
        expect(result[0].points[0].x).toBe(10);
        expect(result[1].points[0].x).toBe(10);
      });
    });
  });

  describe('distribute', () => {
    describe('horizontal distribution', () => {
      it('should evenly distribute 3 drawings horizontally', () => {
        const drawings: Drawing[] = [
          mockDrawing('d1', [
            { x: 0, y: 0 },
            { x: 10, y: 10 },
          ]),
          mockDrawing('d2', [
            { x: 20, y: 0 },
            { x: 30, y: 10 },
          ]),
          mockDrawing('d3', [
            { x: 100, y: 0 },
            { x: 110, y: 10 },
          ]),
        ];
        const ids = new Set(['d1', 'd2', 'd3']);

        const result = distribute(drawings, ids, 'h');

        // d1 at 0, d3 at 100, gap should be 50
        // d2 should be at 50
        const minX2 = Math.min(...result[1].points.map((p) => p.x));
        expect(minX2).toBeCloseTo(50, 5);
      });

      it('should preserve y coordinates when distributing horizontally', () => {
        const drawings: Drawing[] = [
          mockDrawing('d1', [{ x: 0, y: 100 }]),
          mockDrawing('d2', [{ x: 20, y: 200 }]),
          mockDrawing('d3', [{ x: 100, y: 300 }]),
        ];
        const ids = new Set(['d1', 'd2', 'd3']);

        const result = distribute(drawings, ids, 'h');

        // Y unchanged
        expect(result[0].points[0].y).toBe(100);
        expect(result[1].points[0].y).toBe(200);
        expect(result[2].points[0].y).toBe(300);
      });

      it('should not modify unselected drawings', () => {
        const drawings: Drawing[] = [
          mockDrawing('d1', [{ x: 0, y: 0 }]),
          mockDrawing('d2', [{ x: 20, y: 0 }]),
          mockDrawing('d3', [{ x: 100, y: 0 }]),
          mockDrawing('d4', [{ x: 500, y: 500 }]),
        ];
        const ids = new Set(['d1', 'd2', 'd3']); // d4 not selected

        const result = distribute(drawings, ids, 'h');

        // d4 unchanged
        expect(result[3]).toEqual(drawings[3]);
      });

      it('should return unchanged when less than 3 selected', () => {
        const drawings: Drawing[] = [
          mockDrawing('d1', [{ x: 0, y: 0 }]),
          mockDrawing('d2', [{ x: 100, y: 0 }]),
        ];
        const ids = new Set(['d1', 'd2']); // Only 2 selected

        const result = distribute(drawings, ids, 'h');

        expect(result).toEqual(drawings);
      });

      it('should handle 4 drawings evenly spaced', () => {
        const drawings: Drawing[] = [
          mockDrawing('d1', [{ x: 0, y: 0 }]),
          mockDrawing('d2', [{ x: 10, y: 0 }]),
          mockDrawing('d3', [{ x: 20, y: 0 }]),
          mockDrawing('d4', [{ x: 90, y: 0 }]),
        ];
        const ids = new Set(['d1', 'd2', 'd3', 'd4']);

        const result = distribute(drawings, ids, 'h');

        // Span from 0 to 90 = 90, gap = 30
        // d1=0, d2=30, d3=60, d4=90
        expect(Math.min(...result[0].points.map((p) => p.x))).toBeCloseTo(0, 5);
        expect(Math.min(...result[1].points.map((p) => p.x))).toBeCloseTo(30, 5);
        expect(Math.min(...result[2].points.map((p) => p.x))).toBeCloseTo(60, 5);
        expect(Math.min(...result[3].points.map((p) => p.x))).toBeCloseTo(90, 5);
      });

      it('should sort by minX before distributing', () => {
        // Out of order
        const drawings: Drawing[] = [
          mockDrawing('d3', [{ x: 100, y: 0 }]),
          mockDrawing('d1', [{ x: 0, y: 0 }]),
          mockDrawing('d2', [{ x: 50, y: 0 }]),
        ];
        const ids = new Set(['d1', 'd2', 'd3']);

        const result = distribute(drawings, ids, 'h');

        // Should distribute based on sorted order, not array order
        // d1 at 0, d3 at 100, gap = 50, d2 should be at 50
        const d2Result = result.find((d) => d.id === 'd2');
        expect(Math.min(...d2Result!.points.map((p) => p.x))).toBeCloseTo(50, 5);
      });
    });

    describe('vertical distribution', () => {
      it('should evenly distribute 3 drawings vertically', () => {
        const drawings: Drawing[] = [
          mockDrawing('d1', [
            { x: 0, y: 0 },
            { x: 10, y: 10 },
          ]),
          mockDrawing('d2', [
            { x: 0, y: 20 },
            { x: 10, y: 30 },
          ]),
          mockDrawing('d3', [
            { x: 0, y: 100 },
            { x: 10, y: 110 },
          ]),
        ];
        const ids = new Set(['d1', 'd2', 'd3']);

        const result = distribute(drawings, ids, 'v');

        // d1 at 0, d3 at 100, gap should be 50
        // d2 should be at 50
        const minY2 = Math.min(...result[1].points.map((p) => p.y));
        expect(minY2).toBeCloseTo(50, 5);
      });

      it('should preserve x coordinates when distributing vertically', () => {
        const drawings: Drawing[] = [
          mockDrawing('d1', [{ x: 100, y: 0 }]),
          mockDrawing('d2', [{ x: 200, y: 20 }]),
          mockDrawing('d3', [{ x: 300, y: 100 }]),
        ];
        const ids = new Set(['d1', 'd2', 'd3']);

        const result = distribute(drawings, ids, 'v');

        // X unchanged
        expect(result[0].points[0].x).toBe(100);
        expect(result[1].points[0].x).toBe(200);
        expect(result[2].points[0].x).toBe(300);
      });

      it('should handle 5 drawings', () => {
        const drawings: Drawing[] = [
          mockDrawing('d1', [{ x: 0, y: 0 }]),
          mockDrawing('d2', [{ x: 0, y: 10 }]),
          mockDrawing('d3', [{ x: 0, y: 20 }]),
          mockDrawing('d4', [{ x: 0, y: 30 }]),
          mockDrawing('d5', [{ x: 0, y: 100 }]),
        ];
        const ids = new Set(['d1', 'd2', 'd3', 'd4', 'd5']);

        const result = distribute(drawings, ids, 'v');

        // Span from 0 to 100 = 100, gap = 25
        // d1=0, d2=25, d3=50, d4=75, d5=100
        expect(Math.min(...result[0].points.map((p) => p.y))).toBeCloseTo(0, 5);
        expect(Math.min(...result[1].points.map((p) => p.y))).toBeCloseTo(25, 5);
        expect(Math.min(...result[2].points.map((p) => p.y))).toBeCloseTo(50, 5);
        expect(Math.min(...result[3].points.map((p) => p.y))).toBeCloseTo(75, 5);
        expect(Math.min(...result[4].points.map((p) => p.y))).toBeCloseTo(100, 5);
      });

      it('should sort by minY before distributing', () => {
        // Out of order
        const drawings: Drawing[] = [
          mockDrawing('d3', [{ x: 0, y: 100 }]),
          mockDrawing('d1', [{ x: 0, y: 0 }]),
          mockDrawing('d2', [{ x: 0, y: 50 }]),
        ];
        const ids = new Set(['d1', 'd2', 'd3']);

        const result = distribute(drawings, ids, 'v');

        // Should distribute based on sorted order
        const d2Result = result.find((d) => d.id === 'd2');
        expect(Math.min(...d2Result!.points.map((p) => p.y))).toBeCloseTo(50, 5);
      });

      it('should handle negative coordinates', () => {
        const drawings: Drawing[] = [
          mockDrawing('d1', [{ x: 0, y: -100 }]),
          mockDrawing('d2', [{ x: 0, y: 0 }]),
          mockDrawing('d3', [{ x: 0, y: 100 }]),
        ];
        const ids = new Set(['d1', 'd2', 'd3']);

        const result = distribute(drawings, ids, 'v');

        // Span from -100 to 100 = 200, gap = 100
        expect(Math.min(...result[0].points.map((p) => p.y))).toBeCloseTo(-100, 5);
        expect(Math.min(...result[1].points.map((p) => p.y))).toBeCloseTo(0, 5);
        expect(Math.min(...result[2].points.map((p) => p.y))).toBeCloseTo(100, 5);
      });
    });

    describe('edge cases', () => {
      it('should return unchanged when less than 3 selected', () => {
        const drawings: Drawing[] = [
          mockDrawing('d1', [{ x: 0, y: 0 }]),
          mockDrawing('d2', [{ x: 100, y: 0 }]),
        ];
        const ids = new Set(['d1', 'd2']);

        const result = distribute(drawings, ids, 'h');

        expect(result).toEqual(drawings);
      });

      it('should return unchanged when no ids selected', () => {
        const drawings: Drawing[] = [
          mockDrawing('d1', [{ x: 0, y: 0 }]),
          mockDrawing('d2', [{ x: 50, y: 0 }]),
          mockDrawing('d3', [{ x: 100, y: 0 }]),
        ];
        const ids = new Set<string>();

        const result = distribute(drawings, ids, 'h');

        expect(result).toEqual(drawings);
      });

      it('should return unchanged when empty drawings array', () => {
        const drawings: Drawing[] = [];
        const ids = new Set(['d1', 'd2', 'd3']);

        const result = distribute(drawings, ids, 'h');

        expect(result).toEqual([]);
      });

      it('should handle multi-point drawings', () => {
        const drawings: Drawing[] = [
          mockDrawing('d1', [
            { x: 0, y: 0 },
            { x: 10, y: 10 },
            { x: 20, y: 20 },
          ]),
          mockDrawing('d2', [
            { x: 30, y: 0 },
            { x: 40, y: 10 },
          ]),
          mockDrawing('d3', [
            { x: 100, y: 0 },
            { x: 110, y: 10 },
          ]),
        ];
        const ids = new Set(['d1', 'd2', 'd3']);

        const result = distribute(drawings, ids, 'h');

        // All points moved together
        expect(result[0].points.length).toBe(3);
        expect(result[1].points.length).toBe(2);
      });

      it('should handle drawings already evenly distributed', () => {
        const drawings: Drawing[] = [
          mockDrawing('d1', [{ x: 0, y: 0 }]),
          mockDrawing('d2', [{ x: 50, y: 0 }]),
          mockDrawing('d3', [{ x: 100, y: 0 }]),
        ];
        const ids = new Set(['d1', 'd2', 'd3']);

        const result = distribute(drawings, ids, 'h');

        // Already evenly spaced - no change
        expect(Math.min(...result[0].points.map((p) => p.x))).toBeCloseTo(0, 5);
        expect(Math.min(...result[1].points.map((p) => p.x))).toBeCloseTo(50, 5);
        expect(Math.min(...result[2].points.map((p) => p.x))).toBeCloseTo(100, 5);
      });
    });
  });

  describe('integration - combined operations', () => {
    it('should align then distribute correctly', () => {
      let drawings: Drawing[] = [
        mockDrawing('d1', [
          { x: 10, y: 0 },
          { x: 20, y: 10 },
        ]),
        mockDrawing('d2', [
          { x: 50, y: 0 },
          { x: 60, y: 10 },
        ]),
        mockDrawing('d3', [
          { x: 100, y: 0 },
          { x: 110, y: 10 },
        ]),
      ];
      const ids = new Set(['d1', 'd2', 'd3']);

      // First align top
      drawings = align(drawings, ids, 'top');

      // Then distribute horizontally
      drawings = distribute(drawings, ids, 'h');

      // Should have aligned tops and even horizontal spacing
      expect(Math.min(...drawings[0].points.map((p) => p.y))).toBe(0);
      expect(Math.min(...drawings[1].points.map((p) => p.y))).toBe(0);
      expect(Math.min(...drawings[2].points.map((p) => p.y))).toBe(0);
    });

    it('should work with partial selection', () => {
      const drawings: Drawing[] = [
        mockDrawing('d1', [{ x: 0, y: 0 }]),
        mockDrawing('d2', [{ x: 50, y: 0 }]),
        mockDrawing('d3', [{ x: 100, y: 0 }]),
        mockDrawing('d4', [{ x: 200, y: 200 }]), // Not selected
      ];
      const ids = new Set(['d1', 'd2', 'd3']);

      const result = distribute(drawings, ids, 'h');

      // d4 stays at original position
      expect(result[3].points[0].x).toBe(200);
      expect(result[3].points[0].y).toBe(200);
    });
  });
});
