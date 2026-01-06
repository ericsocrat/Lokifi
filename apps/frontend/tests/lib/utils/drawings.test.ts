import {
  createDrawing,
  DEFAULT_STYLE,
  drawParallelChannel,
  drawPitchfork,
  updateDrawingGeometry,
  type Drawing,
  type DrawingStyle,
  type Point,
} from '@/lib/utils/drawings';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-id-123'),
}));

describe('drawings utilities', () => {
  describe('DEFAULT_STYLE', () => {
    it('should have correct default stroke color', () => {
      expect(DEFAULT_STYLE.stroke).toBe('#9ca3af');
    });

    it('should have correct default stroke width', () => {
      expect(DEFAULT_STYLE.strokeWidth).toBe(1.75);
    });

    it('should have solid dash by default', () => {
      expect(DEFAULT_STYLE.dash).toBe('solid');
    });

    it('should have full opacity by default', () => {
      expect(DEFAULT_STYLE.opacity).toBe(1);
    });

    it('should have null fill by default', () => {
      expect(DEFAULT_STYLE.fill).toBeNull();
    });
  });

  describe('createDrawing', () => {
    const startPoint: Point = { x: 100, y: 200 };

    describe('two-point drawings', () => {
      const twoPointKinds = ['trendline', 'arrow', 'ray', 'rect', 'ellipse', 'fib', 'ruler'];

      twoPointKinds.forEach((kind) => {
        it(`should create ${kind} drawing with two points`, () => {
          const drawing = createDrawing(kind, startPoint);

          expect(drawing).not.toBeNull();
          expect(drawing!.id).toBe('test-id-123');
          expect(drawing!.kind).toBe(kind);
          expect(drawing!.points).toEqual([startPoint, startPoint]);
          expect(drawing!.style).toEqual(DEFAULT_STYLE);
          expect(drawing!.groupId).toBeNull();
        });
      });
    });

    describe('three-point drawings', () => {
      const threePointKinds = ['pitchfork', 'parallel-channel'];

      threePointKinds.forEach((kind) => {
        it(`should create ${kind} drawing with three points`, () => {
          const drawing = createDrawing(kind, startPoint);

          expect(drawing).not.toBeNull();
          expect(drawing!.kind).toBe(kind);
          expect(drawing!.points).toEqual([startPoint, startPoint, startPoint]);
        });
      });
    });

    describe('single-point drawings', () => {
      it('should create hline drawing with one point', () => {
        const drawing = createDrawing('hline', startPoint);

        expect(drawing).not.toBeNull();
        expect(drawing!.kind).toBe('hline');
        expect(drawing!.points).toEqual([startPoint]);
      });

      it('should create vline drawing with one point', () => {
        const drawing = createDrawing('vline', startPoint);

        expect(drawing).not.toBeNull();
        expect(drawing!.kind).toBe('vline');
        expect(drawing!.points).toEqual([startPoint]);
      });
    });

    describe('text drawing', () => {
      it('should create text drawing with default text', () => {
        const drawing = createDrawing('text', startPoint) as Drawing & { text: string };

        expect(drawing).not.toBeNull();
        expect(drawing.kind).toBe('text');
        expect(drawing.points).toEqual([startPoint]);
        expect(drawing.text).toBe('Text');
      });
    });

    describe('unknown drawing kind', () => {
      it('should return null for unknown drawing kind', () => {
        const drawing = createDrawing('unknown', startPoint);
        expect(drawing).toBeNull();
      });

      it('should return null for empty string kind', () => {
        const drawing = createDrawing('', startPoint);
        expect(drawing).toBeNull();
      });
    });
  });

  describe('updateDrawingGeometry', () => {
    const newPoint: Point = { x: 300, y: 400 };

    describe('two-point drawings', () => {
      it('should update trendline second point', () => {
        const drawing: Drawing = {
          id: '1',
          kind: 'trendline',
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 100 },
          ],
        };
        const updated = updateDrawingGeometry(drawing, newPoint);

        expect(updated.points).toEqual([{ x: 0, y: 0 }, newPoint]);
      });

      it('should update arrow second point', () => {
        const drawing: Drawing = {
          id: '1',
          kind: 'arrow',
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 100 },
          ],
        };
        const updated = updateDrawingGeometry(drawing, newPoint);

        expect(updated.points).toEqual([{ x: 0, y: 0 }, newPoint]);
      });

      it('should update ray second point', () => {
        const drawing: Drawing = {
          id: '1',
          kind: 'ray',
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 100 },
          ],
        };
        const updated = updateDrawingGeometry(drawing, newPoint);

        expect(updated.points).toEqual([{ x: 0, y: 0 }, newPoint]);
      });

      it('should update rect second point', () => {
        const drawing: Drawing = {
          id: '1',
          kind: 'rect',
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 100 },
          ],
        };
        const updated = updateDrawingGeometry(drawing, newPoint);

        expect(updated.points).toEqual([{ x: 0, y: 0 }, newPoint]);
      });

      it('should update ellipse second point', () => {
        const drawing: Drawing = {
          id: '1',
          kind: 'ellipse',
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 100 },
          ],
        };
        const updated = updateDrawingGeometry(drawing, newPoint);

        expect(updated.points).toEqual([{ x: 0, y: 0 }, newPoint]);
      });

      it('should update fib second point', () => {
        const drawing: Drawing = {
          id: '1',
          kind: 'fib',
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 100 },
          ],
        };
        const updated = updateDrawingGeometry(drawing, newPoint);

        expect(updated.points).toEqual([{ x: 0, y: 0 }, newPoint]);
      });

      it('should update ruler second point', () => {
        const drawing: Drawing = {
          id: '1',
          kind: 'ruler',
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 100 },
          ],
        };
        const updated = updateDrawingGeometry(drawing, newPoint);

        expect(updated.points).toEqual([{ x: 0, y: 0 }, newPoint]);
      });
    });

    describe('three-point drawings', () => {
      it('should update pitchfork middle point', () => {
        const drawing: Drawing = {
          id: '1',
          kind: 'pitchfork',
          points: [
            { x: 0, y: 0 },
            { x: 50, y: 50 },
            { x: 100, y: 100 },
          ],
        };
        const updated = updateDrawingGeometry(drawing, newPoint);

        expect(updated.points).toEqual([{ x: 0, y: 0 }, newPoint, { x: 100, y: 100 }]);
      });

      it('should update parallel-channel middle point', () => {
        const drawing: Drawing = {
          id: '1',
          kind: 'parallel-channel',
          points: [
            { x: 0, y: 0 },
            { x: 50, y: 50 },
            { x: 100, y: 100 },
          ],
        };
        const updated = updateDrawingGeometry(drawing, newPoint);

        expect(updated.points).toEqual([{ x: 0, y: 0 }, newPoint, { x: 100, y: 100 }]);
      });
    });

    describe('single-point drawings', () => {
      it('should update hline y coordinate only', () => {
        const drawing: Drawing = {
          id: '1',
          kind: 'hline',
          points: [{ x: 100, y: 200 }],
        };
        const updated = updateDrawingGeometry(drawing, { x: 500, y: 300 });

        // hline should keep original x, update y
        expect(updated.points).toEqual([{ x: 100, y: 300 }]);
      });

      it('should update vline x coordinate only', () => {
        const drawing: Drawing = {
          id: '1',
          kind: 'vline',
          points: [{ x: 100, y: 200 }],
        };
        const updated = updateDrawingGeometry(drawing, { x: 500, y: 300 });

        // vline should update x, keep original y
        expect(updated.points).toEqual([{ x: 500, y: 200 }]);
      });

      it('should update text position', () => {
        const drawing: Drawing = {
          id: '1',
          kind: 'text',
          points: [{ x: 100, y: 200 }],
          text: 'Hello',
        };
        const updated = updateDrawingGeometry(drawing, newPoint);

        expect(updated.points).toEqual([newPoint]);
      });
    });

    describe('group drawing', () => {
      it('should return group unchanged', () => {
        const drawing: Drawing = {
          id: '1',
          kind: 'group',
          type: 'group',
          children: [],
        };
        const updated = updateDrawingGeometry(drawing, newPoint);

        expect(updated).toBe(drawing);
      });
    });

    describe('immutability', () => {
      it('should not mutate original drawing', () => {
        const original: Drawing = {
          id: '1',
          kind: 'trendline',
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 100 },
          ],
        };
        const originalPoints = [...original.points];

        updateDrawingGeometry(original, newPoint);

        expect(original.points).toEqual(originalPoints);
      });
    });
  });

  describe('drawParallelChannel', () => {
    let mockCtx: CanvasRenderingContext2D;

    beforeEach(() => {
      mockCtx = {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        globalAlpha: 1,
        fillStyle: '',
      } as unknown as CanvasRenderingContext2D;
    });

    it('should draw two parallel lines without fill', () => {
      drawParallelChannel(mockCtx, { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 50 }, 800, 600);

      expect(mockCtx.beginPath).toHaveBeenCalledTimes(2);
      expect(mockCtx.stroke).toHaveBeenCalledTimes(2);
      expect(mockCtx.fill).not.toHaveBeenCalled();
    });

    it('should draw with fill when fill color provided', () => {
      drawParallelChannel(
        mockCtx,
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 50 },
        800,
        600,
        '#ff0000'
      );

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
      expect(mockCtx.fillStyle).toBe('#ff0000');
      expect(mockCtx.globalAlpha).toBe(0.18);
    });

    it('should not fill when fill is null', () => {
      drawParallelChannel(
        mockCtx,
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 50 },
        800,
        600,
        null
      );

      expect(mockCtx.fill).not.toHaveBeenCalled();
    });

    it('should handle zero-length line segment', () => {
      // When a and b are the same point
      drawParallelChannel(mockCtx, { x: 50, y: 50 }, { x: 50, y: 50 }, { x: 50, y: 100 }, 800, 600);

      // Should not throw, just draw something
      expect(mockCtx.stroke).toHaveBeenCalledTimes(2);
    });
  });

  describe('drawPitchfork', () => {
    let mockCtx: CanvasRenderingContext2D;

    beforeEach(() => {
      mockCtx = {
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
      } as unknown as CanvasRenderingContext2D;
    });

    it('should draw three lines for pitchfork', () => {
      drawPitchfork(
        mockCtx,
        { x: 50, y: 0 }, // apex
        { x: 0, y: 100 }, // left
        { x: 100, y: 100 }, // right
        800,
        600
      );

      expect(mockCtx.beginPath).toHaveBeenCalledTimes(3);
      expect(mockCtx.stroke).toHaveBeenCalledTimes(3);
    });

    it('should draw from apex through midpoint', () => {
      drawPitchfork(mockCtx, { x: 0, y: 0 }, { x: 100, y: 100 }, { x: 100, y: 100 }, 800, 600);

      // Middle line should be drawn
      expect(mockCtx.moveTo).toHaveBeenCalled();
      expect(mockCtx.lineTo).toHaveBeenCalled();
    });

    it('should handle collinear points', () => {
      // All points on same line
      drawPitchfork(mockCtx, { x: 0, y: 0 }, { x: 100, y: 100 }, { x: 200, y: 200 }, 800, 600);

      // Should not throw
      expect(mockCtx.stroke).toHaveBeenCalledTimes(3);
    });

    it('should handle zero-distance apex to midpoint', () => {
      // When apex is at midpoint of b and c
      drawPitchfork(
        mockCtx,
        { x: 50, y: 50 }, // apex at midpoint
        { x: 0, y: 0 }, // b
        { x: 100, y: 100 }, // c
        800,
        600
      );

      expect(mockCtx.stroke).toHaveBeenCalledTimes(3);
    });
  });

  describe('edge cases', () => {
    it('should handle negative coordinates in createDrawing', () => {
      const drawing = createDrawing('trendline', { x: -100, y: -200 });

      expect(drawing).not.toBeNull();
      expect(drawing!.points[0]).toEqual({ x: -100, y: -200 });
    });

    it('should handle very large coordinates in updateDrawingGeometry', () => {
      const drawing: Drawing = {
        id: '1',
        kind: 'rect',
        points: [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
        ],
      };
      const updated = updateDrawingGeometry(drawing, { x: 1e10, y: 1e10 });

      expect(updated.points[1]).toEqual({ x: 1e10, y: 1e10 });
    });

    it('should preserve style when updating geometry', () => {
      const customStyle: DrawingStyle = {
        stroke: '#ff0000',
        strokeWidth: 5,
        dash: 'dash',
        opacity: 0.5,
        fill: '#00ff00',
      };
      const drawing: Drawing = {
        id: '1',
        kind: 'trendline',
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 100 },
        ],
        style: customStyle,
      };
      const updated = updateDrawingGeometry(drawing, { x: 200, y: 200 });

      expect(updated.style).toEqual(customStyle);
    });

    it('should preserve text content when updating text drawing position', () => {
      const drawing: Drawing = {
        id: '1',
        kind: 'text',
        points: [{ x: 0, y: 0 }],
        text: 'Custom Text',
      };
      const updated = updateDrawingGeometry(drawing, { x: 100, y: 100 }) as Drawing & {
        text: string;
      };

      expect(updated.text).toBe('Custom Text');
    });

    it('should preserve fib levels when updating fib drawing', () => {
      const drawing: Drawing = {
        id: '1',
        kind: 'fib',
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 100 },
        ],
        fibLevels: [0, 0.236, 0.382, 0.5, 0.618, 1],
      };
      const updated = updateDrawingGeometry(drawing, { x: 200, y: 200 }) as Drawing & {
        fibLevels: number[];
      };

      expect(updated.fibLevels).toEqual([0, 0.236, 0.382, 0.5, 0.618, 1]);
    });
  });
});
