// frontend/src/lib/indicators.test.ts
import { describe, it, expect } from "vitest";
import {
  sma,
  ema,
  bollinger,
  vwma,
  vwap,
  stdDevChannels,
  type Candle,
} from "./indicators";

describe("indicators", () => {
  it("sma works", () => {
    const vals = [1, 2, 3, 4, 5];
    const out = sma(vals, 3);
    expect(out).toEqual([null, null, 2, 3, 4]);
  });

  it("ema seeds and runs", () => {
    const vals = [1, 2, 3, 4, 5, 6];
    const out = ema(vals, 3);
    expect(out.slice(0, 2)).toEqual([null, null]);
    expect(out[2]).not.toBeNull();
    expect(typeof out[3]).toBe("number");
  });

  it("bollinger outputs bands after window", () => {
    const vals = [1, 2, 3, 4, 5, 6];
    const bands = bollinger(vals, 3, 2);
    expect(bands[0]).toEqual({ basis: null, upper: null, lower: null });
    expect(bands[2].basis).toBeCloseTo(2);
    expect(typeof bands[5].upper).toBe("number");
    expect(typeof bands[5].lower).toBe("number");
  });

  it("vwma matches simple average when volume equal", () => {
    const candles: Candle[] = [
      { time: 0, open: 1, high: 1, low: 1, close: 1, volume: 10 },
      { time: 1, open: 2, high: 2, low: 2, close: 2, volume: 10 },
      { time: 2, open: 3, high: 3, low: 3, close: 3, volume: 10 },
      { time: 3, open: 4, high: 4, low: 4, close: 4, volume: 10 },
    ];
    const out = vwma(candles, 3);
    expect(out[2]).toBeCloseTo(2);
    expect(out[3]).toBeCloseTo(3);
  });

  it("vwap increases with price when anchored", () => {
    const candles: Candle[] = [
      { time: 0, open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 },
      { time: 1, open: 2, high: 3, low: 1.5, close: 2.5, volume: 100 },
      { time: 2, open: 3, high: 4, low: 2.5, close: 3.5, volume: 100 },
    ];
    const out = vwap(candles, 0);
    expect(out[0]).not.toBeNull();
    expect(out[1]! > (out[0] as number)).toBe(true);
    expect(out[2]! > (out[1] as number)).toBe(true);
  });

  it("stdDevChannels returns center/upper/lower after window", () => {
    const vals = [1, 2, 3, 4, 5];
    const ch = stdDevChannels(vals, 3, 2);
    expect(ch[0]).toEqual({ center: null, upper: null, lower: null });
    expect(ch[2].center).toBeCloseTo(2);
    expect(typeof ch[4].upper).toBe("number");
    expect(typeof ch[4].lower).toBe("number");
  });
});
