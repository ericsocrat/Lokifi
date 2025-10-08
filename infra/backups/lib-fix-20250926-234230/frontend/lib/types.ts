export type Candle = { ts: number; o: number; h: number; l: number; c: number; v: number };
export type OHLCResponse = { symbol: string; timeframe: string; candles: Candle[] };
