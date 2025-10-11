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
    expect({ basis: bands.mid[0], upper: bands.upper[0], lower: bands.lower[0] }).toEqual({ basis: null, upper: null, lower: null });
    expect(bands.mid[2]).toBeCloseTo(2);
    expect(typeof bands.upper[5]).toBe("number");
    expect(typeof bands.lower[5]).toBe("number");
  });

  it("vwma matches simple average when volume equal", () => {
    const close = [1, 2, 3, 4];
    const volume = [10, 10, 10, 10];
    const out = vwma(close, volume, 3);
    expect(out[2]).toBeCloseTo(2);
    expect(out[3]).toBeCloseTo(3);
  });

  it("vwap increases with price when anchored", () => {
    const typicalPrice = [1.16666667, 2.16666667, 3.16666667];
    const volume = [100, 100, 100];
    const out = vwap(typicalPrice, volume);
    expect(out[0]).not.toBeNull();
    expect(out[1]! > (out[0] as number)).toBe(true);
    expect(out[2]! > (out[1] as number)).toBe(true);
  });

  it("stdDevChannels returns center/upper/lower after window", () => {
    const vals = [1, 2, 3, 4, 5];
    const ch = stdDevChannels(vals, 3, 2);
    expect({ center: ch.mid[0], upper: ch.upper[0], lower: ch.lower[0] }).toEqual({ center: null, upper: null, lower: null });
    expect(ch.mid[2]).toBeCloseTo(2);
    expect(typeof ch.upper[4]).toBe("number");
    expect(typeof ch.lower[4]).toBe("number");
  });
});

