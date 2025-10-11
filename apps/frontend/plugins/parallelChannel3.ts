import { pluginSettingsStore } from '@/lib/pluginSettingsStore';
import type { ToolPlugin } from './types';
const ghostKey = '__lokifiGhost';

function uuid() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

export const parallelChannel3: ToolPlugin = {
  id: 'parallel-channel-3pt',
  label: 'Channel 3pt',
  kind: 'tool',
  onPointerDown(e, ctx) {
    const g = (globalThis as any)[ghostKey];
    if (g && g.type === 'channel3' && g._plugin === 'parallel-channel-3pt')
      (globalThis as any)[ghostKey] = null;
    const { snapped } = ctx.xy(e);
    const st: any =
      (parallelChannel3 as any)._state ||
      ((parallelChannel3 as any)._state = { a: null as any, b: null as any });
    if (!st.a) {
      st.a = snapped;
      (globalThis as any).__lokifiAnchor = { t: snapped.t, p: snapped.p };
      return true;
    }
    if (!st.b) {
      st.b = snapped;
      return true;
    }
    const a = st.a,
      b = st.b,
      c = snapped;
    ctx.draw.add({ id: uuid(), type: 'channel3', a, b, c } as any);
    (parallelChannel3 as any)._state = { a: null, b: null };
    return true;
  },
  onPointerMove(e, ctx) {
    const st: any = (parallelChannel3 as any)._state;
    const { snapped } = ctx.xy(e);
    if (!st?.a) return false;
    if (!st?.b) {
      (globalThis as any)[ghostKey] = {
        type: 'trendline',
        a: st.a,
        b: snapped,
        _plugin: 'parallel-channel-3pt',
      };
      return true;
    }
    const a = st.a,
      b = st.b,
      c = snapped;
    const s = pluginSettingsStore.get();
    let preview: any = { type: 'channel3', a, b, c };
    if (s.channelWidthMode === 'pixels') {
      preview.widthMode = 'pixels';
      preview.widthPx = 20;
    }
    (globalThis as any)[ghostKey] = { ...preview, _plugin: 'parallel-channel-3pt' };
    return true;
  },
  onPointerUp() {
    return true;
  },
};

