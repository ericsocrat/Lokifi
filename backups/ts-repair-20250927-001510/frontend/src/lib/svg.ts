import type { Drawing } from '@/lib/drawings'
import { rectFromPoints } from '@/lib/geom'

type P = { x:number; y:number }
const esc = (s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;')

export function drawingsToSVG(drawings: Drawing[], width: number, height: number): string {
  const parts:string[] = []
  parts.push(<svg xmlns='http://www.w3.org/2000/svg' width='' height='' viewBox='0 0  '>)
  parts.push(<g fill='none' stroke-linecap='round' stroke-linejoin='round'>)
  drawings.forEach(d => {
    if (d.hidden) return
    const sty = d.style || {}
    const stroke = sty.stroke || '#9ca3af'
    const sw = sty.strokeWidth || 1.75
    const dash = sty.dash==='dash' ? '8,6' : sty.dash==='dot' ? '2,4' : sty.dash==='dashdot' ? '10,6,2,6' : null
    const opacity = sty.opacity ?? 1
    const common = stroke='' stroke-width='' opacity='' + (dash? stroke-dasharray='':'')
    switch (d.kind) {
      case 'trendline':
      case 'arrow':
      case 'ray': {
        const [a,b] = d.points
        parts.push(<line x1='' y1='' x2='' y2=''  />)
        break
      }
      case 'hline': {
        const y = d.points[0].y
        parts.push(<line x1='0' y1='' x2='' y2=''  />)
        break
      }
      case 'vline': {
        const x = d.points[0].x
        parts.push(<line x1='' y1='0' x2='' y2=''  />)
        break
      }
      case 'rect': {
        const r = rectFromPoints(d.points[0], d.points[1])
        const fill = d.style?.fill ?  fill='' fill-opacity='0.18' :  fill='none'
        parts.push(<rect x='' y='' width='' height=''  />)
        break
      }
      case 'ellipse': {
        const r = rectFromPoints(d.points[0], d.points[1])
        const cx = r.x + r.w/2, cy = r.y + r.h/2
        const rx = Math.abs(r.w/2), ry = Math.abs(r.h/2)
        const fill = d.style?.fill ?  fill='' fill-opacity='0.18' :  fill='none'
        parts.push(<ellipse cx='' cy='' rx='' ry=''  />)
        break
      }
      case 'parallel-channel': {
        const [a,b,c] = d.points
        const vx=b.x-a.x, vy=b.y-a.y; const len=Math.hypot(vx,vy)||1
        const nx=vx/len, ny=vy/len, px=-ny, py=nx
        const dist = ((c.x-a.x)*px + (c.y-a.y)*py)
        const ox=px*dist, oy=py*dist
        const A2={x:a.x+ox,y:a.y+oy}, B2={x:b.x+ox,y:b.y+oy}
        const fill = d.style?.fill ?  fill='' fill-opacity='0.18' :  fill='none'
        parts.push(<polyline points=', ,'  />)
        parts.push(<polyline points=', ,'  />)
        parts.push(<polygon points=', , , ,'  stroke='none' />)
        break
      }
      case 'pitchfork': {
        const [a,b,c] = d.points
        const m={x:(b.x+c.x)/2, y:(b.y+c.y)/2}
        const vx=m.x-a.x, vy=m.y-a.y; const len=Math.hypot(vx,vy)||1
        const nx=vx/len, ny=vy/len, px=-ny, py=nx
        const distB = ((b.x-a.x)*px + (b.y-a.y)*py)
        const distC = ((c.x-a.x)*px + (c.y-a.y)*py)
        const mk=(p:P)=>${p.x},
        const M1={x:a.x-nx*1000,y:a.y-ny*1000}, M2={x:a.x+nx*1000,y:a.y+ny*1000}
        const PB1={x:M1.x+px*distB,y:M1.y+py*distB}, PB2={x:M2.x+px*distB,y:M2.y+py*distB}
        const PC1={x:M1.x+px*distC,y:M1.y+py*distC}, PC2={x:M2.x+px*distC,y:M2.y+py*distC}
        parts.push(<polyline points=' '  />)
        parts.push(<polyline points=' '  />)
        parts.push(<polyline points=' '  />)
        break
      }
      case 'fib': {
        const [a,b] = d.points
        const levels = (d.fibLevels ?? [0,0.236,0.382,0.5,0.618,1]).slice().sort((x,y)=>x-y)
        const y0 = a.y, y1 = b.y
        levels.forEach(p => {
          const y = y0 + (y1 - y0) * p
          parts.push(<line x1='0' y1='' x2='' y2=''  />)
        })
        break
      }
      case 'text': {
        const p = d.points[0]
        parts.push(<text x='' y='' fill='#e5e7eb' font-size='12'></text>)
        break
      }
    }
  })
  parts.push(</g></svg>)
  return parts.join('')
}
