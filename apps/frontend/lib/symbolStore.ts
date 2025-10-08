type Listener = (sym: string) => void;

let _symbol = "BTCUSD";
const listeners = new Set<Listener>();

export const symbolStore = {
  get: () => _symbol,
  set: (s: string) => {
    _symbol = s.toUpperCase();
    listeners.forEach((l: any) => l(_symbol));
  },
  subscribe: (l: Listener) => {
    listeners.add(l);
    return () => listeners.delete(l);
  }
};
