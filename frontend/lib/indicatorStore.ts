export type IndicatorParams = {
  bbPeriod: number;
  bbMult: number;
  vwmaPeriod: number;
  stddevPeriod: number;
  stddevMult: number;
};

export type IndicatorStyle = {
  bbFillColor: string;     // hex like #3B82F6
  bbFillOpacity: number;   // 0..1
  palette?: string;          // 'Brand' | 'Calm' | 'Heatmap'
};

const DEFAULT_PARAMS: IndicatorParams = { bbPeriod: 20, bbMult: 2, vwmaPeriod: 20, stddevPeriod: 20, stddevMult: 2 };
const DEFAULT_STYLE: IndicatorStyle = { bbFillColor: "#3B82F6", bbFillOpacity: 0.15, palette: "Brand" };

const PALETTES: Record<string, { color: string; opacity: number }> = {
  Brand:   { color: "#3B82F6", opacity: 0.15 },
  Calm:    { color: "#22C55E", opacity: 0.12 },
  Heatmap: { color: "#EF4444", opacity: 0.18 },
};

function clamp01(x: number){ return Math.max(0, Math.min(1, x)); }
function save(){ try { localStorage.setItem(LS_KEY, JSON.stringify(_state)); } catch {} }
function saveSymbol(sym: string){ try { localStorage.setItem(`${LS_KEY}.symbol.${sym}`, JSON.stringify(_state)); } catch {} }
function loadSymbol(sym: string){ try { return JSON.parse(localStorage.getItem(`${LS_KEY}.symbol.${sym}`) || 'null'); } catch { return null; } }
function clearSymbol(sym: string){ try { localStorage.removeItem(`${LS_KEY}.symbol.${sym}`); } catch {} }


export type IndicatorState = {
  ema20: boolean;
  ema50: boolean;
  rsi: boolean;
  macd: boolean;
  bband: boolean;
  bbFill: boolean;
  vwap: boolean;
  vwma: boolean;
  stddev: boolean;
  params: IndicatorParams;
  style: IndicatorStyle;
  bband: boolean;
  vwap: boolean;
};

type Listener = (s: IndicatorState) => void;

const LS_KEY = "fynix.indicators";

function load(): IndicatorState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ema20: parsed.ema20 ?? true,
        ema50: parsed.ema50 ?? false,
        rsi: parsed.rsi ?? true,
        macd: parsed.macd ?? false,
        bband: parsed.bband ?? false,
        bbFill: parsed.bbFill ?? true,
        vwap: parsed.vwap ?? false,
        vwma: parsed.vwma ?? false,
        stddev: parsed.stddev ?? false,
        params: { ...DEFAULT_PARAMS, ...(parsed.params || {}) },
        style: { ...DEFAULT_STYLE, ...(parsed.style || {}) }
      };
    }
  } catch {}
  return { ema20: true, ema50: false, rsi: true, macd: false, bband: false, bbFill: true, vwap: false, vwma: false, stddev: false, params: DEFAULT_PARAMS, style: DEFAULT_STYLE };
}

let _state: IndicatorState = (typeof window === "undefined") ? { ema20: true, ema50: false, rsi: true, macd: false, bband: false, bbFill: true, vwap: false, vwma: false, stddev: false, params: DEFAULT_PARAMS, style: DEFAULT_STYLE } : load();
const listeners = new Set<Listener>();

function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(_state)); } catch {}
}

export const indicatorStore = {
  get: (): IndicatorState => _state,
  set(partial: Partial<IndicatorState>) {
    _state = { ..._state, ...partial };
    save();
    listeners.forEach(l => l(_state));
  },
  subscribe(l: Listener) {
    listeners.add(l);
    l(_state);
    return () => listeners.delete(l);
  }
  ,reset() {
    _state = { ema20: true, ema50: false, rsi: true, macd: false, bband: false, bbFill: true, vwap: false, vwma: false, stddev: false, params: DEFAULT_PARAMS, style: DEFAULT_STYLE };
    save();
    listeners.forEach(l => l(_state));
  }

  ,applyPalette(name: string){
    const p = PALETTES[name];
    if (!p) return;
    _state = { ..._state, style: { ..._state.style, bbFillColor: p.color, bbFillOpacity: clamp01(p.opacity), palette: name } };
    save();
    listeners.forEach(l => l(_state));
  }
  ,loadForSymbol(sym: string){
    const s = loadSymbol(sym);
    if (!s) return false;
    _state = {
      ema20: s.ema20 ?? _state.ema20,
      ema50: s.ema50 ?? _state.ema50,
      rsi: s.rsi ?? _state.rsi,
      macd: s.macd ?? _state.macd,
      bband: s.bband ?? _state.bband,
      bbFill: s.bbFill ?? _state.bbFill,
      vwap: s.vwap ?? _state.vwap,
      vwma: s.vwma ?? _state.vwma,
      stddev: s.stddev ?? _state.stddev,
      params: { ..._state.params, ...(s.params || {}) },
      style: { ..._state.style, ...(s.style || {}) },
    };
    listeners.forEach(l => l(_state));
    return true;
  }
  ,saveForSymbol(sym: string){ saveSymbol(sym); }
  ,clearForSymbol(sym: string){ clearSymbol(sym); }
};
