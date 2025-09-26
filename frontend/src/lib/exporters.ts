import { drawingsToSVG } from '@/lib/svg'
import { useChartStore } from '@/state/store'

/** Merge the visible chart canvas (if found) with DrawingLayer canvas and download PNG */
export async function exportPNG(filename = 'fynix-chart.png') {
  const container = document.querySelector('main') || document.body
  const canvases = Array.from(container.querySelectorAll('canvas')) as HTMLCanvasElement[]
  if (canvases.length === 0) return
  // Heuristic: base layer = first chart canvas (lightweight-charts), overlay = DrawingLayer (last)
  const base = canvases[0]
  const overlay = canvases[canvases.length - 1]
  const w = Math.max(base.width, overlay.width)
  const h = Math.max(base.height, overlay.height)
  const tmp = document.createElement('canvas')
  tmp.width = w; tmp.height = h
  const ctx = tmp.getContext('2d')!
  ctx.drawImage(base, 0, 0)
  ctx.drawImage(overlay, 0, 0)
  const url = tmp.toDataURL('image/png')
  downloadURL(url, filename)
}

/** Export vector-only drawings as SVG (doesn't rasterize the price series) */
export function exportSVG(filename = 'fynix-drawings.svg') {
  const s = (useChartStore as any).getState?.() || null
  if (!s) return
  const container = document.querySelector('main') as HTMLElement | null
  const rect = container?.getBoundingClientRect() || { width: 1200, height: 600 }
  const svg = drawingsToSVG(s.drawings, Math.round(rect.width), Math.round(rect.height))
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  downloadURL(url, filename)
  setTimeout(()=>URL.revokeObjectURL(url), 10000)
}

function downloadURL(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
}
