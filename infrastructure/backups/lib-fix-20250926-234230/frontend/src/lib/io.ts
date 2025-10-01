export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
  downloadBlob(filename, blob)
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Composites all visible canvases under a root element into one PNG.
 * We specifically target:
 *  - lightweight-charts canvases inside the PriceChart container
 *  - our DrawingLayer canvas
 */
export async function exportPngFromRoot(root: HTMLElement, outName = 'lokifi.png') {
  const canvases = Array.from(root.querySelectorAll('canvas')) as HTMLCanvasElement[]
  if (canvases.length === 0) throw new Error('No canvases found to export.')

  // Determine pixel size (max width/height across canvases)
  const w = Math.max(...canvases.map(c => c.width)) || Math.floor(root.clientWidth * devicePixelRatio)
  const h = Math.max(...canvases.map(c => c.height)) || Math.floor(root.clientHeight * devicePixelRatio)
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const ctx = out.getContext('2d')!

  // Draw canvases in DOM order so the overlay (DrawingLayer) ends up on top
  canvases.forEach(c => {
    try {
      ctx.drawImage(c, 0, 0)
    } catch {}
  })

  out.toBlob((blob) => {
    if (blob) downloadBlob(outName, blob)
  }, 'image/png')
}
