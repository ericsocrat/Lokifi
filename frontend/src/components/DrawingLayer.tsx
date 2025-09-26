import React from 'react'
import { useChartStore } from '@/state/store'
import { distanceToSegment, rectFromPoints, withinRect } from '@/lib/geom'
import { Drawing, createDrawing, updateDrawingGeometry } from '@/lib/drawings'
import { snapPxToGrid, snapYToPriceLevels, yToPrice } from '@/lib/chartMap'

type Point = { x:number; y:number }
type Menu = { open: boolean; x:number; y:number }

const HANDLE_R = 4
const HIT_PAD = 6

export default function DrawingLayer() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const s = useChartStore()
  const [drawings, setDrawings] = React.useState<Drawing[]>(s.drawings)
  const [hoverId, setHoverId] = React.useState<string|null>(null)
  const [dragId, setDragId] = React.useState<string|null>(null)
  const [marquee, setMarquee] = React.useState<{start:Point,end:Point}|null>(null)
  const [menu, setMenu] = React.useState<Menu>({ open:false, x:0, y:0 })

  React.useEffect(() => useChartStore.subscribe(state => setDrawings(state.drawings)), [])

  React.useEffect(() => {
    const el = canvasRef.current, container = containerRef.current
    if (!el || !container) return
    const ctx = el.getContext('2d')!
    const resize = () => {
      const r = container.getBoundingClientRect()
      el.width = Math.floor(r.width * devicePixelRatio)
      el.height = Math.floor(r.height * devicePixelRatio)
      el.style.width = r.width + 'px'; el.style.height = r.height + 'px'
      drawAll()
    }
    const drawAll = () => {
      ctx.clearRect(0,0,el.width, el.height)
      ctx.save()
      ctx.scale(devicePixelRatio, devicePixelRatio)
      ctx.lineCap = s.drawingSettings.lineCap

      drawings.forEach(d => {
        const selected = s.selection.has(d.id)
        ctx.strokeStyle = selected ? '#60a5fa' : '#9ca3af'
        ctx.lineWidth = 1.75
        ctx.setLineDash([])

        switch (d.kind) {
          case 'trendline':
          case 'arrow': {
            const [a,b] = d.points
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
            if (d.kind === 'arrow') {
              drawArrowHead(ctx, a, b, s.drawingSettings.arrowHead, s.drawingSettings.arrowHeadSize, getStrokeColor(ctx))
            }
            if (selected && s.drawingSettings.showHandles) { drawHandle(ctx, a); drawHandle(ctx, b) }
            if (s.drawingSettings.showLineLabels) { drawLineLabel(ctx, a, b) }
            break
          }
          case 'ray': {
            const [a,b] = d.points
            const ext = extendRayToBounds(a, b, el.width, el.height)
            ctx.beginPath(); ctx.moveTo(ext.start.x, ext.start.y); ctx.lineTo(ext.end.x, ext.end.y); ctx.stroke()
            if (selected && s.drawingSettings.showHandles) { drawHandle(ctx, a); drawHandle(ctx, b) }
            if (s.drawingSettings.showLineLabels) { drawLineLabel(ctx, a, b) }
            break
          }
          case 'hline': {
            const y = d.points[0].y
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(el.width, y); ctx.stroke()
            if (selected && s.drawingSettings.showHandles) drawHandle(ctx, {x:24,y})
            break
          }
          case 'vline': {
            const x = d.points[0].x
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, el.height); ctx.stroke()
            if (selected && s.drawingSettings.showHandles) drawHandle(ctx, {x, y:24})
            break
          }
          case 'rect': {
            const r = rectFromPoints(d.points[0], d.points[1])
            ctx.strokeRect(r.x, r.y, r.w, r.h)
            if (selected && s.drawingSettings.showHandles) {
              drawHandle(ctx, {x:r.x,y:r.y}); drawHandle(ctx, {x:r.x+r.w,y:r.y})
              drawHandle(ctx, {x:r.x,y:r.y+r.h}); drawHandle(ctx, {x:r.x+r.w,y:r.y+r.h})
            }
            break
          }
          case 'ellipse': {
            const r = rectFromPoints(d.points[0], d.points[1])
            const cx = r.x + r.w/2, cy = r.y + r.h/2
            const rx = Math.abs(r.w/2), ry = Math.abs(r.h/2)
            ctx.beginPath()
            ctx.ellipse(cx, cy, Math.max(rx,0.1), Math.max(ry,0.1), 0, 0, Math.PI*2)
            ctx.stroke()
            if (selected && s.drawingSettings.showHandles) {
              drawHandle(ctx, {x:r.x,y:r.y}); drawHandle(ctx, {x:r.x+r.w,y:r.y+r.h})
            }
            break
          }
          case 'fib': {
            const [a,b] = d.points
            const levels = [0, 0.236, 0.382, 0.5, 0.618, 1]
            const y0 = a.y, y1 = b.y
            const left = 0, right = el.width
            ctx.font = '12px ui-sans-serif, system-ui'
            levels.forEach(p => {
              const y = y0 + (y1 - y0) * p
              ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke()
              // labels: % and price if possible
              const price = yToPrice(y)
              const txt = ${Math.round(p*100)}% + (price!=null ?    : '')
              ctx.fillStyle = '#e5e7eb'
              ctx.fillText(txt, right - 8 - ctx.measureText(txt).width, y - 4)
            })
            if (selected && s.drawingSettings.showHandles) { drawHandle(ctx, a); drawHandle(ctx, b) }
            break
          }
          case 'text': {
            const p = d.points[0]
            ctx.fillStyle = '#e5e7eb'
            ctx.font = '12px ui-sans-serif, system-ui'
            ctx.fillText(d.text || 'Text', p.x, p.y)
            if (selected && s.drawingSettings.showHandles) drawHandle(ctx, p)
            break
          }
        }
      })

      if (marquee) {
        const r = rectFromPoints(marquee.start, marquee.end)
        ctx.strokeStyle = '#818cf8'
        ctx.setLineDash([4,4]); ctx.strokeRect(r.x, r.y, r.w, r.h); ctx.setLineDash([])
      }

      ctx.restore()
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)
    return () => ro.disconnect()
  }, [drawings, s.selection, marquee, s.drawingSettings])

  const toLocal = (e: React.MouseEvent): Point => {
    const r = containerRef.current!.getBoundingClientRect()
    let p = { x: e.clientX - r.left, y: e.clientY - r.top }
    p = snapPxToGrid(p, s.drawingSettings.snapStep, s.drawingSettings.snapEnabled)
    if (s.drawingSettings.snapPriceLevels) p = { x:p.x, y: snapYToPriceLevels(p.y, 6) }
    return p
  }

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) return
    setMenu({ open:false, x:0, y:0 })
    const p = toLocal(e)

    if (s.activeTool === 'select') {
      const hit = drawings.find(d => hitTest(d, p, containerRef.current! ) < HIT_PAD)
      if (!hit) { setMarquee({ start:p, end:p }); s.clearSelection(); return }
      s.toggleSelect(hit.id, !e.shiftKey)
      setDragId(hit.id)
      return
    }

    const d = createDrawing(s.activeTool as any, p)
    if (d) { s.addDrawing(d); setDragId(d.id) }
  }

  const onMouseMove = (e: React.MouseEvent) => {
    const p = toLocal(e)
    if (marquee) { setMarquee(v => v ? ({...v, end:p}) : null); return }
    if (dragId) { s.updateDrawing(dragId, dr => updateDrawingGeometry(dr, p)); return }
    const id = drawings.find(d => hitTest(d, p, containerRef.current! ) < HIT_PAD)?.id ?? null
    setHoverId(id)
  }

  const onMouseUp = () => {
    if (marquee) {
      const r = rectFromPoints(marquee.start, marquee.end)
      const ids = drawings.filter(d => d.points.some(pt => withinRect(pt, r))).map(d => d.id)
      s.setSelection(new Set(ids)); setMarquee(null)
    }
    setDragId(null)
  }

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const r = containerRef.current!.getBoundingClientRect()
    setMenu({ open:true, x: e.clientX - r.left, y: e.clientY - r.top })
  }

  return (
    <div ref={containerRef} className='absolute inset-0' onContextMenu={onContextMenu}>
      <canvas
        ref={canvasRef}
        className='absolute inset-0'
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        tabIndex={0}
        style={{ outline:'none', cursor: s.activeTool==='select' ? (hoverId ? 'pointer':'default') : 'crosshair' }}
      />
      {menu.open && <ContextMenu x={menu.x} y={menu.y} onClose={()=>setMenu({open:false,x:0,y:0})} />}
    </div>
  )
}

