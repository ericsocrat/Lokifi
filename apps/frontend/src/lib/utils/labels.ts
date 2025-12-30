import { yToPrice } from '@/lib/charts/chartMap';
import type { Drawing } from '@/lib/utils/drawings';
import { rectFromPoints } from '@/lib/utils/geom';

export interface LabelConfig {
  showValue: boolean;
  showPercent: boolean;
  showAngle: boolean;
  showRR: boolean;
}

export interface LabelResult {
  text: string;
  anchor: { x: number; y: number };
}

type LabelHandler = (d: Drawing, cfg: LabelConfig) => LabelResult | null;

const LABEL_HANDLERS: Partial<Record<Drawing['kind'], LabelHandler>> = {
  hline: hlineLabel,
  vline: vlineLabel,
  trendline: lineLabel,
  ray: lineLabel,
  arrow: lineLabel,
  rect: rectLabel,
  ruler: rulerLabel,
};

export function describeDrawing(d: Drawing, cfg: LabelConfig): LabelResult | null {
  try {
    const handler = LABEL_HANDLERS[d.kind];
    return handler ? handler(d, cfg) : null;
  } catch {
    return null;
  }
}

/** Format number with specified precision, returns empty string for non-finite values */
const fmt = (n: number, precision = 2): string => (Number.isFinite(n) ? n.toFixed(precision) : '');

function hlineLabel(d: Drawing, cfg: LabelConfig): LabelResult | null {
  if (d.kind !== 'hline' || !cfg.showValue) return null;
  const price = yToPrice(d.points[0].y);
  if (price == null) return null;
  return { text: `@ ${fmt(price)}`, anchor: d.points[0] };
}

function vlineLabel(_d: Drawing, _cfg: LabelConfig): LabelResult | null {
  // Vertical lines don't have meaningful price labels
  return null;
}

function lineLabel(d: Drawing, cfg: LabelConfig): LabelResult | null {
  if (d.kind !== 'trendline' && d.kind !== 'ray' && d.kind !== 'arrow') return null;
  const [a, b] = d.points;
  const parts: string[] = [];

  // Price-based labels
  const p1 = yToPrice(a.y);
  const p2 = yToPrice(b.y);
  if (p1 != null && p2 != null) {
    const delta = p2 - p1;
    if (cfg.showValue) parts.push(`Δ ${fmt(delta)}`);
    if (cfg.showPercent && p1 !== 0) {
      const pct = (delta / Math.abs(p1)) * 100;
      parts.push(`${delta >= 0 ? '+' : ''}${fmt(pct)}%`);
    }
  }

  // Angle label (canvas y+ is downward, so negate dy)
  if (cfg.showAngle) {
    const angle = Math.atan2(a.y - b.y, b.x - a.x) * (180 / Math.PI);
    parts.push(`${fmt(angle, 1)}°`);
  }

  return parts.length > 0 ? { text: parts.join(' '), anchor: b } : null;
}

function rectLabel(d: Drawing, cfg: LabelConfig): LabelResult | null {
  if (d.kind !== 'rect') return null;
  const [p0, p1] = d.points;
  const r = rectFromPoints(p0, p1);

  const pTop = yToPrice(r.y);
  const pBot = yToPrice(r.y + r.h);
  if (pTop == null || pBot == null) return null;

  const height = Math.abs(pTop - pBot);
  const anchor = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  const parts: string[] = [];

  if (cfg.showValue) parts.push(`Δ ${fmt(height)}`);

  if (cfg.showPercent && pBot !== 0) {
    const pct = (height / Math.abs(pBot)) * 100;
    parts.push(`${fmt(pct)}%`);
  }

  if (cfg.showRR) {
    // R:R based on entry at midpoint: reward = distance to top, risk = distance to bottom
    const midPrice = (pTop + pBot) / 2;
    const reward = Math.abs(pTop - midPrice);
    const risk = Math.abs(midPrice - pBot);
    const rr = risk > 0 ? reward / risk : 1;
    parts.push(`R:R ${fmt(rr)}`);
  }

  return parts.length > 0 ? { text: parts.join(' '), anchor } : null;
}

function rulerLabel(d: Drawing, cfg: LabelConfig): LabelResult | null {
  if (d.kind !== 'ruler') return null;
  const [a, b] = d.points;
  const p1 = yToPrice(a.y);
  const p2 = yToPrice(b.y);

  if (p1 == null || p2 == null) return null;

  const delta = p2 - p1;
  const parts: string[] = [];

  if (cfg.showValue) parts.push(`Δ ${fmt(delta)}`);

  if (cfg.showPercent && p1 !== 0) {
    const pct = (delta / Math.abs(p1)) * 100;
    parts.push(`${delta >= 0 ? '+' : ''}${fmt(pct)}%`);
  }

  return parts.length > 0 ? { text: parts.join(' '), anchor: b } : null;
}
