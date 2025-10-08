import type { Drawing } from "@/lib/drawings"
import { rectFromPoints } from "@/lib/geom"

type B = { minX:number; maxX:number; minY:number; maxY:number, cx:number, cy:number }

function bbox(d: Drawing): B {
  const pts = d.points
  const xs = pts.map(p=>p.x), ys = pts.map(p=>p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  return { minX, maxX, minY, maxY, cx:(minX+maxX)/2, cy:(minY+maxY)/2 }
}

export function align(drawings: Drawing[], ids: Set<string>, dir: 'left'|'right'|'top'|'bottom') {
  const selected = drawings.filter(d=>ids.has(d.id))
  if (selected.length < 2) return drawings
  const boxes = new Map<string,B>(selected.map(d=>[d.id, bbox(d)]))
  let target = 0
  switch (dir) {
    case 'left':   target = Math.min(...selected.map(d=>boxes.get(d.id)!.minX)); break
    case 'right':  target = Math.max(...selected.map(d=>boxes.get(d.id)!.maxX)); break
    case 'top':    target = Math.min(...selected.map(d=>boxes.get(d.id)!.minY)); break
    case 'bottom': target = Math.max(...selected.map(d=>boxes.get(d.id)!.maxY)); break
  }
  const out = drawings.map(d=>{
    if (!ids.has(d.id)) return d
    const b = boxes.get(d.id)!
    const dx = dir==='left' ? target - b.minX : dir==='right' ? target - b.maxX : 0
    const dy = dir==='top' ? target - b.minY : dir==='bottom' ? target - b.maxY : 0
    return { ...d, points: d.points.map(p=>({ x: p.x + dx, y: p.y + dy })) }
  })
  return out
}

export function distribute(drawings: Drawing[], ids: Set<string>, axis: 'h'|'v') {
  const selected = drawings.filter(d=>ids.has(d.id))
  if (selected.length < 3) return drawings
  const boxes = selected.map(d=>({ id:d.id, ...bbox(d) }))
  if (axis==='h') {
    boxes.sort((a,b)=>a.minX-b.minX)
    const totalSpan = boxes[boxes.length-1].minX - boxes[0].minX
    const gap = totalSpan / (boxes.length-1)
    const out = new Map<string,number>()
    boxes.forEach((b,i)=>{
      const dx = (boxes[0].minX + gap*i) - b.minX
      out.set(b.id, dx)
    })
    return drawings.map(d => out.has(d.id) ? ({ ...d, points: d.points.map(p=>({ x:p.x + (out.get(d.id) || 0), y:p.y })) }) : d)
  } else {
    boxes.sort((a,b)=>a.minY-b.minY)
    const totalSpan = boxes[boxes.length-1].minY - boxes[0].minY
    const gap = totalSpan / (boxes.length-1)
    const out = new Map<string,number>()
    boxes.forEach((b,i)=>{
      const dy = (boxes[0].minY + gap*i) - b.minY
      out.set(b.id, dy)
    })
    return drawings.map(d => out.has(d.id) ? ({ ...d, points: d.points.map(p=>({ x:p.x, y:p.y + (out.get(d.id) || 0) })) }) : d)
  }
}