/** ===== Helpers & UI ===== */

function drawHandle(ctx: CanvasRenderingContext2D, p: Point) {
  ctx.save(); ctx.fillStyle = '#0b1220'; ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.rect(p.x-HANDLE_R, p.y-HANDLE_R, HANDLE_R*2, HANDLE_R*2); ctx.fill(); ctx.stroke()
  ctx.restore()
}
function getStrokeColor(ctx: CanvasRenderingContext2D): string {
  const s = ctx.strokeStyle as any; return typeof s === 'string' ? s : '#9ca3af'
}
function drawArrowHead(ctx: CanvasRenderingContext2D, a: Point, b: Point, kind: 'none'|'open'|'filled', size: number, color: string) {
  if (kind === 'none') return
  const vx=b.x-a.x, vy=b.y-a.y; const len=Math.hypot(vx,vy)||1; const nx=vx/len, ny=vy/len; const px=-ny, py=nx
  const tip=b; const baseX=b.x-nx*size; const baseY=b.y-ny*size
  ctx.save(); ctx.beginPath()
  if (kind === 'filled') {
    ctx.moveTo(tip.x, tip.y); ctx.lineTo(baseX+px*size*0.6, baseY+py*size*0.6); ctx.lineTo(baseX-px*size*0.6, baseY-py*size*0.6)
    ctx.closePath(); ctx.fillStyle=color; ctx.fill()
  } else {
    ctx.moveTo(tip.x, tip.y); ctx.lineTo(baseX+px*size*0.6, baseY+py*size*0.6)
    ctx.moveTo(tip.x, tip.y); ctx.lineTo(baseX-px*size*0.6, baseY-py*size*0.6); ctx.stroke()
  }
  ctx.restore()
}

