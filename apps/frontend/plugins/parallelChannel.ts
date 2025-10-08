import { pluginSettingsStore } from '@/lib/pluginSettingsStore';
import type { ToolPlugin } from './types';
const ghostKey = '__fynixGhost';

function uuid() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

export const parallelChannel: ToolPlugin = {
  id: 'parallel-channel',
  label: 'Channel',
  kind: 'tool',
  onPointerDown(e, ctx) {
    const g = (globalThis as any)[ghostKey];
    if (g && g.type === 'channel' && g._plugin === 'parallel-channel')
      (globalThis as any)[ghostKey] = null;
    const { snapped } = ctx.xy(e);
    const st: any =
      (parallelChannel as any)._state ||
      ((parallelChannel as any)._state = { a: null as null | { t: number; p: number } });
    if (!st.a) {
      st.a = snapped;
      (globalThis as any).__fynixAnchor = { t: snapped.t, p: snapped.p };
      return true;
    }
    // second click sets the axis; width default heuristics = 1% of price
    const a = st.a;
    const b = snapped;
    const s = pluginSettingsStore.get();
    let width = Math.abs(a.p) * (s.channelDefaultWidthPct / 100);
    let shape: any = { id: uuid(), type: 'channel', a, b, width };
    if (s.channelWidthMode === 'pixels') {
      const ts = ctx.chart.timeScale();
      const x1 = ts.timeToCoordinate(a.t as any) || 0;
      const x2 = ts.timeToCoordinate(b.t as any) || 0;
      const dx = x2 - x1;
      const candle = ctx.candle;
      const yMid = candle.priceToCoordinate?.((a.p + b.p) / 2) || 0;
      const yP = candle.priceToCoordinate?.((a.p + b.p) / 2 + width) || 0;
      const pix = Math.abs(yP - yMid);
      shape.widthMode = 'pixels';
      shape.widthPx = pix; // render uses pixels
    }
    ctx.draw.add(shape as any);
    (parallelChannel as any)._state = { a: null };
    return true;
  },
  onPointerMove(e, ctx) {
    const st: any = (parallelChannel as any)._state;
    if (!st?.a) return false;
    const { snapped } = ctx.xy(e);
    const a = st.a,
      b = snapped;
    const s = pluginSettingsStore.get();
    let preview: any = {
      type: 'channel',
      a,
      b,
      width: Math.abs(a.p) * (s.channelDefaultWidthPct / 100),
    };
    if (s.channelWidthMode === 'pixels') {
      preview.widthMode = 'pixels';
      preview.widthPx = 20;
    }
    (globalThis as any)[ghostKey] = { ...preview, _plugin: 'parallel-channel' };
    return true;
  },
  onPointerUp() {
    return !!(parallelChannel as any)._state?.a;
  },
};
