/* ==== Fynix shims (safe minimal surfaces) ==== */
declare module "zustand" {
  export type StateCreator<T> = (set:(p: Partial<T> | ((s: T) => Partial<T>)) => void, get: () => T) => T;

  type UseStore<T> = {
    (): T;
    <U>(selector: (s: T) => U): U;         // selector overload
    getState(): T;
    setState(p: Partial<T> | ((s: T) => Partial<T>)): void;
    subscribe(cb: (s: T) => void): () => void;
  };

  // both signatures supported by zustand v4
  export function create<T>(c: StateCreator<T>): UseStore<T>;
  export function create<T>(): (c: StateCreator<T>) => UseStore<T>;
}

declare module "zustand/middleware" { export const persist: any; }

declare module "lightweight-charts" {
  export type Time = number | string | { timestamp: number };

  export interface TimeScaleApi {
    setVisibleRange(r: any): void;
    getVisibleRange(): any;
    subscribeVisibleTimeRangeChange(cb: (r: any) => void): void;
    unsubscribeVisibleTimeRangeChange?(cb: (r: any) => void): void;
    timeToCoordinate(t: Time): number | null;
    coordinateToTime(x: number): Time | null;
  }

  export interface ISeriesApi<T = any> {
    setData(data: any[]): void;
    setMarkers?(m: any[]): void;
    priceToCoordinate?(p: number): number | null;
    coordinateToPrice?(c: number): number | null;
    applyOptions?(o: Record<string, any>): void;
  }

  export interface IChartApi {
    addLineSeries(opts?: Record<string, any>): ISeriesApi;
    addHistogramSeries(opts?: Record<string, any>): ISeriesApi;
    addCandlestickSeries(opts?: Record<string, any>): ISeriesApi;
    addAreaSeries(opts?: Record<string, any>): ISeriesApi;
    remove(): void;
    applyOptions(opts: Record<string, any>): void;
    timeScale(): TimeScaleApi;
    rightPriceScale(): any;
  }

  export function createChart(el: HTMLElement, options?: Record<string, any>): IChartApi;
  export const LineStyle: any;
}

declare global {
  var __fynixStopExtras: (() => void) | undefined;  // ✅ correct arrow type
}

declare module "@/plugins" {
  export interface Registered {
    id: string;
    name: string;
    description?: string;
    defaults?: Record<string, any>;
    run?(sel: any): void;
  }
  export const pluginManager: {
    activeToolId?: string | null;
    hasActiveTool(): boolean;
    setActiveTool(tool: string | null): void;
    pointerDown?(e: PointerEvent): boolean;
    pointerMove?(e: PointerEvent): boolean;
    pointerUp?(e: PointerEvent): boolean;
    setEnv?(env: any): void;
    list(): Registered[];
  };
  export default pluginManager;
}

export {};