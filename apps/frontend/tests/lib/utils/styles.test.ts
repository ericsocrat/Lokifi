import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_STYLE,
  PALETTE,
  applyCtxStyle,
  lineDashFromStyle,
  type DrawingStyle,
  type LineStyleKind,
} from '../../../src/lib/utils/styles';

describe('styles utilities', () => {
  describe('DEFAULT_STYLE', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_STYLE.stroke).toBe('#60a5fa');
      expect(DEFAULT_STYLE.width).toBe(2);
      expect(DEFAULT_STYLE.lineStyle).toBe('solid');
      expect(DEFAULT_STYLE.opacity).toBe(1);
      expect(DEFAULT_STYLE.fill).toBe('transparent');
      expect(DEFAULT_STYLE.fontSize).toBe(12);
    });

    it('should be a valid DrawingStyle object', () => {
      const style: DrawingStyle = DEFAULT_STYLE;
      expect(style).toBeDefined();
      expect(typeof style.stroke).toBe('string');
      expect(typeof style.width).toBe('number');
      expect(typeof style.opacity).toBe('number');
    });
  });

  describe('PALETTE', () => {
    it('should contain 10 colors', () => {
      expect(PALETTE).toHaveLength(10);
    });

    it('should have all hex color codes', () => {
      PALETTE.forEach((color) => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    it('should include blue as first color', () => {
      expect(PALETTE[0]).toBe('#60a5fa');
    });

    it('should include green', () => {
      expect(PALETTE).toContain('#22c55e');
    });

    it('should include amber/orange tones', () => {
      expect(PALETTE).toContain('#f59e0b'); // amber
      expect(PALETTE).toContain('#f97316'); // orange
    });

    it('should include red', () => {
      expect(PALETTE).toContain('#ef4444');
    });

    it('should include purple/violet tones', () => {
      expect(PALETTE).toContain('#e879f9'); // fuchsia
      expect(PALETTE).toContain('#a78bfa'); // violet
    });

    it('should include pink', () => {
      expect(PALETTE).toContain('#f472b6');
    });

    it('should include neutral tones', () => {
      expect(PALETTE).toContain('#94a3b8'); // slate
      expect(PALETTE).toContain('#e5e7eb'); // zinc
    });
  });

  describe('lineDashFromStyle', () => {
    it('should return empty array for solid line', () => {
      const result = lineDashFromStyle('solid');
      expect(result).toEqual([]);
    });

    it('should return dash pattern for dashed line', () => {
      const result = lineDashFromStyle('dash');
      expect(result).toEqual([8, 6]);
    });

    it('should return dot pattern for dotted line', () => {
      const result = lineDashFromStyle('dot');
      expect(result).toEqual([2, 6]);
    });

    it('should handle all LineStyleKind types', () => {
      const styles: LineStyleKind[] = ['solid', 'dash', 'dot'];
      styles.forEach((style) => {
        const result = lineDashFromStyle(style);
        expect(Array.isArray(result)).toBe(true);
      });
    });

    it('should return different patterns for different styles', () => {
      const solid = lineDashFromStyle('solid');
      const dash = lineDashFromStyle('dash');
      const dot = lineDashFromStyle('dot');

      expect(solid).not.toEqual(dash);
      expect(dash).not.toEqual(dot);
      expect(solid).not.toEqual(dot);
    });
  });

  describe('applyCtxStyle', () => {
    let mockCtx: CanvasRenderingContext2D;

    beforeEach(() => {
      // Create mock canvas context with required methods
      mockCtx = {
        globalAlpha: 1,
        strokeStyle: '',
        lineWidth: 1,
        setLineDash: vi.fn(),
      } as unknown as CanvasRenderingContext2D;
    });

    it('should apply basic style properties', () => {
      const style: DrawingStyle = {
        stroke: '#ff0000',
        width: 3,
        lineStyle: 'solid',
        opacity: 0.8,
      };

      applyCtxStyle(mockCtx, style);

      expect(mockCtx.globalAlpha).toBe(0.8);
      expect(mockCtx.strokeStyle).toBe('#ff0000');
      expect(mockCtx.lineWidth).toBe(3);
      expect(mockCtx.setLineDash).toHaveBeenCalledWith([]);
    });

    it('should clamp opacity to valid range [0, 1]', () => {
      // Test upper bound
      const styleHigh: DrawingStyle = { ...DEFAULT_STYLE, opacity: 1.5 };
      applyCtxStyle(mockCtx, styleHigh);
      expect(mockCtx.globalAlpha).toBe(1);

      // Test lower bound
      const styleLow: DrawingStyle = { ...DEFAULT_STYLE, opacity: -0.5 };
      applyCtxStyle(mockCtx, styleLow);
      expect(mockCtx.globalAlpha).toBe(0);
    });

    it('should enforce minimum lineWidth of 0.5', () => {
      // Test very small width
      const styleThin: DrawingStyle = { ...DEFAULT_STYLE, width: 0.1 };
      applyCtxStyle(mockCtx, styleThin);
      expect(mockCtx.lineWidth).toBe(0.5);

      // Test negative width
      const styleNeg: DrawingStyle = { ...DEFAULT_STYLE, width: -2 };
      applyCtxStyle(mockCtx, styleNeg);
      expect(mockCtx.lineWidth).toBe(0.5);

      // Test zero width
      const styleZero: DrawingStyle = { ...DEFAULT_STYLE, width: 0 };
      applyCtxStyle(mockCtx, styleZero);
      expect(mockCtx.lineWidth).toBe(0.5);
    });

    it('should apply solid line style (empty dash array)', () => {
      const style: DrawingStyle = { ...DEFAULT_STYLE, lineStyle: 'solid' };
      applyCtxStyle(mockCtx, style);
      expect(mockCtx.setLineDash).toHaveBeenCalledWith([]);
    });

    it('should apply dashed line style', () => {
      const style: DrawingStyle = { ...DEFAULT_STYLE, lineStyle: 'dash' };
      applyCtxStyle(mockCtx, style);
      expect(mockCtx.setLineDash).toHaveBeenCalledWith([8, 6]);
    });

    it('should apply dotted line style', () => {
      const style: DrawingStyle = { ...DEFAULT_STYLE, lineStyle: 'dot' };
      applyCtxStyle(mockCtx, style);
      expect(mockCtx.setLineDash).toHaveBeenCalledWith([2, 6]);
    });

    it('should handle style with all properties', () => {
      const style: DrawingStyle = {
        stroke: '#00ff00',
        width: 5,
        lineStyle: 'dash',
        opacity: 0.5,
        fill: '#ffaa00',
        fontSize: 16,
      };

      applyCtxStyle(mockCtx, style);

      expect(mockCtx.globalAlpha).toBe(0.5);
      expect(mockCtx.strokeStyle).toBe('#00ff00');
      expect(mockCtx.lineWidth).toBe(5);
      expect(mockCtx.setLineDash).toHaveBeenCalledWith([8, 6]);
    });

    it('should use default opacity of 1 if undefined', () => {
      const style: DrawingStyle = {
        stroke: '#000',
        width: 2,
        lineStyle: 'solid',
        opacity: undefined as any, // Test fallback
      };

      applyCtxStyle(mockCtx, style);
      expect(mockCtx.globalAlpha).toBe(1);
    });

    it('should use default width of 1 if undefined', () => {
      const style: DrawingStyle = {
        stroke: '#000',
        width: undefined as any, // Test fallback
        lineStyle: 'solid',
        opacity: 1,
      };

      applyCtxStyle(mockCtx, style);
      expect(mockCtx.lineWidth).toBe(1);
    });

    it('should use default solid lineStyle if undefined', () => {
      const style: DrawingStyle = {
        stroke: '#000',
        width: 2,
        lineStyle: undefined as any, // Test fallback
        opacity: 1,
      };

      applyCtxStyle(mockCtx, style);
      expect(mockCtx.setLineDash).toHaveBeenCalledWith([]);
    });

    it('should apply DEFAULT_STYLE correctly', () => {
      applyCtxStyle(mockCtx, DEFAULT_STYLE);

      expect(mockCtx.globalAlpha).toBe(1);
      expect(mockCtx.strokeStyle).toBe('#60a5fa');
      expect(mockCtx.lineWidth).toBe(2);
      expect(mockCtx.setLineDash).toHaveBeenCalledWith([]);
    });

    it('should handle rapid style changes', () => {
      const styles: DrawingStyle[] = [
        { stroke: '#f00', width: 1, lineStyle: 'solid', opacity: 1 },
        { stroke: '#0f0', width: 2, lineStyle: 'dash', opacity: 0.5 },
        { stroke: '#00f', width: 3, lineStyle: 'dot', opacity: 0.7 },
      ];

      styles.forEach((style) => {
        applyCtxStyle(mockCtx, style);
      });

      // Final state should be last style
      expect(mockCtx.strokeStyle).toBe('#00f');
      expect(mockCtx.lineWidth).toBe(3);
      expect(mockCtx.globalAlpha).toBe(0.7);
      expect(mockCtx.setLineDash).toHaveBeenLastCalledWith([2, 6]);
    });

    it('should call setLineDash exactly once per applyCtxStyle', () => {
      const style: DrawingStyle = DEFAULT_STYLE;
      applyCtxStyle(mockCtx, style);
      expect(mockCtx.setLineDash).toHaveBeenCalledTimes(1);
    });
  });

  describe('integration - combining utilities', () => {
    it('should use PALETTE colors with applyCtxStyle', () => {
      const mockCtx = {
        globalAlpha: 1,
        strokeStyle: '',
        lineWidth: 1,
        setLineDash: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      PALETTE.forEach((color) => {
        const style: DrawingStyle = { ...DEFAULT_STYLE, stroke: color };
        applyCtxStyle(mockCtx, style);
        expect(mockCtx.strokeStyle).toBe(color);
      });
    });

    it('should combine lineDashFromStyle with applyCtxStyle', () => {
      const mockCtx = {
        globalAlpha: 1,
        strokeStyle: '',
        lineWidth: 1,
        setLineDash: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      const lineStyles: LineStyleKind[] = ['solid', 'dash', 'dot'];

      lineStyles.forEach((lineStyle) => {
        const style: DrawingStyle = { ...DEFAULT_STYLE, lineStyle };
        const expectedDash = lineDashFromStyle(lineStyle);
        applyCtxStyle(mockCtx, style);
        expect(mockCtx.setLineDash).toHaveBeenCalledWith(expectedDash);
      });
    });
  });
});
