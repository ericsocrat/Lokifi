import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { exportPNG } from '@/lib/exporters'

export async function exportReportPDF(title = 'Fynix Chart Report') {
  // Get PNG as data URL via existing exporter
  const container = document.querySelector('main') || document.body
  const canvases = Array.from(container.querySelectorAll('canvas')) as HTMLCanvasElement[]
  if (canvases.length === 0) return
  const base = canvases[0], overlay = canvases[canvases.length - 1]
  const w = Math.max(base.width, overlay.width), h = Math.max(base.height, overlay.height)
  const tmp = document.createElement('canvas')
  tmp.width = w; tmp.height = h
  const ctx = tmp.getContext('2d')!
  ctx.drawImage(base, 0, 0); ctx.drawImage(overlay, 0, 0)
  const dataUrl = tmp.toDataURL('image/png')
  const pngBytes = await (await fetch(dataUrl)).arrayBuffer()

  const pdf = await PDFDocument.create()
  const page = pdf.addPage()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const png = await pdf.embedPng(pngBytes)
  const { width: pw, height: ph } = page.getSize()

  const margin = 36
  const imgW = pw - margin*2
  const scale = imgW / w
  const imgH = h * scale
  page.drawText(title, { x: margin, y: ph - margin - 14, size: 14, font, color: rgb(0.9,0.9,0.95) })
  page.drawImage(png, { x: margin, y: ph - margin*2 - imgH, width: imgW, height: imgH })

  const bytes = await pdf.save()
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'fynix-report.pdf'; a.click()
  setTimeout(()=>URL.revokeObjectURL(url), 10000)
}
