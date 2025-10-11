/**
 * Type safety tests for drawing type definitions
 * Ensures our type system is working correctly
 */

import type {
    ArrowDrawing,
    Drawing,
    DrawingStyle,
    FibDrawing,
    GroupDrawing,
    Point,
    RectDrawing,
    TextDrawing,
    TrendlineDrawing,
} from '@/types/drawings';
import { describe, expect, it } from '@jest/globals';

describe('Drawing Type Definitions', () => {
  describe('Point type', () => {
    it('should accept valid point objects', () => {
      const point: Point = { x: 100, y: 200 };
      expect(point.x).toBe(100);
      expect(point.y).toBe(200);
    });
  });

  describe('DrawingStyle type', () => {
    it('should accept valid style objects', () => {
      const style: DrawingStyle = {
        stroke: '#ffffff',
        strokeWidth: 2,
        dash: 'solid',
        opacity: 0.8,
        fill: '#000000',
      };
      expect(style.stroke).toBe('#ffffff');
      expect(style.strokeWidth).toBe(2);
    });

    it('should accept partial style objects', () => {
      const style: DrawingStyle = {
        stroke: '#ffffff',
      };
      expect(style.stroke).toBe('#ffffff');
    });

    it('should accept dash style variations', () => {
      const styles: DrawingStyle[] = [
        { dash: 'solid' },
        { dash: 'dash' },
        { dash: 'dot' },
        { dash: 'dashdot' },
      ];
      expect(styles).toHaveLength(4);
    });
  });

  describe('TrendlineDrawing type', () => {
    it('should accept valid trendline drawings', () => {
      const drawing: TrendlineDrawing = {
        id: 'test-1',
        kind: 'trendline',
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 100 },
        ],
      };
      expect(drawing.kind).toBe('trendline');
      expect(drawing.points).toHaveLength(2);
    });

    it('should accept optional properties', () => {
      const drawing: TrendlineDrawing = {
        id: 'test-2',
        kind: 'trendline',
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 100 },
        ],
        style: { stroke: '#ff0000' },
        layerId: 'layer-1',
        hidden: false,
        locked: true,
        name: 'My Trendline',
      };
      expect(drawing.style?.stroke).toBe('#ff0000');
      expect(drawing.locked).toBe(true);
    });
  });

  describe('ArrowDrawing type', () => {
    it('should accept valid arrow drawings', () => {
      const drawing: ArrowDrawing = {
        id: 'arrow-1',
        kind: 'arrow',
        points: [
          { x: 50, y: 50 },
          { x: 150, y: 150 },
        ],
      };
      expect(drawing.kind).toBe('arrow');
    });
  });

  describe('RectDrawing type', () => {
    it('should accept valid rectangle drawings', () => {
      const drawing: RectDrawing = {
        id: 'rect-1',
        kind: 'rect',
        points: [
          { x: 10, y: 10 },
          { x: 110, y: 110 },
        ],
      };
      expect(drawing.kind).toBe('rect');
    });
  });

  describe('TextDrawing type', () => {
    it('should accept valid text drawings', () => {
      const drawing: TextDrawing = {
        id: 'text-1',
        kind: 'text',
        points: [{ x: 50, y: 50 }],
        text: 'Hello World',
      };
      expect(drawing.text).toBe('Hello World');
    });

    it('should accept optional fontSize', () => {
      const drawing: TextDrawing = {
        id: 'text-2',
        kind: 'text',
        points: [{ x: 50, y: 50 }],
        text: 'Large Text',
        fontSize: 24,
      };
      expect(drawing.fontSize).toBe(24);
    });
  });

  describe('FibDrawing type', () => {
    it('should accept valid fibonacci drawings', () => {
      const drawing: FibDrawing = {
        id: 'fib-1',
        kind: 'fib',
        points: [
          { x: 0, y: 100 },
          { x: 200, y: 200 },
        ],
      };
      expect(drawing.kind).toBe('fib');
    });

    it('should accept custom levels', () => {
      const drawing: FibDrawing = {
        id: 'fib-2',
        kind: 'fib',
        points: [
          { x: 0, y: 100 },
          { x: 200, y: 200 },
        ],
        levels: [0, 0.236, 0.382, 0.5, 0.618, 1],
      };
      expect(drawing.levels).toHaveLength(6);
    });
  });

  describe('GroupDrawing type', () => {
    it('should accept valid group drawings', () => {
      const child1: TrendlineDrawing = {
        id: 'child-1',
        kind: 'trendline',
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 100 },
        ],
      };

      const group: GroupDrawing = {
        id: 'group-1',
        type: 'group',
        children: [child1],
      };

      expect(group.type).toBe('group');
      expect(group.children).toHaveLength(1);
    });

    it('should accept multiple children of different types', () => {
      const trendline: TrendlineDrawing = {
        id: 'child-1',
        kind: 'trendline',
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 100 },
        ],
      };

      const arrow: ArrowDrawing = {
        id: 'child-2',
        kind: 'arrow',
        points: [
          { x: 50, y: 50 },
          { x: 150, y: 150 },
        ],
      };

      const group: GroupDrawing = {
        id: 'group-1',
        type: 'group',
        children: [trendline, arrow],
      };

      expect(group.children).toHaveLength(2);
    });
  });

  describe('Drawing union type', () => {
    it('should accept any valid drawing type', () => {
      const drawings: Drawing[] = [
        {
          id: '1',
          kind: 'trendline',
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 100 },
          ],
        },
        {
          id: '2',
          kind: 'arrow',
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 100 },
          ],
        },
        {
          id: '3',
          kind: 'rect',
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 100 },
          ],
        },
        {
          id: '4',
          kind: 'text',
          points: [{ x: 50, y: 50 }],
          text: 'Test',
        },
      ];

      expect(drawings).toHaveLength(4);
    });
  });

  describe('Type discrimination', () => {
    it('should allow type narrowing based on kind', () => {
      const drawing: Drawing = {
        id: 'test',
        kind: 'text',
        points: [{ x: 0, y: 0 }],
        text: 'Test Text',
      };

      if (drawing.kind === 'text') {
        // TypeScript should know this is a TextDrawing
        expect(drawing.text).toBe('Test Text');
      }
    });

    it('should allow type narrowing for groups', () => {
      const drawing: Drawing = {
        id: 'test',
        type: 'group',
        children: [],
      };

      if ('type' in drawing && drawing.type === 'group') {
        // TypeScript should know this is a GroupDrawing
        expect(drawing.children).toEqual([]);
      }
    });
  });
});

