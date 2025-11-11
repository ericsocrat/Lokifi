/**
 * TrendLine Primitive - Based on TradingView's official lightweight-charts example
 * Source: https://github.com/tradingview/lightweight-charts/tree/master/plugin-examples/src/plugins/trend-line
 * 
 * This implementation uses the Primitives API to draw trendlines with proper
 * price/time coordinate conversion, ensuring lines anchor correctly to chart data.
 */

import {
  ISeriesPrimitive,
  SeriesAttachedParameter,
  Time,
  AutoscaleInfo,
  Logical,
  ISeriesApi,
  IChartApi,
  SeriesType,
} from 'lightweight-charts';

interface TrendLinePoint {
  time: Time;
  price: number;
}

interface ViewPoint {
  x: number | null;
  y: number | null;
}

export interface TrendLineOptions {
  lineColor: string;
  lineWidth: number;
  showLabels: boolean;
  labelBackgroundColor: string;
  labelTextColor: string;
  extendLeft?: boolean;
  extendRight?: boolean;
}

const defaultOptions: TrendLineOptions = {
  lineColor: '#2962FF',
  lineWidth: 2,
  showLabels: true,
  labelBackgroundColor: 'rgba(255, 255, 255, 0.85)',
  labelTextColor: '#000000',
  extendLeft: false,
  extendRight: false,
};

class TrendLinePaneRenderer {
  private _p1: ViewPoint;
  private _p2: ViewPoint;
  private _options: TrendLineOptions;
  private _text1: string;
  private _text2: string;

  constructor(
    p1: ViewPoint,
    p2: ViewPoint,
    text1: string,
    text2: string,
    options: TrendLineOptions
  ) {
    this._p1 = p1;
    this._p2 = p2;
    this._text1 = text1;
    this._text2 = text2;
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
      const x1Scaled = Math.round(this._p1.x * scope.horizontalPixelRatio);
      const y1Scaled = Math.round(this._p1.y * scope.verticalPixelRatio);
      const x2Scaled = Math.round(this._p2.x * scope.horizontalPixelRatio);
      const y2Scaled = Math.round(this._p2.y * scope.verticalPixelRatio);

      // Draw line
      ctx.lineWidth = this._options.lineWidth * scope.verticalPixelRatio;
      ctx.strokeStyle = this._options.lineColor;
      ctx.beginPath();
      ctx.moveTo(x1Scaled, y1Scaled);
      ctx.lineTo(x2Scaled, y2Scaled);
      ctx.stroke();

      // Draw labels if enabled
      if (this._options.showLabels) {
        this._drawLabel(scope, this._text1, x1Scaled, y1Scaled, true);
        this._drawLabel(scope, this._text2, x2Scaled, y2Scaled, false);
      }
    });
  }

  private _drawLabel(
    scope: any,
    text: string,
    x: number,
    y: number,
    left: boolean
  ) {
    const ctx = scope.context;
    ctx.font = `${14 * scope.verticalPixelRatio}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial`;
    
    const offset = 5 * scope.horizontalPixelRatio;
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = 14 * scope.verticalPixelRatio;
    const leftAdjustment = left ? textWidth + offset * 4 : 0;

    // Draw background
    ctx.fillStyle = this._options.labelBackgroundColor;
    ctx.beginPath();
    ctx.roundRect(
      x + offset - leftAdjustment,
      y - textHeight - offset,
      textWidth + offset * 2,
      textHeight + offset * 2,
      4 * scope.horizontalPixelRatio
    );
    ctx.fill();

    // Draw text
    ctx.fillStyle = this._options.labelTextColor;
    ctx.fillText(text, x + offset * 2 - leftAdjustment, y - offset);
  }
}

class TrendLinePaneView {
  private _source: TrendLinePrimitive;
  private _p1: ViewPoint = { x: null, y: null };
  private _p2: ViewPoint = { x: null, y: null };

  constructor(source: TrendLinePrimitive) {
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
    return new TrendLinePaneRenderer(
      this._p1,
      this._p2,
      this._source._p1.price.toFixed(2),
      this._source._p2.price.toFixed(2),
      this._source._options
    );
  }

  zOrder(): 'bottom' | 'normal' | 'top' {
    return 'normal';
  }
}

export class TrendLinePrimitive implements ISeriesPrimitive<Time> {
  _chart: IChartApi;
  _series: ISeriesApi<SeriesType>;
  _p1: TrendLinePoint;
  _p2: TrendLinePoint;
  _paneViews: TrendLinePaneView[];
  _options: TrendLineOptions;
  private _minPrice: number;
  private _maxPrice: number;
  private _requestUpdate?: () => void;

  constructor(
    p1: TrendLinePoint,
    p2: TrendLinePoint,
    options?: Partial<TrendLineOptions>
  ) {
    this._p1 = p1;
    this._p2 = p2;
    this._minPrice = Math.min(p1.price, p2.price);
    this._maxPrice = Math.max(p1.price, p2.price);
    this._options = {
      ...defaultOptions,
      ...options,
    };
    this._paneViews = [new TrendLinePaneView(this)];
    // Chart and series will be set in attached()
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

  updatePoints(p1: TrendLinePoint, p2: TrendLinePoint) {
    this._p1 = p1;
    this._p2 = p2;
    this._minPrice = Math.min(p1.price, p2.price);
    this._maxPrice = Math.max(p1.price, p2.price);
    this._requestUpdate?.();
  }

  applyOptions(options: Partial<TrendLineOptions>) {
    this._options = {
      ...this._options,
      ...options,
    };
    this._requestUpdate?.();
  }

  private _pointIndex(p: TrendLinePoint): number | null {
    const coordinate = this._chart.timeScale().timeToCoordinate(p.time);
    if (coordinate === null) return null;
    const index = this._chart.timeScale().coordinateToLogical(coordinate);
    return index;
  }
}
