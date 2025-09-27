
"use client";
import type { FynixPlugin, PluginCtx, ToolPlugin } from "./types";
import type { IChartApi, ISeriesApi } from "lightweight-charts";
import { drawStore, type Shape } from "@/lib/drawStore";
import { symbolStore } from "@/lib/symbolStore";
import { timeframeStore } from "@/lib/timeframeStore";

export type { PluginManager };

type Env = {
  chart: IChartApi;
  candle: ISeriesApi<"Candlestick">;
  canvas: HTMLCanvasElement;
  snap: (t:number, p:number) => { t:number, p:number };
};

class PluginManager {
  private plugins: FynixPlugin[] = [];
  private env: Env | null = null;
  private _activeToolId: string | null = null;

  register(p: FynixPlugin){
    if (this.plugins.find(x => x.id === p.id)) return;
    this.plugins.push(p);
    if (this.env) p.mount?.(this.ctx());
  }

  list(): FynixPlugin[] {
    return this.plugins.slice();
  }

  setEnv(env: Env){
    this.env = env;
    // mount all
    for (const p of this.plugins){ p.mount?.(this.ctx()); }
  }

  clearEnv(){
    for (const p of this.plugins){ p.unmount?.(); }
    this.env = null;
  }

  setActiveTool(id: string | null){
    this._activeToolId = id;
    // also ensure cursor mode in drawStore when plugin active (so our canvas accepts events)
    // Consumers will check hasActiveTool()
  }
  get activeToolId(){ return this._activeToolId; }
  hasActiveTool(){ return !!this._activeToolId; }

  private ctx(): PluginCtx {
    if (!this.env) throw new Error("Plugin env not set");
    const env = this.env;
    return {
      chart: env.chart,
      candle: env.candle,
      canvas: env.canvas,
      symbol: () => symbolStore.get(),
      timeframe: () => timeframeStore.get(),
      snap: env.snap,
      xy: (e: PointerEvent) => {
        const rect = env.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const ts = env.chart.timeScale();
        const t = (ts.coordinateToTime(x) as any as number);
        const p = env.candle.coordinateToPrice(y) ?? 0;
        const snapped = env.snap(t, p);
        return { x, y, t, p, snapped };
      },
      draw: {
        add: (shape: Shape) => drawStore.addShape(shape),
        update: (id, updater) => drawStore.updateShape(id, updater),
        select: (ids) => drawStore.setSelection(ids),
        clearSelection: () => drawStore.clearSelection(),
      }
    };
  }

  private active(): ToolPlugin | null {
    if (!this._activeToolId) return null;
    return (this.plugins.find(p => p.id === this._activeToolId) as ToolPlugin) || null;
  }

  pointerDown(e: PointerEvent): boolean {
    const a = this.active(); if (!a || !a.onPointerDown) return false;
    a.onPointerDown(e, this.ctx());
    return true;
  }
  pointerMove(e: PointerEvent): boolean {
    const a = this.active(); if (!a || !a.onPointerMove) return false;
    a.onPointerMove(e, this.ctx());
    return true;
  }
  pointerUp(e: PointerEvent): boolean {
    const a = this.active(); if (!a || !a.onPointerUp) return false;
    a.onPointerUp(e, this.ctx());
    return true;
  }
}

export const pluginManager = new PluginManager();
