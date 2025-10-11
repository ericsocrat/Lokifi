/* ==== Lokifi shims (safe minimal surfaces) ==== */
declare module 'zustand' {
  export type StateCreator<T> = (
    set: (p: Partial<T> | ((s: T) => Partial<T>)) => void,
    get: () => T
  ) => T;

  type UseStore<T> = {
    (): T;
    <U>(selector: (s: T) => U): U; // selector overload
    getState(): T;
    setState(p: Partial<T> | ((s: T) => Partial<T>)): void;
    subscribe(cb: (s: T) => void): () => void;
  };

  // both signatures supported by zustand v4
  export function create<T>(c: StateCreator<T>): UseStore<T>;
  export function create<T>(): (c: StateCreator<T>) => UseStore<T>;
}

declare module 'zustand/middleware' {
  import type { StateCreator } from 'zustand';

  export interface PersistOptions<T> {
    name: string;
    storage?: {
      getItem: (name: string) => string | null | Promise<string | null>;
      setItem: (name: string, value: string) => void | Promise<void>;
      removeItem: (name: string) => void | Promise<void>;
    };
    partialize?: (state: T) => Partial<T>;
    onRehydrateStorage?: (state: T) => ((state?: T, error?: Error) => void) | void;
    version?: number;
    migrate?: (persistedState: unknown, version: number) => T | Promise<T>;
  }

  export function persist<T>(config: StateCreator<T>, options: PersistOptions<T>): StateCreator<T>;
}

declare module 'lightweight-charts' {
  import type {
    ChartOptions,
    IChartApi,
    ISeriesApi,
    LineStyle as LineStyleType,
    PriceScaleApi,
    SeriesDataPoint,
    SeriesMarker,
    SeriesOptions,
    Time,
    TimeScaleApi,
  } from '@/types/lightweight-charts';

  export type {
    ChartOptions,
    IChartApi,
    ISeriesApi,
    PriceScaleApi,
    SeriesDataPoint,
    SeriesMarker,
    SeriesOptions,
    Time,
    TimeScaleApi,
  };

  export function createChart(el: HTMLElement, options?: ChartOptions): IChartApi;
  export const LineStyle: LineStyleType;
}

declare global {
  var __lokifiStopExtras: (() => void) | undefined; // ✅ correct arrow type
}

declare module '@/plugins' {
  import type { Drawing } from '@/types/drawings';

  export interface PluginEnvironment {
    getDrawings: () => Drawing[];
    addDrawing: (drawing: Drawing) => void;
    getSelection: () => Set<string>;
  }

  export interface Registered {
    id: string;
    name: string;
    description?: string;
    defaults?: Record<string, unknown>;
    run?(selection: Set<string>): void;
  }
  export const pluginManager: {
    activeToolId?: string | null;
    hasActiveTool(): boolean;
    setActiveTool(tool: string | null): void;
    pointerDown?(e: PointerEvent): boolean;
    pointerMove?(e: PointerEvent): boolean;
    pointerUp?(e: PointerEvent): boolean;
    setEnv?(env: PluginEnvironment): void;
    list(): Registered[];
  };
  export default pluginManager;
}

export {};
