/* ===== Path alias catch-alls (keeps TS happy while we normalize code) ===== */
declare module "@/*";
declare module "@/app/*";
declare module "@/components/*";
declare module "@/lib/*";
declare module "@/state/*";
declare module "@/plugins/*";

/* ===== Lightweight Charts minimal types (enough for our usage) ===== */
declare module "lightweight-charts" {
  export type Time = number | string | { timestamp: number };
  export type LineData = { time: Time; value: number };
  export type HistogramData = { time: Time; value: number };
  export type CandlestickData = { time: Time; open: number; high: number; low: number; close: number };

  export type SeriesOptions = Record<string, any>;
  export interface ISeriesApi<T = any> {
    setData(data: any[]): void;
    setMarkers?(m: any[]): void;
    priceToCoordinate?(p: number): number | null;
    coordinateToPrice?(c: number): number | null;
  }

  export interface IChartApi {
    addLineSeries(opts?: SeriesOptions): ISeriesApi<LineData>;
    addHistogramSeries(opts?: SeriesOptions): ISeriesApi<HistogramData>;
    addCandlestickSeries(opts?: SeriesOptions): ISeriesApi<CandlestickData>;
    remove(): void;
    applyOptions(opts: Record<string, any>): void;
    timeScale(): {
      setVisibleRange(r: any): void;
      subscribeVisibleTimeRangeChange(cb: (r: any) => void): void;
      timeToCoordinate(t: Time): number | null;
      coordinateToTime(x: number): Time | null;
    };
    rightPriceScale(): any;
  }

  export function createChart(container: HTMLElement, options?: Record<string, any>): IChartApi;
}

/* ===== Browser globals we reference defensively ===== */
declare global {
  interface Window {
    __fynixChart?: any;
    __fynixCandle?: any;
    __fynixGhost?: any;
    __fynixIntersections?: Array<{ t: number; p: number; x: number; y: number }>;
    __fynixHUD?: any;
    __fynixMarquee?: any;
    __fynixApplySymbolSettings?: () => void;
    __fynixClearSymbolSettings?: () => void;
  }
}

/* ===== Minimal plugin manager surface used by UI ===== */
declare module "@/plugins" {
  export const pluginManager: { activeToolId?: string;
    hasActiveTool(): boolean;
    setActiveTool(tool: string | null): void;
    pointerDown?(e: PointerEvent): boolean;
    pointerMove?(e: PointerEvent): boolean;
    pointerUp?(e: PointerEvent): boolean;
    setEnv?(env: any): void;
  };
  export default pluginManager;
}

/* ===== Drawing types used by components (loose for now) ===== */
declare module "@/lib/drawings" {
  export type Drawing = any;
  export function createDrawing(kind: string, p: { x: number; y: number }): Drawing | null;
  export function updateDrawingGeometry(dr: Drawing, p: { x: number; y: number }): Drawing;
}

/* ===== Store surface (only what components use) ===== */
declare module "@/state/store" {
  export function useChartStore(): any;
  export const store: any;
}

/* ===== Misc helpers referenced around the app (loose declarations) ===== */
declare module "@/lib/geom" {
  export function distanceToSegment(a: {x:number;y:number}, b:{x:number;y:number}, p:{x:number;y:number}): number;
  export function rectFromPoints(a:{x:number;y:number}, b:{x:number;y:number}): {x:number;y:number;w:number;h:number};
  export function withinRect(p:{x:number;y:number}, r:{x:number;y:number;w:number;h:number}): boolean;
}

declare module 'zustand' {
  export type StateCreator<T> = (set:any,get:any)=>T
  export function create<T>(c: StateCreator<T>): { ():T; getState():T; setState(p:Partial<T>):void; subscribe(cb:(s:T)=>void):()=>void };
}
declare module 'zustand/middleware' { export const persist:any; }


declare module "lightweight-charts" {
  export const LineStyle: any;
}
