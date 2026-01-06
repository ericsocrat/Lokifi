import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  describeDrawing,
  DEFAULT_LABEL_CONFIG,
  SUPPORTED_DRAWING_KINDS,
  type LabelConfig,
  type LabelResult,
} from '@/lib/utils/labels';
import type { Drawing } from '@/lib/utils/drawings';

// Mock the chartMap module
vi.mock('@/lib/charts/chartMap', () => ({
  yToPrice: (y: number): number | null => {
    // Mock: y=0 -> price=100, y=100 -> price=0
    if (y < 0 || y > 100) return null;
    return 100 - y;
  },
}));

// Mock the geom module
vi.mock('@/lib/utils/geom', () => ({
  rectFromPoints: (p0: { x: number; y: number }, p1: { x: number; y: number }) => {
    const x = Math.min(p0.x, p1.x);
    const y = Math.min(p0.y, p1.y);
    const w = Math.abs(p1.x - p0.x);
    const h = Math.abs(p1.y - p0.y);
    return { x, y, w, h };
  },
}));

// Helper to create test drawings
const createDrawing = (
  kind: string,
  points: Array<{ x: number; y: number }>
): Drawing => ({
  id: 'test-drawing',
  kind: kind as Drawing['kind'],
  points,
  style: { color: '#000000' },
  locked: false,
  visible: true,
});