/** % label using y->price */
function drawLineLabel(ctx: CanvasRenderingContext2D, a: Point, b: Point) {
  const p1 = yToPrice(a.y), p2 = yToPrice(b.y)
  if (p1 == null || p2 == null || p1 === 0) return
  const pct = ((p2 - p1) / Math.abs(p1)) * 100
  const txt = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'
  const pad = 6
  ctx.save()
  ctx.font = '12px ui-sans-serif, system-ui'
  const w = ctx.measureText(txt).width + pad*2
  const h = 18
  const x = b.x + 8
  const y = b.y - h - 8
  ctx.fillStyle = 'rgba(0,0,0,0.65)'
  ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.strokeRect(x+0.5, y+0.5, w-1, h-1)
  ctx.fillStyle = '#e5e7eb'
  ctx.fillText(txt, x + pad, y + 13)
  ctx.restore()
}

/** Extend segment AB as a forward ray through B until canvas bounds */
function extendRayToBounds(a: Point, b: Point, w: number, h: number) {
  const vx = b.x - a.x, vy = b.y - a.y
  const len = Math.hypot(vx, vy) || 1
  const nx = vx/len, ny = vy/len
  // project far enough to hit an edge
  const far = Math.max(w, h) * 2
  const end = { x: b.x + nx * far, y: b.y + ny * far }
  // back to start just a little before A for visual continuity
  const start = { x: a.x - nx * 8, y: a.y - ny * 8 }
  return { start, end }
}

