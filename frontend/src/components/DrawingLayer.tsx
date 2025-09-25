import React from 'react'
import { useChartStore } from '@/state/store'
import { distanceToSegment, rectFromPoints, withinRect } from '@/lib/geom'
import { Drawing, createDrawing, updateDrawingGeometry } from '@/lib/drawings'
import { applyCtxStyle } from '@/lib/styles'
import { snapPxToGrid } from '@/lib/chartMap'
import { loadCurrent, saveCurrent } from '@/lib/persist'

type Point = { x: number; y: number }

export default function DrawingLayer() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const s = useChartStore()
  const [drawings, setDrawings] = React.useState<Drawing[]>(s.drawings)
  const [hoverId, setHoverId] = React.useState<string | null>(null)
  const [dragId, setDragId] = React.useState<string | null>(null)
  const [marquee, setMarquee] = React.useState<{start:Point,end:Point}|null>(null)

  // load snapshot once
  React.useEffect(() => {
    const snap = loadCurrent()
    if (snap && snap.drawings) {
      useChartStore.setState({ drawings: snap.drawings, selection: new Set(snap.selection || []) })
      setDrawings(snap.drawings as any)
    }
  }, [])

  // subscribe + autosave
  React.useEffect(() => {
    const unsub = useChartStore.subscribe(state => {
      setDrawings(state.drawings)
      try { saveCurrent(state.drawings, state.selection) } catch {}
    })
    return unsub
  }, [])

  React.useEffect(() => {
    const el = canvasRef.current
    const container = containerRef.current
    if (!el || !container) return
    const ctx = el.getContext('2d')!
    const resize = () => {
      const r = container.getBoundingClientRect()
      el.width = Math.floor(r.width * devicePixelRatio)
      el.height = Math.floor(r.height * devicePixelRatio)
      el.style.width = r.width + 'px'
      el.style.height = r.height + 'px'
      drawAll()
    }
    const drawAll = () => {
      ctx.clearRect(0,0,el.width, el.height)
      ctx.save()
      ctx.scale(devicePixelRatio, devicePixelRatio)
      drawings.forEach(d => {
        applyCtxStyle(ctx, d.style)
        if (s.selection.has(d.id)) {
          // highlight selection stroke color slightly
          ctx.strokeStyle = d.style.stroke
        }
        switch (d.kind) {
          case 'trendline': {
            const [a,b] = d.points
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
            break
          }
          case 'hline': {
            const y = d.points[0].y
            ctx.beginPath()
            ctx.moveTo(0, y)
            ctx.lineTo(el.width, y)
            ctx.stroke()
            break
          }
          case 'vline': {
            const x = d.points[0].x
            ctx.beginPath()
            ctx.moveTo(x, 0)
            ctx.lineTo(x, el.height)
            ctx.stroke()
            break
          }
          case 'rect': {
            const r = rectFromPoints(d.points[0], d.points[1])
            if (d.style.fill && d.style.fill !== 'transparent') {
              ctx.fillStyle = d.style.fill as string
              ctx.globalAlpha = (d.style.opacity ?? 1) * 0.2
              ctx.fillRect(r.x, r.y, r.w, r.h)
              ctx.globalAlpha = d.style.opacity ?? 1
            }
            ctx.strokeRect(r.x, r.y, r.w, r.h)
            break
          }
          case 'text': {
            const p = d.points[0]
            ctx.fillStyle = d.style.stroke
            const fs = Math.max(8, Math.min(64, d.style.fontSize ?? 12))
            ctx.font = ${fs}px ui-sans-serif, system-ui
            ctx.globalAlpha = d.style.opacity ?? 1
            ctx.fillText(d.text || 'Text', p.x, p.y)
            break
          }
          case 'arrow': {
            const [a,b] = d.points
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
            // simple arrow head
            const vx = b.x - a.x, vy = b.y - a.y
            const m = Math.hypot(vx, vy) || 1
            const nx = vx / m, ny = vy / m
            const px = -ny, py = nx
            const size = 10 + (d.style.width ?? 1)
            const tip = b
            const baseX = b.x - nx*size, baseY = b.y - ny*size
            ctx.beginPath()
            ctx.moveTo(tip.x, tip.y)
            ctx.lineTo(baseX + px*size*0.6, baseY + py*size*0.6)
            ctx.lineTo(baseX - px*size*0.6, baseY - py*size*0.6)
            ctx.closePath()
            const prevAlpha = ctx.globalAlpha
            ctx.globalAlpha = (d.style.opacity ?? 1)
            ctx.fillStyle = d.style.stroke
            ctx.fill()
            ctx.globalAlpha = prevAlpha
            break
          }
          case 'parallel-channel': {
            const [p1,p2,p3] = d.points
            const vx = p2.x - p1.x, vy = p2.y - p1.y
            const m = Math.hypot(vx, vy) || 1
            const nx = vx/m, ny = vy/m
            const px = -ny, py = nx
            const width = (p3.x - p1.x)*px + (p3.y - p1.y)*py
            const q1 = { x: p1.x + px*width, y: p1.y + py*width }
            const q2 = { x: p2.x + px*width, y: p2.y + py*width }
            ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.stroke()
            ctx.beginPath(); ctx.moveTo(q1.x,q1.y); ctx.lineTo(q2.x,q2.y); ctx.stroke()
            break
          }
        }
      })
      if (marquee) {
        ctx.save()
        const r = rectFromPoints(marquee.start, marquee.end)
        ctx.strokeStyle = '#818cf8'
        ctx.setLineDash([4,4])
        ctx.strokeRect(r.x, r.y, r.w, r.h)
        ctx.restore()
      }
      ctx.restore()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)
    return () => ro.disconnect()
  }, [drawings, s.selection, marquee])

  const toLocal = (e: React.MouseEvent): Point => {
    const r = containerRef.current!.getBoundingClientRect()
    const raw = { x: e.clientX - r.left, y: e.clientY - r.top }
    try { return snapPxToGrid(raw) } catch { return raw }
  }

  const onMouseDown = (e: React.MouseEvent) => {
    s.commit()
    const p = toLocal(e)
    if (s.activeTool === 'select') {
      const hit = drawings.find(d => hitTest(d, p) < 6)
      if (!hit) { setMarquee({ start: p, end: p }); s.clearSelection(); return }
      s.toggleSelect(hit.id, !e.shiftKey)
      setDragId(hit.id)
      return
    }
    const d = createDrawing(s.activeTool as any, p)
    if (d) { s.addDrawing(d as any); setDragId((d as any).id) }
  }

  const onMouseMove = (e: React.MouseEvent) => {
    const p = toLocal(e)
    if (marquee) { setMarquee(v => v ? ({...v, end: p}) : null); return }
    if (dragId) { s.updateDrawing(dragId, dr => updateDrawingGeometry(dr, p)); return }
    const id = drawings.find(d => hitTest(d, p) < 6)?.id ?? null
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

  const onKeyDown = (e: React.KeyboardEvent) => {
    const ctrl = e.ctrlKey || e.metaKey
    if (ctrl && e.key.toLowerCase() === 'z') { e.preventDefault(); s.undo(); return }
    if ((ctrl && e.key.toLowerCase() === 'y') || (ctrl && e.shiftKey && e.key.toLowerCase() === 'z')) { e.preventDefault(); s.redo(); return }
    if (ctrl && e.key.toLowerCase() === 'c') { e.preventDefault(); s.copySelected(); return }
    if (ctrl && e.key.toLowerCase() === 'v') { e.preventDefault(); s.commit(); s.paste({dx: 12, dy: 12}); return }
    if (ctrl && e.key.toLowerCase() === 's') { e.preventDefault(); try { saveCurrent(s.drawings, s.selection) } catch {} return }

    if (e.key === 'Delete' || e.key === 'Backspace') { s.commit(); s.deleteSelected() }
    else if (e.key === 'Escape') { s.clearSelection(); setDragId(null); setMarquee(null) }
    else if (e.key === 'a' && ctrl) { s.setSelection(new Set(drawings.map(d => d.id))); e.preventDefault() }

    // quick color hotkeys 1..0 for palette indices 0..9
    if (!ctrl && e.key >= '0' && e.key <= '9') {
      const idx = (e.key === '0') ? 9 : (parseInt(e.key,10)-1)
      const PALETTE = ['#60a5fa','#22c55e','#f59e0b','#ef4444','#e879f9','#a78bfa','#f472b6','#f97316','#94a3b8','#e5e7eb']
      s.setStyleForSelection({ stroke: PALETTE[idx] })
    }
    if (e.key === '+' || e.key === '=') { s.setStyleForSelection({ width:  (getStyleAvg(s, 'width') ?? 2) + 1 }) }
    if (e.key === '-') { s.setStyleForSelection({ width: Math.max(1, (getStyleAvg(s, 'width') ?? 2) - 1) }) }
  }

  return (
    <div ref={containerRef} className='absolute inset-0'>
      <canvas
        ref={canvasRef}
        className='absolute inset-0'
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onKeyDown={onKeyDown}
        tabIndex={0}
        style={{ outline: 'none', cursor: s.activeTool==='select' ? (hoverId ? 'pointer' : 'crosshair') : 'crosshair' }}
      />
    </div>
  )
}