describe('labels', () => {
  describe('DEFAULT_LABEL_CONFIG', () => {
    it('should have all labels enabled by default', () => {
      expect(DEFAULT_LABEL_CONFIG).toEqual({
        showValue: true,
        showPercent: true,
        showAngle: true,
        showRR: true,
      });
    });
  });

  describe('SUPPORTED_DRAWING_KINDS', () => {
    it('should include all supported drawing types', () => {
      expect(SUPPORTED_DRAWING_KINDS).toContain('hline');
      expect(SUPPORTED_DRAWING_KINDS).toContain('vline');
      expect(SUPPORTED_DRAWING_KINDS).toContain('trendline');
      expect(SUPPORTED_DRAWING_KINDS).toContain('ray');
      expect(SUPPORTED_DRAWING_KINDS).toContain('arrow');
      expect(SUPPORTED_DRAWING_KINDS).toContain('rect');
      expect(SUPPORTED_DRAWING_KINDS).toContain('ruler');
    });
  });

  describe('describeDrawing', () => {
    describe('hline (horizontal line)', () => {
      it('should generate price label for hline', () => {
        const drawing = createDrawing('hline', [{ x: 100, y: 25 }]);
        const cfg: LabelConfig = { ...DEFAULT_LABEL_CONFIG };

        const result = describeDrawing(drawing, cfg);

        expect(result).not.toBeNull();
        expect(result!.text).toBe('@ 75.00');
        expect(result!.anchor).toEqual({ x: 100, y: 25 });
      });

      it('should return null when showValue is false', () => {
        const drawing = createDrawing('hline', [{ x: 100, y: 25 }]);
        const cfg: LabelConfig = { ...DEFAULT_LABEL_CONFIG, showValue: false };

        const result = describeDrawing(drawing, cfg);

        expect(result).toBeNull();
      });

      it('should return null for out-of-range price', () => {
        const drawing = createDrawing('hline', [{ x: 100, y: 150 }]); // y > 100 returns null
        const cfg: LabelConfig = { ...DEFAULT_LABEL_CONFIG };

        const result = describeDrawing(drawing, cfg);

        expect(result).toBeNull();
      });
    });

    describe('vline (vertical line)', () => {
      it('should return null for vline (no meaningful price label)', () => {
        const drawing = createDrawing('vline', [{ x: 50, y: 50 }]);
        const cfg: LabelConfig = { ...DEFAULT_LABEL_CONFIG };

        const result = describeDrawing(drawing, cfg);

        expect(result).toBeNull();
      });
    });

    describe('trendline', () => {
      it('should generate delta and percent labels for trendline', () => {
        const drawing = createDrawing('trendline', [
          { x: 0, y: 50 }, // price = 50
          { x: 100, y: 25 }, // price = 75
        ]);
        const cfg: LabelConfig = { ...DEFAULT_LABEL_CONFIG, showAngle: false };

        const result = describeDrawing(drawing, cfg);

        expect(result).not.toBeNull();
        expect(result!.text).toContain('Δ 25.00');
        expect(result!.text).toContain('+50.00%');
        expect(result!.anchor).toEqual({ x: 100, y: 25 });
      });

      it('should include angle when showAngle is true', () => {
        const drawing = createDrawing('trendline', [
          { x: 0, y: 50 },
          { x: 100, y: 50 },
        ]);
        const cfg: LabelConfig = { ...DEFAULT_LABEL_CONFIG };

        const result = describeDrawing(drawing, cfg);

        expect(result).not.toBeNull();
        expect(result!.text).toContain('°');
      });

      it('should handle negative price change', () => {
        const drawing = createDrawing('trendline', [
          { x: 0, y: 25 }, // price = 75
          { x: 100, y: 50 }, // price = 50
        ]);
        const cfg: LabelConfig = { ...DEFAULT_LABEL_CONFIG, showAngle: false };

        const result = describeDrawing(drawing, cfg);

        expect(result).not.toBeNull();
        expect(result!.text).toContain('Δ -25.00');
      });
    });

    describe('ray', () => {
      it('should generate labels for ray (same as trendline)', () => {
        const drawing = createDrawing('ray', [
          { x: 0, y: 50 },
          { x: 100, y: 25 },
        ]);
        const cfg: LabelConfig = { ...DEFAULT_LABEL_CONFIG, showAngle: false };

        const result = describeDrawing(drawing, cfg);

        expect(result).not.toBeNull();
        expect(result!.text).toContain('Δ');
      });
    });

    describe('arrow', () => {
      it('should generate labels for arrow (same as trendline)', () => {
        const drawing = createDrawing('arrow', [
          { x: 0, y: 50 },
          { x: 100, y: 25 },
        ]);
        const cfg: LabelConfig = { ...DEFAULT_LABEL_CONFIG, showAngle: false };

        const result = describeDrawing(drawing, cfg);

        expect(result).not.toBeNull();
        expect(result!.text).toContain('Δ');
      });
    });

    describe('rect (rectangle)', () => {
      it('should generate height and R:R labels for rect', () => {
        const drawing = createDrawing('rect', [
          { x: 0, y: 25 }, // price = 75
          { x: 100, y: 75 }, // price = 25
        ]);
        const cfg: LabelConfig = { ...DEFAULT_LABEL_CONFIG };

        const result = describeDrawing(drawing, cfg);

        expect(result).not.toBeNull();
        expect(result!.text).toContain('Δ 50.00');
        expect(result!.text).toContain('R:R');
      });

      it('should have anchor at center of rectangle', () => {
        const drawing = createDrawing('rect', [
          { x: 0, y: 0 },
          { x: 100, y: 100 },
        ]);
        const cfg: LabelConfig = { ...DEFAULT_LABEL_CONFIG };

        const result = describeDrawing(drawing, cfg);

        expect(result).not.toBeNull();
        expect(result!.anchor.x).toBe(50);
        expect(result!.anchor.y).toBe(50);
      });

      it('should show percent when enabled', () => {
        const drawing = createDrawing('rect', [
          { x: 0, y: 25 },
          { x: 100, y: 75 },
        ]);
        const cfg: LabelConfig = { ...DEFAULT_LABEL_CONFIG };

        const result = describeDrawing(drawing, cfg);

        expect(result).not.toBeNull();
        expect(result!.text).toContain('%');
      });
    });

    describe('ruler', () => {
      it('should generate delta and percent labels for ruler', () => {
        const drawing = createDrawing('ruler', [
          { x: 0, y: 50 },
          { x: 100, y: 25 },
        ]);
        const cfg: LabelConfig = { ...DEFAULT_LABEL_CONFIG };

        const result = describeDrawing(drawing, cfg);

        expect(result).not.toBeNull();
        expect(result!.text).toContain('Δ 25.00');
        expect(result!.text).toContain('+50.00%');
      });

      it('should return null when neither showValue nor showPercent', () => {
        const drawing = createDrawing('ruler', [
          { x: 0, y: 50 },
          { x: 100, y: 25 },
        ]);
        const cfg: LabelConfig = {
          showValue: false,
          showPercent: false,
          showAngle: false,
          showRR: false,
        };

        const result = describeDrawing(drawing, cfg);

        expect(result).toBeNull();
      });
    });

    describe('unsupported drawing kinds', () => {
      it('should return null for unsupported drawing kind', () => {
        const drawing = createDrawing('fib', [
          { x: 0, y: 0 },
          { x: 100, y: 100 },
        ]);
        const cfg: LabelConfig = { ...DEFAULT_LABEL_CONFIG };

        const result = describeDrawing(drawing, cfg);

        expect(result).toBeNull();
      });
    });

    describe('error handling', () => {
      it('should return null when handler throws', () => {
        // Create a malformed drawing that might cause issues
        const drawing = {
          id: 'bad',
          kind: 'hline' as const,
          points: [], // Empty points array
          style: { color: '#000' },
          locked: false,
          visible: true,
        };
        const cfg: LabelConfig = { ...DEFAULT_LABEL_CONFIG };

        // Should not throw, should return null
        const result = describeDrawing(drawing as Drawing, cfg);

        expect(result).toBeNull();
      });
    });
  });

  describe('label configuration combinations', () => {
    it('should only show value when other labels disabled', () => {
      const drawing = createDrawing('trendline', [
        { x: 0, y: 50 },
        { x: 100, y: 25 },
      ]);
      const cfg: LabelConfig = {
        showValue: true,
        showPercent: false,
        showAngle: false,
        showRR: false,
      };

      const result = describeDrawing(drawing, cfg);

      expect(result).not.toBeNull();
      expect(result!.text).toBe('Δ 25.00');
    });

    it('should only show percent when other labels disabled', () => {
      const drawing = createDrawing('trendline', [
        { x: 0, y: 50 },
        { x: 100, y: 25 },
      ]);
      const cfg: LabelConfig = {
        showValue: false,
        showPercent: true,
        showAngle: false,
        showRR: false,
      };

      const result = describeDrawing(drawing, cfg);

      expect(result).not.toBeNull();
      expect(result!.text).toContain('%');
    });

    it('should only show angle when other labels disabled', () => {
      const drawing = createDrawing('trendline', [
        { x: 0, y: 50 },
        { x: 100, y: 50 },
      ]);
      const cfg: LabelConfig = {
        showValue: false,
        showPercent: false,
        showAngle: true,
        showRR: false,
      };

      const result = describeDrawing(drawing, cfg);

      expect(result).not.toBeNull();
      expect(result!.text).toContain('°');
    });
  });
});
