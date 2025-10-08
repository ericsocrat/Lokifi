/**
 * Minimal SVG string builders — no JSX, no DOM, TypeScript-safe.
 * Usage: build element strings with helpers, then join with serializeSvg(...)
 */

export type P = { x: number; y: number };

export type SvgStyle = {
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  fill?: string;
  dash?: boolean | string;     // true -> "6,4" (default), string -> custom "a,b"
  lineCap?: "butt" | "round" | "square";
  lineJoin?: "miter" | "round" | "bevel";
  className?: string;
};

export type TextStyle = {
  fill?: string;
  fontSize?: number;           // px
  fontFamily?: string;
  anchor?: "start" | "middle" | "end";
  className?: string;
  opacity?: number;
};

function escAttr(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function joinAttrs(obj: Record<string, string | number | boolean | null | undefined>): string {
  const parts: string[] = [];
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v === undefined || v === null || v === false) continue;
    if (v === true) { parts.push(`${k}="true"`); continue; }
    const sv = escAttr(v);
    if (sv === "") continue;
    parts.push(`${k}="${sv}"`);
  }
  return parts.length ? " " + parts.join(" ") : "";
}

function commonStroke(style: SvgStyle = {}): Record<string, string | number> {
  const dashArray = style.dash === true ? "6,4" : (typeof style.dash === "string" ? style.dash : "");
  return {
    stroke: style.stroke ?? "currentColor",
    "stroke-width": style.strokeWidth ?? 1.5,
    opacity: style.opacity ?? 1,
    ...(dashArray ? { "stroke-dasharray": dashArray } : {}),
    ...(style.lineCap ? { "stroke-linecap": style.lineCap } : {}),
    ...(style.lineJoin ? { "stroke-linejoin": style.lineJoin } : {}),
    ...(style.className ? { class: style.className } : {}),
  };
}

function commonFill(style: SvgStyle = {}): Record<string, string | number> {
  // If explicit fill provided, use it with light opacity; else "none"
  return style.fill
    ? { fill: style.fill, "fill-opacity": 0.18 }
    : { fill: "none" };
}

/** <line .../> */
export function lineEl(a: P, b: P, style: SvgStyle = {}): string {
  const attrs = {
    x1: a.x, y1: a.y, x2: b.x, y2: b.y,
    ...commonStroke(style),
  };
  return `<line${joinAttrs(attrs)} />`;
}

/** <polyline .../> */
export function polylineEl(points: P[], style: SvgStyle = {}): string {
  const pts = points.map(p => `${p.x},${p.y}`).join(" ");
  const attrs = {
    points: pts,
    ...commonStroke(style),
    ...commonFill(style),
  };
  return `<polyline${joinAttrs(attrs)} />`;
}

/** <rect .../> (defined by opposite corners) */
export function rectEl(a: P, b: P, style: SvgStyle = {}): string {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const w = Math.max(0.0001, Math.abs(b.x - a.x));
  const h = Math.max(0.0001, Math.abs(b.y - a.y));
  const attrs = {
    x, y, width: w, height: h,
    ...commonStroke(style),
    ...commonFill(style),
  };
  return `<rect${joinAttrs(attrs)} />`;
}

/** <circle .../> */
export function circleEl(c: P, r: number, style: SvgStyle = {}): string {
  const attrs = {
    cx: c.x, cy: c.y, r: Math.max(0.0001, r),
    ...commonStroke(style),
    ...commonFill(style),
  };
  return `<circle${joinAttrs(attrs)} />`;
}

/** <path .../> (pass a prebuilt "d" attribute) */
export function pathEl(d: string, style: SvgStyle = {}): string {
  const attrs = {
    d,
    ...commonStroke(style),
    ...commonFill(style),
  };
  return `<path${joinAttrs(attrs)} />`;
}

/** <text ...>content</text> */
export function textEl(p: P, text: string, style: TextStyle = {}): string {
  const attrs = {
    x: p.x, y: p.y,
    fill: style.fill ?? "currentColor",
    "font-size": style.fontSize ?? 12,
    "font-family": style.fontFamily ?? "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
    "text-anchor": style.anchor ?? "start",
    opacity: style.opacity ?? 1,
    class: style.className,
  };
  return `<text${joinAttrs(attrs)}>${escAttr(text)}</text>`;
}

/** Helper to group multiple elements */
export function groupEl(children: string[], className?: string, opacity?: number): string {
  const attrs: Record<string, string | number> = {};
  if (className) attrs["class"] = className;
  if (opacity !== undefined) attrs["opacity"] = opacity;
  return `<g${joinAttrs(attrs)}>${children.join("")}</g>`;
}

/** Serialize a whole SVG document with given width/height (optional viewBox) */
export function serializeSvg(children: string[], width = 800, height = 400, viewBox?: { x: number; y: number; w: number; h: number }): string {
  const vb = viewBox ? ` viewBox="${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}"` : "";
  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"${vb}>`;
  return head + children.join("") + "</svg>";
}

/** Convenience: convert 2 points to a path "d" for a simple line */
export function dLine(a: P, b: P): string {
  return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
}

/** Convenience: polygon/polyline "points" from points array */
export function pointsAttr(points: P[]): string {
  return points.map(p => `${p.x},${p.y}`).join(" ");
}

/** Default export with common helpers for flexible imports */
const Svg = {
  lineEl,
  polylineEl,
  rectEl,
  circleEl,
  pathEl,
  textEl,
  groupEl,
  serializeSvg,
  dLine,
  pointsAttr,
};
export default Svg;

export function drawingsToSVG(drawings: any[], width = 800, height = 400): string {
  const payload = JSON.stringify({ drawings });
  return serializeSvg([textEl({x:12,y:20}, payload)], width, height);
}
