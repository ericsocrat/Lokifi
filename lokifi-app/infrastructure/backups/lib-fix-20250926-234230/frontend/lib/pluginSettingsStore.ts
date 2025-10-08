
type Settings = {
  channelDefaultWidthPct: number; // % of price at point A
  channelWidthMode: 'percent' | 'pixels'; // width defined by % of price or constant pixels
  fibPreset: "Classic" | "Extended" | "Aggressive" | "Custom";
  perSymbolEnabled?: boolean;
  fibCustomLevels: number[];
};
const DEFAULT: Settings = {
  channelDefaultWidthPct: 1.0,
  channelWidthMode: "percent",
  fibPreset: "Extended",
  fibCustomLevels: [0,0.236,0.382,0.5,0.618,0.786,1,1.272,1.414,1.618,2,2.618],
};
const KEY = "lokifi.plugins.settings";
const KEY_OVR = 'lokifi.plugins.settings.overrides';
const listeners = new Set<(s: Settings)=>void>();
let _s: Settings = load();
function load(): Settings{
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT, ...parsed };
  } catch { return { ...DEFAULT }; }
}
function save(){
  try { localStorage.setItem(KEY, JSON.stringify(_s)); } catch {}
  listeners.forEach(l=>l(_s));
}
export const pluginSettingsStore = {
  get(): Settings { return _s; },
  subscribe(fn: (s: Settings)=>void){ listeners.add(fn); fn(_s); return ()=> listeners.delete(fn); },
  set<K extends keyof Settings>(k: K, v: Settings[K]){ _s = { ..._s, [k]: v } as Settings; save(); },
  reset(){ _s = { ...DEFAULT }; save(); },
};

type OverrideMap = { [key: string]: Partial<Settings> };
function readOverrides(): OverrideMap { try{ const raw = localStorage.getItem(KEY_OVR); return raw ? JSON.parse(raw) as OverrideMap : {}; } catch { return {}; } }
function writeOverrides(m: OverrideMap){ try{ localStorage.setItem(KEY_OVR, JSON.stringify(m)); } catch {} }
export const pluginSymbolSettings = {
  get(symbol: string, timeframe: string): Partial<Settings> {
    const map = readOverrides(); return map[`${symbol}.${timeframe}`] || {};
  },
  set(symbol: string, timeframe: string, patch: Partial<Settings>){
    const map = readOverrides(); map[`${symbol}.${timeframe}`] = { ...(map[`${symbol}.${timeframe}`] || {}), ...patch }; writeOverrides(map); listeners.forEach(l=>l(_s));
  },
  clear(symbol: string, timeframe: string){ const map = readOverrides(); delete map[`${symbol}.${timeframe}`]; writeOverrides(map); listeners.forEach(l=>l(_s)); },
  listKeys(): string[]{ return Object.keys(readOverrides()); }
};
