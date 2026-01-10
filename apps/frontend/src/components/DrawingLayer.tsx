import ContextMenu from '@/components/ContextMenu';
import { magnetYToOHLC, snapPxToGrid, snapYToPriceLevels, yToPrice } from '@/lib/charts/chartMap';
import * as canvasHelpers from '@/lib/drawing/canvasHelpers';
import type { Drawing, DrawingStyle } from '@/lib/utils/drawings';
import { createDrawing, updateDrawingGeometry } from '@/lib/utils/drawings';
import { distanceToSegment, rectFromPoints, withinRect } from '@/lib/utils/geom';
import { useChartStore } from '@/state/store';
import React from 'react';

type Point = { x: number; y: number };
type Menu = { open: boolean; x: number; y: number };

const _HANDLE_R = 4;
const HIT_PAD = 6;

export default function DrawingLayer({ useOffscreen = true }: { useOffscreen?: boolean } = {}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const s = useChartStore();
  const layerOf = (id: string) =>
    s.layers.find((l) => l.id === id) || { visible: true, locked: false, opacity: 1 };
  const [drawings, setDrawings] = React.useState<Drawing[]>(s.drawings);
  const [hoverId, setHoverId] = React.useState<string | null>(null);
  const [dragId, setDragId] = React.useState<string | null>(null);

  const [_alertModalOpen, _setAlertModalOpen] = React.useState(false); // reserved
  const [menu, setMenu] = React.useState<Menu>({ open: false, x: 0, y: 0 });

  // ✅ missing marquee state (was referenced but not declared)
  const [marquee, setMarquee] = React.useState<{ start: Point; end: Point } | null>(null);

  // perf flags
  const needsDraw = React.useRef(true);
  const rafId = React.useRef<number | undefined>(undefined);
  const offscreen = React.useRef<OffscreenCanvas | null>(null);

  React.useEffect(
    () =>
      useChartStore.subscribe((state: { drawings: Drawing[] }) => {
        setDrawings(state.drawings);
        needsDraw.current = true;
      }),
    []
  );

  // Draw loop
  React.useEffect(() => {
    const el = canvasRef.current,
      container = containerRef.current;
    if (!el || !container) return;

    const setup = () => {
      const r = container.getBoundingClientRect();
      el.width = Math.floor(r.width * (window.devicePixelRatio || 1));
      el.height = Math.floor(r.height * (window.devicePixelRatio || 1));
      el.style.width = r.width + 'px';
      el.style.height = r.height + 'px';
      // try offscreen (disabled if useOffscreen=false)
      if (useOffscreen) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- transferControlToOffscreen is experimental browser API with incomplete types
          offscreen.current = (el as any).transferControlToOffscreen?.() || null;
        } catch {
          offscreen.current = null;
        }
      } else {
        offscreen.current = null;
      }
      needsDraw.current = true;
    };

    const drawFrame = () => {
      if (!needsDraw.current) {
        rafId.current = requestAnimationFrame(drawFrame);
        return;
      }
      const ctx = el.getContext('2d')!;
      const width = el.width,
        height = el.height;
      canvasHelpers.clearCanvas(ctx, width, height);
      ctx.save();
      const dpr = window.devicePixelRatio || 1;
      ctx.scale(dpr, dpr);
      ctx.lineCap = s.drawingSettings.lineCap;

      drawings.forEach((d: Drawing) => {
        const ly = layerOf(d.layerId || s.activeLayerId || 'layer-1');
        if (!ly.visible) return;
        if (d.hidden) return;
        const selected = s.selection.has(d.id);
        const sty: Partial<DrawingStyle> = d.style || {};
        const stroke = sty.stroke || '#9ca3af';
        const width = sty.strokeWidth || 1.75;
        ctx.globalAlpha = sty.opacity ?? 1;
        ctx.strokeStyle = selected ? '#60a5fa' : stroke;
        ctx.lineWidth = width;
        ctx.setLineDash(
          sty.dash === 'dash'
            ? [8, 6]
            : sty.dash === 'dot'
              ? [2, 4]
              : sty.dash === 'dashdot'
                ? [10, 6, 2, 6]
                : []
        );

        switch (d.kind) {
          case 'trendline':
          case 'arrow': {
            const [a, b] = d.points;
            canvasHelpers.drawLine(ctx, a, b);
            if (d.kind === 'arrow')
              canvasHelpers.drawArrowHead(
                ctx,
                a,
                b,
                s.drawingSettings.arrowHead === 'filled' ? 'filled' : 'simple',
                s.drawingSettings.arrowHeadSize
              );
            if (selected && s.drawingSettings.showHandles) {
              canvasHelpers.drawLineHandles(ctx, a, b);
            }
            if (s.drawingSettings.showLineLabels) {
              canvasHelpers.drawLineLabel(ctx, a, b, yToPrice);
            }
            break;
          }
          case 'ray': {
            const [a, b] = d.points;
            canvasHelpers.drawRay(ctx, a, b, el.width, el.height);
            if (selected && s.drawingSettings.showHandles) {
              canvasHelpers.drawLineHandles(ctx, a, b);
            }
            if (s.drawingSettings.showLineLabels) {
              canvasHelpers.drawLineLabel(ctx, a, b, yToPrice);
            }
            break;
          }
          case 'hline': {
            const y = d.points[0].y;
            canvasHelpers.drawHorizontalLine(ctx, y, el.width);
            if (selected && s.drawingSettings.showHandles)
              canvasHelpers.drawHandle(ctx, { x: 24, y });
            break;
          }
          case 'vline': {
            const x = d.points[0].x;
            canvasHelpers.drawVerticalLine(ctx, x, el.height);
            if (selected && s.drawingSettings.showHandles)
              canvasHelpers.drawHandle(ctx, { x, y: 24 });
            break;
          }
          case 'rect': {
            const r = rectFromPoints(d.points[0], d.points[1]);
            canvasHelpers.drawRect(ctx, r.x, r.y, r.w, r.h, {
              ...sty,
              fill: sty.fill ?? undefined,
            });
            if (selected && s.drawingSettings.showHandles)
              canvasHelpers.drawRectHandles(ctx, r.x, r.y, r.w, r.h);
            break;
          }
          case 'ellipse': {
            const r = rectFromPoints(d.points[0], d.points[1]);
            const cx = r.x + r.w / 2,
              cy = r.y + r.h / 2;
            const rx = Math.abs(r.w / 2),
              ry = Math.abs(r.h / 2);
            canvasHelpers.drawEllipse(ctx, cx, cy, rx, ry, { ...sty, fill: sty.fill ?? undefined });
            if (selected && s.drawingSettings.showHandles)
              canvasHelpers.drawRectHandles(ctx, r.x, r.y, r.w, r.h);
            break;
          }
          case 'fib': {
            const [a, b] = d.points;
            const levels = d.fibLevels ?? s.drawingSettings.fibDefaultLevels;
            canvasHelpers.drawFibonacci(
              ctx,
              a,
              b,
              levels,
              el.width,
              { ...sty, fill: sty.fill ?? undefined },
              yToPrice
            );
            if (selected && s.drawingSettings.showHandles) {
              canvasHelpers.drawHandle(ctx, a);
              canvasHelpers.drawHandle(ctx, b);
            }
            break;
          }
          case 'parallel-channel': {
            const [a, b, c] = d.points;
            canvasHelpers.drawParallelChannel(
              ctx,
              a,
              b,
              c,
              el.width,
              el.height,
              sty.fill ?? undefined
            );
            if (selected && s.drawingSettings.showHandles) {
              canvasHelpers.drawHandle(ctx, a);
              canvasHelpers.drawHandle(ctx, b);
              canvasHelpers.drawHandle(ctx, c);
            }
            break;
          }
          case 'pitchfork': {
            const [a, b, c] = d.points;
            canvasHelpers.drawPitchfork(ctx, a, b, c, el.width, el.height);
            if (selected && s.drawingSettings.showHandles) {
              canvasHelpers.drawHandle(ctx, a);
              canvasHelpers.drawHandle(ctx, b);
              canvasHelpers.drawHandle(ctx, c);
            }
            break;
          }
          case 'text': {
            const p = d.points[0];
            canvasHelpers.drawText(ctx, p, d.text || 'Text', {
              ...sty,
              fill: sty.fill ?? undefined,
            });
            if (selected && s.drawingSettings.showHandles) canvasHelpers.drawHandle(ctx, p);
            break;
          }
          case 'ruler': {
            // Ruler drawing logic (if needed)
            const [a, b] = d.points;
            canvasHelpers.drawLine(ctx, a, b);
            if (selected && s.drawingSettings.showHandles) {
              canvasHelpers.drawLineHandles(ctx, a, b);
            }
            break;
          }
        }
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      });

      if (marquee) {
        const r = rectFromPoints(marquee.start, marquee.end);
        ctx.strokeStyle = '#818cf8';
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        ctx.setLineDash([]);
      }

      ctx.restore();
      needsDraw.current = false;
      rafId.current = requestAnimationFrame(drawFrame);
    };

    setup();
    needsDraw.current = true;
    rafId.current = requestAnimationFrame(drawFrame);
    const ro = new ResizeObserver(() => {
      setup();
    });
    ro.observe(container);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      ro.disconnect();
    };
  }, [drawings, s.selection, marquee, s.drawingSettings]);

  const invalidate = () => {
    needsDraw.current = true;
  };

  const perToolSnapOn = () => s.drawingSettings.perToolSnap[String(s.activeTool)] !== false;

  const toLocal = (e: React.MouseEvent): Point => {
    const r = containerRef.current!.getBoundingClientRect();
    let p = { x: e.clientX - r.left, y: e.clientY - r.top };
    p = snapPxToGrid(
      p,
      s.drawingSettings.snapStep,
      s.drawingSettings.snapEnabled && perToolSnapOn()
    );
    if (s.drawingSettings.snapPriceLevels && perToolSnapOn())
      p = { x: p.x, y: snapYToPriceLevels(p.y, 6) };
    if (s.drawingSettings.snapToOHLC && perToolSnapOn())
      p = { x: p.x, y: magnetYToOHLC(p.y, s.drawingSettings.magnetTolerancePx) };
    return p;
  };

  // --- hit testing util (minimal but robust) ---
  function hitTest(d: Drawing, p: Point, container: HTMLDivElement): number {
    const W = container.clientWidth,
      H = container.clientHeight;

    const edge = (a: Point, b: Point) => distanceToSegment(a, b, p);

    switch (d.kind) {
      case 'trendline':
      case 'arrow': {
        const [a, b] = d.points;
        return edge(a, b);
      }
      case 'ray': {
        // approximate by clamping second point to bounds
        const [a, b] = d.points;
        const ext = canvasHelpers.extendRay(a, b, W, H);
        return edge(ext.start, ext.end);
      }
      case 'hline': {
        const y = d.points[0].y;
        return Math.abs(p.y - y);
      }
      case 'vline': {
        const x = d.points[0].x;
        return Math.abs(p.x - x);
      }
      case 'rect': {
        const r = rectFromPoints(d.points[0], d.points[1]);
        const dTop = edge({ x: r.x, y: r.y }, { x: r.x + r.w, y: r.y });
        const dBot = edge({ x: r.x, y: r.y + r.h }, { x: r.x + r.w, y: r.y + r.h });
        const dL = edge({ x: r.x, y: r.y }, { x: r.x, y: r.y + r.h });
        const dR = edge({ x: r.x + r.w, y: r.y }, { x: r.x + r.w, y: r.y + r.h });
        const inside = withinRect(p, r);
        return inside ? 0 : Math.min(dTop, dBot, dL, dR);
      }
      case 'ellipse': {
        // simple bbox distance
        const r = rectFromPoints(d.points[0], d.points[1]);
        const cx = r.x + r.w / 2,
          cy = r.y + r.h / 2;
        const rx = Math.abs(r.w / 2),
          ry = Math.abs(r.h / 2);
        const dx = (p.x - cx) / (rx || 1),
          dy = (p.y - cy) / (ry || 1);
        const dist = Math.abs(Math.hypot(dx, dy) - 1) * Math.max(rx, ry);
        return dist;
      }
      case 'fib': {
        const [a, b] = d.points;
        const y0 = a.y,
          y1 = b.y;
        const left = 0,
          right = W;
        const levels = d.fibLevels ?? s.drawingSettings.fibDefaultLevels;
        let best = Infinity;
        for (const lv of levels) {
          const y = y0 + (y1 - y0) * lv;
          // measure vertical distance if within horizontal band
          if (p.x >= left - 6 && p.x <= right + 6) best = Math.min(best, Math.abs(p.y - y));
        }
        return best;
      }
      case 'parallel-channel': {
        const [a, b, c] = d.points;
        const base = edge(a, b);
        const width = Math.abs(c.y - (a.y + b.y) / 2);
        const top = edge({ x: a.x, y: a.y - width }, { x: b.x, y: b.y - width });
        const bot = edge({ x: a.x, y: a.y + width }, { x: b.x, y: b.y + width });
        return Math.min(base, top, bot);
      }
      case 'pitchfork': {
        const [a, b, c] = d.points;
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const d1 = edge(a, c);
        const d2 = edge(b, c);
        const d3 = edge(a, mid);
        return Math.min(d1, d2, d3);
      }
      case 'text': {
        const t = d.points[0];
        return Math.hypot(p.x - t.x, p.y - t.y);
      }
      case 'ruler': {
        const [a, b] = d.points;
        return edge(a, b);
      }
      default:
        return Infinity;
    }
  }

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) return;
    setMenu({ open: false, x: 0, y: 0 });
    const p = toLocal(e);

    if (s.activeTool === 'select') {
      const hit = drawings.find(
        (d: Drawing) => !d.locked && !d.hidden && hitTest(d, p, containerRef.current!) < HIT_PAD
      );
      if (!hit) {
        setMarquee({ start: p, end: p });
        s.clearSelection();
        invalidate();
        return;
      }
      s.toggleSelect(hit.id, !e.shiftKey);
      setDragId(hit.id);
      invalidate();
      return;
    }

    // any required: createDrawing returns generic object, not typed Drawing union
    const d = createDrawing(s.activeTool || 'line', p) as Drawing | null;
    if (d) {
      d.layerId = d.layerId ?? s.activeLayerId ?? undefined;
      s.addDrawing(d);
      setDragId(d.id);
      invalidate();
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const p = toLocal(e);
    if (marquee) {
      setMarquee((v: { start: Point; end: Point } | null) => (v ? { ...v, end: p } : null));
      invalidate();
      return;
    }
    if (dragId) {
      s.updateDrawing(dragId, (dr: Drawing) => updateDrawingGeometry(dr, p));
      invalidate();
      return;
    }
    const id =
      drawings.find((d: Drawing) => !d.hidden && hitTest(d, p, containerRef.current!) < HIT_PAD)
        ?.id ?? null;
    setHoverId(id); // cosmetic; no invalidate
  };

  const onMouseUp = () => {
    if (marquee) {
      const r = rectFromPoints(marquee.start, marquee.end);
      const ids = drawings
        .filter((d: Drawing) => {
          if (d.hidden || d.locked) return false;
          // Groups don't have points directly, check children recursively
          if (d.kind === 'group') {
            const checkPoints = (drawings: Drawing[]): boolean =>
              drawings.some((child) =>
                child.kind === 'group'
                  ? checkPoints(child.children)
                  : child.points.some((pt: Point) => withinRect(pt, r))
              );
            return checkPoints(d.children);
          }
          return d.points.some((pt: Point) => withinRect(pt, r));
        })
        .map((d: Drawing) => d.id);
      s.setSelection(new Set(ids));
      setMarquee(null);
      invalidate();
    }
    setDragId(null);
  };

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const r = containerRef.current!.getBoundingClientRect();
    setMenu({ open: true, x: e.clientX - r.left, y: e.clientY - r.top });
  };

  return (
    <div ref={containerRef} className="absolute inset-0" onContextMenu={onContextMenu}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        tabIndex={0}
        style={{
          outline: 'none',
          cursor: s.activeTool === 'select' ? (hoverId ? 'pointer' : 'default') : 'crosshair',
        }}
      />
      {menu.open && (
        <ContextMenu x={menu.x} y={menu.y} onClose={() => setMenu({ open: false, x: 0, y: 0 })} />
      )}
    </div>
  );
}
