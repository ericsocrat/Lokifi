/**
 * Fibonacci Retracement Primitive
 * Draws Fibonacci retracement levels (0%, 23.6%, 38.2%, 50%, 61.8%, 100%)
 * between two price points with proper anchoring
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

interface FibPoint {
  time: Time;
  price: number;
}

interface ViewPoint {
  x: number | null;
  y: number | null;
}

export interface FibonacciOptions {
  lineColor: string;
  lineWidth: number;
  showLabels: boolean;
  labelBackgroundColor: string;
  labelTextColor: string;
  levels: number[]; // e.g., [0, 0.236, 0.382, 0.5, 0.618, 1.0]
}

const defaultOptions: FibonacciOptions = {
  lineColor: '#787B86',
  lineWidth: 1,
  showLabels: true,
  labelBackgroundColor: 'rgba(255, 255, 255, 0.85)',
  labelTextColor: '#000000',
  levels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0],
};

const LEVEL_LABELS: Record<number, string> = {
  0: '0%',
  0.236: '23.6%',
  0.382: '38.2%',
  0.5: '50%',
  0.618: '61.8%',
  0.786: '78.6%',
  1.0: '100%',
};

class FibonacciPaneRenderer {
  private _p1: ViewPoint;
  private _p2: ViewPoint;
  private _options: FibonacciOptions;
  private _priceRange: { start: number; end: number };

  constructor(
    p1: ViewPoint,
    p2: ViewPoint,
    priceRange: { start: number; end: number },
    options: FibonacciOptions
  ) {
    this._p1 = p1;
    this._p2 = p2;
    this._priceRange = priceRange;
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

      // Calculate price difference and direction
      const priceDiff = this._priceRange.end - this._priceRange.start;
      const yDiff = y2 - y1;

      // Draw each Fibonacci level
      this._options.levels.forEach((level) => {
        const levelY = y1 + yDiff * level;
        const levelPrice = this._priceRange.start + priceDiff * level;

        // Draw horizontal line
        ctx.strokeStyle = this._options.lineColor;
        ctx.lineWidth = this._options.lineWidth * scope.verticalPixelRatio;
        ctx.setLineDash([5 * scope.horizontalPixelRatio, 5 * scope.horizontalPixelRatio]);
        ctx.beginPath();
        ctx.moveTo(x1, levelY);
        ctx.lineTo(x2, levelY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw label if enabled
        if (this._options.showLabels) {
          this._drawLabel(
            scope,
            `${LEVEL_LABELS[level] || `${(level * 100).toFixed(1)}%`} (${levelPrice.toFixed(2)})`,
            x2,
            levelY
          );
        }
      });

      // Draw main trend line (from p1 to p2)
      ctx.strokeStyle = this._options.lineColor;
      ctx.lineWidth = (this._options.lineWidth + 1) * scope.verticalPixelRatio;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
  }

  private _drawLabel(scope: any, text: string, x: number, y: number) {
    const ctx = scope.context;
    ctx.font = `${12 * scope.verticalPixelRatio}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial`;

    const offset = 5 * scope.horizontalPixelRatio;
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = 12 * scope.verticalPixelRatio;

    // Draw background
    ctx.fillStyle = this._options.labelBackgroundColor;
    ctx.beginPath();
    ctx.roundRect(
      x + offset,
      y - textHeight / 2 - offset,
      textWidth + offset * 2,
      textHeight + offset * 2,
      4 * scope.horizontalPixelRatio
    );
    ctx.fill();

    // Draw text
    ctx.fillStyle = this._options.labelTextColor;
    ctx.fillText(text, x + offset * 2, y + textHeight / 4);
  }
}

class FibonacciPaneView {
  private _source: FibonacciPrimitive;
  private _p1: ViewPoint = { x: null, y: null };
  private _p2: ViewPoint = { x: null, y: null };

  constructor(source: FibonacciPrimitive) {
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
    return new FibonacciPaneRenderer(
      this._p1,
      this._p2,
      { start: this._source._p1.price, end: this._source._p2.price },
      this._source._options
    );
  }

  zOrder(): 'bottom' | 'normal' | 'top' {
    return 'normal';
  }
}

export class FibonacciPrimitive implements ISeriesPrimitive<Time> {
  _chart: IChartApi;
  _series: ISeriesApi<SeriesType>;
  _p1: FibPoint;
  _p2: FibPoint;
  _paneViews: FibonacciPaneView[];
  _options: FibonacciOptions;
  private _minPrice: number;
  private _maxPrice: number;
  private _requestUpdate?: () => void;

  constructor(
    p1: FibPoint,
    p2: FibPoint,
    options?: Partial<FibonacciOptions>
  ) {
    this._p1 = p1;
    this._p2 = p2;
    this._minPrice = Math.min(p1.price, p2.price);
    this._maxPrice = Math.max(p1.price, p2.price);
    this._options = {
      ...defaultOptions,
      ...options,
    };
    this._paneViews = [new FibonacciPaneView(this)];
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

  updatePoints(p1: FibPoint, p2: FibPoint) {
    this._p1 = p1;
    this._p2 = p2;
    this._minPrice = Math.min(p1.price, p2.price);
    this._maxPrice = Math.max(p1.price, p2.price);
    this._requestUpdate?.();
  }

  applyOptions(options: Partial<FibonacciOptions>) {
    this._options = {
      ...this._options,
      ...options,
    };
    this._requestUpdate?.();
  }

  private _pointIndex(p: FibPoint): number | null {
    const coordinate = this._chart.timeScale().timeToCoordinate(p.time);
    if (coordinate === null) return null;
    const index = this._chart.timeScale().coordinateToLogical(coordinate);
    return index;
  }
}
