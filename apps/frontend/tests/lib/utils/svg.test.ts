import { describe, expect, it } from 'vitest';
import {
  circleEl,
  dLine,
  drawingsToSVG,
  groupEl,
  lineEl,
  pathEl,
  pointsAttr,
  polylineEl,
  rectEl,
  serializeSvg,
  textEl,
  type P,
  type SvgStyle,
  type TextStyle,
} from '../../../src/lib/utils/svg';

describe('svg utilities', () => {
  describe('lineEl', () => {
    it('should create line SVG element with basic points', () => {
      const result = lineEl({ x: 0, y: 0 }, { x: 100, y: 100 });
      expect(result).toContain('<line');
      expect(result).toContain('x1="0"');
      expect(result).toContain('y1="0"');
      expect(result).toContain('x2="100"');
      expect(result).toContain('y2="100"');
      expect(result).toContain('stroke="currentColor"');
      expect(result).toContain('/>');
    });

    it('should apply custom stroke style', () => {
      const style: SvgStyle = { stroke: '#ff0000', strokeWidth: 3 };
      const result = lineEl({ x: 10, y: 20 }, { x: 30, y: 40 }, style);
      expect(result).toContain('stroke="#ff0000"');
      expect(result).toContain('stroke-width="3"');
    });

    it('should handle dashed lines with boolean', () => {
      const style: SvgStyle = { dash: true };
      const result = lineEl({ x: 0, y: 0 }, { x: 10, y: 10 }, style);
      expect(result).toContain('stroke-dasharray="6,4"');
    });

    it('should handle custom dash pattern', () => {
      const style: SvgStyle = { dash: '10,5,2,5' };
      const result = lineEl({ x: 0, y: 0 }, { x: 10, y: 10 }, style);
      expect(result).toContain('stroke-dasharray="10,5,2,5"');
    });

    it('should apply lineCap and lineJoin', () => {
      const style: SvgStyle = { lineCap: 'round', lineJoin: 'bevel' };
      const result = lineEl({ x: 0, y: 0 }, { x: 10, y: 10 }, style);
      expect(result).toContain('stroke-linecap="round"');
      expect(result).toContain('stroke-linejoin="bevel"');
    });

    it('should apply className', () => {
      const style: SvgStyle = { className: 'my-line' };
      const result = lineEl({ x: 0, y: 0 }, { x: 10, y: 10 }, style);
      expect(result).toContain('class="my-line"');
    });

    it('should apply opacity', () => {
      const style: SvgStyle = { opacity: 0.5 };
      const result = lineEl({ x: 0, y: 0 }, { x: 10, y: 10 }, style);
      expect(result).toContain('opacity="0.5"');
    });
  });

  describe('polylineEl', () => {
    it('should create polyline from points array', () => {
      const points: P[] = [
        { x: 0, y: 0 },
        { x: 10, y: 20 },
        { x: 30, y: 15 },
      ];
      const result = polylineEl(points);
      expect(result).toContain('<polyline');
      expect(result).toContain('points="0,0 10,20 30,15"');
      expect(result).toContain('fill="none"');
    });

    it('should apply custom fill', () => {
      const points: P[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 10 },
      ];
      const style: SvgStyle = { fill: '#00ff00' };
      const result = polylineEl(points, style);
      expect(result).toContain('fill="#00ff00"');
      expect(result).toContain('fill-opacity="0.18"');
    });

    it('should handle empty points array gracefully', () => {
      const result = polylineEl([]);
      // Empty points array creates polyline without points attribute (filtered out)
      expect(result).toContain('<polyline');
      expect(result).toContain('stroke="currentColor"');
      expect(result).toContain('fill="none"');
    });

    it('should apply stroke style', () => {
      const points: P[] = [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ];
      const style: SvgStyle = { stroke: '#0000ff', strokeWidth: 2 };
      const result = polylineEl(points, style);
      expect(result).toContain('stroke="#0000ff"');
      expect(result).toContain('stroke-width="2"');
    });
  });

  describe('rectEl', () => {
    it('should create rectangle from two corners', () => {
      const result = rectEl({ x: 10, y: 20 }, { x: 50, y: 60 });
      expect(result).toContain('<rect');
      expect(result).toContain('x="10"');
      expect(result).toContain('y="20"');
      expect(result).toContain('width="40"');
      expect(result).toContain('height="40"');
    });

    it('should handle inverted corners (normalize to min/max)', () => {
      const result = rectEl({ x: 50, y: 60 }, { x: 10, y: 20 });
      expect(result).toContain('x="10"');
      expect(result).toContain('y="20"');
      expect(result).toContain('width="40"');
      expect(result).toContain('height="40"');
    });

    it('should enforce minimum width and height', () => {
      const result = rectEl({ x: 10, y: 10 }, { x: 10, y: 10 }); // zero size
      expect(result).toContain('width="0.0001"');
      expect(result).toContain('height="0.0001"');
    });

    it('should apply fill with opacity', () => {
      const style: SvgStyle = { fill: '#ffaa00' };
      const result = rectEl({ x: 0, y: 0 }, { x: 20, y: 20 }, style);
      expect(result).toContain('fill="#ffaa00"');
      expect(result).toContain('fill-opacity="0.18"');
    });

    it('should apply stroke style', () => {
      const style: SvgStyle = { stroke: '#333', strokeWidth: 1 };
      const result = rectEl({ x: 0, y: 0 }, { x: 20, y: 20 }, style);
      expect(result).toContain('stroke="#333"');
      expect(result).toContain('stroke-width="1"');
    });
  });

  describe('circleEl', () => {
    it('should create circle element', () => {
      const result = circleEl({ x: 50, y: 75 }, 25);
      expect(result).toContain('<circle');
      expect(result).toContain('cx="50"');
      expect(result).toContain('cy="75"');
      expect(result).toContain('r="25"');
    });

    it('should enforce minimum radius', () => {
      const result = circleEl({ x: 0, y: 0 }, 0);
      expect(result).toContain('r="0.0001"');
    });

    it('should handle negative radius', () => {
      const result = circleEl({ x: 0, y: 0 }, -10);
      // Max(0.0001, -10) = 0.0001
      expect(result).toContain('r="0.0001"');
    });

    it('should apply fill and stroke', () => {
      const style: SvgStyle = { fill: '#ff0000', stroke: '#000', strokeWidth: 2 };
      const result = circleEl({ x: 10, y: 10 }, 5, style);
      expect(result).toContain('fill="#ff0000"');
      expect(result).toContain('stroke="#000"');
      expect(result).toContain('stroke-width="2"');
    });
  });

  describe('pathEl', () => {
    it('should create path element with d attribute', () => {
      const d = 'M 10 10 L 20 20 L 30 10 Z';
      const result = pathEl(d);
      expect(result).toContain('<path');
      expect(result).toContain(`d="${d}"`);
      expect(result).toContain('fill="none"');
    });

    it('should apply style', () => {
      const style: SvgStyle = { stroke: '#00ff00', strokeWidth: 3, fill: '#aaa' };
      const result = pathEl('M 0 0 L 10 10', style);
      expect(result).toContain('stroke="#00ff00"');
      expect(result).toContain('fill="#aaa"');
    });

    it('should handle complex path data', () => {
      const d = 'M 150 0 L 75 200 L 225 200 Z';
      const result = pathEl(d);
      expect(result).toContain(d);
    });
  });

  describe('textEl', () => {
    it('should create text element', () => {
      const result = textEl({ x: 100, y: 50 }, 'Hello SVG');
      expect(result).toContain('<text');
      expect(result).toContain('x="100"');
      expect(result).toContain('y="50"');
      expect(result).toContain('>Hello SVG</text>');
    });

    it('should apply default text styles', () => {
      const result = textEl({ x: 0, y: 0 }, 'Test');
      expect(result).toContain('fill="currentColor"');
      expect(result).toContain('font-size="12"');
      expect(result).toContain('text-anchor="start"');
      expect(result).toContain('opacity="1"');
    });

    it('should apply custom text styles', () => {
      const style: TextStyle = {
        fill: '#ff0000',
        fontSize: 18,
        fontFamily: 'Arial',
        anchor: 'middle',
        opacity: 0.7,
        className: 'my-text',
      };
      const result = textEl({ x: 50, y: 50 }, 'Custom', style);
      expect(result).toContain('fill="#ff0000"');
      expect(result).toContain('font-size="18"');
      expect(result).toContain('font-family="Arial"');
      expect(result).toContain('text-anchor="middle"');
      expect(result).toContain('opacity="0.7"');
      expect(result).toContain('class="my-text"');
    });

    it('should escape special XML characters in text', () => {
      const result = textEl({ x: 0, y: 0 }, '<script>&"test"</script>');
      expect(result).toContain('&lt;script&gt;&amp;&quot;test&quot;&lt;/script&gt;');
      expect(result).not.toContain('<script>');
    });

    it('should handle anchor variations', () => {
      expect(textEl({ x: 0, y: 0 }, 'start')).toContain('text-anchor="start"');
      expect(textEl({ x: 0, y: 0 }, 'mid', { anchor: 'middle' })).toContain('text-anchor="middle"');
      expect(textEl({ x: 0, y: 0 }, 'end', { anchor: 'end' })).toContain('text-anchor="end"');
    });
  });

  describe('groupEl', () => {
    it('should group elements without attributes', () => {
      const children = [lineEl({ x: 0, y: 0 }, { x: 10, y: 10 })];
      const result = groupEl(children);
      expect(result).toContain('<g>');
      expect(result).toContain('</g>');
      expect(result).toContain('<line');
    });

    it('should apply className to group', () => {
      const children = ['<circle cx="5" cy="5" r="3" />'];
      const result = groupEl(children, 'my-group');
      expect(result).toContain('class="my-group"');
    });

    it('should apply opacity to group', () => {
      const children = ['<rect x="0" y="0" width="10" height="10" />'];
      const result = groupEl(children, undefined, 0.5);
      expect(result).toContain('opacity="0.5"');
    });

    it('should handle both className and opacity', () => {
      const children = ['<text>test</text>'];
      const result = groupEl(children, 'styled-group', 0.8);
      expect(result).toContain('class="styled-group"');
      expect(result).toContain('opacity="0.8"');
    });

    it('should join multiple children', () => {
      const children = [lineEl({ x: 0, y: 0 }, { x: 10, y: 10 }), circleEl({ x: 5, y: 5 }, 2)];
      const result = groupEl(children);
      expect(result).toContain('<line');
      expect(result).toContain('<circle');
    });
  });

  describe('serializeSvg', () => {
    it('should create SVG document with default dimensions', () => {
      const children = [lineEl({ x: 0, y: 0 }, { x: 100, y: 100 })];
      const result = serializeSvg(children);
      expect(result).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
      expect(result).toContain('width="800"');
      expect(result).toContain('height="400"');
      expect(result).toContain('</svg>');
      expect(result).toContain('<line');
    });

    it('should use custom dimensions', () => {
      const children = [circleEl({ x: 50, y: 50 }, 25)];
      const result = serializeSvg(children, 200, 150);
      expect(result).toContain('width="200"');
      expect(result).toContain('height="150"');
    });

    it('should include viewBox when provided', () => {
      const children = ['<rect x="0" y="0" width="10" height="10" />'];
      const viewBox = { x: 0, y: 0, w: 100, h: 100 };
      const result = serializeSvg(children, 800, 400, viewBox);
      expect(result).toContain('viewBox="0 0 100 100"');
    });

    it('should handle empty children array', () => {
      const result = serializeSvg([]);
      expect(result).toBe(
        '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"></svg>'
      );
    });

    it('should join multiple children', () => {
      const children = [
        lineEl({ x: 0, y: 0 }, { x: 10, y: 10 }),
        circleEl({ x: 5, y: 5 }, 3),
        textEl({ x: 20, y: 20 }, 'test'),
      ];
      const result = serializeSvg(children);
      expect(result).toContain('<line');
      expect(result).toContain('<circle');
      expect(result).toContain('<text');
    });
  });

  describe('dLine', () => {
    it('should create path d attribute for line', () => {
      const result = dLine({ x: 10, y: 20 }, { x: 30, y: 40 });
      expect(result).toBe('M 10 20 L 30 40');
    });

    it('should handle negative coordinates', () => {
      const result = dLine({ x: -5, y: -10 }, { x: 15, y: 20 });
      expect(result).toBe('M -5 -10 L 15 20');
    });

    it('should handle decimal coordinates', () => {
      const result = dLine({ x: 1.5, y: 2.7 }, { x: 10.3, y: 15.9 });
      expect(result).toBe('M 1.5 2.7 L 10.3 15.9');
    });
  });

  describe('pointsAttr', () => {
    it('should create points attribute string', () => {
      const points: P[] = [
        { x: 0, y: 0 },
        { x: 10, y: 20 },
        { x: 30, y: 15 },
      ];
      const result = pointsAttr(points);
      expect(result).toBe('0,0 10,20 30,15');
    });

    it('should handle single point', () => {
      const result = pointsAttr([{ x: 5, y: 10 }]);
      expect(result).toBe('5,10');
    });

    it('should handle empty array', () => {
      const result = pointsAttr([]);
      expect(result).toBe('');
    });

    it('should handle decimal coordinates', () => {
      const result = pointsAttr([
        { x: 1.5, y: 2.3 },
        { x: 4.7, y: 8.9 },
      ]);
      expect(result).toBe('1.5,2.3 4.7,8.9');
    });
  });

  describe('drawingsToSVG', () => {
    it('should create SVG with JSON payload as text', () => {
      const drawings = [
        {
          type: 'line',
          points: [
            [0, 0],
            [10, 10],
          ],
        },
      ];
      const result = drawingsToSVG(drawings);
      expect(result).toContain('<svg');
      expect(result).toContain('<text');
      // JSON is escaped in XML: &quot; instead of "
      expect(result).toContain('&quot;drawings&quot;');
      expect(result).toContain('&quot;line&quot;');
      expect(result).toContain('</svg>');
    });

    it('should use default dimensions', () => {
      const result = drawingsToSVG([]);
      expect(result).toContain('width="800"');
      expect(result).toContain('height="400"');
    });

    it('should accept custom dimensions', () => {
      const result = drawingsToSVG([{ type: 'test' }], 300, 200);
      expect(result).toContain('width="300"');
      expect(result).toContain('height="200"');
    });

    it('should handle empty drawings array', () => {
      const result = drawingsToSVG([]);
      // JSON is escaped: &quot; instead of "
      expect(result).toContain('{&quot;drawings&quot;:[]}');
    });

    it('should escape special characters in JSON', () => {
      const drawings = [{ label: '<script>alert("xss")</script>' }];
      const result = drawingsToSVG(drawings);
      // JSON string should be escaped in text element
      expect(result).toContain('&lt;');
      expect(result).toContain('&quot;');
    });
  });

  describe('edge cases and special characters', () => {
    it('should use defaults when no style provided', () => {
      const result = lineEl({ x: 0, y: 0 }, { x: 10, y: 10 }, {});
      // Should use defaults
      expect(result).toContain('stroke="currentColor"');
      expect(result).toContain('stroke-width="1.5"');
    });

    it('should handle numeric text', () => {
      const result = textEl({ x: 0, y: 0 }, '12345');
      expect(result).toContain('>12345</text>');
    });

    it('should handle ampersands in text', () => {
      const result = textEl({ x: 0, y: 0 }, 'Rock & Roll');
      expect(result).toContain('Rock &amp; Roll');
    });

    it('should handle quotes in text', () => {
      const result = textEl({ x: 0, y: 0 }, 'Say "Hello"');
      expect(result).toContain('Say &quot;Hello&quot;');
    });

    it('should handle all stroke line cap options', () => {
      expect(lineEl({ x: 0, y: 0 }, { x: 10, y: 10 }, { lineCap: 'butt' })).toContain(
        'stroke-linecap="butt"'
      );
      expect(lineEl({ x: 0, y: 0 }, { x: 10, y: 10 }, { lineCap: 'round' })).toContain(
        'stroke-linecap="round"'
      );
      expect(lineEl({ x: 0, y: 0 }, { x: 10, y: 10 }, { lineCap: 'square' })).toContain(
        'stroke-linecap="square"'
      );
    });

    it('should handle all stroke line join options', () => {
      expect(lineEl({ x: 0, y: 0 }, { x: 10, y: 10 }, { lineJoin: 'miter' })).toContain(
        'stroke-linejoin="miter"'
      );
      expect(lineEl({ x: 0, y: 0 }, { x: 10, y: 10 }, { lineJoin: 'round' })).toContain(
        'stroke-linejoin="round"'
      );
      expect(lineEl({ x: 0, y: 0 }, { x: 10, y: 10 }, { lineJoin: 'bevel' })).toContain(
        'stroke-linejoin="bevel"'
      );
    });
  });
});
