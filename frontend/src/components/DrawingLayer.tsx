import React from 'react'
import { useChartStore } from '@/state/store'
import { distanceToSegment, rectFromPoints, withinRect, normalize, perpendicular } from '@/lib/geom'
import { Drawing, createDrawing, updateDrawingGeometry, arrowHead } from '@/lib/drawings'

type Point = { x: number; y: number }

export default function DrawingLayer() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const s = useChartStore()
  const [drawings, setDrawings] = React.useState<Drawing[]>(s.drawings)
  const [hoverId, setHoverId] = React.useState<string | null>(null)
  const [drag, setDrag] = React.useState<{ id: string; mode: 'move' | 'handle'; handleIdx?: number } | null>(null)
  const [marquee, setMarquee] = React.useState<{start:Point,end:Point}|null>(null)
  const drawingSettings = s.drawingSettings

  // sync from store
  React.useEffect(() => {
    const unsub = useChartStore.subscribe(state => setDrawings(state.drawings))
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
        ctx.strokeStyle = s.selection.has(d.id) ? '#60a5fa' : '#9ca3af'
        ctx.lineWidth = 1.5
        switch (d.kind) {
          case 'trendline': {
            const [a,b] = d.points
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
            if (drawingSettings.showHandles && s.selection.has(d.id)) drawHandles(ctx, [a,b])
            break
          }
          case 'hline': {
            const y = d.points[0].y
            ctx.beginPath()
            ctx.moveTo(0, y)
            ctx.lineTo(el.width, y)
            ctx.stroke()
            if (drawingSettings.showHandles && s.selection.has(d.id)) drawHandles(ctx, [{x:8,y},{x:el.width-8,y}])
            break
          }
          case 'vline': {
            const x = d.points[0].x
            ctx.beginPath()
            ctx.moveTo(x, 0)
            ctx.lineTo(x, el.height)
            ctx.stroke()
            if (drawingSettings.showHandles && s.selection.has(d.id)) drawHandles(ctx, [{x,y:8},{x,y:el.height-8}])
            break
          }
          case 'rect': {
            const r = rectFromPoints(d.points[0], d.points[1])
            ctx.strokeRect(r.x, r.y, r.w, r.h)
            if (drawingSettings.showHandles && s.selection.has(d.id)) {
              drawHandles(ctx, [
                {x:r.x, y:r.y}, {x:r.x+r.w, y:r.y},
                {x:r.x+r.w, y:r.y+r.h}, {x:r.x, y:r.y+r.h}
              ])
            }
            break
          }
          case 'text': {
            const p = d.points[0]
            ctx.fillStyle = '#e5e7eb'
            ctx.font = '12px ui-sans-serif, system-ui'
            ctx.fillText(d.text || 'Text', p.x, p.y)
            break
          }
          case 'arrow': {
            const [a,b] = d.points
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
            const head = arrowHead(a,b,10)
            ctx.beginPath()
            ctx.moveTo(head.tip.x, head.tip.y)
            ctx.lineTo(head.left.x, head.left.y)
            ctx.lineTo(head.right.x, head.right.y)
            ctx.closePath()
            ctx.fillStyle = ctx.strokeStyle as string
            ctx.fill()
            if (drawingSettings.showHandles && s.selection.has(d.id)) drawHandles(ctx,[a,b])
            break
          }
          case 'parallel-channel': {
            const [p1,p2,p3] = d.points
            const [nx, ny] = normalize(p2.x - p1.x, p2.y - p1.y)
            const [px, py] = perpendicular(nx, ny)
            const width = (p3.x - p1.x)*px + (p3.y - p1.y)*py
            const q1 = { x: p1.x + px*width, y: p1.y + py*width }
            const q2 = { x: p2.x + px*width, y: p2.y + py*width }
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(q1.x, q1.y); ctx.lineTo(q2.x, q2.y); ctx.stroke()
            if (drawingSettings.showHandles && s.selection.has(d.id)) drawHandles(ctx,[p1,p2,q2])
            break
          }
        }
      })
      if (marquee) {
        const r = rectFromPoints(marquee.start, marquee.end)
        ctx.strokeStyle = '#818cf8'
        ctx.setLineDash([4,4])
        ctx.strokeRect(r.x, r.y, r.w, r.h)
        ctx.setLineDash([])
      }
      ctx.restore()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)
    return () => ro.disconnect()
  }, [drawings, s.selection, marquee, drawingSettings])

  const toLocal = (e: React.MouseEvent): Point => {
    const r = containerRef.current!.getBoundingClientRect()
    let x = e.clientX - r.left, y = e.clientY - r.top
    if (drawingSettings.snapEnabled) {
      const step = drawingSettings.snapStep
      x = Math.round(x/step)*step
      y = Math.round(y/step)*step
    }
    return { x, y }
  }

  const onMouseDown = (e: React.MouseEvent) => {
    const p = toLocal(e)
    if (s.activeTool === 'select') {
      // start marquee if dragging empty space
      const hit = drawings.find(d => hitTest(d, p).hit)
      if (!hit) {
        setMarquee({ start: p, end: p })
        s.clearSelection()
        return
      }
      // select & start drag
      s.toggleSelect(hit.id, !e.shiftKey)
      const hitInfo = hitTest(hit, p)
      setDrag({ id: hit.id, mode: hitInfo.handleIdx != null ? 'handle' : 'move', handleIdx: hitInfo.handleIdx })
      return
    }

    // create a new drawing
    const d = createDrawing(s.activeTool as any, p)
    if (d) {
      s.addDrawing(d as any)
      setDrag({ id: (d as any).id, mode: 'handle', handleIdx: undefined })
    }
  }

  const onMouseMove = (e: React.MouseEvent) => {
    const p = toLocal(e)
    if (marquee) {
      setMarquee(v => v ? ({...v, end: p}) : null)
      return
    }
    if (drag) {
      s.updateDrawing(drag.id, dr => updateWithMode(dr, p, drag))
      return
    }
    // hover
    const first = drawings.map(d => ({...hitTest(d, p), id: d.id})).find(h => h.hit)
    setHoverId(first?.id ?? null)
  }

  const onMouseUp = () => {
    if (marquee) {
      const r = rectFromPoints(marquee.start, marquee.end)
      const ids = drawings.filter(d => d.points.some(pt => withinRect(pt, r))).map(d => d.id)
      s.setSelection(new Set(ids))
      setMarquee(null)
    }
    setDrag(null)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      s.deleteSelected()
    } else if (e.key === 'Escape') {
      s.clearSelection(); setDrag(null); setMarquee(null)
    } else if (e.key.toLowerCase() === 'a' && (e.ctrlKey || e.metaKey)) {
      s.setSelection(new Set(drawings.map(d => d.id))); e.preventDefault()
    } else if (e.key.toLowerCase() === 's') {
      s.setDrawingSettings({ snapEnabled: !s.drawingSettings.snapEnabled })
    }
  }

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
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

