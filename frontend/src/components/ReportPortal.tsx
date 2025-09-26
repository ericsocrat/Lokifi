import React from "react"
import ReportComposer from "@/components/ReportComposer"

export default function ReportPortal() {
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => {
    const openHandler = () => setOpen(true)
    window.addEventListener("fynix:open-report", openHandler as any)
    return () => window.removeEventListener("fynix:open-report", openHandler as any)
  }, [])
  return open ? <ReportComposer open={open} onClose={()=>setOpen(false)} /> : null
}
