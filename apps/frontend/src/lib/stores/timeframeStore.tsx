// TradingView-standard timeframe intervals
export type TF = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M';
type Listener = (tf: TF) => void;

let _tf: TF = '1h';
const listeners = new Set<Listener>();

export const timeframeStore = {
  get: () => _tf,
  set: (t: TF) => {
    _tf = t;
    listeners.forEach((l) => l(_tf));
  },
  subscribe: (l: Listener) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