function hitTest(d: Drawing, p: Point): { hit: boolean; handleIdx?: number } {
  switch (d.kind) {
    case 'trendline': {
      const dist = distanceToSegment(p, d.points[0], d.points[1])
      const handle = handleIndex(d.points, p)
      return { hit: dist < 6 || handle != null, handleIdx: handle ?? undefined }
    }
    case 'hline': {
      const dist = Math.abs(p.y - d.points[0].y)
      return { hit: dist < 6 }
    }
    case 'vline': {
      const dist = Math.abs(p.x - d.points[0].x)
      return { hit: dist < 6 }
    }
    case 'rect': {
      const r = rectFromPoints(d.points[0], d.points[1])
      const h = handleIndex([
        {x:r.x, y:r.y}, {x:r.x+r.w, y:r.y},
        {x:r.x+r.w, y:r.y+r.h}, {x:r.x, y:r.y+r.h}
      ], p)
      const inside = withinRect(p, r) || h != null
      return { hit: inside, handleIdx: h ?? undefined }
    }
    case 'text': {
      const a = d.points[0]
      const r = { x: a.x, y: a.y-12, w: 80, h: 16 }
      return { hit: withinRect(p, r) }
    }
    case 'arrow': {
      const dist = distanceToSegment(p, d.points[0], d.points[1])
      const handle = handleIndex(d.points, p)
      return { hit: dist < 6 || handle != null, handleIdx: handle ?? undefined }
    }
    case 'parallel-channel': {
      const [p1,p2,p3] = d.points
      const d1 = distanceToSegment(p, p1, p2)
      const handle = handleIndex([p1,p2,p3], p)
      return { hit: d1 < 6 || handle != null, handleIdx: handle ?? undefined }
    }
    default: return { hit: false }
  }
}

function updateWithMode(d: any, p: Point, drag: {mode:'move'|'handle', handleIdx?: number}) {
  if (drag.mode === 'handle') return updateDrawingGeometry(d, p)
  // move whole shape using point[0] as anchor
  const p0 = d.points[0]
  const dx = p.x - p0.x
  const dy = p.y - p0.y
  return { ...d, points: d.points.map((pt: Point) => ({ x: pt.x + dx, y: pt.y + dy })) }
}

function drawHandles(ctx: CanvasRenderingContext2D, pts: Point[]) {
  ctx.save()
  ctx.fillStyle = '#60a5fa'
  pts.forEach(p => ctx.fillRect(p.x-3, p.y-3, 6, 6))
  ctx.restore()
}

function handleIndex(pts: Point[], p: Point): number | null {
  for (let i=0;i<pts.length;i++) {
    if (Math.abs(pts[i].x - p.x) <= 6 && Math.abs(pts[i].y - p.y) <= 6) return i
  }
  return null
}
