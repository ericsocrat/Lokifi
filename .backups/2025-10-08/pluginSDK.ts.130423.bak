/**
 * Plugin SDK for indicators and drawing tools
 * Provides registries and auto-generated UIs
 */

export interface PluginParameter {
  name: string;
  type: 'number' | 'boolean' | 'string' | 'select' | 'color';
  label: string;
  description?: string;
  defaultValue: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: unknown; label: string }>;
}

export interface IndicatorDefinition {
  id: string;
  name: string;
  description: string;
  category: 'trend' | 'momentum' | 'volatility' | 'volume' | 'custom';
  paneType: 'overlay' | 'separate';
  parameters: PluginParameter[];
  calculate: (data: OHLCData[], params: Record<string, unknown>) => IndicatorResult[];
  style?: {
    color?: string;
    lineWidth?: number;
    lineStyle?: 'solid' | 'dashed' | 'dotted';
  };
}

export interface DrawingToolDefinition {
  id: string;
  name: string;
  description: string;
  category: 'line' | 'shape' | 'fibonacci' | 'pattern' | 'custom';
  parameters: PluginParameter[];
  minPoints: number;
  maxPoints: number;
  render: (ctx: CanvasRenderingContext2D, points: Point[], params: Record<string, unknown>) => void;
  hitTest: (point: Point, drawingPoints: Point[], params: Record<string, unknown>) => boolean;
  getBounds: (points: Point[]) => { x1: number; y1: number; x2: number; y2: number };
}

export interface OHLCData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorResult {
  timestamp: number;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface Point {
  x: number;
  y: number;
  time?: string | number;
  price?: number;
}

// Plugin registries
class IndicatorRegistry {
  private indicators = new Map<string, IndicatorDefinition>();

  register(definition: IndicatorDefinition) {
    if (this.indicators.has(definition.id)) {
      console.warn(`Indicator ${definition.id} is already registered`);
    }
    this.indicators.set(definition.id, definition);
  }

  get(id: string): IndicatorDefinition | undefined {
    return this.indicators.get(id);
  }

  getAll(): IndicatorDefinition[] {
    return Array.from(this.indicators.values());
  }

  getByCategory(category: string): IndicatorDefinition[] {
    return this.getAll().filter(ind => ind.category === category);
  }
}

class DrawingToolRegistry {
  private tools = new Map<string, DrawingToolDefinition>();

  register(definition: DrawingToolDefinition) {
    if (this.tools.has(definition.id)) {
      console.warn(`Drawing tool ${definition.id} is already registered`);
    }
    this.tools.set(definition.id, definition);
  }

  get(id: string): DrawingToolDefinition | undefined {
    return this.tools.get(id);
  }

  getAll(): DrawingToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getByCategory(category: string): DrawingToolDefinition[] {
    return this.getAll().filter(tool => tool.category === category);
  }
}

// Global registries
export const indicatorRegistry = new IndicatorRegistry();
export const drawingToolRegistry = new DrawingToolRegistry();

// Helper functions for registering plugins
export function registerStudy(definition: IndicatorDefinition) {
  indicatorRegistry.register(definition);
}

export function registerTool(definition: DrawingToolDefinition) {
  drawingToolRegistry.register(definition);
}

// Auto-generated settings UI component generator
export function generateSettingsUI(parameters: PluginParameter[]) {
  return parameters.map(param => ({
    ...param,
    component: getComponentForType(param.type),
    validation: getValidationForParam(param),
  }));
}

function getComponentForType(type: PluginParameter['type']) {
  switch (type) {
    case 'number':
      return 'NumberInput';
    case 'boolean':
      return 'Checkbox';
    case 'string':
      return 'TextInput';
    case 'select':
      return 'Select';
    case 'color':
      return 'ColorPicker';
    default:
      return 'TextInput';
  }
}

function getValidationForParam(param: PluginParameter) {
  const validation: any = {
    required: param.defaultValue === undefined,
  };

  if (param.type === 'number') {
    if (param.min !== undefined) validation.min = param.min;
    if (param.max !== undefined) validation.max = param.max;
  }

  return validation;
}

// Built-in indicator calculations
export const BUILTIN_INDICATORS = {
  sma: (data: OHLCData[], params: { period: number }): IndicatorResult[] => {
    const { period } = params;
    const results: IndicatorResult[] = [];
    
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1)
        .reduce((acc, bar) => acc + bar.close, 0);
      
      results.push({
        timestamp: data[i].timestamp,
        value: sum / period,
      });
    }
    
