import {
  BUILTIN_DRAWING_TOOLS,
  BUILTIN_INDICATORS,
  drawingToolRegistry,
  generateSettingsUI,
  indicatorRegistry,
  registerStudy,
  registerTool,
  type DrawingToolDefinition,
  type IndicatorDefinition,
  type OHLCData,
  type PluginParameter,
  type Point,
} from '@/lib/plugins/pluginSDK';
import { describe, expect, it, vi } from 'vitest';

// Create test OHLC data
const createOHLCData = (count: number, startPrice: number = 100): OHLCData[] => {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: 1000000 + i * 1000,
    open: startPrice + i,
    high: startPrice + i + 5,
    low: startPrice + i - 3,
    close: startPrice + i + 2,
    volume: 1000 + i * 100,
  }));
};

describe('Plugin SDK', () => {
  describe('IndicatorRegistry', () => {
    it('should register an indicator', () => {
      const indicator: IndicatorDefinition = {
        id: 'test-indicator',
        name: 'Test Indicator',
        description: 'A test indicator',
        category: 'trend',
        paneType: 'overlay',
        parameters: [],
        calculate: () => [],
      };

      indicatorRegistry.register(indicator);

      expect(indicatorRegistry.get('test-indicator')).toBe(indicator);
    });

    it('should warn when registering duplicate indicator', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const indicator: IndicatorDefinition = {
        id: 'duplicate-indicator',
        name: 'Duplicate',
        description: 'Duplicate test',
        category: 'momentum',
        paneType: 'separate',
        parameters: [],
        calculate: () => [],
      };

      indicatorRegistry.register(indicator);
      indicatorRegistry.register(indicator);

      expect(warnSpy).toHaveBeenCalledWith('Indicator duplicate-indicator is already registered');

      warnSpy.mockRestore();
    });

    it('should return undefined for non-existent indicator', () => {
      expect(indicatorRegistry.get('non-existent')).toBeUndefined();
    });

    it('should get all indicators', () => {
      const all = indicatorRegistry.getAll();
      expect(Array.isArray(all)).toBe(true);
    });

    it('should filter indicators by category', () => {
      const indicator: IndicatorDefinition = {
        id: 'volatility-test',
        name: 'Volatility Test',
        description: 'Test',
        category: 'volatility',
        paneType: 'separate',
        parameters: [],
        calculate: () => [],
      };

      indicatorRegistry.register(indicator);

      const volatilityIndicators = indicatorRegistry.getByCategory('volatility');
      expect(volatilityIndicators.some((i) => i.id === 'volatility-test')).toBe(true);
    });
  });

  describe('DrawingToolRegistry', () => {
    it('should register a drawing tool', () => {
      const tool: DrawingToolDefinition = {
        id: 'test-tool',
        name: 'Test Tool',
        description: 'A test tool',
        category: 'line',
        parameters: [],
        minPoints: 2,
        maxPoints: 2,
        render: () => {},
        hitTest: () => false,
        getBounds: () => ({ x1: 0, y1: 0, x2: 0, y2: 0 }),
      };

      drawingToolRegistry.register(tool);

      expect(drawingToolRegistry.get('test-tool')).toBe(tool);
    });

    it('should warn when registering duplicate tool', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const tool: DrawingToolDefinition = {
        id: 'duplicate-tool',
        name: 'Duplicate',
        description: 'Duplicate test',
        category: 'shape',
        parameters: [],
        minPoints: 2,
        maxPoints: 2,
        render: () => {},
        hitTest: () => false,
        getBounds: () => ({ x1: 0, y1: 0, x2: 0, y2: 0 }),
      };

      drawingToolRegistry.register(tool);
      drawingToolRegistry.register(tool);

      expect(warnSpy).toHaveBeenCalledWith('Drawing tool duplicate-tool is already registered');

      warnSpy.mockRestore();
    });

    it('should filter tools by category', () => {
      const tool: DrawingToolDefinition = {
        id: 'fib-test',
        name: 'Fib Test',
        description: 'Test',
        category: 'fibonacci',
        parameters: [],
        minPoints: 2,
        maxPoints: 2,
        render: () => {},
        hitTest: () => false,
        getBounds: () => ({ x1: 0, y1: 0, x2: 0, y2: 0 }),
      };

      drawingToolRegistry.register(tool);

      const fibTools = drawingToolRegistry.getByCategory('fibonacci');
      expect(fibTools.some((t) => t.id === 'fib-test')).toBe(true);
    });
  });

  describe('registerStudy', () => {
    it('should register indicator via helper function', () => {
      const indicator: IndicatorDefinition = {
        id: 'study-test',
        name: 'Study Test',
        description: 'Test',
        category: 'volume',
        paneType: 'separate',
        parameters: [],
        calculate: () => [],
      };

      registerStudy(indicator);

      expect(indicatorRegistry.get('study-test')).toBe(indicator);
    });
  });

  describe('registerTool', () => {
    it('should register tool via helper function', () => {
      const tool: DrawingToolDefinition = {
        id: 'tool-test',
        name: 'Tool Test',
        description: 'Test',
        category: 'pattern',
        parameters: [],
        minPoints: 3,
        maxPoints: 5,
        render: () => {},
        hitTest: () => false,
        getBounds: () => ({ x1: 0, y1: 0, x2: 0, y2: 0 }),
      };

      registerTool(tool);

      expect(drawingToolRegistry.get('tool-test')).toBe(tool);
    });
  });

  describe('generateSettingsUI', () => {
    it('should generate UI config for number parameter', () => {
      const params: PluginParameter[] = [
        {
          name: 'period',
          type: 'number',
          label: 'Period',
          defaultValue: 14,
          min: 1,
          max: 100,
          step: 1,
        },
      ];

      const ui = generateSettingsUI(params);

      expect(ui[0].component).toBe('NumberInput');
      expect(ui[0].validation).toEqual({ required: false, min: 1, max: 100 });
    });

    it('should generate UI config for boolean parameter', () => {
      const params: PluginParameter[] = [
        {
          name: 'showLabels',
          type: 'boolean',
          label: 'Show Labels',
          defaultValue: true,
        },
      ];

      const ui = generateSettingsUI(params);

      expect(ui[0].component).toBe('Checkbox');
    });

    it('should generate UI config for string parameter', () => {
      const params: PluginParameter[] = [
        {
          name: 'title',
          type: 'string',
          label: 'Title',
          defaultValue: 'My Chart',
        },
      ];

      const ui = generateSettingsUI(params);

      expect(ui[0].component).toBe('TextInput');
    });

    it('should generate UI config for select parameter', () => {
      const params: PluginParameter[] = [
        {
          name: 'lineStyle',
          type: 'select',
          label: 'Line Style',
          defaultValue: 'solid',
          options: [
            { value: 'solid', label: 'Solid' },
            { value: 'dashed', label: 'Dashed' },
          ],
        },
      ];

      const ui = generateSettingsUI(params);

      expect(ui[0].component).toBe('Select');
    });

    it('should generate UI config for color parameter', () => {
      const params: PluginParameter[] = [
        {
          name: 'color',
          type: 'color',
          label: 'Color',
          defaultValue: '#ff0000',
        },
      ];

      const ui = generateSettingsUI(params);

      expect(ui[0].component).toBe('ColorPicker');
    });

    it('should mark parameter as required when no default value', () => {
      const params: PluginParameter[] = [
        {
          name: 'requiredField',
          type: 'string',
          label: 'Required Field',
          defaultValue: undefined,
        },
      ];

      const ui = generateSettingsUI(params);

      expect(ui[0].validation.required).toBe(true);
    });
  });

  describe('BUILTIN_INDICATORS', () => {
    describe('SMA (Simple Moving Average)', () => {
      it('should calculate SMA correctly', () => {
        const data = createOHLCData(10);
        const result = BUILTIN_INDICATORS.sma(data, { period: 3 });

        // Should have 8 results (10 - 3 + 1)
        expect(result).toHaveLength(8);
      });

      it('should return correct values for SMA', () => {
        const data: OHLCData[] = [
          { timestamp: 1, open: 10, high: 12, low: 8, close: 10, volume: 100 },
          { timestamp: 2, open: 10, high: 13, low: 9, close: 12, volume: 100 },
          { timestamp: 3, open: 12, high: 14, low: 10, close: 14, volume: 100 },
          { timestamp: 4, open: 14, high: 15, low: 12, close: 13, volume: 100 },
          { timestamp: 5, open: 13, high: 16, low: 11, close: 15, volume: 100 },
        ];

        const result = BUILTIN_INDICATORS.sma(data, { period: 3 });

        // First SMA: (10 + 12 + 14) / 3 = 12
        expect(result[0].value).toBe(12);
        // Second SMA: (12 + 14 + 13) / 3 = 13
        expect(result[1].value).toBe(13);
      });
    });

    describe('EMA (Exponential Moving Average)', () => {
      it('should return empty array for empty data', () => {
        const result = BUILTIN_INDICATORS.ema([], { period: 5 });
        expect(result).toHaveLength(0);
      });

      it('should calculate EMA with correct length', () => {
        const data = createOHLCData(20);
        const result = BUILTIN_INDICATORS.ema(data, { period: 5 });

        // Should have 16 results (20 - 5 + 1)
        expect(result).toHaveLength(16);
      });

      it('should start EMA with SMA value', () => {
        const data = createOHLCData(10);
        const result = BUILTIN_INDICATORS.ema(data, { period: 5 });

        // First EMA value should be SMA of first 5 closes
        const firstFiveCloses = data.slice(0, 5).map((d) => d.close);
        const expectedSMA = firstFiveCloses.reduce((a, b) => a + b, 0) / 5;

        expect(result[0].value).toBeCloseTo(expectedSMA, 5);
      });
    });

    describe('RSI (Relative Strength Index)', () => {
      it('should return empty array for insufficient data', () => {
        const data = createOHLCData(5);
        const result = BUILTIN_INDICATORS.rsi(data, { period: 14 });

        expect(result).toHaveLength(0);
      });

      it('should calculate RSI with correct length', () => {
        const data = createOHLCData(30);
        const result = BUILTIN_INDICATORS.rsi(data, { period: 14 });

        // RSI needs period + 1 data points to start, then produces 1 value per bar
        expect(result.length).toBeGreaterThan(0);
      });

      it('should produce RSI values between 0 and 100', () => {
        const data = createOHLCData(50);
        const result = BUILTIN_INDICATORS.rsi(data, { period: 14 });

        result.forEach((r) => {
          expect(r.value).toBeGreaterThanOrEqual(0);
          expect(r.value).toBeLessThanOrEqual(100);
        });
      });
    });
  });

  describe('BUILTIN_DRAWING_TOOLS', () => {
    // Create a mock canvas context
    const createMockContext = () => {
      return {
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        strokeRect: vi.fn(),
        fillRect: vi.fn(),
        strokeStyle: '',
        lineWidth: 0,
        fillStyle: '',
      } as unknown as CanvasRenderingContext2D;
    };

    describe('trendline', () => {
      it('should not render with less than 2 points', () => {
        const ctx = createMockContext();
        const points: Point[] = [{ x: 10, y: 20 }];

        BUILTIN_DRAWING_TOOLS.trendline(ctx, points, {});

        expect(ctx.beginPath).not.toHaveBeenCalled();
      });

      it('should render trendline with 2 points', () => {
        const ctx = createMockContext();
        const points: Point[] = [
          { x: 10, y: 20 },
          { x: 100, y: 80 },
        ];

        BUILTIN_DRAWING_TOOLS.trendline(ctx, points, {});

        expect(ctx.beginPath).toHaveBeenCalled();
        expect(ctx.moveTo).toHaveBeenCalledWith(10, 20);
        expect(ctx.lineTo).toHaveBeenCalledWith(100, 80);
        expect(ctx.stroke).toHaveBeenCalled();
      });

      it('should use custom color and lineWidth', () => {
        const ctx = createMockContext();
        const points: Point[] = [
          { x: 0, y: 0 },
          { x: 50, y: 50 },
        ];

        BUILTIN_DRAWING_TOOLS.trendline(ctx, points, {
          color: '#ff0000',
          lineWidth: 3,
        });

        expect(ctx.strokeStyle).toBe('#ff0000');
        expect(ctx.lineWidth).toBe(3);
      });

      it('should use default color and lineWidth', () => {
        const ctx = createMockContext();
        const points: Point[] = [
          { x: 0, y: 0 },
          { x: 50, y: 50 },
        ];

        BUILTIN_DRAWING_TOOLS.trendline(ctx, points, {});

        expect(ctx.strokeStyle).toBe('#00ff00');
        expect(ctx.lineWidth).toBe(1);
      });
    });

    describe('rectangle', () => {
      it('should not render with less than 2 points', () => {
        const ctx = createMockContext();
        const points: Point[] = [{ x: 10, y: 20 }];

        BUILTIN_DRAWING_TOOLS.rectangle(ctx, points, {});

        expect(ctx.strokeRect).not.toHaveBeenCalled();
      });

      it('should render rectangle with 2 points', () => {
        const ctx = createMockContext();
        const points: Point[] = [
          { x: 10, y: 20 },
          { x: 110, y: 120 },
        ];

        BUILTIN_DRAWING_TOOLS.rectangle(ctx, points, {});

        expect(ctx.strokeRect).toHaveBeenCalledWith(10, 20, 100, 100);
      });

      it('should handle inverted points', () => {
        const ctx = createMockContext();
        const points: Point[] = [
          { x: 110, y: 120 },
          { x: 10, y: 20 },
        ];

        BUILTIN_DRAWING_TOOLS.rectangle(ctx, points, {});

        expect(ctx.strokeRect).toHaveBeenCalledWith(10, 20, 100, 100);
      });

      it('should fill rectangle when fillColor provided', () => {
        const ctx = createMockContext();
        const points: Point[] = [
          { x: 0, y: 0 },
          { x: 50, y: 50 },
        ];

        BUILTIN_DRAWING_TOOLS.rectangle(ctx, points, { fillColor: 'rgba(255, 0, 0, 0.5)' });

        expect(ctx.fillRect).toHaveBeenCalled();
      });
    });

    describe('circle', () => {
      it('should not render with less than 2 points', () => {
        const ctx = createMockContext();
        const points: Point[] = [{ x: 50, y: 50 }];

        BUILTIN_DRAWING_TOOLS.circle(ctx, points, {});

        expect(ctx.arc).not.toHaveBeenCalled();
      });

      it('should render circle with center and radius point', () => {
        const ctx = createMockContext();
        const points: Point[] = [
          { x: 50, y: 50 },
          { x: 100, y: 50 },
        ];

        BUILTIN_DRAWING_TOOLS.circle(ctx, points, {});

        expect(ctx.beginPath).toHaveBeenCalled();
        expect(ctx.arc).toHaveBeenCalledWith(50, 50, 50, 0, 2 * Math.PI);
        expect(ctx.stroke).toHaveBeenCalled();
      });

      it('should fill circle when fillColor provided', () => {
        const ctx = createMockContext();
        const points: Point[] = [
          { x: 50, y: 50 },
          { x: 100, y: 50 },
        ];

        BUILTIN_DRAWING_TOOLS.circle(ctx, points, { fillColor: 'blue' });

        expect(ctx.fill).toHaveBeenCalled();
      });

      it('should calculate correct radius for diagonal point', () => {
        const ctx = createMockContext();
        const points: Point[] = [
          { x: 0, y: 0 },
          { x: 3, y: 4 },
        ];

        BUILTIN_DRAWING_TOOLS.circle(ctx, points, {});

        // Radius should be sqrt(3^2 + 4^2) = 5
        expect(ctx.arc).toHaveBeenCalledWith(0, 0, 5, 0, 2 * Math.PI);
      });
    });
  });
});
