/**
 * Rectangle Drawing Primitive - Based on TradingView's official example
 * Source: https://github.com/tradingview/lightweight-charts/tree/master/plugin-examples/src/plugins/rectangle-drawing-tool
 *
 * Draws rectangles on the chart with proper price/time anchoring
 */

import {
  AutoscaleInfo,
  IChartApi,
  ISeriesApi,
  ISeriesPrimitive,
  Logical,
  SeriesAttachedParameter,
  SeriesType,
  Time,
} from 'lightweight-charts';

interface RectanglePoint {
  time: Time;
  price: number;
}

interface ViewPoint {
  x: number | null;
  y: number | null;
}

export interface RectangleOptions {
  fillColor: string;
  borderColor: string;
  borderWidth: number;
  fillOpacity: number;
}

const defaultOptions: RectangleOptions = {
  fillColor: '#2962FF',
  borderColor: '#2962FF',
  borderWidth: 2,
  fillOpacity: 0.1,
};

class RectanglePaneRenderer {
  private _p1: ViewPoint;
  private _p2: ViewPoint;
  private _options: RectangleOptions;

  constructor(p1: ViewPoint, p2: ViewPoint, options: RectangleOptions) {
    this._p1 = p1;
    this._p2 = p2;
    this._options = options;
  }

  draw(target: any) {
    target.useBitmapCoordinateSpace((scope: any) => {
      if (
        this._p1.x === null ||
        this._p1.y === null ||
        this._p2.x === null ||
        this._p2.y === null
      ) {
        return;
      }

      const ctx = scope.context;
      const x1 = Math.round(this._p1.x * scope.horizontalPixelRatio);
      const y1 = Math.round(this._p1.y * scope.verticalPixelRatio);
      const x2 = Math.round(this._p2.x * scope.horizontalPixelRatio);
      const y2 = Math.round(this._p2.y * scope.verticalPixelRatio);

      const width = x2 - x1;
      const height = y2 - y1;

      // Draw fill
      ctx.fillStyle = this._hexToRgba(this._options.fillColor, this._options.fillOpacity);
      ctx.fillRect(x1, y1, width, height);

      // Draw border
      ctx.strokeStyle = this._options.borderColor;
      ctx.lineWidth = this._options.borderWidth * scope.verticalPixelRatio;
      ctx.strokeRect(x1, y1, width, height);
    });
  }

  private _hexToRgba(hex: string, opacity: number): string {
    // Remove # if present
    hex = hex.replace('#', '');

    // Parse RGB values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
}

class RectanglePaneView {
  private _source: RectanglePrimitive;
  private _p1: ViewPoint = { x: null, y: null };
  private _p2: ViewPoint = { x: null, y: null };

  constructor(source: RectanglePrimitive) {
    this._source = source;
  }

  update() {
    const series = this._source._series;
    const timeScale = this._source._chart.timeScale();

    // Convert price to Y coordinate
    const y1 = series.priceToCoordinate(this._source._p1.price);
    const y2 = series.priceToCoordinate(this._source._p2.price);

    // Convert time to X coordinate
    const x1 = timeScale.timeToCoordinate(this._source._p1.time);
    const x2 = timeScale.timeToCoordinate(this._source._p2.time);

    this._p1 = { x: x1, y: y1 };
    this._p2 = { x: x2, y: y2 };
  }

  renderer() {
    return new RectanglePaneRenderer(this._p1, this._p2, this._source._options);
  }

  zOrder(): 'bottom' | 'normal' | 'top' {
    return 'normal';
  }
}

export class RectanglePrimitive implements ISeriesPrimitive<Time> {
  _chart: IChartApi;
  _series: ISeriesApi<SeriesType>;
  _p1: RectanglePoint;
  _p2: RectanglePoint;
  _paneViews: RectanglePaneView[];
  _options: RectangleOptions;
  private _minPrice: number;
  private _maxPrice: number;
  private _requestUpdate?: () => void;

  constructor(p1: RectanglePoint, p2: RectanglePoint, options?: Partial<RectangleOptions>) {
    this._p1 = p1;
    this._p2 = p2;
    this._minPrice = Math.min(p1.price, p2.price);
    this._maxPrice = Math.max(p1.price, p2.price);
    this._options = {
      ...defaultOptions,
      ...options,
    };
    this._paneViews = [new RectanglePaneView(this)];
    this._chart = null as any;
    this._series = null as any;
  }

  attached(param: SeriesAttachedParameter<Time>) {
    this._chart = param.chart;
    this._series = param.series;
    this._requestUpdate = param.requestUpdate;
  }

  detached() {
    this._chart = null as any;
    this._series = null as any;
    this._requestUpdate = undefined;
  }

  updateAllViews() {
    this._paneViews.forEach((pw) => pw.update());
  }

  paneViews() {
    return this._paneViews;
  }

  autoscaleInfo(startTimePoint: Logical, endTimePoint: Logical): AutoscaleInfo | null {
    const p1Index = this._pointIndex(this._p1);
    const p2Index = this._pointIndex(this._p2);

    if (p1Index === null || p2Index === null) return null;
    if (endTimePoint < p1Index || startTimePoint > p2Index) return null;

    return {
      priceRange: {
        minValue: this._minPrice,
        maxValue: this._maxPrice,
      },
    };
  }

  updatePoints(p1: RectanglePoint, p2: RectanglePoint) {
    this._p1 = p1;
    this._p2 = p2;
    this._minPrice = Math.min(p1.price, p2.price);
    this._maxPrice = Math.max(p1.price, p2.price);
    this._requestUpdate?.();
  }

  applyOptions(options: Partial<RectangleOptions>) {
    this._options = {
      ...this._options,
      ...options,
    };
    this._requestUpdate?.();
  }

  private _pointIndex(p: RectanglePoint): number | null {
    const coordinate = this._chart.timeScale().timeToCoordinate(p.time);
    if (coordinate === null) return null;
    const index = this._chart.timeScale().coordinateToLogical(coordinate);
    return index;
  }
}
