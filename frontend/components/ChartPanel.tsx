"use client";
import ChartSidebar from "@/components/ChartSidebar";
import { API } from "@/lib/api";
import { drawStore, type Shape } from "@/lib/drawStore";
import { indicatorStore } from "@/lib/indicatorStore";
import { bollinger, ema, macd, rsi, stddevChannels, vwap, vwma } from "@/lib/indicators";
import { symbolStore } from "@/lib/symbolStore";
import { timeframeStore } from "@/lib/timeframeStore";
import type { OHLCResponse } from "@/lib/types";
import { pluginManager } from "@/plugins/registry";
import type { LokifiGlobalThis, LokifiWindow } from "@/types/lokifi";
import { createChart, IChartApi, ISeriesApi, Time } from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";

// Helpers that were missing
function angleDeg(x1: number, y1: number, x2: number, y2: number) {
  return (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
}
function tfToSeconds(tf: string): number {
  const n = parseInt(tf, 10);
  if (Number.isFinite(n)) {
    if (tf.endsWith("m")) return n * 60;
    if (tf.endsWith("h")) return n * 3600;
    if (tf.endsWith("d")) return n * 86400;
    if (tf.endsWith("w")) return n * 604800;
  }
  // default assume minutes
  return (Number.isFinite(n) ? n : 1) * 60;
}
function barsFromTimes(aSec: number, bSec: number, tf: string) {
  const dt = Math.abs(bSec - aSec);
  const spb = tfToSeconds(tf) || 60;
  return dt / spb;
}

function hexToRGBA(hex: string, a: number) {
  const m = hex.replace("#", "");
  const bigint = parseInt(m.length === 3 ? m.split("").map(c => c + c).join("") : m, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${a})`;
}

export default function ChartPanel() {
  const ref = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  const [inds, setInds] = useState(indicatorStore.get());
  const params = inds.params; const style = inds.style;
  useEffect(() => {
    const unsub = indicatorStore.subscribe(st => setInds(st));
    return () => { unsub(); };
  }, []);

  const [sym, setSym] = useState(symbolStore.get());
  useEffect(() => {
    const unsub = symbolStore.subscribe(s => { setSym(s); indicatorStore.loadForSymbol(s); drawStore.loadCurrent(); });
    return () => { unsub(); };
  }, []);

  const [tf, setTf] = useState(timeframeStore.get());
  useEffect(() => {
    const unsub = timeframeStore.subscribe(t => { setTf(t); drawStore.loadCurrent(); });
    return () => { unsub(); };
  }, []);

  const { data } = useSWR<OHLCResponse>(`${API}/ohlc?symbol=${sym}&timeframe=${tf}&limit=500`);

  // Always use mock data for testing until backend API is fixed
  const mockData = {
    symbol: sym,
    timeframe: tf,
    candles: Array.from({ length: 100 }, (_, i) => {
      const time = Date.now() - (100 - i) * 3600 * 1000;
      const price = 50000 + Math.sin(i / 10) * 2000 + Math.random() * 1000;
      return {
        ts: time,
        o: price,
        h: price + Math.random() * 500,
        l: price - Math.random() * 500,
        c: price + (Math.random() - 0.5) * 400,
        v: Math.random() * 1000
      };
    })
  };

  // Bind per-symbol apply/clear functions for the settings drawer (guarded)
  useEffect(() => {
    const pss = (globalThis as any as LokifiGlobalThis).pluginSettingsStore;
    const pssym = (globalThis as any as LokifiGlobalThis).pluginSymbolSettings;
    (window as LokifiWindow).__lokifiApplySymbolSettings = () => {
      try {
        const s = pss?.get?.();
        if (!s || !pssym?.set) return;
        pssym.set(sym, tf, {
          channelDefaultWidthPct: s.channelDefaultWidthPct,
          channelWidthMode: s.channelWidthMode,
          fibPreset: s.fibPreset,
          fibCustomLevels: s.fibCustomLevels
        });
      } catch { }
    };
    (window as any).__lokifiClearSymbolSettings = () => {
      try { pssym?.clear?.(sym, tf); } catch { }
    };
    return () => { delete (window as any).__lokifiApplySymbolSettings; delete (window as any).__lokifiClearSymbolSettings; };
  }, [sym, tf]);

  // Build chart
  useEffect(() => {
    const el = ref.current;
    const chartData = mockData; // Always use mock data for now
    if (!el || !chartData) return;

    const mainHeight = (inds.rsi || inds.macd) ? 360 : 520;
    const chart = createChart(el, {
      height: mainHeight,
      layout: { background: { color: "#0a0a0a" }, textColor: "#e5e7eb" },
      grid: { vertLines: { color: "#1f2937" }, horzLines: { color: "#1f2937" } },
      rightPriceScale: { borderColor: "#374151" },
      timeScale: { timeVisible: true }
    });
    const candle = chart.addCandlestickSeries();
    const candles = (chartData?.candles || []).map(c => ({ time: Math.floor(c.ts / 1000) as Time, open: c.o, high: c.h, low: c.l, close: c.c }));
    candle.setData(candles);

    const closes = (chartData?.candles || []).map(c => c.c);
    const highs = (chartData?.candles || []).map(c => c.h);
    const lows = (chartData?.candles || []).map(c => c.l);
    const vols = (chartData?.candles || []).map(c => c.v ?? 0);

    const overlayLine = (vals: (number | null)[] | null, width = 2) => {
      if (!vals) return null;
      const line = chart.addLineSeries({ lineWidth: width });
      line.setData(vals.map((v, i) => v == null ? { time: candles[i].time, value: NaN } : { time: candles[i].time, value: v }));
      return line;
    };

    overlayLine(inds.ema20 ? ema(closes, 20) : null);
    overlayLine(inds.ema50 ? ema(closes, 50) : null);

    // Bollinger + fill
    if (inds.bband) {
      const bb = bollinger(closes, params.bbPeriod ?? 20, params.bbMult ?? 2);
      overlayLine(bb.mid, 1);
      const u = chart.addLineSeries({ lineWidth: 1 });
      const l = chart.addLineSeries({ lineWidth: 1 });
      u.setData(bb.upper.map((v, i) => ({ time: candles[i].time, value: (v ?? NaN) as number })));
      l.setData(bb.lower.map((v, i) => ({ time: candles[i].time, value: (v ?? NaN) as number })));
      if (inds.bbFill) {
        const top = chart.addAreaSeries({ lineWidth: 0, topColor: hexToRGBA(style.bbFillColor, style.bbFillOpacity), bottomColor: hexToRGBA(style.bbFillColor, style.bbFillOpacity) });
        top.setData(bb.upper.map((v, i) => ({ time: candles[i].time, value: (v ?? NaN) as number })));
        const bot = chart.addAreaSeries({ lineWidth: 0, topColor: 'rgba(11,11,15,1)', bottomColor: 'rgba(11,11,15,1)' });
        bot.setData(bb.lower.map((v, i) => ({ time: candles[i].time, value: (v ?? NaN) as number })));
      }
    }

    // VWAP/VWMA
    if (inds.vwap) {
      const typ = closes.map((c, i) => (highs[i] + lows[i] + c) / 3);
      const hasVol = vols.some(v => v && v > 0);
      overlayLine(hasVol ? vwap(typ, vols) : ema(typ, 20), 2);
    }
    if (inds.vwma) {
      const hasVol = vols.some(v => v && v > 0);
      overlayLine(hasVol ? vwma(closes, vols, params.vwmaPeriod ?? 20) : ema(closes, params.vwmaPeriod ?? 20), 2);
    }

    if (inds.stddev) {
      const sd = stddevChannels(closes, params.stddevPeriod ?? 20, params.stddevMult ?? 2);
      overlayLine(sd.mid, 1); overlayLine(sd.upper, 1); overlayLine(sd.lower, 1);
    }

    // Subpane
    let subChart: any = null;
    if ((inds.rsi || inds.macd) && subRef.current) {
      subChart = createChart(subRef.current, {
        height: 180,
        layout: { background: { color: "#0a0a0a" }, textColor: "#e5e7eb" },
        grid: { vertLines: { color: "#1f2937" }, horzLines: { color: "#1f2937" } },
        rightPriceScale: { borderColor: "#374151" },
        timeScale: { timeVisible: true }
      });
      if (inds.rsi) {
        const r = rsi(closes, 14);
        const line = subChart.addLineSeries(); line.setData(r.map((v, i) => ({ time: candles[i].time, value: (v ?? NaN) as number })));
      }
      if (inds.macd) {
        const m = macd(closes, 12, 26, 9);
        const hist = subChart.addHistogramSeries(); hist.setData(m.hist.map((v, i) => ({ time: candles[i].time, value: (v ?? NaN) as number })));
        const sig = subChart.addLineSeries({ lineWidth: 1 }); sig.setData(m.signalLine.map((v, i) => ({ time: candles[i].time, value: (v ?? NaN) as number })));
      }
      const sync = () => {
        const rScale = subChart.timeScale(); const mScale = chart.timeScale();
        rScale.subscribeVisibleTimeRangeChange((range: { from: number; to: number }) => { if (range) mScale.setVisibleRange(range); });
        mScale.subscribeVisibleTimeRangeChange((range: { from: number; to: number }) => { if (range) rScale.setVisibleRange(range); });
      };
      sync();
    }

    const resize = () => {
      chart.applyOptions({ width: el.clientWidth });
      if (subChart) subChart.applyOptions({ width: el.clientWidth });
      const canvas = overlayRef.current; if (canvas) { canvas.style.width = el.clientWidth + 'px'; canvas.width = el.clientWidth * (window.devicePixelRatio || 1); }
    };
    resize();
    window.addEventListener("resize", resize);

    (window as any).__lokifiChart = chart;
    (window as any).__lokifiCandle = candle;

    // Plugin env: snap + optional settings override
    const nearestSnap = (t: number, p: number) => {
      const cs = (data?.candles || []);
      if (!cs.length || !drawStore.get().snap) return { t, p } as any;
      let best = 0, bestd = Infinity;
      for (let i = 0; i < cs.length; i++) { const d = Math.abs((cs[i].ts / 1000) - t); if (d < bestd) { bestd = d; best = i; } }
      const c = cs[best];
      const prices = [c.o, c.h, c.l, c.c];
      let bestp = prices[0], bestpd = Math.abs(prices[0] - p);
      for (const pr of prices) { const d = Math.abs(pr - p); if (d < bestpd) { bestpd = d; bestp = pr; } }
      return { t: cs[best].ts / 1000, p: bestp };
    };
    const canvas = overlayRef.current!;
    // Apply symbol overrides by patching store getters to merge overrides (best effort)
    try {
      const pss: any = (globalThis as any).pluginSettingsStore;
      const pssym: any = (globalThis as any).pluginSymbolSettings;
      const origGet = pss?.get?.bind(pss);
      if (origGet && pssym?.get) {
        (pss as any).get = function () {
          const base = origGet();
          try { const ov = pssym.get(sym, tf); return { ...base, ...ov }; } catch { return base; }
        };
      }
    } catch { }
    pluginManager.setEnv({ chart, candle, canvas, snap: nearestSnap });

    return () => {
      window.removeEventListener("resize", resize);
      chart.remove(); if (subChart) subChart.remove();
    };
  }, [data, mockData, inds]);

  // Overlay draw: shapes + selection handles + labels + marquee box
  useEffect(() => {
    const canvas = overlayRef.current; if (!canvas || !data || !ref.current) return;
    const el = ref.current as HTMLDivElement;
    const width = el.clientWidth; const height = (inds.rsi || inds.macd) ? 360 : 520;
    canvas.width = width * (window.devicePixelRatio || 1);
    canvas.height = height * (window.devicePixelRatio || 1);
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';

    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, width, height);

    const chart = (window as any).__lokifiChart as IChartApi;
    const candle = (window as any).__lokifiCandle as ISeriesApi<"Candlestick">;
    if (!chart || !candle) return;

    const ts = chart.timeScale();
    const priceToY = (price: number): number => {
      if (!candle?.priceToCoordinate) return 0;
      return candle.priceToCoordinate(price) ?? 0;
    };

    const timeToX = (t: number): number => {
      if (!ts?.timeToCoordinate) return 0;
      return ts.timeToCoordinate(t as Time) ?? 0;
    };

    const HANDLE = 5;
    const dist = (x1: number, y1: number, x2: number, y2: number, px: number, py: number) => {
      const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1; const dot = A * C + B * D; const len_sq = C * C + D * D || 1; const t = Math.max(0, Math.min(1, dot / len_sq)); const xx = x1 + t * C, yy = y1 + t * D; return Math.hypot(px - xx, py - yy);
    };
    function drawHandle(x: number, y: number) {
      if (!ctx) return;
      ctx.save();
      ctx.fillStyle = 'rgba(59,130,246,0.95)';
      ctx.strokeStyle = 'rgba(17,24,39,1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(x - HANDLE, y - HANDLE, HANDLE * 2, HANDLE * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    const drawLine = (x1: number, y1: number, x2: number, y2: number, dash = false) => { ctx.save(); if (dash) ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = 'rgba(229,231,235,0.9)'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); };
    const drawLabel = (x: number, y: number, text: string) => {
      const padX = 6; const h = 18; const r = 6;
      ctx.save(); ctx.font = '12px ui-sans-serif, system-ui, -apple-system'; const w = ctx.measureText(text).width + padX * 2;
      const rx = x; const ry = y - h / 2;
      ctx.fillStyle = 'rgba(17,24,39,0.9)'; ctx.strokeStyle = 'rgba(59,130,246,0.9)';
      ctx.beginPath();
      ctx.moveTo(rx + r, ry); ctx.arcTo(rx + w, ry, rx + w, ry + h, r); ctx.arcTo(rx + w, ry + h, rx, ry + h, r); ctx.arcTo(rx, ry + h, rx, ry, r); ctx.arcTo(rx, ry, rx + w, ry, r);
      ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#e5e7eb'; ctx.fillText(text, rx + padX, ry + h / 2 + 4); ctx.restore();
    };
    const fmt = (n: number) => (Math.abs(n) >= 1 ? n.toFixed(2) : n.toFixed(6));
    const drawInfo = (x1: number, y1: number, x2: number, y2: number, aSec: number, bSec: number, p1: number, p2: number) => {
      const ang = angleDeg(x1, y1, x2, y2);
      const bars = barsFromTimes(aSec, bSec, tf as any);
      const dp = p2 - p1; const pct = p1 ? (dp / p1) * 100 : 0;
      const midx = (x1 + x2) / 2, midy = (y1 + y2) / 2;
      drawLabel(midx - 36, midy + 16, `${ang.toFixed(1)}°  |  Δ${fmt(dp)}  (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)  |  ${bars.toFixed(1)} bars`);
    };

    const shapes = drawStore.get().shapes;

    // Precompute intersections between line-like shapes (trendline/ray)
    const lines: any[] = [];
    for (const sh of shapes) {
      if (sh.type === 'trendline' || sh.type === 'ray') {
        lines.push({ id: sh.id, type: sh.type, a: sh.a, b: sh.b });
      }
    }
    const inters: { t: number, p: number, x: number, y: number }[] = [];
    const timeToX2 = (t: number): number => ts?.timeToCoordinate?.(t as Time) ?? 0;
    const priceToY2 = (p: number): number => candle?.priceToCoordinate?.(p) ?? 0;
    function lineParams(l: any) { const x1 = timeToX2(l.a.t), y1 = priceToY2(l.a.p); const x2 = timeToX2(l.b.t), y2 = priceToY2(l.b.p); return { x1, y1, x2, y2 }; }
    function intersect(l1: any, l2: any) {
      const { x1, y1, x2, y2 } = lineParams(l1); const { x1: x3, y1: y3, x2: x4, y2: y4 } = lineParams(l2);
      const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4); if (Math.abs(den) < 1e-6) return null;
      const px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / den;
      const py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / den;
      // Convert px,py back to time/price
      const t = ts?.coordinateToTime?.(px) as number ?? 0;
      const p = candle?.coordinateToPrice?.(py) ?? 0;
      // Segment/ray validation
      function within(l: any) {
        const { x1, y1, x2, y2 } = lineParams(l); const len = Math.hypot(x2 - x1, y2 - y1) || 1; const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
        const proj = (px - x1) * ux + (py - y1) * uy;
        if (l.type === 'trendline') return proj >= -2 && proj <= len + 2; // small tolerance
        return proj >= -2; // ray forward only
      }
      if (!within(l1) || !within(l2)) return null;
      return { t, p, x: px, y: py };
    }
    for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) { const k = intersect(lines[i], lines[j]); if (k) inters.push(k); }
    (window as any).__lokifiIntersections = inters;

    const selectedIds = new Set(drawStore.get().selectedIds);

    // marquee box if present
    const mq: any = (window as any).__lokifiMarquee;
    if (mq) { ctx.save(); ctx.strokeStyle = 'rgba(59,130,246,0.9)'; ctx.setLineDash([5, 4]); ctx.strokeRect(Math.min(mq.x0, mq.x1), Math.min(mq.y0, mq.y1), Math.abs(mq.x1 - mq.x0), Math.abs(mq.y1 - mq.y0)); ctx.restore(); }

    // HUD box (cursor deltas)
    const hud: any = (window as any).__lokifiHUD;
    if (hud) {
      const bx = Math.min(canvas.width - 8 - 160, Math.max(8, (hud.x || (canvas.width - 170))));
      const by = Math.min(canvas.height - 8 - 56, Math.max(8, (hud.y || 8)));
      ctx.save(); ctx.fillStyle = 'rgba(17,24,39,0.9)'; ctx.strokeStyle = 'rgba(75,85,99,0.9)'; ctx.lineWidth = 1; ctx.beginPath(); (ctx as any).roundRect?.(bx, by, 160, 56, 10);
      if (!(ctx as any).roundRect) { ctx.rect(bx, by, 160, 56); } ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e5e7eb'; ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      const l1 = `P: ${hud.p?.toFixed?.(2)}  T: ${new Date(hud.t * 1000).toLocaleString()}`;
      const l2 = `Δ: ${hud.dp >= 0 ? '+' : ''}${(hud.dp || 0).toFixed(2)} (${hud.pct >= 0 ? '+' : ''}${(hud.pct || 0).toFixed(2)}%)  |  ${hud.bars?.toFixed?.(1) || '0'} bars`;
      const l3 = `θ: ${(hud.angle || 0).toFixed(1)}°`;
      ctx.fillText(l1, bx + 8, by + 18);
      ctx.fillText(l2, bx + 8, by + 34);
      ctx.fillText(l3, bx + 8, by + 50);
      ctx.restore();
    }

    // Hover tooltip on intersection
    const hov: any = (window as any).__lokifiHover;
    if (hov?.type === 'intersection') {
      const tx = hov.x + 10, ty = hov.y - 10; const w = 140, h = 44;
      ctx.save(); ctx.fillStyle = 'rgba(31,41,55,0.95)'; ctx.strokeStyle = 'rgba(75,85,99,0.9)'; ctx.lineWidth = 1;
      ctx.beginPath(); (ctx as any).roundRect?.(tx, ty, w, h, 8); if (!(ctx as any).roundRect) { ctx.rect(tx, ty, w, h); } ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e5e7eb'; ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(`Price: ${hov.p.toFixed(2)}`, tx + 8, ty + 18);
      ctx.fillText(new Date(hov.t * 1000).toLocaleString(), tx + 8, ty + 34);
      ctx.restore();
    }

    // Ghost overlay (draw preview of shape being created) — fixed structure
    const ghost: any = (window as any).__lokifiGhost;
    if (ghost) {
      ctx.save(); ctx.globalAlpha = 0.55; ctx.setLineDash([6, 4]);
      const sh: any = ghost;
      if (sh.type === 'fib') {
        const x1 = timeToX(sh.a.t); const y1 = priceToY(sh.a.p);
        const x2 = timeToX(sh.b.t); const y2 = priceToY(sh.b.p);
        const levels = (sh as any).levels ?? [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        const high = Math.max(y1, y2); const low = Math.min(y1, y2);
        for (const lv of levels) { const y = high - (high - low) * lv; drawLine(Math.min(x1, x2), y, Math.max(x1, x2), y, true); }
        drawLabel(x1 + 6, y1 - 14, `$${fmt(sh.a.p)}`);
        drawLabel(x2 + 6, y2 - 14, `$${fmt(sh.b.p)}`);
        if (selectedIds.has(sh.id)) { drawHandle(x1, y1); drawHandle(x2, y2); }
      }
      ctx.restore();
    }

    // --- hit testing ---
    function ptInRect(px: number, py: number, left: number, top: number, right: number, bottom: number) {
      return px >= left && px <= right && py >= top && py <= bottom;
    }
    function shapeIntersectsRect(sh: Shape, left: number, top: number, right: number, bottom: number) {
      const timeToX = (t: number): number => ts?.timeToCoordinate?.(t as Time) ?? 0;
      const priceToY = (p: number): number => candle?.priceToCoordinate?.(p) ?? 0;
      if (sh.type === 'hline') { const y = priceToY((sh as any).y); return y >= top && y <= bottom; }
      const a: any = (sh as any).a, b: any = (sh as any).b;
      const x1 = timeToX(a.t), y1 = priceToY(a.p); const x2 = timeToX(b.t), y2 = priceToY(b.p);
      const minx = Math.min(x1, x2), maxx = Math.max(x1, x2), miny = Math.min(y1, y2), maxy = Math.max(y1, y2);
      return !(right < minx || left > maxx || bottom < miny || top > maxy) || ptInRect(x1, y1, left, top, right, bottom) || ptInRect(x2, y2, left, top, right, bottom);
    }

    function hitTest(clientX: number, clientY: number) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect(); const x = clientX - rect.left; const y = clientY - rect.top;
      const timeToX = (t: number): number => ts?.timeToCoordinate?.(t as Time) ?? 0;
      const priceToY = (p: number): number => candle?.priceToCoordinate?.(p) ?? 0;

      // Handles
      for (const sh of drawStore.get().shapes) {
        if (sh.type === 'trendline' || sh.type === 'ray' || sh.type === 'fib' || sh.type === 'measure') {
          const x1 = timeToX((sh as any).a.t), y1 = priceToY((sh as any).a.p); const x2 = timeToX((sh as any).b.t), y2 = priceToY((sh as any).b.p);
          if (Math.abs(x - x1) <= 6 && Math.abs(y - y1) <= 6) return { id: sh.id, handle: 'a' };
          if (Math.abs(x - x2) <= 6 && Math.abs(y - y2) <= 6) return { id: sh.id, handle: 'b' };
        } else if (sh.type === 'hline') {
          const y0 = priceToY((sh as any).y); if (Math.abs(x - 20) <= 6 && Math.abs(y - y0) <= 6) return { id: sh.id, handle: 'y' };
        } else if (sh.type === 'channel3') {
          const x1 = timeToX((sh as any).a.t), y1 = priceToY((sh as any).a.p); const x2 = timeToX((sh as any).b.t), y2 = priceToY((sh as any).b.p);
          const cx = timeToX((sh as any).c.t), cy = priceToY((sh as any).c.p);
          if (Math.abs(x - cx) <= 6 && Math.abs(y - cy) <= 6) return { id: sh.id, handle: 'c' };
          if (Math.abs(x - x1) <= 6 && Math.abs(y - y1) <= 6) return { id: sh.id, handle: 'a' };
          if (Math.abs(x - x2) <= 6 && Math.abs(y - y2) <= 6) return { id: sh.id, handle: 'b' };
        } else if (sh.type === 'rect' || (sh.type as string) === 'fib') {
          const x1 = timeToX((sh as any).a.t), y1 = priceToY((sh as any).a.p); const x2 = timeToX((sh as any).b.t), y2 = priceToY((sh as any).b.p);
          const left = Math.min(x1, x2), right = Math.max(x1, x2), top = Math.min(y1, y2), bottom = Math.max(y1, y2);
          if (Math.abs(x - left) <= 6 && Math.abs(y - top) <= 6) return { id: sh.id, handle: 'tl' };
          if (Math.abs(x - right) <= 6 && Math.abs(y - top) <= 6) return { id: sh.id, handle: 'tr' };
          if (Math.abs(x - left) <= 6 && Math.abs(y - bottom) <= 6) return { id: sh.id, handle: 'bl' };
          if (Math.abs(x - right) <= 6 && Math.abs(y - bottom) <= 6) return { id: sh.id, handle: 'br' };
        }
      }

      // Body hits (edge distance checks for lines/channels)
      for (const sh of drawStore.get().shapes) {
        if (sh.type === 'trendline' || sh.type === 'ray') {
          const x1 = timeToX((sh as any).a.t), y1 = priceToY((sh as any).a.p); const x2 = timeToX((sh as any).b.t), y2 = priceToY((sh as any).b.p);
          const minx = Math.min(x1, x2) - 6, maxx = Math.max(x1, x2) + 6, miny = Math.min(y1, y2) - 6, maxy = Math.max(y1, y2) + 6;
          if (x >= minx && x <= maxx && y >= miny && y <= maxy) return { id: sh.id, handle: null };
        } else if (sh.type === 'hline') {
          const y0 = priceToY((sh as any).y); if (Math.abs(y - y0) <= 6) return { id: sh.id, handle: null };
        } else if (sh.type === 'channel' || sh.type === 'channel3') {
          const x1 = timeToX((sh as any).a.t), y1 = priceToY((sh as any).a.p); const x2 = timeToX((sh as any).b.t), y2 = priceToY((sh as any).b.p);
          const dx = x2 - x1, dy = y2 - y1; const len = Math.hypot(dx, dy) || 1; const ux = dx / len, uy = dy / len; const nx = -uy, ny = ux;
          // determine pixel offset from width (channel) or point c (channel3)
          let pix = 0;
          if ((sh as any).width != null) {
            const midP = ((sh as any).a.p + (sh as any).b.p) / 2; const yMid = priceToY(midP); const yUp = priceToY(midP + (sh as any).width); pix = Math.abs(yUp - yMid);
          } else {
            const c = (sh as any).c; const tt1 = (sh as any).a.t, tt2 = (sh as any).b.t;
            const priceAtT = (t: number) => { if (tt1 === tt2) return (sh as any).a.p; const frac = (t - tt1) / (tt2 - tt1); return (sh as any).a.p + frac * ((sh as any).b.p - (sh as any).a.p); };
            const widthPrice = Math.abs(c.p - priceAtT(c.t)); const midP = ((sh as any).a.p + (sh as any).b.p) / 2; const yMid = priceToY(midP); const yUp = priceToY(midP + widthPrice); pix = Math.abs(yUp - yMid);
          }
          const offx = nx * pix, offy = ny * pix;
          const d1 = dist(x1 - offx, y1 - offy, x2 - offx, y2 - offy, x, y);
          const d2 = dist(x1 + offx, y1 + offy, x2 + offx, y2 + offy, x, y);
          const inside = (function () {
            // simple polygon check: within band by projecting onto normal direction
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2; const vpx = x - mx, vpy = y - my; const along = vpx * ux + vpy * uy; const norm = vpx * nx + vpy * ny; return Math.abs(norm) < pix && along > -len * 0.1 && along < len * 1.1;
          })();
          if (d1 <= 6 || d2 <= 6 || inside) return { id: (sh as any).id, handle: null };
        } else if (sh.type === 'rect' || sh.type === 'fib') {
          const x1 = timeToX((sh as any).a.t), y1 = priceToY((sh as any).a.p); const x2 = timeToX((sh as any).b.t), y2 = priceToY((sh as any).b.p);
          const left = Math.min(x1, x2), right = Math.max(x1, x2), top = Math.min(y1, y2), bottom = Math.max(y1, y2);
          if (x >= left && x <= right && y >= top && y <= bottom) return { id: (sh as any).id, handle: null };
        }
      }
      return { id: null as string | null, handle: null as string | null };
    }

    // --- interaction ---
    interface DraftingShape {
      tool: string;
      a: { t: number; p: number };
      b?: { t: number; p: number };
    }

    let drafting: DraftingShape | null = null;
    let dragMode: null | { kind: 'move' | 'move-group' | 'handle', id?: string, handle?: string, start: { t: number, p: number } } = null;
    let marquee: null | { x0: number, y0: number, x1: number, y1: number, add: boolean } = null;

    const priceFromY = (y: number): number => candle?.coordinateToPrice?.(y) ?? 0;
    const timeFromX = (x: number) => ts.coordinateToTime(x) as any as number;

    function nearestSnap(t: number, p: number) {
      if (!drawStore.get().snap || !data?.candles?.length) return { t, p };
      const cs = data.candles;
      let best = 0; let bestd = Infinity;
      for (let i = 0; i < cs.length; i++) { const d = Math.abs((cs[i].ts / 1000) - t); if (d < bestd) { bestd = d; best = i; } }
      const c = cs[best];
      const prices = [c.o, c.h, c.l, c.c];
      let bestp = prices[0], bestpd = Math.abs(prices[0] - p);
      for (const pr of prices) { const d = Math.abs(pr - p); if (d < bestpd) { bestpd = d; bestp = pr; } }
      return { t: cs[best].ts / 1000, p: bestp };
    }

    function onDown(e: PointerEvent) {
      if (!canvas) return;
      if (pluginManager.hasActiveTool()) {
        const handled = pluginManager.pointerDown(e);
        if (handled) return;
      }
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const t0 = timeFromX(x); const p0 = priceFromY(y);
      if (drawStore.get().tool === 'cursor') {
        const result = hitTest(e.clientX, e.clientY);
        if (!result) return;
        const { id, handle } = result;
        if (!id) {
          marquee = { x0: x, y0: y, x1: x, y1: y, add: e.shiftKey };
          return;
        }
        if (e.shiftKey) { drawStore.toggle(id); } else { drawStore.selectOne(id); }
        if (handle) { dragMode = { kind: 'handle', id, handle, start: nearestSnap(t0, p0) }; return; }
        const sel = drawStore.get().selectedIds;
        dragMode = { kind: (sel.includes(id) && sel.length > 1) ? 'move-group' : 'move', id, start: nearestSnap(t0, p0) };
        return;
      }
      const { t, p } = nearestSnap(t0, p0);
      if (drawStore.get().tool === 'hline') { drawStore.addShape({ id: crypto.randomUUID(), type: 'hline', y: p } as any); return; }
      drafting = { tool: drawStore.get().tool, a: { t, p } };
    }

    function onMove(e: PointerEvent) {
      if (!canvas) return;
      if (pluginManager.hasActiveTool()) {
        const handled = pluginManager.pointerMove(e);
        if (handled) return;
      }
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const { t, p } = nearestSnap(timeFromX(x), priceFromY(y));
      if (marquee) { marquee.x1 = x; marquee.y1 = y; (window as any).__lokifiMarquee = marquee; canvas.style.cursor = 'crosshair'; return; }
      if (dragMode) {
        const start = dragMode.start;
        const dt = t - start.t;
        const dp = p - start.p;
        if (dragMode.kind === 'handle' && dragMode.id) {
          const which = dragMode.handle!;
          drawStore.updateShape(dragMode.id, (s) => {
            if (s.type === 'hline' && which === 'y') return { ...s, y: p };
            if (s.type === 'channel3' && which === 'c') return { ...s, c: { t, p } };
            if ('a' in s && 'b' in s) { if (which === 'a') return { ...(s as any), a: { t, p } }; if (which === 'b') return { ...(s as any), b: { t, p } }; }
            return s as any;
          });
        } else if (dragMode.kind === 'move') {
          drawStore.updateShape(dragMode.id!, (s) => {
            if (s.type === 'hline') { return { ...s, y: s.y + dp }; }
            if ('a' in s && 'b' in s) { return { ...(s as any), a: { t: s.a.t + dt, p: s.a.p + dp }, b: { t: s.b.t + dt, p: s.b.p + dp } }; }
            return s as any;
          }); dragMode.start = { t, p };
        } else if (dragMode.kind === 'move-group') { drawStore.moveSelectedBy(dt, dp); dragMode.start = { t, p }; }
        return;
      }
      if (!drafting) return; drafting.b = { t, p };
    }

    function onUp(e: PointerEvent) {
      if (pluginManager.hasActiveTool()) {
        const handled = pluginManager.pointerUp(e);
        if (handled) return;
      }
      if (marquee) {
        const left = Math.min(marquee.x0, marquee.x1), right = Math.max(marquee.x0, marquee.x1);
        const top = Math.min(marquee.y0, marquee.y1), bottom = Math.max(marquee.y0, marquee.y1);
        const ids = drawStore.get().shapes.filter(s => shapeIntersectsRect(s, left, top, right, bottom)).map(s => s.id);
        if (marquee.add) drawStore.setSelection(Array.from(new Set([...drawStore.get().selectedIds, ...ids])));
        else drawStore.setSelection(ids);
        marquee = null;
        (window as any).__lokifiMarquee = null;
        if (canvas) canvas.style.cursor = 'default';
        return;
      }
      if (dragMode) { dragMode = null; return; }
      if (!drafting) return;
      if (drafting.tool === 'rect' || drafting.tool === 'trendline' || drafting.tool === 'ray' || drafting.tool === 'fib') {
        if (!drafting.b) { drafting = null; return; }
        const sh: Shape = { id: crypto.randomUUID(), type: drafting.tool as any, a: drafting.a, b: drafting.b } as any;
        drawStore.addShape(sh);
      }
      drafting = null;
    }

    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as any)?.tagName; const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement as any)?.isContentEditable; if (inInput) return;
      if (e.key === 'Escape') { drafting = null; dragMode = null; marquee = null; drawStore.setTool('cursor'); drawStore.clearSelection(); (window as any).__lokifiMarquee = null; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); drawStore.undo(); }
      // Keys: V T H M for core; R C Shift+C F for plugins
      if (!e.ctrlKey && !e.metaKey) {
        if (e.key === 'v' || e.key === 'V') { pluginManager.setActiveTool(null); drawStore.setTool('cursor'); }
        if (e.key === 't' || e.key === 'T') { pluginManager.setActiveTool(null); drawStore.setTool('trendline'); }
        if (e.key === 'h' || e.key === 'H') { pluginManager.setActiveTool(null); drawStore.setTool('hline'); }
        if (e.key === 'm' || e.key === 'M') { pluginManager.setActiveTool(null); drawStore.setTool('rect'); }
        if (e.key === 'r' || e.key === 'R') { pluginManager.setActiveTool('ruler-measure'); }
        if (e.key === 'c' || e.key === 'C') { if (e.shiftKey) pluginManager.setActiveTool('parallel-channel-3pt'); else pluginManager.setActiveTool('parallel-channel'); }
        if (e.key === 'f' || e.key === 'F') { pluginManager.setActiveTool('fib-extended'); }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); drawStore.redo(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && (document.activeElement as any)?.tagName !== 'INPUT') { e.preventDefault(); drawStore.removeSelected(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); drawStore.setSelection(drawStore.get().shapes.map(s => s.id)); }
    };
    window.addEventListener('keydown', onKey);

    drawStore.loadCurrent();

    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('keydown', onKey);
    };
  }, [data, inds, sym, tf]);

  return (
    <div className="w-full rounded-2xl border border-neutral-800 relative">
      <ChartSidebar />
      <div ref={ref} />
      <canvas ref={overlayRef} className="absolute inset-0 z-10" style={{ pointerEvents: (drawStore.get().tool === "cursor" && !pluginManager.hasActiveTool()) ? "none" : "auto" }} />
      {(inds.rsi || inds.macd) && <div ref={subRef} className="border-t border-neutral-800" />}
    </div>
  );
}
