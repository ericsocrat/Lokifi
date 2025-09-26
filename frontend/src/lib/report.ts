import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

export type ReportBlock =
  | { kind: "title"; text: string }
  | { kind: "text"; markdown: string }
  | { kind: "image"; dataUrl: string; caption?: string }
  | { kind: "snapshot"; title?: string; pngDataUrl: string }

export async function buildReportPDF(blocks: ReportBlock[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const mm = (v:number) => v * 2.83464567
  const pageMargin = mm(15)

  function addPage() {
    return pdf.addPage([mm(210), mm(297)]) // A4 portrait
  }

  let page = addPage()
  let cursorY = page.getHeight() - pageMargin

  const drawText = (text:string, size=12, bold=false) => {
    const wrapped = wrapText(text, size, bold ? fontBold : font, page.getWidth() - pageMargin*2)
    for (const line of wrapped) {
      const h = size * 1.2
      if (cursorY - h < pageMargin) { page = addPage(); cursorY = page.getHeight() - pageMargin }
      page.drawText(line, { x: pageMargin, y: cursorY - h, size, font: bold ? fontBold : font, color: rgb(1,1,1) })
      cursorY -= h
    }
  }

  const drawImage = async (dataUrl:string, caption?:string) => {
    const bytes = dataUrlToBytes(dataUrl)
    const isPng = dataUrl.startsWith("data:image/png")
    const img = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes)
    const maxW = page.getWidth() - pageMargin*2
    const maxH = page.getHeight() - pageMargin*2 - 40
    const scale = Math.min(maxW / img.width, maxH / img.height, 1)
    const w = img.width * scale
    const h = img.height * scale
    if (cursorY - h - 20 < pageMargin) { page = addPage(); cursorY = page.getHeight() - pageMargin }
    page.drawImage(img, { x: pageMargin, y: cursorY - h, width: w, height: h })
    cursorY -= h + 6
    if (caption) {
      drawText(caption, 10)
      cursorY -= 8
    }
  }

  for (const b of blocks) {
    if (b.kind === "title") {
      drawText(b.text, 20, true)
      cursorY -= 10
      continue
    }
    if (b.kind === "text") {
      const plain = mdToPlain(b.markdown)
      drawText(plain, 12, false)
      cursorY -= 8
      continue
    }
    if (b.kind === "image") {
      await drawImage(b.dataUrl, b.caption)
      continue
    }
    if (b.kind === "snapshot") {
      await drawImage(b.pngDataUrl, b.title)
      continue
    }
  }

  return await pdf.save()
}

export function downloadPdf(bytes: Uint8Array, filename="report.pdf") {
  const blob = new Blob([bytes], { type: "application/pdf" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000)
}

function dataUrlToBytes(dataUrl:string): Uint8Array {
  const base64 = dataUrl.split(",")[1]
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i=0; i<bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function mdToPlain(md:string): string {
  return md
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
}

function wrapText(text: string, size: number, font: any, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ""
  for (const w of words) {
    const test = line ? line + " " + w : w
    const width = font.widthOfTextAtSize(test, size)
    if (width > maxWidth && line) {
      lines.push(line)
      line = w
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}