    return results;
  },

  ema: (data: OHLCData[], params: { period: number }): IndicatorResult[] => {
    const { period } = params;
    const multiplier = 2 / (period + 1);
    const results: IndicatorResult[] = [];
    
    if (data.length === 0) return results;
    
    // Start with SMA for first value
    let ema = data.slice(0, period).reduce((acc, bar) => acc + bar.close, 0) / period;
    results.push({ timestamp: data[period - 1].timestamp, value: ema });
    
    for (let i = period; i < data.length; i++) {
      ema = (data[i].close - ema) * multiplier + ema;
      results.push({ timestamp: data[i].timestamp, value: ema });
    }
    
    return results;
  },

  rsi: (data: OHLCData[], params: { period: number }): IndicatorResult[] => {
    const { period } = params;
    const results: IndicatorResult[] = [];
    
    if (data.length < period + 1) return results;
    
    // Calculate price changes
    const changes = data.slice(1).map((bar, i) => bar.close - data[i].close);
    
    // Calculate initial averages
    let avgGain = changes.slice(0, period)
      .filter(change => change > 0)
      .reduce((acc, gain) => acc + gain, 0) / period;
    
    let avgLoss = changes.slice(0, period)
      .filter(change => change < 0)
      .reduce((acc, loss) => acc - loss, 0) / period;
    
    // Calculate RSI
    for (let i = period; i < changes.length; i++) {
      const change = changes[i];
      
      if (change > 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) - change) / period;
      }
      
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      
      results.push({
        timestamp: data[i + 1].timestamp,
        value: rsi,
      });
    }
    
    return results;
  },
};

// Built-in drawing tool renderers
export const BUILTIN_DRAWING_TOOLS = {
  trendline: (ctx: CanvasRenderingContext2D, points: Point[], params: any) => {
    if (points.length < 2) return;
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.strokeStyle = params.color || '#00ff00';
    ctx.lineWidth = params.lineWidth || 1;
    ctx.stroke();
  },

  rectangle: (ctx: CanvasRenderingContext2D, points: Point[], params: any) => {
    if (points.length < 2) return;
    
    const x1 = Math.min(points[0].x, points[1].x);
    const y1 = Math.min(points[0].y, points[1].y);
    const width = Math.abs(points[1].x - points[0].x);
    const height = Math.abs(points[1].y - points[0].y);
    
    ctx.strokeStyle = params.color || '#00ff00';
    ctx.lineWidth = params.lineWidth || 1;
    
    if (params.fillColor) {
      ctx.fillStyle = params.fillColor;
      ctx.fillRect(x1, y1, width, height);
    }
    
    ctx.strokeRect(x1, y1, width, height);
  },

  circle: (ctx: CanvasRenderingContext2D, points: Point[], params: any) => {
    if (points.length < 2) return;
    
    const centerX = points[0].x;
    const centerY = points[0].y;
    const radius = Math.sqrt(
      Math.pow(points[1].x - centerX, 2) + Math.pow(points[1].y - centerY, 2)
    );
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = params.color || '#00ff00';
    ctx.lineWidth = params.lineWidth || 1;
    
    if (params.fillColor) {
      ctx.fillStyle = params.fillColor;
      ctx.fill();
    }
    
    ctx.stroke();
  },
};