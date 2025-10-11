
"use client";
import type { LokifiPlugin, PluginCtx, ToolPlugin } from "./types";
import type { IChartApi, ISeriesApi } from "lightweight-charts";
import { drawStore, type Shape } from "@/lib/drawStore";
import { symbolStore } from "@/lib/symbolStore";
import { timeframeStore } from "@/lib/timeframeStore";

export type { PluginManager };

interface Env {
  chart: IChartApi;
  candle: ISeriesApi<"Candlestick">;
  canvas: HTMLCanvasElement;
  snap: (t: number, p: number) => { t: number, p: number };
}

type SafeEnv = {
  [K in keyof Env]: NonNullable<Env[K]>;
};

class PluginManager {
  private plugins: LokifiPlugin[] = [];
  private env: Env | null = null;
  private _activeToolId: string | null = null;

  register(p: LokifiPlugin){
    if (this.plugins.find((x: any) => x.id === p.id)) return;
    this.plugins.push(p);
    if (this.env) p.mount?.(this.ctx());
  }

  list(): LokifiPlugin[] {
    return this.plugins.slice();
  }

  setEnv(env: Env): void {
    if (!env.chart || !env.candle || !env.canvas || !env.snap) {
      throw new Error('Invalid environment configuration');
    }
    this.env = env;
    // mount all plugins with the new environment
    for (const plugin of this.plugins) {
      try {
        plugin.mount?.(this.ctx());
      } catch (err) {
        console.error(`Failed to mount plugin ${plugin.id}:`, err);
      }
    }
  }

  clearEnv(): void {
    if (!this.env) return;
    // safely unmount all plugins
    for (const plugin of this.plugins) {
      try {
        plugin.unmount?.();
      } catch (err) {
        console.error(`Failed to unmount plugin ${plugin.id}:`, err);
      }
    }
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
    const { chart, candle, canvas, snap } = this.env;

    const getPointerPosition = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    const getTimeAndPrice = (x: number, y: number): { time: number, price: number } => {
      const timeScale = chart.timeScale();
      const time = Number(timeScale.coordinateToTime(x));

      // Ensure the candlestick series exists and has the coordinateToPrice method
      if (typeof candle?.coordinateToPrice !== 'function') {
        throw new Error("Candlestick series not properly initialized");
      }
      const price = candle.coordinateToPrice(y);

      if (!timeScale || !Number.isFinite(time) || typeof price !== 'number') {
        throw new Error("Invalid coordinate conversion");
      }

      return { time, price };
    };

    return {
      chart,
      candle,
      canvas,
      symbol: () => symbolStore.get(),
      timeframe: () => timeframeStore.get(),
      snap,
      xy: (e: PointerEvent) => {
        try {
          const { x, y } = getPointerPosition(e);
          const { time, price } = getTimeAndPrice(x, y);
          const snapped = snap(time, price);
          return { x, y, t: time, p: price, snapped };
        } catch (err) {
          console.error('Error computing coordinates:', err);
          return { x: 0, y: 0, t: 0, p: 0, snapped: { t: 0, p: 0 } };
        }
      },
      draw: {
        add: (shape: Shape) => {
          try {
            drawStore.addShape(shape);
          } catch (err) {
            console.error('Error adding shape:', err);
          }
        },
        update: (id: string, updater: (s: Shape) => Shape) => {
          try {
            drawStore.updateShape(id, updater);
          } catch (err) {
            console.error('Error updating shape:', err);
          }
        },
        select: (ids: string[]) => {
          try {
            drawStore.setSelection(Array.isArray(ids) ? ids : Array.from(ids));
          } catch (err) {
            console.error('Error setting selection:', err);
          }
        },
        clearSelection: () => {
          try {
            drawStore.clearSelection();
          } catch (err) {
            console.error('Error clearing selection:', err);
          }
        }
      }
    };
  }

  private active(): ToolPlugin | null {
    if (!this._activeToolId) return null;
    return (this.plugins.find((p: any) => p.id === this._activeToolId) as ToolPlugin) || null;
  }

  pointerDown(e: PointerEvent): boolean {
    const activePlugin = this.active();
    if (!activePlugin?.onPointerDown) return false;
    try {
      activePlugin.onPointerDown(e, this.ctx());
      return true;
    } catch (err) {
      console.error('Plugin pointer down error:', err);
      return false;
    }
  }

  pointerMove(e: PointerEvent): boolean {
    const activePlugin = this.active();
    if (!activePlugin?.onPointerMove) return false;
    try {
      activePlugin.onPointerMove(e, this.ctx());
      return true;
    } catch (err) {
      console.error('Plugin pointer move error:', err);
      return false;
    }
  }

  pointerUp(e: PointerEvent): boolean {
    const activePlugin = this.active();
    if (!activePlugin?.onPointerUp) return false;
    try {
      activePlugin.onPointerUp(e, this.ctx());
      return true;
    } catch (err) {
      console.error('Plugin pointer up error:', err);
      return false;
    }
  }
}

export const pluginManager = new PluginManager();