function hitTest(d: Drawing, p: Point, container: HTMLDivElement): number {
  switch (d.kind) {
    case 'trendline':
    case 'arrow':
      return distanceToSegment(p, d.points[0], d.points[1])
    case 'ray': {
      // distance to infinite segment in forward direction
      const [a,b] = d.points
      // reuse distanceToSegment against our extended ray segment
      const r = container.getBoundingClientRect()
      const ext = extendRayToBounds(a,b, r.width, r.height)
      return distanceToSegment(p, ext.start, ext.end)
    }
    case 'hline': return Math.abs(p.y - d.points[0].y)
    case 'vline': return Math.abs(p.x - d.points[0].x)
    case 'rect': {
      const r = rectFromPoints(d.points[0], d.points[1])
      return withinRect(p, r) ? 0 : 999
    }
    case 'ellipse': {
      const R = rectFromPoints(d.points[0], d.points[1])
      const cx = R.x + R.w/2, cy = R.y + R.h/2
      const rx = Math.max(Math.abs(R.w/2), 0.1), ry = Math.max(Math.abs(R.h/2), 0.1)
      // normalized ellipse equation value
      const v = Math.abs(((p.x - cx) ** 2) / (rx ** 2) + ((p.y - cy) ** 2) / (ry ** 2) - 1)
      // approximate distance band
      return v < 0.15 ? 0 : 999
    }
    case 'fib': {
      const [a,b] = d.points
      const levels = [0, 0.236, 0.382, 0.5, 0.618, 1]
      const y0 = a.y, y1 = b.y
      let best = 999
      levels.forEach(pct => {
        const y = y0 + (y1 - y0) * pct
        best = Math.min(best, Math.abs(p.y - y))
      })
      return best
    }
    case 'text': {
      const a = d.points[0]; const r = { x:a.x, y:a.y-12, w:80, h:16 }
      return withinRect(p, r) ? 0 : 999
    }
    default: return 999
  }
}

/** Context Menu */
function ContextMenu({ x, y, onClose }:{x:number;y:number;onClose:()=>void}) {
  const s = useChartStore()
  const run = (fn:()=>void) => { fn(); onClose() }
  return (
    <div className='absolute z-20 rounded-md border border-white/10 bg-black/80 text-sm shadow-lg'
         style={{ left:x, top:y, minWidth:220 }}>
      <MenuBtn onClick={()=>run(()=>s.duplicateSelected())}>Duplicate</MenuBtn>
      <MenuBtn onClick={()=>run(()=>s.deleteSelected())}>Delete</MenuBtn>

      <div className='h-px bg-white/10 my-1' />

      <MenuBtn onClick={()=>run(()=>s.alignSelected('left'))}>Align Left</MenuBtn>
      <MenuBtn onClick={()=>run(()=>s.alignSelected('right'))}>Align Right</MenuBtn>
      <MenuBtn onClick={()=>run(()=>s.alignSelected('top'))}>Align Top</MenuBtn>
      <MenuBtn onClick={()=>run(()=>s.alignSelected('bottom'))}>Align Bottom</MenuBtn>

      <MenuBtn onClick={()=>run(()=>s.distributeSelected('h'))}>Distribute Horizontal</MenuBtn>
      <MenuBtn onClick={()=>run(()=>s.distributeSelected('v'))}>Distribute Vertical</MenuBtn>

      <div className='h-px bg-white/10 my-1' />

      <MenuBtn onClick={()=>run(()=>s.setDrawingSettings({ snapPriceLevels: !s.drawingSettings.snapPriceLevels }))}>
        Snap to Price Levels: {s.drawingSettings.snapPriceLevels ? 'On' : 'Off'}
      </MenuBtn>
      <MenuBtn onClick={()=>run(()=>s.setDrawingSettings({ showLineLabels: !s.drawingSettings.showLineLabels }))}>
        Line Labels: {s.drawingSettings.showLineLabels ? 'On' : 'Off'}
      </MenuBtn>
    </div>
  )
}
function MenuBtn({children, onClick}:{children:React.ReactNode; onClick:()=>void}) {
  return <button onClick={onClick} className='w-full text-left px-3 py-2 hover:bg-white/10'>{children}</button>
}
