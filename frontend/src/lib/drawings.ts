import { nanoid } from 'nanoid'
export type Point = { x: number; y: number }
export type DrawingKind =
  | 'trendline' | 'hline' | 'vline' | 'rect' | 'text' | 'arrow'
  | 'ray' | 'ellipse' | 'fib' | 'pitchfork' | 'parallel-channel'
  | 'ruler'

export type StrokeDash = 'solid' | 'dash' | 'dot' | 'dashdot'
export type DrawingStyle = {
  stroke: string
  strokeWidth: number
  dash: StrokeDash
  opacity: number
  fill?: string | null
}

export type Drawing = {
  layerId?: string
  id: string
  kind: DrawingKind
  points: Point[]
  text?: string
  name?: string
  locked?: boolean
  hidden?: boolean
  groupId?: string | null
  style?: DrawingStyle
  fibLevels?: number[]
}

export const DEFAULT_STYLE: DrawingStyle = {
  stroke: '#9ca3af',
  strokeWidth: 1.75,
  dash: 'solid',
  opacity: 1,
  fill: null,
}

export function createDrawing(kind: string, start: Point) {
  const base: Partial<Drawing> = { style: { ...DEFAULT_STYLE }, groupId: null }
  switch (kind) {
    case 'trendline':
    case 'arrow':
    case 'ray':
    case 'rect':
    case 'ellipse':
    case 'fib':
    case 'ruler':
      return { id: nanoid(), kind: kind as DrawingKind, points: [start, start], ...base }
    case 'pitchfork':
    case 'parallel-channel':
      return { id: nanoid(), kind: kind as DrawingKind, points: [start, start, start], ...base }
    case 'hline':
      return { id: nanoid(), kind: 'hline', points: [start], ...base }
    case 'vline':
      return { id: nanoid(), kind: 'vline', points: [start], ...base }
    case 'text':
      return { id: nanoid(), kind: 'text', points: [start], text: 'Text', ...base }
    default:
      return null
  }
}

export function updateDrawingGeometry(d: Drawing, p: Point): Drawing {
  switch (d.kind) {
    case 'trendline':
    case 'arrow':
    case 'ray':
    case 'rect':
    case 'ellipse':
    case 'fib':
    case 'ruler':
      return { ...d, points: [d.points[0], p] }
    case 'pitchfork':
    case 'parallel-channel': {
      const pts = d.points.slice()
      if (pts.length < 3) pts.push(p)
      pts[1] = p
      return { ...d, points: pts }
    }
    case 'hline':
      return { ...d, points: [{ x: d.points[0].x, y: p.y }] }
    case 'vline':
      return { ...d, points: [{ x: p.x, y: d.points[0].y }] }
    case 'text':
      return { ...d, points: [p] }
    default:
      return d
  }
}

// Using existing Point type above

export function drawParallelChannel(ctx: CanvasRenderingContext2D, a: Point, b: Point, c: Point, w: number, h: number, fill?: string|null) {
    const vx=b.x-a.x, vy=b.y-a.y;
    const len=Math.hypot(vx,vy)||1;
    const nx=vx/len, ny=vy/len;
    const px=-ny, py=nx;
    const dist=((c.x-a.x)*px+(c.y-a.y)*py);
    const ox=px*dist, oy=py*dist;
    const far=Math.max(w,h)*2;
    const A1={x:a.x-nx*far,y:a.y-ny*far};
    const B1={x:b.x+nx*far,y:b.y+ny*far};
    const A2={x:A1.x+ox,y:A1.y+oy};
    const B2={x:B1.x+ox,y:B1.y+oy};
    if (fill) {
        ctx.save();
        ctx.globalAlpha=0.18;
        ctx.fillStyle=fill as string;
        ctx.beginPath();
        ctx.moveTo(A1.x,A1.y);
        ctx.lineTo(B1.x,B1.y);
        ctx.lineTo(B2.x,B2.y);
        ctx.lineTo(A2.x,A2.y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    ctx.beginPath();
    ctx.moveTo(A1.x,A1.y);
    ctx.lineTo(B1.x,B1.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(A2.x,A2.y);
    ctx.lineTo(B2.x,B2.y);
    ctx.stroke();
}

export function drawPitchfork(ctx: CanvasRenderingContext2D, a: Point, b: Point, c: Point, w: number, h: number) {
    const m={x:(b.x+c.x)/2,y:(b.y+c.y)/2};
    const vx=m.x-a.x, vy=m.y-a.y;
    const len=Math.hypot(vx,vy)||1;
    const nx=vx/len, ny=vy/len;
    const far=Math.max(w,h)*2;
    const M1={x:a.x-nx*far,y:a.y-ny*far};
    const M2={x:a.x+nx*far,y:a.y+ny*far};
    const px=-ny, py=nx;
    const distB=((b.x-a.x)*px+(b.y-a.y)*py);
    const distC=((c.x-a.x)*px+(c.y-a.y)*py);
    const PB1={x:M1.x+px*distB,y:M1.y+py*distB};
    const PB2={x:M2.x+px*distB,y:M2.y+py*distB};
    const PC1={x:M1.x+px*distC,y:M1.y+py*distC};
    const PC2={x:M2.x+px*distC,y:M2.y+py*distC};
    ctx.beginPath();
    ctx.moveTo(M1.x,M1.y);
    ctx.lineTo(M2.x,M2.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(PB1.x,PB1.y);
    ctx.lineTo(PB2.x,PB2.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(PC1.x,PC1.y);
    ctx.lineTo(PC2.x,PC2.y);
    ctx.stroke();
}
