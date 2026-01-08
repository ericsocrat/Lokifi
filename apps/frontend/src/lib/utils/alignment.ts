import type { Drawing, Point } from '@/lib/utils/drawings';

type B = { minX: number; maxX: number; minY: number; maxY: number; cx: number; cy: number };

/**
 * Get points from a drawing, handling groups which don't have direct points.
 * Groups calculate their bounds from children.
 */
function getPoints(d: Drawing): Point[] {
  if (d.kind === 'group') {
    // For groups, collect all points from children
    return d.children.flatMap(getPoints);
  }
  return d.points;
}

function bbox(d: Drawing): B {
  const pts = getPoints(d);
  if (pts.length === 0) {
    // Fallback for empty groups
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, cx: 0, cy: 0 };
  }
  const xs = pts.map((p: Point) => p.x),
    ys = pts.map((p: Point) => p.y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs);
  const minY = Math.min(...ys),
    maxY = Math.max(...ys);
  return { minX, maxX, minY, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

/**
 * Transform a drawing by applying delta to all its points.
 * Handles groups by recursively transforming children.
 */
function transformDrawing(d: Drawing, dx: number, dy: number): Drawing {
  if (d.kind === 'group') {
    return {
      ...d,
      children: d.children.map((child) => transformDrawing(child, dx, dy)),
    };
  }
  return {
    ...d,
    points: d.points.map((p: Point) => ({ x: p.x + dx, y: p.y + dy })),
  } as Drawing;
}

export function align(
  drawings: Drawing[],
  ids: Set<string>,
  dir: 'left' | 'right' | 'top' | 'bottom'
) {
  const selected = drawings.filter((d) => ids.has(d.id));
  if (selected.length < 2) return drawings;
  const boxes = new Map<string, B>(selected.map((d) => [d.id, bbox(d)]));
  let target = 0;
  switch (dir) {
    case 'left':
      target = Math.min(...selected.map((d) => boxes.get(d.id)!.minX));
      break;
    case 'right':
      target = Math.max(...selected.map((d) => boxes.get(d.id)!.maxX));
      break;
    case 'top':
      target = Math.min(...selected.map((d) => boxes.get(d.id)!.minY));
      break;
    case 'bottom':
      target = Math.max(...selected.map((d) => boxes.get(d.id)!.maxY));
      break;
  }
  const out = drawings.map((d) => {
    if (!ids.has(d.id)) return d;
    const b = boxes.get(d.id)!;
    const dx = dir === 'left' ? target - b.minX : dir === 'right' ? target - b.maxX : 0;
    const dy = dir === 'top' ? target - b.minY : dir === 'bottom' ? target - b.maxY : 0;
    return transformDrawing(d, dx, dy);
  });
  return out;
}

export function distribute(drawings: Drawing[], ids: Set<string>, axis: 'h' | 'v') {
  const selected = drawings.filter((d) => ids.has(d.id));
  if (selected.length < 3) return drawings;
  const boxes = selected.map((d) => ({ id: d.id, ...bbox(d) }));
  if (axis === 'h') {
    boxes.sort((a, b) => a.minX - b.minX);
    const totalSpan = boxes[boxes.length - 1].minX - boxes[0].minX;
    const gap = totalSpan / (boxes.length - 1);
    const out = new Map<string, number>();
    boxes.forEach((b, i) => {
      const dx = boxes[0].minX + gap * i - b.minX;
      out.set(b.id, dx);
    });
    return drawings.map((d) => (out.has(d.id) ? transformDrawing(d, out.get(d.id) || 0, 0) : d));
  } else {
    boxes.sort((a, b) => a.minY - b.minY);
    const totalSpan = boxes[boxes.length - 1].minY - boxes[0].minY;
    const gap = totalSpan / (boxes.length - 1);
    const out = new Map<string, number>();
    boxes.forEach((b, i) => {
      const dy = boxes[0].minY + gap * i - b.minY;
      out.set(b.id, dy);
    });
    return drawings.map((d) => (out.has(d.id) ? transformDrawing(d, 0, out.get(d.id) || 0) : d));
  }
}

