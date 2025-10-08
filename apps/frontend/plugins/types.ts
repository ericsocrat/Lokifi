
import type { IChartApi, ISeriesApi } from "lightweight-charts";
import type { Shape } from "@/lib/drawStore";

export type PluginKind = "tool" | "overlay" | "indicator";

export interface PluginCtx {
  chart: IChartApi;
  candle: ISeriesApi<"Candlestick">;
  canvas: HTMLCanvasElement;
  symbol(): string;
  timeframe(): string;
  snap(t:number, p:number): { t:number, p:number };
  xy(e: PointerEvent): { x:number, y:number, t:number, p:number, snapped: { t:number, p:number } };
  draw: {
    add(shape: Shape): void;
    update(id: string, updater: (s: Shape) => Shape): void;
    select(ids: string[]): void;
    clearSelection(): void;
  };
}

export interface ToolPlugin {
  id: string;
  label: string;
  kind: "tool";
  mount?(ctx: PluginCtx): void;
  unmount?(): void;
  onPointerDown?(e: PointerEvent, ctx: PluginCtx): boolean | void;
  onPointerMove?(e: PointerEvent, ctx: PluginCtx): boolean | void;
  onPointerUp?(e: PointerEvent, ctx: PluginCtx): boolean | void;
}

export type FynixPlugin = ToolPlugin; // extend later
