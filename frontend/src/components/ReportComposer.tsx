import React from "react"
import { useChartStore } from "@/state/store"
import { buildReportPDF, downloadPdf, ReportBlock } from "@/lib/report"

export default function ReportComposer({ open, onClose }:{ open:boolean; onClose:()=>void }) {
  const s = useChartStore()
  const [title, setTitle] = React.useState("Fynix Report")
  const [notes, setNotes] = React.useState("")
  const [includeRecent, setIncludeRecent] = React.useState(true)
  const [exporting, setExporting] = React.useState(false)

  if (!open) return null

  const snapshots = s.snapshots || []

  const exportPdf = async () => {
    try {
      setExporting(true)
      const blocks: ReportBlock[] = []
      if (title.trim()) blocks.push({ kind: "title", text: title.trim() })
      if (notes.trim()) blocks.push({ kind: "text", markdown: notes.trim() })
      // Add snapshot thumbnails if any
      for (const sn of snapshots) {
        // Expect plugin or chart to expose last PNG; if not, skip gracefully
        const png = (window as any).__fynix_lastSnapshotPng || ""
        if (png) blocks.push({ kind: "snapshot", title: sn.name, pngDataUrl: png })
      }
      if (includeRecent && s.alertEvents?.length) {
        const lines = s.alertEvents.slice(-12).map(ev => `- ${new Date(ev.at).toLocaleString()} — ${ev.kind}${ev.price!=null?` @ ${ev.price.toFixed(2)}`:""}`)
        blocks.push({ kind: "text", markdown: `### Recent Alerts
${lines.join("\n")}` })
      }
      const bytes = await buildReportPDF(blocks)
      downloadPdf(bytes, (title || "report").replace(/\s+/g,"_") + ".pdf")
      onClose()
    } catch (e) {
      console.error(e)
      alert("Failed to export PDF. Check console for details.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute left-1/2 top-10 -translate-x-1/2 w-[560px] rounded-xl border border-white/15 bg-neutral-900 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Create Report</div>
          <button className="text-xs opacity-70 hover:opacity-100" onClick={onClose}>✕</button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <label className="opacity-70">Title</label>
          <input className="col-span-2 bg-transparent border border-white/15 rounded px-2 py-1"
                 value={title} onChange={e=>setTitle(e.target.value)} />

          <label className="opacity-70">Notes</label>
          <textarea rows={5} className="col-span-2 bg-transparent border border-white/15 rounded px-2 py-1"
                    placeholder="Markdown supported (**, *, `code`, [text](url))"
                    value={notes} onChange={e=>setNotes(e.target.value)} />

          <label className="opacity-70">Include recent alerts</label>
          <div className="col-span-2">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={includeRecent} onChange={e=>setIncludeRecent(e.target.checked)} />
              <span>Last 12 alerts</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button className="px-3 py-1 text-xs rounded border border-white/15 hover:bg-white/10" onClick={onClose}>Cancel</button>
          <button className="px-3 py-1 text-xs rounded border border-emerald-500/40 hover:bg-emerald-500/10"
                  onClick={exportPdf} disabled={exporting}>{exporting ? "Exporting…" : "Export PDF"}</button>
        </div>
      </div>
    </div>
  )
}