function getStyleAvg(store: any, key: string): number | undefined {
  const ids = Array.from(store.selection)
  const ds = store.drawings.filter((d:any)=>ids.includes(d.id))
  if (ds.length === 0) return
  const vals = ds.map((d:any)=>Number(d.style?.[key] ?? 0)).filter((n:number)=>!Number.isNaN(n))
  if (vals.length === 0) return
  return Math.round(vals.reduce((a:number,b:number)=>a+b,0)/vals.length)
}

function hitTest(d: Drawing, p: Point): number {
  switch (d.kind) {
    case 'trendline': return distanceToSegment(p, d.points[0], d.points[1])
    case 'hline': return Math.abs(p.y - d.points[0].y)
    case 'vline': return Math.abs(p.x - d.points[0].x)
    case 'rect': {
      const r = rectFromPoints(d.points[0], d.points[1])
      const inside = withinRect(p, r)
      return inside ? 0 : 999
    }
    case 'text': {
      const a = d.points[0]
      const r = { x: a.x, y: a.y-12, w: 80, h: 16 }
      return withinRect(p, r) ? 0 : 999
    }
    case 'arrow': {
      return distanceToSegment(p, d.points[0], d.points[1])
    }
    case 'parallel-channel': {
      const [p1,p2] = d.points
      return Math.min(
        distanceToSegment(p, p1, p2),
        distanceToSegment(p, p1, { x: p2.x + (d.points[2].x-p1.x), y: p2.y + (d.points[2].y-p1.y) })
      )
    }
    default: return 999
  }
}
