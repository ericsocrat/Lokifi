import React from 'react'
import AlertModal from '@/components/AlertModal'\nimport { useChartStore } from '@/state/store'
import { distanceToSegment, rectFromPoints, withinRect } from '@/lib/geom'
import { Drawing, createDrawing, updateDrawingGeometry } from '@/lib/drawings'
import { snapPxToGrid, snapYToPriceLevels, magnetYToOHLC, yToPrice } from '@/lib/chartMap'

type Point = { x:number; y:number }
type Menu = { open: boolean; x:number; y:number }

const HANDLE_R = 4
const HIT_PAD = 6

export default function DrawingLayer() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const s = useChartStore()
  const layerOf = (id: string) => s.layers.find(l => l.id === id) || { visible: true, locked: false, opacity: 1 }  const [drawings, setDrawings] = React.useState<Drawing[]>(s.drawings)
  const [hoverId, setHoverId] = React.useState<string|null>(null)
  const [dragId, setDragId] = React.useState<string|null>(null)
  
  const [alertModalOpen, setAlertModalOpen] = React.useState(false)
  const [menu, setMenu] = React.useState<Menu>({ open:false, x:0, y:0 })

  // perf flags
  const needsDraw = React.useRef(true)
  const rafId = React.useRef<number|undefined>(undefined)
  const offscreen = React.useRef<OffscreenCanvas | null>(null)

  React.useEffect(() => useChartStore.subscribe(state => { setDrawings(state.drawings); needsDraw.current = true }), [])

  // Draw loop
  React.useEffect(() => {
    const el = canvasRef.current, container = containerRef.current
    if (!el || !container) return

    const setup = () => {
      const r = container.getBoundingClientRect()
      el.width = Math.floor(r.width * devicePixelRatio)
      el.height = Math.floor(r.height * devicePixelRatio)
      el.style.width = r.width + 'px'; el.style.height = r.height + 'px'
      // try offscreen
      try { offscreen.current = (el as any).transferControlToOffscreen?.() || null } catch { offscreen.current = null }
      needsDraw.current = true
    }

    const drawFrame = () => {
      if (!needsDraw.current) { rafId.current = requestAnimationFrame(drawFrame); return }
      const ctx = el.getContext('2d')!
      const width = el.width, height = el.height
      ctx.clearRect(0,0,width,height)
      ctx.save()
      ctx.scale(devicePixelRatio, devicePixelRatio)
      ctx.lineCap = s.drawingSettings.lineCap

      drawings.forEach(d => {\n        const ly = layerOf((d as any).layerId || s.activeLayerId || 'layer-1'); if (!ly.visible) return;
        if (d.hidden) return
        const selected = s.selection.has(d.id)
        const sty = d.style || {}
        const stroke = sty.stroke || '#9ca3af'
        const width = sty.strokeWidth || 1.75
        ctx.globalAlpha = sty.opacity ?? 1
        ctx.strokeStyle = selected ? '#60a5fa' : stroke
        ctx.lineWidth = width
        ctx.setLineDash(sty.dash==='dash' ? [8,6] : sty.dash==='dot' ? [2,4] : sty.dash==='dashdot' ? [10,6,2,6] : [])

        switch (d.kind) {
          case 'trendline':
          case 'arrow': {
            const [a,b] = d.points
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
            if (d.kind === 'arrow') drawArrowHead(ctx, a, b, s.drawingSettings.arrowHead, s.drawingSettings.arrowHeadSize, getStrokeColor(ctx))
            if (selected && s.drawingSettings.showHandles) { drawLineHandles(ctx, a, b) }
            if (s.drawingSettings.showLineLabels) { drawLineLabel(ctx, a, b) }
            break
          }
          case 'ray': {
            const [a,b] = d.points
            const ext = extendRayToBounds(a, b, el.width, el.height)
            ctx.beginPath(); ctx.moveTo(ext.start.x, ext.start.y); ctx.lineTo(ext.end.x, ext.end.y); ctx.stroke()
            if (selected && s.drawingSettings.showHandles) { drawLineHandles(ctx, a, b) }
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
            if (sty.fill) { ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = sty.fill as any; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.restore() }
            ctx.strokeRect(r.x, r.y, r.w, r.h)
            if (selected && s.drawingSettings.showHandles) drawRectHandles(ctx, r.x, r.y, r.w, r.h)
            break
          }
          case 'ellipse': {
            const r = rectFromPoints(d.points[0], d.points[1])
            const cx = r.x + r.w/2, cy = r.y + r.h/2
            const rx = Math.abs(r.w/2), ry = Math.abs(r.h/2)
            ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(rx,0.1), Math.max(ry,0.1), 0, 0, Math.PI*2)
            if (sty.fill) { ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = sty.fill as any; ctx.fill(); ctx.restore() }
            ctx.stroke()
            if (selected && s.drawingSettings.showHandles) drawRectHandles(ctx, r.x, r.y, r.w, r.h)
            break
          }
          case 'fib': {
            const [a,b] = d.points
            const levels = (d.fibLevels ?? s.drawingSettings.fibDefaultLevels).slice().sort((x,y)=>x-y)
            const y0 = a.y, y1 = b.y
            const left = 0, right = el.width
            ctx.font = '12px ui-sans-serif, system-ui'
            levels.forEach(p => {
              const y = y0 + (y1 - y0) * p
              ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke()
              const price = yToPrice(y)
              const txt = ${Math.round(p*100)}% + (price!=null ?    : '')
              ctx.fillStyle = '#e5e7eb'
              ctx.fillText(txt, right - 8 - ctx.measureText(txt).width, y - 4)
            })
            if (selected && s.drawingSettings.showHandles) { drawHandle(ctx, a); drawHandle(ctx, b) }
            break
          }
          case 'parallel-channel': {
            const [a,b,c] = d.points
            drawParallelChannel(ctx, a, b, c, el.width, el.height, sty.fill as any)
            if (selected && s.drawingSettings.showHandles) { drawHandle(ctx, a); drawHandle(ctx, b); drawHandle(ctx, c) }
            break
          }
          case 'pitchfork': {
            const [a,b,c] = d.points
            drawPitchfork(ctx, a, b, c, el.width, el.height)
            if (selected && s.drawingSettings.showHandles) { drawHandle(ctx, a); drawHandle(ctx, b); drawHandle(ctx, c) }
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
        ctx.setLineDash([])
        ctx.globalAlpha = 1
      })

      if (marquee) {
        const r = rectFromPoints(marquee.start, marquee.end)
        ctx.strokeStyle = '#818cf8'
        ctx.setLineDash([4,4]); ctx.strokeRect(r.x, r.y, r.w, r.h); ctx.setLineDash([])
      }

      ctx.restore()
      needsDraw.current = false
      rafId.current = requestAnimationFrame(drawFrame)
    }

    setup()
    needsDraw.current = true
    rafId.current = requestAnimationFrame(drawFrame)
    const ro = new ResizeObserver(() => { setup(); })
    ro.observe(container)
    return () => { if (rafId.current) cancelAnimationFrame(rafId.current); ro.disconnect() }
  }, [drawings, s.selection, marquee, s.drawingSettings])

  const invalidate = () => { needsDraw.current = true }

  const perToolSnapOn = () => s.drawingSettings.perToolSnap[String(s.activeTool)] !== false

  const toLocal = (e: React.MouseEvent): Point => {
    const r = containerRef.current!.getBoundingClientRect()
    let p = { x: e.clientX - r.left, y: e.clientY - r.top }
    p = snapPxToGrid(p, s.drawingSettings.snapStep, s.drawingSettings.snapEnabled && perToolSnapOn())
    if (s.drawingSettings.snapPriceLevels && perToolSnapOn()) p = { x:p.x, y: snapYToPriceLevels(p.y, 6) }
    if (s.drawingSettings.snapToOHLC && perToolSnapOn()) p = { x:p.x, y: magnetYToOHLC(p.y, s.drawingSettings.magnetTolerancePx) }
    return p
  }

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) return
    setMenu({ open:false, x:0, y:0 })
    const p = toLocal(e)

    if (s.activeTool === 'select') {
      const hit = drawings.find(d => !d.locked && !d.hidden && hitTest(d, p, containerRef.current! ) < HIT_PAD)
      if (!hit) { setMarquee({ start:p, end:p }); s.clearSelection(); invalidate(); return }
      s.toggleSelect(hit.id, !e.shiftKey); setDragId(hit.id); invalidate(); return
    }

    const d = createDrawing(, p) as any
    if (d) { d.layerId = d.layerId ?? s.activeLayerId; s.addDrawing(d); setDragId(d.id); invalidate() }
  }

  const onMouseMove = (e: React.MouseEvent) => {
    const p = toLocal(e)
    if (marquee) { setMarquee(v => v ? ({...v, end:p}) : null); invalidate(); return }
    if (dragId) { s.updateDrawing(dragId, dr => updateDrawingGeometry(dr, p)); invalidate(); return }
    const id = drawings.find(d => !d.hidden && hitTest(d, p, containerRef.current! ) < HIT_PAD)?.id ?? null
    setHoverId(id); // cosmetic; no invalidate
  }

  const onMouseUp = () => {
    if (marquee) {
      const r = rectFromPoints(marquee.start, marquee.end)
      const ids = drawings.filter(d => !d.hidden && !d.locked && d.points.some(pt => withinRect(pt, r))).map(d => d.id)
      s.setSelection(new Set(ids)); setMarquee(null); invalidate()
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

/** ===== Helpers (same as your S.1) ===== */
function drawHandle(ctx: CanvasRenderingContext2D, p: Point) { ctx.save(); ctx.fillStyle = '#0b1220'; ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 1; ctx.beginPath(); ctx.rect(p.x-4, p.y-4, 8, 8); ctx.fill(); ctx.stroke(); ctx.restore() }
function drawLineHandles(ctx: CanvasRenderingContext2D, a: Point, b: Point) { drawHandle(ctx, a); drawHandle(ctx, b) }
function drawRectHandles(ctx: CanvasRenderingContext2D, x:number, y:number, w:number, h:number) { drawHandle(ctx,{x,y}); drawHandle(ctx,{x:x+w,y}); drawHandle(ctx,{x,y:y+h}); drawHandle(ctx,{x:x+w,y:y+h}); drawHandle(ctx,{x:x+w/2,y}); drawHandle(ctx,{x:x+w/2,y:y+h}); drawHandle(ctx,{x,y:y+h/2}); drawHandle(ctx,{x:x+w,y:y+h/2}); }
function getStrokeColor(ctx: CanvasRenderingContext2D): string { const s = ctx.strokeStyle as any; return typeof s === 'string' ? s : '#9ca3af' }
function drawArrowHead(ctx: CanvasRenderingContext2D, a: Point, b: Point, kind: 'none'|'open'|'filled', size: number, color: string) {
  if (kind === 'none') return
  const vx=b.x-a.x, vy=b.y-a.y; const len=Math.hypot(vx,vy)||1; const nx=vx/len, ny=vy/len; const px=-ny, py=nx
  const tip=b; const baseX=b.x-nx*size; const baseY=b.y-ny*size
  ctx.save(); ctx.beginPath()
  if (kind === 'filled') { ctx.moveTo(tip.x, tip.y); ctx.lineTo(baseX+px*size*0.6, baseY+py*size*0.6); ctx.lineTo(baseX-px*size*0.6, baseY-py*size*0.6); ctx.closePath(); ctx.fillStyle=color; ctx.fill() }
  else { ctx.moveTo(tip.x, tip.y); ctx.lineTo(baseX+px*size*0.6, baseY+py*size*0.6); ctx.moveTo(tip.x, tip.y); ctx.lineTo(baseX-px*size*0.6, baseY-py*size*0.6); ctx.stroke() }
  ctx.restore()
}
function drawLineLabel(ctx: CanvasRenderingContext2D, a: Point, b: Point) { const p1=yToPrice(a.y), p2=yToPrice(b.y); if (p1==null||p2==null||p1===0) return; const pct=((p2-p1)/Math.abs(p1))*100; const txt=(pct>=0?'+':'')+pct.toFixed(2)+'%'; const pad=6; ctx.save(); ctx.font='12px ui-sans-serif, system-ui'; const w=ctx.measureText(txt).width+pad*2; const h=18; const x=b.x+8; const y=b.y-h-8; ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(x,y,w,h); ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.strokeRect(x+0.5,y+0.5,w-1,h-1); ctx.fillStyle='#e5e7eb'; ctx.fillText(txt,x+pad,y+13); ctx.restore() }
function extendRayToBounds(a: Point, b: Point, w: number, h: number) { const vx=b.x-a.x, vy=b.y-a.y; const len=Math.hypot(vx,vy)||1; const nx=vx/len, ny=vy/len; const far=Math.max(w,h)*2; const end={x:b.x+nx*far,y:b.y+ny*far}; const start={x:a.x-nx*8,y:a.y-ny*8}; return { start, end } }
function drawParallelChannel(ctx: CanvasRenderingContext2D, a: Point, b: Point, c: Point, w: number, h: number, fill?: string|null) { const vx=b.x-a.x, vy=b.y-a.y; const len=Math.hypot(vx,vy)||1; const nx=vx/len, ny=vy/len; const px=-ny, py=nx; const dist=((c.x-a.x)*px+(c.y-a.y)*py); const ox=px*dist, oy=py*dist; const far=Math.max(w,h)*2; const A1={x:a.x-nx*far,y:a.y-ny*far}; const B1={x:b.x+nx*far,y:b.y+ny*far}; const A2={x:A1.x+ox,y:A1.y+oy}; const B2={x:B1.x+ox,y:B1.y+oy}; if (fill) { ctx.save(); ctx.globalAlpha=0.18; ctx.fillStyle=fill as any; ctx.beginPath(); ctx.moveTo(A1.x,A1.y); ctx.lineTo(B1.x,B1.y); ctx.lineTo(B2.x,B2.y); ctx.lineTo(A2.x,A2.y); ctx.closePath(); ctx.fill(); ctx.restore() } ctx.beginPath(); ctx.moveTo(A1.x,A1.y); ctx.lineTo(B1.x,B1.y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(A2.x,A2.y); ctx.lineTo(B2.x,B2.y); ctx.stroke() }
function drawPitchfork(ctx: CanvasRenderingContext2D, a: Point, b: Point, c: Point, w: number, h: number) { const m={x:(b.x+c.x)/2,y:(b.y+c.y)/2}; const vx=m.x-a.x, vy=m.y-a.y; const len=Math.hypot(vx,vy)||1; const nx=vx/len, ny=vy/len; const far=Math.max(w,h)*2; const M1={x:a.x-nx*far,y:a.y-ny*far}; const M2={x:a.x+nx*far,y:a.y+ny*far}; const px=-ny, py=nx; const distB=((b.x-a.x)*px+(b.y-a.y)*py); const distC=((c.x-a.x)*px+(c.y-a.y)*py); const PB1={x:M1.x+px*distB,y:M1.y+py*distB}; const PB2={x:M2.x+px*distB,y:M2.y+py*distB}; const PC1={x:M1.x+px*distC,y:M1.y+py*distC}; const PC2={x:M2.x+px*distC,y:M2.y+py*distC}; ctx.beginPath(); ctx.moveTo(M1.x,M1.y); ctx.lineTo(M2.x,M2.y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(PB1.x,PB1.y); ctx.lineTo(PB2.x,PB2.y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(PC1.x,PC1.y); ctx.lineTo(PC2.x,PC2.y); ctx.stroke() }
function hitTest(d:any, p: Point, container: HTMLDivElement): number {
  if (d.hidden) return 999
  switch (d.kind) {
    case 'trendline':
    case 'arrow': return distanceToSegment(p, d.points[0], d.points[1])
    case 'ray': { const [a,b]=d.points; const r=container.getBoundingClientRect(); const ext=extendRayToBounds(a,b,r.width,r.height); return distanceToSegment(p, ext.start, ext.end) }
    case 'hline': return Math.abs(p.y - d.points[0].y)
    case 'vline': return Math.abs(p.x - d.points[0].x)
    case 'rect': { const r=rectFromPoints(d.points[0], d.points[1]); return withinRect(p, r) ? 0 : 999 }
    case 'ellipse': { const R=rectFromPoints(d.points[0], d.points[1]); const cx=R.x+R.w/2, cy=R.y+R.h/2; const rx=Math.max(Math.abs(R.w/2),0.1), ry=Math.max(Math.abs(R.h/2),0.1); const v=Math.abs(((p.x-cx)**2)/(rx**2)+((p.y-cy)**2)/(ry**2)-1); return v<0.15?0:999 }
    case 'fib': { const [a,b]=d.points; const lv=[0, ...(d.fibLevels ?? [0.236,0.382,0.5,0.618]), 1]; const y0=a.y, y1=b.y; let best=999; lv.forEach(pct=>{ const y=y0+(y1-y0)*pct; best=Math.min(best, Math.abs(p.y - y))}); return best }
    case 'parallel-channel': { const [a,b,c]=d.points; const r=container.getBoundingClientRect(); const vx=b.x-a.x, vy=b.y-a.y; const len=Math.hypot(vx,vy)||1; const nx=vx/len, ny=vy/len; const px=-ny, py=nx; const far=Math.max(r.width,r.height)*2; const A1={x:a.x-nx*far,y:a.y-ny*far}; const B1={x:b.x+nx*far,y:b.y+ny*far}; const dist=((c.x-a.x)*px+(c.y-a.y)*py); const A2={x:A1.x+px*dist,y:A1.y+py*dist}; const B2={x:B1.x+px*dist,y:B1.y+py*dist}; return Math.min(distanceToSegment(p,A1,B1), distanceToSegment(p,A2,B2)) }
    case 'pitchfork': { const [a,b,c]=d.points; const r=container.getBoundingClientRect(); const m={x:(b.x+c.x)/2,y:(b.y+c.y)/2}; const vx=m.x-a.x, vy=m.y-a.y; const len=Math.hypot(vx,vy)||1; const nx=vx/len, ny=vy/len; const far=Math.max(r.width,r.height)*2; const M1={x:a.x-nx*far,y:a.y-ny*far}; const M2={x:a.x+nx*far,y:a.y+ny*far}; const px=-ny, py=nx; const distB=((b.x-a.x)*px+(b.y-a.y)*py); const distC=((c.x-a.x)*px+(c.y-a.y)*py); const PB1={x:M1.x+px*distB,y:M1.y+py*distB}; const PB2={x:M2.x+px*distB,y:M2.y+py*distB}; const PC1={x:M1.x+px*distC,y:M1.y+py*distC}; const PC2={x:M2.x+px*distC,y:M2.y+py*distC}; return Math.min(distanceToSegment(p,M1,M2), distanceToSegment(p,PB1,PB2), distanceToSegment(p,PC1,PC2)) }
    case 'text': { const a=d.points[0]; const r={x:a.x,y:a.y-12,w:80,h:16}; return withinRect(p, r) ? 0 : 999 }
    default: return 999
  }
}
function ContextMenu({ x, y, onClose }:{x:number;y:number;onClose:()=>void}) {
  const s = useChartStore()
  const layerOf = (id: string) => s.layers.find(l => l.id === id) || { visible: true, locked: false, opacity: 1 }  const run = (fn:()=>void) => { fn(); onClose() }
  return (
    <div className='absolute z-20 rounded-md border border-white/10 bg-black/80 text-sm shadow-lg'
         style={{ left:x, top:y, minWidth:220 }}>
      <MenuBtn onClick={()=>run(()=>s.duplicateSelected())}>Duplicate</MenuBtn>
      <MenuBtn onClick={()=>run(()=>s.deleteSelected())}>Delete</MenuBtn>
      <div className='h-px bg-white/10 my-1' />
      <MenuBtn onClick={()=>run(()=>s.bringToFront())}>Bring to front</MenuBtn>
      <MenuBtn onClick={()=>run(()=>s.sendToBack())}>Send to back</MenuBtn>
      <div className='h-px bg-white/10 my-1' />
      <MenuBtn onClick={()=>run(()=>s.toggleLockSelected())}>Lock/Unlock</MenuBtn>
      <MenuBtn onClick={()=>run(()=>s.toggleVisibilitySelected())}>Show/Hide</MenuBtn>
    </div>
  )
}
function MenuBtn({children, onClick}:{children:React.ReactNode; onClick:()=>void}) { return <button onClick={onClick} className='w-full text-left px-3 py-2 hover:bg-white/10'>{children}</button> }


