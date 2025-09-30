/**
 * Typed interfaces for lightweight-charts library
 * Replaces "any" types in shims.d.ts with proper definitions
 */

export type Time = number | string | { timestamp: number };

export interface TimeRange {
  from: Time;
  to: Time;
}

export interface VisibleRange {
  from: Time;
  to: Time;
}

export interface SeriesDataPoint {
  time: Time;
  value?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

export interface CandlestickData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface LineData {
  time: Time;
  value: number;
}

export interface HistogramData {
  time: Time;
  value: number;
  color?: string;
}

export interface AreaData {
  time: Time;
  value: number;
}

export interface SeriesMarker {
  time: Time;
  position: 'aboveBar' | 'belowBar' | 'inBar';
  color?: string;
  shape?: 'circle' | 'square' | 'arrowUp' | 'arrowDown';
  text?: string;
  size?: number;
}

export interface SeriesOptions {
  color?: string;
  lineWidth?: number;
  lineStyle?: number;
  lineType?: number;
  title?: string;
  priceFormat?: {
    type?: 'price' | 'volume' | 'percent' | 'custom';
    precision?: number;
    minMove?: number;
  };
  priceLineVisible?: boolean;
  lastValueVisible?: boolean;
  baseLineVisible?: boolean;
  priceScaleId?: string;
}

export interface TimeScaleOptions {
  rightOffset?: number;
  barSpacing?: number;
  minBarSpacing?: number;
  fixLeftEdge?: boolean;
  fixRightEdge?: boolean;
  lockVisibleTimeRangeOnResize?: boolean;
  rightBarStaysOnScroll?: boolean;
  borderVisible?: boolean;
  borderColor?: string;
  visible?: boolean;
  timeVisible?: boolean;
  secondsVisible?: boolean;
}

export interface ChartOptions {
  width?: number;
  height?: number;
  layout?: {
    background?: { color?: string };
    textColor?: string;
    fontSize?: number;
    fontFamily?: string;
  };
  grid?: {
    vertLines?: { color?: string; visible?: boolean };
    horzLines?: { color?: string; visible?: boolean };
  };
  crosshair?: {
    mode?: number;
    vertLine?: { color?: string; width?: number; style?: number; visible?: boolean; labelVisible?: boolean };
    horzLine?: { color?: string; width?: number; style?: number; visible?: boolean; labelVisible?: boolean };
  };
  priceScale?: {
    position?: 'left' | 'right' | 'none';
    mode?: number;
    autoScale?: boolean;
    invertScale?: boolean;
    alignLabels?: boolean;
    borderVisible?: boolean;
    borderColor?: string;
    scaleMargins?: { top?: number; bottom?: number };
  };
  timeScale?: TimeScaleOptions;
  watermark?: {
    color?: string;
    visible?: boolean;
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    fontStyle?: string;
    horzAlign?: 'left' | 'center' | 'right';
    vertAlign?: 'top' | 'center' | 'bottom';
  };
  handleScroll?: boolean | { mouseWheel?: boolean; pressedMouseMove?: boolean; horzTouchDrag?: boolean; vertTouchDrag?: boolean };
  handleScale?: boolean | { mouseWheel?: boolean; pinch?: boolean; axisPressedMouseMove?: boolean | { time?: boolean; price?: boolean } };
}

export interface TimeScaleApi {
  setVisibleRange(range: VisibleRange): void;
  getVisibleRange(): VisibleRange | null;
  subscribeVisibleTimeRangeChange(cb: (range: VisibleRange | null) => void): void;
  unsubscribeVisibleTimeRangeChange(cb: (range: VisibleRange | null) => void): void;
  timeToCoordinate(time: Time): number | null;
  coordinateToTime(x: number): Time | null;
  scrollPosition(): number;
  scrollToPosition(position: number, animated: boolean): void;
  scrollToRealTime(): void;
  getVisibleLogicalRange(): { from: number; to: number } | null;
  setVisibleLogicalRange(range: { from: number; to: number }): void;
  applyOptions(options: TimeScaleOptions): void;
  options(): TimeScaleOptions;
}

export interface PriceScaleApi {
  applyOptions(options: Record<string, unknown>): void;
  options(): Record<string, unknown>;
  width(): number;
}

export interface ISeriesApi<T = SeriesDataPoint> {
  setData(data: T[]): void;
  update(bar: T): void;
  setMarkers(markers: SeriesMarker[]): void;
  priceToCoordinate(price: number): number | null;
  coordinateToPrice(coordinate: number): number | null;
  applyOptions(options: SeriesOptions): void;
  options(): SeriesOptions;
  priceScale(): PriceScaleApi;
  createPriceLine(options: Record<string, unknown>): { remove: () => void };
}

export interface IChartApi {
  addLineSeries(options?: SeriesOptions): ISeriesApi<LineData>;
  addHistogramSeries(options?: SeriesOptions): ISeriesApi<HistogramData>;
  addCandlestickSeries(options?: SeriesOptions): ISeriesApi<CandlestickData>;
  addAreaSeries(options?: SeriesOptions): ISeriesApi<AreaData>;
  addBaselineSeries(options?: SeriesOptions): ISeriesApi;
  removeSeries(series: ISeriesApi): void;
  subscribeClick(handler: (param: MouseEventParams) => void): void;
  unsubscribeClick(handler: (param: MouseEventParams) => void): void;
  subscribeCrosshairMove(handler: (param: MouseEventParams) => void): void;
  unsubscribeCrosshairMove(handler: (param: MouseEventParams) => void): void;
  applyOptions(options: ChartOptions): void;
  options(): ChartOptions;
  timeScale(): TimeScaleApi;
  priceScale(priceScaleId?: string): PriceScaleApi;
  remove(): void;
  resize(width: number, height: number, forceRepaint?: boolean): void;
  takeScreenshot(): HTMLCanvasElement;
}

export interface MouseEventParams {
  time?: Time;
  point?: { x: number; y: number };
  seriesData: Map<ISeriesApi, SeriesDataPoint | null>;
}

export interface LineStyle {
  Solid: number;
  Dotted: number;
  Dashed: number;
  LargeDashed: number;
  SparseDotted: number;
}
